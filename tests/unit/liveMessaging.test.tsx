import { describe, it, expect, beforeEach, vi } from "vitest";
import React from "react";
import { renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

/**
 * The role-agnostic live wiring (talent/management threads + lists). The connection module is
 * mocked, so no socket opens: the tests capture the registered chat-event handlers and fire them,
 * asserting the right React Query keys are invalidated and that a revoked thread leaves its group.
 */

// A tiny fake of the shared connection: records handlers so tests can fire events.
const handlers: Record<string, ((payload: unknown) => void)[]> = {};
const leaveConversation = vi.fn();
const joinConversation = vi.fn();
const ensureConnected = vi.fn(async () => {});

vi.mock("@/features/conversations/connection", () => ({
  ensureConnected: () => ensureConnected(),
  joinConversation: (id: string) => joinConversation(id),
  leaveConversation: (id: string) => leaveConversation(id),
  sendTyping: vi.fn(),
  onConnectionStatus: () => () => {},
  onChatEvent: (event: string, handler: (p: unknown) => void) => {
    (handlers[event] ??= []).push(handler);
    return () => {
      handlers[event] = (handlers[event] ?? []).filter((h) => h !== handler);
    };
  },
}));

// Authenticated principal so the hooks engage.
vi.mock("@/auth/PrincipalContext", () => ({
  usePrincipal: () => ({ principal: { isAuthenticated: true, userId: "me" } }),
}));

import { useLiveThread, useLiveConversationList } from "@/features/conversations/hooks";

function fire(event: string, payload: unknown) {
  (handlers[event] ?? []).forEach((h) => h(payload));
}

function wrapper(client: QueryClient) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

describe("useLiveThread", () => {
  beforeEach(() => {
    for (const k of Object.keys(handlers)) delete handlers[k];
    leaveConversation.mockClear();
    joinConversation.mockClear();
  });

  it("joins the group and refetches the keys on a message for this conversation", async () => {
    const client = new QueryClient();
    const spy = vi.spyOn(client, "invalidateQueries");
    const keys = [["talent", "conversations", "c1", "messages"], ["talent", "conversations"]];
    renderHook(() => useLiveThread("c1", keys), { wrapper: wrapper(client) });

    await vi.waitFor(() => expect(joinConversation).toHaveBeenCalledWith("c1"));

    spy.mockClear();
    fire("ReceiveMessage", { conversationId: "c1" });
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it("ignores a message for a different conversation", () => {
    const client = new QueryClient();
    const spy = vi.spyOn(client, "invalidateQueries");
    renderHook(() => useLiveThread("c1", [["k"]]), { wrapper: wrapper(client) });
    spy.mockClear();
    fire("ReceiveMessage", { conversationId: "other" });
    expect(spy).not.toHaveBeenCalled();
  });

  it("leaves the group and refetches when access is revoked", () => {
    const client = new QueryClient();
    const spy = vi.spyOn(client, "invalidateQueries");
    renderHook(() => useLiveThread("c1", [["k"]]), { wrapper: wrapper(client) });
    spy.mockClear();
    leaveConversation.mockClear();

    fire("ConversationAccessChanged", { conversationId: "c1", granted: false });
    expect(leaveConversation).toHaveBeenCalledWith("c1");
    expect(spy).toHaveBeenCalled();
  });
});

describe("useLiveConversationList", () => {
  beforeEach(() => {
    for (const k of Object.keys(handlers)) delete handlers[k];
  });

  it("refetches the list on a new conversation and on an access change", () => {
    const client = new QueryClient();
    const spy = vi.spyOn(client, "invalidateQueries");
    renderHook(() => useLiveConversationList([["management", "conversations"]]), { wrapper: wrapper(client) });

    spy.mockClear();
    fire("ConversationCreated", { conversationId: "c9" });
    expect(spy).toHaveBeenCalledWith({ queryKey: ["management", "conversations"] });

    spy.mockClear();
    fire("ConversationAccessChanged", { conversationId: "c9", granted: true });
    expect(spy).toHaveBeenCalledWith({ queryKey: ["management", "conversations"] });
  });
});
