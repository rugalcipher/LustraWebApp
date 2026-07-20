import { describe, it, expect } from "vitest";
import {
  presentProfileStatus, canSubmitDraft, presentAvailabilityStatus, presentRateUnit,
  AVAILABILITY_STATUSES, RATE_UNITS, TAG_TYPES, TAG_TYPE_FIELDS,
} from "@/services/talentProfileService";
import {
  presentModerationStatus, presentVisibility, formatFileSize, MEDIA_TYPES,
} from "@/services/talentMediaService";
import {
  validateRule, validateTravel, toTimeOnly, formatTime, presentExceptionType,
  DAYS_OF_WEEK, EXCEPTION_TYPES,
} from "@/services/availabilityService";
import { canRespond } from "@/services/talentEngagementService";
import { queryKeys, USER_SCOPED_NAMESPACES } from "@/api/queryKeys";

describe("profile status", () => {
  it("treats ONLY Approved as live", () => {
    // Every other status must report not-live. Telling a paused or suspended talent their
    // profile is public would be a direct falsehood — and discovery filters on
    // `ProfileStatus == Approved`, so those profiles genuinely are not visible.
    expect(presentProfileStatus("Approved").isLive).toBe(true);
    for (const status of [
      "Draft", "PendingReview", "ChangesRequested", "Rejected", "Paused", "Suspended", "Archived",
    ]) {
      expect(presentProfileStatus(status).isLive).toBe(false);
    }
  });

  it("does not assume an unknown status is live or editable", () => {
    const unknown = presentProfileStatus("SomethingNew");
    expect(unknown.isLive).toBe(false);
    expect(unknown.isEditable).toBe(false);
  });

  it("locks editing while management is reviewing", () => {
    expect(presentProfileStatus("PendingReview").isEditable).toBe(false);
    expect(presentProfileStatus("ChangesRequested").isEditable).toBe(true);
    expect(presentProfileStatus("Draft").isEditable).toBe(true);
  });

  it("does not offer resubmission of a draft already in review", () => {
    expect(canSubmitDraft("Draft")).toBe(true);
    expect(canSubmitDraft("ChangesRequested")).toBe(true);
    expect(canSubmitDraft("Approved")).toBe(true);
    expect(canSubmitDraft("PendingReview")).toBe(false);
    expect(canSubmitDraft("Suspended")).toBe(false);
  });

  it("covers every backend TalentProfileStatus", () => {
    // A member with no entry falls through to the conservative unknown branch, which is
    // identifiable by its generic detail text. Comparing the LABEL would not work: some
    // labels legitimately equal the enum name (`Draft` → "Draft").
    const unknownDetail = presentProfileStatus("__definitely_not_a_status__").detail;

    for (const status of [
      "Draft", "PendingReview", "ChangesRequested", "Approved", "Rejected",
      "Paused", "Suspended", "Archived",
    ]) {
      expect(presentProfileStatus(status).detail).not.toBe(unknownDetail);
    }
  });
});

describe("media moderation", () => {
  it("treats ONLY Approved as visible to clients", () => {
    expect(presentModerationStatus("Approved").isPublic).toBe(true);
    for (const status of [
      "Draft", "Uploading", "Processing", "PendingReview", "Rejected", "Archived",
    ]) {
      expect(presentModerationStatus(status).isPublic).toBe(false);
    }
  });

  it("never treats an unknown moderation status as published", () => {
    expect(presentModerationStatus("Quarantined").isPublic).toBe(false);
    expect(presentModerationStatus("Quarantined").canSubmit).toBe(false);
  });

  it("only offers submission from a state the server accepts it from", () => {
    expect(presentModerationStatus("Draft").canSubmit).toBe(true);
    expect(presentModerationStatus("Rejected").canSubmit).toBe(true);
    // Already queued or already approved — resubmitting would be a 422.
    expect(presentModerationStatus("PendingReview").canSubmit).toBe(false);
    expect(presentModerationStatus("Approved").canSubmit).toBe(false);
  });

  it("marks VIP visibility distinctly", () => {
    expect(presentVisibility("VipOnly").isVip).toBe(true);
    expect(presentVisibility("Public").isVip).toBe(false);
    expect(presentVisibility("ManagementOnly").isVip).toBe(false);
  });

  it("offers only the two media types the backend has", () => {
    expect(MEDIA_TYPES.map((t) => t.value)).toEqual(["Image", "IntroductionVideo"]);
  });

  it("formats file sizes without pretending to precision", () => {
    expect(formatFileSize(512)).toBe("512 B");
    expect(formatFileSize(2048)).toBe("2 KB");
    expect(formatFileSize(5 * 1024 * 1024)).toBe("5.0 MB");
  });
});

