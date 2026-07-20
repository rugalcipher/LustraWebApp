import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/api/queryKeys";
import { clearUserScopedCaches } from "@/services/cache";
import * as appointmentService from "@/services/appointmentService";
import * as managementService from "@/services/managementService";
import { adoptAuthResult, endSession } from "@/api/authTokenCoordinator";

/**
 * Internal appointments — the management-only schedule.
 *
 * These assertions guard the request shape and the privacy boundary, not the visuals:
 * an appointment must be created idempotently, the inbox must not send noise filters,
 * and none of this may leak into a client-scoped cache that survives sign-out.
 */

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchMock = vi.fn().mockResolvedValue(jsonResponse({ bookingId: "b1" }));
  vi.stubGlobal("fetch", fetchMock);
  adoptAuthResult({
    user: { id: "staff-1" },
    tokens: { accessToken: "a", refreshToken: "r", expiresAtUtc: "2099-01-01T00:00:00Z" },
  } as never);
});

afterEach(() => {
  endSession("logout");
  vi.unstubAllGlobals();
});

function createInput(): appointmentService.CreateAppointmentInput {
  return {
    clientUserId: "client-1",
    talentProfileId: "talent-1",
    conversationId: "conv-1",
    engagementCategoryId: "cat-1",
    confirmedDate: "2027-06-12",
    startTime: "19:00:00",
    endTime: "23:00:00",
    talentAvailabilityConfirmed: true,
  };
}

describe("creating an appointment", () => {
  it("sends an Idempotency-Key so a retry cannot double-book the talent", async () => {
    await appointmentService.createAppointment(createInput(), "key-123");

    const [, init] = fetchMock.mock.calls[0];
    const headers = new Headers(init.headers);
    expect(headers.get("Idempotency-Key")).toBe("key-123");
    expect(init.method).toBe("POST");
  });

  it("carries the acknowledgement and the conversation it was arranged in", async () => {
    await appointmentService.createAppointment(createInput(), "key-123");

    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toContain("/management/bookings");

    const body = JSON.parse(init.body as string);
    // The API rejects the request without this; sending it is the operational
    // attestation that the slot was already agreed with the talent.
    expect(body.talentAvailabilityConfirmed).toBe(true);
    // Reuses the client's existing thread rather than opening a second one.
    expect(body.conversationId).toBe("conv-1");
  });

  it("posts to the management route, never a client one", async () => {
    await appointmentService.createAppointment(createInput(), "key-123");

    const [url] = fetchMock.mock.calls[0];
    expect(String(url)).not.toContain("/client/");
  });
});

describe("the management inbox request", () => {
  beforeEach(() => {
    fetchMock.mockResolvedValue(jsonResponse({ items: [], total: 0, page: 1, pageSize: 50 }));
  });

  it("sends the filters that are set and omits the ones that are not", async () => {
    await managementService.listConversations({ unreadOnly: true, search: "  Isabelle  " });

    const url = String(fetchMock.mock.calls[0][0]);
    expect(url).toContain("unreadOnly=true");
    expect(url).toContain("Isabelle");
    // A trimmed-to-empty search and an explicit `false` are noise that would change the
    // cache key without changing the result.
    expect(url).not.toContain("unassignedOnly");
  });

  it("drops a whitespace-only search rather than querying for it", async () => {
    await managementService.listConversations({ search: "   " });

    const url = String(fetchMock.mock.calls[0][0]);
    expect(url).not.toContain("search=");
  });
});

describe("appointment cache keys", () => {
  it("separates the calendar per filter set", () => {
    const a = JSON.stringify(queryKeys.management.calendar({ talentProfileId: "t1" }));
    const b = JSON.stringify(queryKeys.management.calendar({ talentProfileId: "t2" }));
    const c = JSON.stringify(queryKeys.management.calendar());
    expect(new Set([a, b, c]).size).toBe(3);
  });

  it("separates a conversation's client summary from its appointment", () => {
    const summary = JSON.stringify(queryKeys.management.conversationClientSummary("c1"));
    const appointment = JSON.stringify(queryKeys.management.conversationAppointment("c1"));
    expect(summary).not.toBe(appointment);
  });

  it("drops every appointment cache on sign-out", async () => {
    // These hold client identities, private addresses and internal notes. None of it
    // may survive into the next account's session.
    const queryClient = new QueryClient();
    queryClient.setQueryData(queryKeys.management.booking("b1"), { id: "b1" });
    queryClient.setQueryData(queryKeys.management.calendar(), []);
    queryClient.setQueryData(queryKeys.management.conversationClientSummary("c1"), { userId: "u1" });

    clearUserScopedCaches(queryClient);

    expect(queryClient.getQueryData(queryKeys.management.booking("b1"))).toBeUndefined();
    expect(queryClient.getQueryData(queryKeys.management.calendar())).toBeUndefined();
    expect(
      queryClient.getQueryData(queryKeys.management.conversationClientSummary("c1"))
    ).toBeUndefined();
  });
});
