import type { HubConnection } from "@microsoft/signalr";
import { env } from "@/config/env";
import { getAccessToken } from "@/api/tokenStorage";
import { refreshAccessToken } from "@/api/authTokenCoordinator";
import type { MessageDto } from "@/services/conversationService";

/**
 * The single shared SignalR connection to `/hubs/chat`.
 *
 * Design notes:
 *  - ONE connection per signed-in session, shared by every screen. Opening a
 *    connection per component would multiply server resources and duplicate events.
 *  - SignalR is a LIVE UPDATE CHANNEL ONLY. History, sending and read state all go
 *    through REST, so a dropped connection degrades freshness, never correctness —
 *    and a message can never exist only in a socket frame.
 *  - The access token is supplied per (re)connect via `accessTokenFactory`, and is
 *    refreshed first when stale, so a long-lived socket does not outlive its token.
 *  - Group membership is authorised SERVER-side in `ChatHub.JoinConversation`;
 *    sending a conversation id here grants nothing on its own.
 */

export type ChatEventMap = {
  ReceiveMessage: (message: MessageDto) => void;
  TypingIndicator: (payload: { conversationId: string; userId: string }) => void;
  ReadReceipt: (payload: { conversationId: string; userId: string; readAtUtc: string }) => void;
  ConversationUpdated: (payload: { conversationId: string }) => void;
};

export type ChatEventName = keyof ChatEventMap;

export type ConnectionStatus = "disconnected" | "connecting" | "connected" | "reconnecting";

const HUB_EVENTS: ChatEventName[] = [
  "ReceiveMessage",
  "TypingIndicator",
  "ReadReceipt",
  "ConversationUpdated",
];

/** Resolve the hub URL from configuration; falls back to the API origin. */
function hubUrl(): string {
  const configured = env.signalrUrl;
  if (configured) return `${configured.replace(/\/+$/, "")}/hubs/chat`;

  // The API base URL includes /api/v1; the hub is mounted at the ORIGIN.
  try {
    if (/^https?:\/\//i.test(env.apiBaseUrl)) {
      return `${new URL(env.apiBaseUrl).origin}/hubs/chat`;
    }
  } catch {
    /* fall through to a same-origin path */
  }
  return "/hubs/chat";
}

// --- Module state ------------------------------------------------------------

let connection: HubConnection | null = null;
let startPromise: Promise<void> | null = null;

/** Conversation ids this client wants to be joined to, so they can be re-joined. */
const desiredGroups = new Set<string>();

const listeners: { [K in ChatEventName]: Set<ChatEventMap[K]> } = {
  ReceiveMessage: new Set(),
  TypingIndicator: new Set(),
  ReadReceipt: new Set(),
  ConversationUpdated: new Set(),
};

const statusListeners = new Set<(status: ConnectionStatus) => void>();
let status: ConnectionStatus = "disconnected";

function setStatus(next: ConnectionStatus): void {
  if (status === next) return;
  status = next;
  for (const listener of [...statusListeners]) {
    try {
      listener(next);
    } catch {
      /* a broken subscriber must not break the connection */
    }
  }
}

export function getConnectionStatus(): ConnectionStatus {
  return status;
}

export function onConnectionStatus(listener: (status: ConnectionStatus) => void): () => void {
  statusListeners.add(listener);
  listener(status);
  return () => statusListeners.delete(listener);
}

export function onChatEvent<K extends ChatEventName>(event: K, handler: ChatEventMap[K]): () => void {
  listeners[event].add(handler);
  return () => {
    listeners[event].delete(handler);
  };
}

function dispatch<K extends ChatEventName>(event: K, ...args: Parameters<ChatEventMap[K]>): void {
  for (const handler of [...listeners[event]] as ChatEventMap[K][]) {
    try {
      (handler as (...a: unknown[]) => void)(...args);
    } catch {
      /* one bad subscriber must not stop the others */
    }
  }
}

