import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/api/queryKeys";
import { usePrincipal } from "@/auth/PrincipalContext";
import * as conversationService from "@/services/conversationService";
import type { MessageDto, PagedMessages } from "@/services/conversationService";
import {
  ensureConnected,
  joinConversation,
  leaveConversation,
  onChatEvent,
  onConnectionStatus,
  sendTyping,
  type ConnectionStatus,
} from "@/features/conversations/connection";

/**
 * Conversation hooks.
 *
 * REST is authoritative; SignalR events fold into the SAME React Query cache so the UI
 * has one source of truth. Nothing is stored in Zustand and no message exists only in
 * a socket frame.
 */

const CONVERSATION_STALE_TIME = 30_000;
const FIRST_PAGE = 1;
const PAGE_SIZE = 30;

/** The client's conversations, newest activity first. */
export function useConversations() {
  const { principal } = usePrincipal();
  return useQuery({
    queryKey: queryKeys.conversations.mine(),
    queryFn: ({ signal }) => conversationService.listConversations(signal),
    enabled: principal.isAuthenticated,
    staleTime: CONVERSATION_STALE_TIME,
    select: (items) =>
      [...items].sort(
        (a, b) =>
          new Date(b.lastMessageAtUtc ?? 0).getTime() - new Date(a.lastMessageAtUtc ?? 0).getTime()
      ),
  });
}

/** Total unread across every conversation, for the navigation badge. */
export function useUnreadConversationCount(): number {
  const { data } = useConversations();
  return useMemo(() => (data ?? []).reduce((total, c) => total + (c.unreadCount ?? 0), 0), [data]);
}

export function useConversation(conversationId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.conversations.detail(conversationId ?? ""),
    queryFn: ({ signal }) => conversationService.getConversation(conversationId!, signal),
    enabled: Boolean(conversationId),
    staleTime: CONVERSATION_STALE_TIME,
  });
}

/**
 * The first page of messages.
 *
 * The backend returns newest-first; the thread renders oldest-first, so the order is
 * reversed once here rather than in every component.
 */
export function useMessages(conversationId: string | undefined) {
  const query = useQuery({
    queryKey: queryKeys.conversations.messages(conversationId ?? "", FIRST_PAGE),
    queryFn: ({ signal }) =>
      conversationService.getMessages(conversationId!, FIRST_PAGE, PAGE_SIZE, signal),
    enabled: Boolean(conversationId),
    staleTime: 10_000,
  });

  const messages = useMemo(() => {
    const items = query.data?.items ?? [];
    return [...items].sort(
      (a, b) => new Date(a.createdAtUtc).getTime() - new Date(b.createdAtUtc).getTime()
    );
  }, [query.data]);

  return {
    messages,
    hasOlder: query.data?.hasNext ?? false,
    isLoading: query.isPending,
    isError: query.isError,
    error: query.error,
  };
}

/**
 * Merge a message into the cached page.
 *
 * Deduplicates by id, because the same message arrives twice by design: once as the
 * POST response and once over the socket. Without this the sender sees their own
 * message twice.
 */
function mergeMessage(queryClient: QueryClient, message: MessageDto): void {
  const key = queryKeys.conversations.messages(message.conversationId, FIRST_PAGE);

  queryClient.setQueryData<PagedMessages>(key, (current) => {
    if (!current) return current;
    if (current.items.some((m) => m.id === message.id)) return current;
    return {
      ...current,
      items: [message, ...current.items],
      totalCount: current.totalCount + 1,
    };
  });

  queryClient.invalidateQueries({ queryKey: queryKeys.conversations.mine() });
}

/** Send a message. The POST response is authoritative and folded into the cache. */
export function useSendMessage(conversationId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { body?: string | null; file?: File | null }) =>
      conversationService.postMessage(conversationId!, input),
    // Never auto-retry a send: a retry could post the message twice, and this endpoint
    // has no idempotency key. Failure is surfaced so the client can retry deliberately.
    retry: false,
    onSuccess: (message) => mergeMessage(queryClient, message),
  });
}

