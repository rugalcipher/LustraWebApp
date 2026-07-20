import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import { queryKeys, USER_SCOPED_NAMESPACES } from "@/api/queryKeys";
import { clearUserScopedCaches } from "@/services/cache";
import * as conversationService from "@/services/conversationService";
import type { MessageDto } from "@/services/conversationService";
import { adoptAuthResult, endSession } from "@/api/authTokenCoordinator";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function message(overrides: Partial<MessageDto> = {}): MessageDto {
  return {
    id: "m1",
    conversationId: "c1",
    senderUserId: "u1",
    messageType: "Text",
    body: "Hello",
    isSystem: false,
    isDeleted: false,
    createdAtUtc: "2026-07-20T10:00:00Z",
    attachments: [],
    ...overrides,
  };
}

describe("message attribution", () => {
  it("attributes a message to its sender", () => {
    expect(conversationService.isOwnMessage(message({ senderUserId: "u1" }), "u1")).toBe(true);
    expect(conversationService.isOwnMessage(message({ senderUserId: "u2" }), "u1")).toBe(false);
  });

  it("never attributes a SYSTEM message to the reader", () => {
    // System messages have no sender. Comparing null to null would otherwise make every
    // system message look like the reader's own, right-aligned as if they wrote it.
    const system = message({ senderUserId: null, isSystem: true, messageType: "InquirySummary" });

    expect(conversationService.isOwnMessage(system, "u1")).toBe(false);
    expect(conversationService.isOwnMessage(system, null)).toBe(false);
  });

  it("attributes nothing when there is no signed-in reader", () => {
    expect(conversationService.isOwnMessage(message(), null)).toBe(false);
  });
});

describe("conversation requests", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn(async () => jsonResponse({}));
    vi.stubGlobal("fetch", fetchMock);
    const future = new Date(Date.now() + 3_600_000).toISOString();
    adoptAuthResult({
      user: { id: "u1" },
      tokens: {
        accessToken: "access",
        accessTokenExpiresAtUtc: future,
        refreshToken: "refresh",
        refreshTokenExpiresAtUtc: future,
      },
    });
  });

  afterEach(() => {
    endSession("logout");
    vi.unstubAllGlobals();
  });

  it("posts a message as multipart using the field names the controller binds", async () => {
    fetchMock.mockImplementation(async () => jsonResponse(message()));

    await conversationService.postMessage("c1", { body: "Hello there" });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toContain("/client/conversations/c1/messages");
    expect(init.method).toBe("POST");
    expect(init.body).toBeInstanceOf(FormData);
    expect((init.body as FormData).get("body")).toBe("Hello there");

    // The client must NOT set Content-Type for multipart — the browser adds the
    // boundary, and overriding it produces an unparseable request.
    expect((init.headers as Record<string, string>)["Content-Type"]).toBeUndefined();
  });

  it("sends an attachment under the 'file' field", async () => {
    fetchMock.mockImplementation(async () => jsonResponse(message()));
    const file = new File(["x"], "brief.pdf", { type: "application/pdf" });

    await conversationService.postMessage("c1", { body: null, file });

    const form = fetchMock.mock.calls[0][1].body as FormData;
    expect((form.get("file") as File).name).toBe("brief.pdf");
    expect(form.get("body")).toBeNull();
  });

  it("requests message history paginated", async () => {
    fetchMock.mockImplementation(async () => jsonResponse({ items: [], totalCount: 0 }));

    await conversationService.getMessages("c1", 2, 30);

    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toContain("page=2");
    expect(url).toContain("pageSize=30");
  });

  it("carries the bearer token — conversations are never anonymous", async () => {
    await conversationService.listConversations();
    const headers = fetchMock.mock.calls[0][1].headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer access");
  });
});

describe("conversation cache", () => {
  it("keeps message pages of different conversations separate", () => {
    const a = JSON.stringify(queryKeys.conversations.messages("c1", 1));
    const b = JSON.stringify(queryKeys.conversations.messages("c2", 1));
    const c = JSON.stringify(queryKeys.conversations.messages("c1", 2));

    expect(new Set([a, b, c]).size).toBe(3);
  });

  it("drops every conversation cache on logout", () => {
    const qc = new QueryClient();
    qc.setQueryData(queryKeys.conversations.mine(), [{ id: "c1" }]);
    qc.setQueryData(queryKeys.conversations.detail("c1"), { id: "c1" });
    qc.setQueryData(queryKeys.conversations.messages("c1", 1), { items: [message()] });

    clearUserScopedCaches(qc);

    expect(qc.getQueryData(queryKeys.conversations.mine())).toBeUndefined();
    expect(qc.getQueryData(queryKeys.conversations.detail("c1"))).toBeUndefined();
    expect(qc.getQueryData(queryKeys.conversations.messages("c1", 1))).toBeUndefined();
  });

  it("treats conversations as user-scoped", () => {
    expect(USER_SCOPED_NAMESPACES).toContain("conversations");
  });
});

describe("chat connection", () => {
  beforeEach(async () => {
    vi.resetModules();
  });

  it("derives the hub URL from the API origin, not the /api/v1 path", async () => {
    // The hub is mounted at the ORIGIN (/hubs/chat); appending it to the API base URL
    // would produce /api/v1/hubs/chat and 404.
    const { __resetChatConnectionForTests, getConnectionStatus } = await import(
      "@/features/conversations/connection"
    );
    __resetChatConnectionForTests();

    // Starts disconnected and never auto-connects on import.
    expect(getConnectionStatus()).toBe("disconnected");
  });

  it("reports disconnected after teardown so the UI can stop claiming to be live", async () => {
    const connection = await import("@/features/conversations/connection");
    connection.__resetChatConnectionForTests();

    await connection.disconnectChat();

    expect(connection.getConnectionStatus()).toBe("disconnected");
  });

  it("notifies status subscribers immediately on subscribe", async () => {
    const connection = await import("@/features/conversations/connection");
    connection.__resetChatConnectionForTests();

    const seen: string[] = [];
    const off = connection.onConnectionStatus((s) => seen.push(s));

    expect(seen).toEqual(["disconnected"]);
    off();
  });

  it("delivers a chat event only to current subscribers", async () => {
    const connection = await import("@/features/conversations/connection");
    connection.__resetChatConnectionForTests();

    const received: string[] = [];
    const off = connection.onChatEvent("ConversationUpdated", (p) => received.push(p.conversationId));

    // Unsubscribing must actually stop delivery — otherwise an unmounted thread keeps
    // mutating the cache.
    off();
    expect(received).toEqual([]);
  });
});
