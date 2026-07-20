import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import { queryKeys, USER_SCOPED_NAMESPACES } from "@/api/queryKeys";
import { clearUserScopedCaches } from "@/services/cache";
import * as clientService from "@/services/clientService";
import * as inquiryService from "@/services/inquiryService";
import { adoptAuthResult, endSession } from "@/api/authTokenCoordinator";

/**
 * Client workspace: saved talent, collections and cache isolation.
 *
 * The inquiry-FORM suite that used to live here was removed with the form itself: Lustra
 * is concierge-led, so a client messages management rather than completing structured
 * paperwork (INTEGRATION.md §0). `inquiryService.presentStatus` is still exercised below
 * because the MANAGEMENT pipeline renders those statuses.
 */
function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}


describe("client service requests", () => {
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

  it("sends the idempotency key as a header and keeps it out of the body", async () => {
    fetchMock.mockImplementation(async () => jsonResponse({ inquiryId: "i1", conversationId: "c1" }));

    await inquiryService.createInquiry(
      {
        talentProfileId: "t1",
        engagementCategoryId: "cat-1",
        preferredDate: null,
        alternativeDate: null,
        preferredStartTime: null,
        estimatedDurationMinutes: null,
        cityId: null,
        venueTypeId: null,
        attendeeCount: null,
        travelRequired: false,
        clientMessage: null,
        additionalRequirements: null,
      },
      "stable-key-1"
    );

    const [, init] = fetchMock.mock.calls[0];
    expect((init.headers as Record<string, string>)["Idempotency-Key"]).toBe("stable-key-1");
    const body = JSON.parse(init.body as string);
    expect(body).not.toHaveProperty("idempotencyKey");
    expect(body).not.toHaveProperty("Idempotency-Key");
  });

  afterEach(() => {
    endSession("logout");
    vi.unstubAllGlobals();
  });

  it("saves and unsaves idempotently via PUT and DELETE", async () => {
    await clientService.saveTalent("t1");
    expect(fetchMock.mock.calls[0][0]).toContain("/client/saved-talents/t1");
    expect(fetchMock.mock.calls[0][1].method).toBe("PUT");

    await clientService.unsaveTalent("t1");
    expect(fetchMock.mock.calls[1][1].method).toBe("DELETE");
  });

  it("fetches saved ids from a dedicated endpoint, not from discovery", async () => {
    await clientService.listSavedIds();
    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toContain("/client/saved-talents/ids");
    expect(url).not.toContain("/public/talents");
  });

  it("never sends a client id when updating the profile", async () => {
    await clientService.updateProfile({
      preferredName: "Mr Laurent",
      phoneNumber: "+27825550140",
      preferredCityId: null,
      contactPreference: "Phone",
      engagementPreferences: null,
    });

    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(body).not.toHaveProperty("userId");
    expect(body).not.toHaveProperty("clientUserId");
    expect(body).not.toHaveProperty("id");
  });
});

describe("client cache isolation", () => {
  it("drops every client-scoped query on logout so the next account sees nothing", () => {
    const qc = new QueryClient();

    qc.setQueryData(queryKeys.client.profile(), { preferredName: "Mr Laurent" });
    qc.setQueryData(queryKeys.client.saved(), [{ talentProfileId: "t1" }]);
    qc.setQueryData(queryKeys.client.savedIds(), ["t1"]);
    qc.setQueryData(queryKeys.client.collections(), [{ id: "c1" }]);
    qc.setQueryData(queryKeys.client.collection("c1"), { id: "c1", items: [] });
    qc.setQueryData(queryKeys.inquiries.mine(), [{ id: "i1" }]);
    qc.setQueryData(queryKeys.inquiries.detail("i1"), { id: "i1" });
    // Public discovery is not user-scoped and should survive.
    qc.setQueryData(queryKeys.talent.public("isabelle"), { slug: "isabelle" });

    clearUserScopedCaches(qc);

    expect(qc.getQueryData(queryKeys.client.profile())).toBeUndefined();
    expect(qc.getQueryData(queryKeys.client.saved())).toBeUndefined();
    expect(qc.getQueryData(queryKeys.client.savedIds())).toBeUndefined();
    expect(qc.getQueryData(queryKeys.client.collections())).toBeUndefined();
    expect(qc.getQueryData(queryKeys.client.collection("c1"))).toBeUndefined();
    expect(qc.getQueryData(queryKeys.inquiries.mine())).toBeUndefined();
    expect(qc.getQueryData(queryKeys.inquiries.detail("i1"))).toBeUndefined();

    expect(qc.getQueryData(queryKeys.talent.public("isabelle"))).toBeDefined();
  });

  it("keeps saved state OUT of the public discovery cache key", () => {
    // The whole point: discovery stays publicly cacheable and identical for everyone,
    // and saved state is merged from a separate, user-scoped query.
    const discoveryKey = JSON.stringify(queryKeys.discovery.search({ filters: null, sort: "Featured" }));
    expect(discoveryKey).not.toContain("saved");
    expect(discoveryKey).not.toContain("client");

    expect(queryKeys.client.savedIds()[0]).toBe("client");
    expect(USER_SCOPED_NAMESPACES).toContain("client");
  });

  it("gives collection detail keys that do not collide with the collection list", () => {
    const list = JSON.stringify(queryKeys.client.collections());
    const detail = JSON.stringify(queryKeys.client.collection("c1"));
    expect(list).not.toBe(detail);
  });
});

describe("inquiry status presentation", () => {
  it("never presents a new inquiry as confirmed or booked", () => {
    expect(inquiryService.presentStatus("New").label).toBe("Submitted");
    expect(inquiryService.presentStatus("New").label.toLowerCase()).not.toContain("confirm");
    expect(inquiryService.presentStatus("New").label.toLowerCase()).not.toContain("book");
  });

  it("only allows cancellation from statuses the backend accepts", () => {
    expect(inquiryService.isCancellable("New")).toBe(true);
    expect(inquiryService.isCancellable("ProposalSent")).toBe(true);
    // Already terminal — the backend would reject these.
    expect(inquiryService.isCancellable("Cancelled")).toBe(false);
    expect(inquiryService.isCancellable("Closed")).toBe(false);
    expect(inquiryService.isCancellable("ConvertedToBooking")).toBe(false);
  });

  it("falls back to the raw status rather than inventing a friendly lie", () => {
    expect(inquiryService.presentStatus("SomeFutureStatus").label).toBe("SomeFutureStatus");
  });
});