/** Mark the conversation read, clearing its unread badge. */
export function useMarkConversationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (conversationId: string) => conversationService.markRead(conversationId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.conversations.mine() }),
  });
}

/**
 * Live updates for one open conversation.
 *
 * Joins the SignalR group on mount, leaves on unmount, and folds incoming messages into
 * the same cache REST populates. Everything still works with the socket down — the
 * thread is simply not live.
 */
export function useLiveConversation(conversationId: string | undefined): {
  status: ConnectionStatus;
  isSomeoneTyping: boolean;
  notifyTyping: () => void;
} {
  const queryClient = useQueryClient();
  const { principal } = usePrincipal();
  const [status, setStatus] = useState<ConnectionStatus>("disconnected");
  const [typingUntil, setTypingUntil] = useState<number>(0);
  const [now, setNow] = useState<number>(() => Date.now());

  useEffect(() => onConnectionStatus(setStatus), []);

  useEffect(() => {
    if (!conversationId || !principal.isAuthenticated) return;

    let cancelled = false;
    ensureConnected()
      .then(() => {
        if (!cancelled) return joinConversation(conversationId);
      })
      .catch(() => {
        // Live updates are a bonus; REST already rendered the thread.
      });

    return () => {
      cancelled = true;
      void leaveConversation(conversationId);
    };
  }, [conversationId, principal.isAuthenticated]);

  useEffect(() => {
    if (!conversationId) return;

    const offMessage = onChatEvent("ReceiveMessage", (message) => {
      if (message.conversationId !== conversationId) return;
      mergeMessage(queryClient, message);
      // A message ends any typing indicator from that sender.
      setTypingUntil(0);
    });

    const offTyping = onChatEvent("TypingIndicator", (payload) => {
      if (payload.conversationId !== conversationId) return;
      if (payload.userId === principal.userId) return; // never echo our own typing
      setTypingUntil(Date.now() + 4_000);
    });

    const offRead = onChatEvent("ReadReceipt", (payload) => {
      if (payload.conversationId !== conversationId) return;
      queryClient.invalidateQueries({ queryKey: queryKeys.conversations.detail(conversationId) });
    });

    const offUpdated = onChatEvent("ConversationUpdated", (payload) => {
      if (payload.conversationId !== conversationId) return;
      queryClient.invalidateQueries({ queryKey: queryKeys.conversations.detail(conversationId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.conversations.mine() });
    });

    return () => {
      offMessage();
      offTyping();
      offRead();
      offUpdated();
    };
  }, [conversationId, queryClient, principal.userId]);

  // Tick only while a typing indicator is pending, so the component is not
  // re-rendering on a timer for the whole session.
  useEffect(() => {
    if (typingUntil <= Date.now()) return;
    const timer = setInterval(() => setNow(Date.now()), 1_000);
    return () => clearInterval(timer);
  }, [typingUntil]);

  const lastTypingSent = useRef(0);
  const notifyTyping = useCallback(() => {
    if (!conversationId) return;
    // Throttle: one indicator per 2s regardless of keystroke rate.
    const elapsed = Date.now() - lastTypingSent.current;
    if (elapsed < 2_000) return;
    lastTypingSent.current = Date.now();
    void sendTyping(conversationId);
  }, [conversationId]);

  return { status, isSomeoneTyping: typingUntil > now, notifyTyping };
}

/**
 * Keeps the conversation LIST live app-wide, so the navigation badge updates while the
 * client is on another screen. Mounted once, in the client shell.
 */
export function useConversationListLiveUpdates(): void {
  const queryClient = useQueryClient();
  const { principal } = usePrincipal();

  useEffect(() => {
    if (!principal.isAuthenticated) return;

    ensureConnected().catch(() => undefined);

    const off = onChatEvent("ReceiveMessage", () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.conversations.mine() });
    });
    const offUpdated = onChatEvent("ConversationUpdated", () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.conversations.mine() });
    });

    return () => {
      off();
      offUpdated();
    };
  }, [queryClient, principal.isAuthenticated]);
}
