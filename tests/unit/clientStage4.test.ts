import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import { queryKeys, USER_SCOPED_NAMESPACES } from "@/api/queryKeys";
import { clearUserScopedCaches } from "@/services/cache";
import { inquirySchema, toCreateInquiryInput } from "@/features/inquiries/schema";
import * as clientService from "@/services/clientService";
import * as inquiryService from "@/services/inquiryService";
import { adoptAuthResult, endSession } from "@/api/authTokenCoordinator";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function validInquiry(overrides: Record<string, unknown> = {}) {
  return {
    engagementCategoryId: "cat-1",
    preferredDate: "2099-01-01",
    alternativeDate: "",
    preferredStartTime: "19:30",
    estimatedDurationMinutes: "240",
    cityId: "city-1",
    venueTypeId: "",
    attendeeCount: "2",
    travelRequired: false,
    clientMessage: "A quiet dinner.",
    additionalRequirements: "",
    acknowledged: true as const,
    ...overrides,
  };
}

describe("inquiry form validation", () => {
  it("accepts a well-formed inquiry", () => {
    expect(inquirySchema.safeParse(validInquiry()).success).toBe(true);
  });

  it("requires an engagement category chosen from real reference data", () => {
    const result = inquirySchema.safeParse(validInquiry({ engagementCategoryId: "" }));
    expect(result.success).toBe(false);
  });

  it("requires the client to acknowledge this is an inquiry, not a booking", () => {
    const result = inquirySchema.safeParse(validInquiry({ acknowledged: false }));
    expect(result.success).toBe(false);
  });

  it("rejects a date in the past", () => {
    const result = inquirySchema.safeParse(validInquiry({ preferredDate: "2000-01-01" }));
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path.includes("preferredDate"))).toBe(true);
    }
  });

  it("rejects nonsensical duration and attendee counts", () => {
    expect(inquirySchema.safeParse(validInquiry({ estimatedDurationMinutes: "-30" })).success).toBe(false);
    expect(inquirySchema.safeParse(validInquiry({ attendeeCount: "-5" })).success).toBe(false);
  });

  it("submits reference-data IDs, never display labels", () => {
    const parsed = inquirySchema.parse(validInquiry());
    const payload = toCreateInquiryInput(parsed, "talent-guid");

    expect(payload.engagementCategoryId).toBe("cat-1");
    expect(payload.cityId).toBe("city-1");
    expect(payload.talentProfileId).toBe("talent-guid");
    // Empty optional selections become null, not "".
    expect(payload.venueTypeId).toBeNull();
    expect(payload.alternativeDate).toBeNull();
    // Time is sent as HH:mm:ss to match the backend's TimeOnly.
    expect(payload.preferredStartTime).toBe("19:30:00");
    expect(payload.estimatedDurationMinutes).toBe(240);
  });

  it("never sends a client id or a price — those are server-owned or absent", () => {
    const parsed = inquirySchema.parse(validInquiry());
    const payload = toCreateInquiryInput(parsed, "talent-guid") as Record<string, unknown>;

    expect(payload).not.toHaveProperty("clientId");
    expect(payload).not.toHaveProperty("clientUserId");
    expect(payload).not.toHaveProperty("price");
    expect(payload).not.toHaveProperty("amount");
    expect(payload).not.toHaveProperty("status");
    expect(payload).not.toHaveProperty("createdAtUtc");
  });
});

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
