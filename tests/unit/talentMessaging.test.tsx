import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { ROUTES } from "@/app/routeRegistry";
import * as service from "@/services/talentConversationService";
import { isOwnTalentMessage } from "@/services/talentConversationService";

/**
 * The talent booking-conversation surface.
 *
 * A talent is a participant only of the booking conversations they are assigned to, enforced
 * on the server. These tests pin the exact endpoints the client calls and that the routes
 * exist and are protected — a Messages tab must never point at a placeholder.
 */

const paths = ROUTES.map((r) => r.path);

describe("talent conversation API surface", () => {
  let calls: { url: string; init: RequestInit }[] = [];

  beforeEach(() => {
    calls = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init: RequestInit = {}) => {
        calls.push({ url: String(url), init });
        return new Response(JSON.stringify({ items: [], id: "x" }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      })
    );
  });
  afterEach(() => vi.unstubAllGlobals());

  const last = () => new URL(calls[calls.length - 1].url, "https://example.test");

  it("lists the talent's conversations at the talent path", async () => {
    await service.listTalentConversations();
    expect(last().pathname).toMatch(/\/talent\/conversations$/);
    expect(calls[0].init.method ?? "GET").toBe("GET");
  });

  it("reads a thread's messages under the talent path", async () => {
    await service.getTalentMessages("conv-1");
    expect(last().pathname).toMatch(/\/talent\/conversations\/conv-1\/messages$/);
  });

  it("posts a message to the talent path", async () => {
    await service.postTalentMessage("conv-1", { body: "hi" });
    expect(last().pathname).toMatch(/\/talent\/conversations\/conv-1\/messages$/);
    expect(calls[calls.length - 1].init.method).toBe("POST");
  });

  it("marks a thread read at the talent path", async () => {
    await service.markTalentConversationRead("conv-1");
    expect(last().pathname).toMatch(/\/talent\/conversations\/conv-1\/read$/);
    expect(calls[calls.length - 1].init.method).toBe("POST");
  });

  it("never talks to the management or client conversation surfaces", async () => {
    await service.listTalentConversations();
    await service.getTalentMessages("c");
    await service.markTalentConversationRead("c");
    for (const call of calls) {
      expect(call.url).not.toContain("/management/conversations");
      expect(call.url).not.toContain("/client/conversations");
    }
  });
});

describe("talent messaging routes", () => {
  it("registers the list and thread routes", () => {
    expect(paths).toContain("/talent-messages");
    expect(paths).toContain("/talent-messages/:id");
  });

  it("keeps them protected and available to the talent role", () => {
    for (const path of ["/talent-messages", "/talent-messages/:id"]) {
      const route = ROUTES.find((r) => r.path === path);
      expect(route?.access).toBe("protected");
      expect(route?.roles).toContain("talent");
    }
  });

  it("surfaces Messages in the talent navigation", () => {
    const list = ROUTES.find((r) => r.path === "/talent-messages");
    const nav = Array.isArray(list?.nav) ? list?.nav : list?.nav ? [list.nav] : [];
    expect(nav.some((n) => n.group === "talent" && n.label === "Messages")).toBe(true);
  });
});

describe("own-message attribution", () => {
  const base = {
    id: "m",
    conversationId: "c",
    senderDisplayName: null,
    senderRole: null,
    onBehalfOfUserId: null,
    onBehalfOfDisplayName: null,
    displayAttribution: null,
    messageType: "Text",
    body: "hi",
    isSystem: false,
    isDeleted: false,
    createdAtUtc: "2026-01-01T00:00:00Z",
    attachments: [],
  };

  it("treats a talent's own message as theirs", () => {
    expect(isOwnTalentMessage({ ...base, senderUserId: "talent-1" }, "talent-1")).toBe(true);
  });

  it("never treats a management proxy message as the talent's own", () => {
    // Sent BY management, representing the talent — the real sender is the manager, so it is
    // not the talent's own message even though it speaks for them.
    const proxy = { ...base, senderUserId: "manager-1", onBehalfOfUserId: "talent-1" };
    expect(isOwnTalentMessage(proxy, "talent-1")).toBe(false);
  });

  it("never treats a system message as anyone's own", () => {
    expect(isOwnTalentMessage({ ...base, senderUserId: null, isSystem: true }, "talent-1")).toBe(false);
  });
});