/**
 * The SignalR client is ~100 kB and only signed-in clients ever chat, so it is loaded
 * on demand rather than shipped in the initial bundle a guest downloads.
 */
async function build(): Promise<HubConnection> {
  const { HubConnectionBuilder, LogLevel } = await import("@microsoft/signalr");

  const built = new HubConnectionBuilder()
    .withUrl(hubUrl(), {
      // Called on every connect AND reconnect, so a rotated token is picked up.
      accessTokenFactory: async () => {
        const token = getAccessToken();
        if (token) return token;
        // The socket outlived the access token — mint a new one before reconnecting.
        return (await refreshAccessToken().catch(() => null)) ?? "";
      },
    })
    // Backoff, then steady retries; `null` would stop retrying forever.
    .withAutomaticReconnect([0, 2_000, 5_000, 10_000, 30_000])
    .configureLogging(env.isDev ? LogLevel.Warning : LogLevel.Error)
    .build();

  for (const event of HUB_EVENTS) {
    built.on(event, (payload: never) => dispatch(event, payload));
  }

  built.onreconnecting(() => setStatus("reconnecting"));
  built.onreconnected(async () => {
    setStatus("connected");
    // Group membership does NOT survive a reconnect — re-join every desired
    // conversation, or the client would sit silently in a dead group.
    await Promise.all([...desiredGroups].map((id) => invokeJoin(id)));
  });
  built.onclose(() => {
    setStatus("disconnected");
    startPromise = null;
  });

  return built;
}

/** The SignalR "Connected" state value, without importing the enum eagerly. */
const CONNECTED = "Connected";

function isConnected(): boolean {
  return connection?.state === CONNECTED;
}

/** Start (or reuse) the shared connection. Safe to call repeatedly. */
export async function ensureConnected(): Promise<void> {
  if (isConnected()) return;
  if (startPromise) return startPromise;

  setStatus("connecting");

  startPromise = (async () => {
    connection ??= await build();
    await connection.start();
    setStatus("connected");
    await Promise.all([...desiredGroups].map((id) => invokeJoin(id)));
  })().catch((error) => {
    setStatus("disconnected");
    startPromise = null;
    throw error;
  });

  return startPromise;
}

async function invokeJoin(conversationId: string): Promise<void> {
  if (!isConnected()) return;
  try {
    await connection!.invoke("JoinConversation", conversationId);
  } catch {
    // A failed join is not fatal: REST already rendered the thread, and the next
    // reconnect retries. Authorisation failures are silent by design server-side.
  }
}

/** Join a conversation group, remembering it so reconnects restore membership. */
export async function joinConversation(conversationId: string): Promise<void> {
  desiredGroups.add(conversationId);
  await ensureConnected().catch(() => undefined);
  await invokeJoin(conversationId);
}

export async function leaveConversation(conversationId: string): Promise<void> {
  desiredGroups.delete(conversationId);
  if (!isConnected()) return;
  try {
    await connection!.invoke("LeaveConversation", conversationId);
  } catch {
    /* leaving is best-effort */
  }
}

/** Broadcast a typing indicator. Fire-and-forget: it must never block the composer. */
export async function sendTyping(conversationId: string): Promise<void> {
  if (!isConnected()) return;
  try {
    await connection!.invoke("SendTyping", conversationId);
  } catch {
    /* ignore */
  }
}

/**
 * Tear the connection down completely. Called on sign-out so the next account never
 * inherits this one's socket, groups or subscriptions.
 */
export async function disconnectChat(): Promise<void> {
  desiredGroups.clear();
  const current = connection;
  connection = null;
  startPromise = null;
  setStatus("disconnected");

  if (current) {
    try {
      await current.stop();
    } catch {
      /* already closing */
    }
  }
}

/** Test seam. */
export function __resetChatConnectionForTests(): void {
  connection = null;
  startPromise = null;
  desiredGroups.clear();
  status = "disconnected";
  for (const event of HUB_EVENTS) listeners[event].clear();
  statusListeners.clear();
}