describe("availability", () => {
  it("rejects an inverted time window before it reaches the server", () => {
    expect(validateRule({ startTime: "18:00", endTime: "23:00" })).toBeNull();
    expect(validateRule({ startTime: "23:00", endTime: "18:00" })).not.toBeNull();
    expect(validateRule({ startTime: "18:00", endTime: "18:00" })).not.toBeNull();
    expect(validateRule({ startTime: "", endTime: "23:00" })).not.toBeNull();
  });

  it("allows a single-day travel period but not an inverted one", () => {
    expect(validateTravel({ startDate: "2026-08-01", endDate: "2026-08-05" })).toBeNull();
    expect(validateTravel({ startDate: "2026-08-01", endDate: "2026-08-01" })).toBeNull();
    expect(validateTravel({ startDate: "2026-08-05", endDate: "2026-08-01" })).not.toBeNull();
  });

  it("converts an input time to the TimeOnly shape .NET binds", () => {
    expect(toTimeOnly("19:00")).toBe("19:00:00");
    // Already full precision — must not gain a second suffix.
    expect(toTimeOnly("19:00:30")).toBe("19:00:30");
  });

  it("renders a TimeOnly back without seconds", () => {
    expect(formatTime("19:00:00")).toBe("19:00");
    expect(formatTime(null)).toBe("");
  });

  it("uses the DayOfWeek names .NET parses", () => {
    expect(DAYS_OF_WEEK).toContain("Monday");
    expect(DAYS_OF_WEEK).toContain("Sunday");
    expect(DAYS_OF_WEEK).toHaveLength(7);
  });

  it("offers only the backend AvailabilityExceptionType members", () => {
    expect(EXCEPTION_TYPES.map((t) => t.value).sort()).toEqual(
      ["Available", "Blackout", "TimeOff"].sort()
    );
    expect(presentExceptionType("Blackout")).not.toBe("Blackout");
  });

  it("offers only the backend AvailabilityStatus members", () => {
    expect(AVAILABILITY_STATUSES.map((s) => s.value)).toEqual([
      "Available", "LimitedAvailability", "ByRequest", "Travelling", "TemporarilyUnavailable",
    ]);
    expect(presentAvailabilityStatus("LimitedAvailability")).toBe("Limited availability");
  });
});

describe("rates and tags", () => {
  it("offers only the backend RateUnit members", () => {
    expect(RATE_UNITS.map((u) => u.value).sort()).toEqual(
      ["Custom", "Hourly", "PerDay", "PerEvening", "PerEvent"].sort()
    );
    expect(presentRateUnit("PerEvening")).toBe("Per evening");
  });

  it("uses the exact tag-type slugs the API route accepts", () => {
    // The server matches these against a fixed set; a typo is a 400 at runtime.
    expect(Object.values(TAG_TYPES).sort()).toEqual(
      ["categories", "engagement-categories", "interests", "languages", "personality-tags", "skills"].sort()
    );
  });

  it("maps every tag-type slug to a real TalentTagsDto field", () => {
    const fields = ["categories", "engagementCategories", "languages", "skills", "interests", "personalityTags"];
    for (const type of Object.values(TAG_TYPES)) {
      expect(fields).toContain(TAG_TYPE_FIELDS[type]);
    }
  });
});

describe("talent reviews", () => {
  function review(overrides: Record<string, unknown> = {}) {
    return {
      id: "r1",
      bookingId: "b1",
      rating: 5,
      title: null,
      body: "Wonderful",
      status: "Approved",
      talentResponse: null,
      publishedAtUtc: "2026-07-20T10:00:00Z",
      ...overrides,
    } as Parameters<typeof canRespond>[0];
  }

  it("allows one response to an approved review", () => {
    expect(canRespond(review())).toBe(true);
  });

  it("refuses a second response", () => {
    expect(canRespond(review({ talentResponse: "Thank you" }))).toBe(false);
  });

  it("refuses a response to an unapproved review", () => {
    // Responding to a pending review would be a 422; more importantly a talent must not be
    // shown a composer for a review the public cannot see.
    for (const status of ["Pending", "Rejected", "Hidden"]) {
      expect(canRespond(review({ status }))).toBe(false);
    }
  });
});

describe("talent-portal cache isolation", () => {
  it("keeps portal data in a user-scoped namespace", () => {
    // Drafts, unapproved media and private rates must not survive sign-out.
    expect(USER_SCOPED_NAMESPACES).toContain("talent-portal");
  });

  it("keeps the portal namespace separate from public talent data", () => {
    expect(queryKeys.talentPortal.profile()[0]).toBe("talent-portal");
    expect(queryKeys.talent.public("someone")[0]).toBe("talent");
  });

  it("nests every calendar range under one invalidatable prefix", () => {
    const prefix = queryKeys.talentPortal.calendarAll();
    const ranged = queryKeys.talentPortal.calendar("2026-07-01", "2026-10-01");
    expect(ranged.slice(0, prefix.length)).toEqual([...prefix]);
  });

  it("gives media its own key", () => {
    expect(queryKeys.talentPortal.media()).toEqual(["talent-portal", "media"]);
  });
});
