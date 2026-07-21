import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import * as talentAdmin from "@/services/talentAdminService";
import {
  PUBLICATION_ERROR_CODES, publicationGuidance,
} from "@/features/talentAdmin/publicationErrors";
import {
  withdrawalConsequence, fallbackCoverAfter, remainingPublicAfter,
  NO_AUTOMATIC_REPUBLISH_NOTE,
} from "@/features/talentAdmin/publicationHealth";
import TalentRecord from "@/pages/TalentRecord";

/**
 * Publication eligibility as the frontend must present it.
 *
 * Two things carry the weight here. The first is that eligibility is the
 * SERVER'S verdict and is never re-derived locally — a locally-guessed answer
 * would disagree with the API that actually refuses the action, and the operator
 * would be looking at a green badge and a 422. The second is that the warnings
 * before a media change must state the real, locked consequence: another
 * photograph becomes the cover, or the talent comes down.
 */

const ROOT = join(__dirname, "../..");
const read = (p: string) => readFileSync(join(ROOT, p), "utf8");

/** Source with comments stripped, so a test cannot pass by matching our own prose. */
const code = (p: string) =>
  read(p)
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");

let permissions: string[] = [];

vi.mock("@/auth/PrincipalContext", () => ({
  usePrincipal: () => ({
    principal: { isAuthenticated: true, permissions, roles: ["superadmin"], isLoading: false },
    hasPermission: (p: string) => permissions.includes(p),
    isLoading: false,
  }),
}));

function wrap(ui: React.ReactElement) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={["/admin/talent/tp-1"]}>
        <Routes>
          <Route path="/admin/talent/:id" element={ui} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

const record = (over = {}) => ({
  talentProfileId: "tp-1", userId: "u-1", displayName: "Aurelia", slug: "aurelia",
  legalFirstName: null, legalSurname: null, headline: null, shortBiography: null,
  fullBiography: null, dateOfBirth: null, isAgePublic: false, cityId: null,
  cityName: "Cape Town", regionId: null, email: "a@x.test", cellphoneNumber: null,
  whatsAppNumber: null, instagramUrl: null, additionalSocialUrl: null,
  availabilityStatus: "Available", travelAvailable: false, eventAvailable: false,
  profileStatus: "Approved", isPublic: true, isFeatured: false, isVerified: true,
  publishedAtUtc: "2026-02-01T00:00:00Z", pausedAtUtc: null, suspensionReason: null,
  accountStatus: "Active", emailConfirmed: true, hasPassword: true,
  hasActiveLogin: true, lastLoginAtUtc: null, activeSessionCount: 0, invitation: null,
  categoryIds: [], rates: [], upcomingAppointmentCount: 0, conversationCount: 0,
  createdAtUtc: "2026-01-01T00:00:00Z",
  isPublicationEligible: true, publicationEligibilityBlockers: [],
  approvedPublicMediaCount: 3, hasValidPublicCover: true,
  suggestedFallbackCoverMediaId: null, hasPublicationIssue: false,
  ...over,
});

const photo = (over = {}) => ({
  id: "m-1", talentProfileId: "tp-1", mediaType: "Image", caption: null, sortOrder: 0,
  isCover: false, visibility: "Public", moderationStatus: "Approved",
  originalFileName: "a.jpg", mimeType: "image/jpeg", sizeBytes: 1, width: 800,
  height: 1200, rejectionReason: null, createdAtUtc: "2026-01-01T00:00:00Z",
  readUrl: "https://cdn.test/a.jpg", ...over,
});

// ---- the request the roster filter sends ---------------------------------------

describe("publication-issue filter", () => {
  let calls: string[] = [];

  beforeEach(() => {
    calls = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        calls.push(String(url));
        return new Response(JSON.stringify({ items: [], totalCount: 0, page: 1, pageSize: 25 }), {
          status: 200, headers: { "content-type": "application/json" },
        });
      })
    );
  });
  afterEach(() => vi.unstubAllGlobals());

  it("sends hasPublicationIssue with the exact name the backend binds", async () => {
    await talentAdmin.searchTalent({ hasPublicationIssue: true });
    const query = new URL(calls[0], "https://x.test").searchParams;
    expect(query.get("hasPublicationIssue")).toBe("true");
  });

  it("can ask for the healthy records too, not only the broken ones", async () => {
    await talentAdmin.searchTalent({ hasPublicationIssue: false });
    expect(new URL(calls[0], "https://x.test").searchParams.get("hasPublicationIssue")).toBe("false");
  });

  it("omits the filter when it is not asked for", async () => {
    await talentAdmin.searchTalent({ query: "aurelia" });
    expect(new URL(calls[0], "https://x.test").searchParams.has("hasPublicationIssue")).toBe(false);
  });

  it("offers the filter in the roster UI", () => {
    const roster = read("src/pages/TalentRoster.jsx");
    expect(roster).toContain("hasPublicationIssue");
    expect(roster).toContain('label="Publication issue"');
  });

  it("shows the roster badge from the server field, not a local calculation", () => {
    const roster = code("src/pages/TalentRoster.jsx");
    expect(roster).toContain("talent.hasPublicationIssue");
    // The roster has approvedPublicMediaCount to hand; deciding from it here would
    // disagree with the server the moment any other rule failed.
    expect(roster).not.toMatch(/approvedPublicMediaCount\s*===?\s*0\s*&&\s*talent\.isPublic/);
  });
});

// ---- the record shows the server's verdict --------------------------------------

describe("talent record — publication health", () => {
  beforeEach(() => {
    permissions = ["Talent.View", "Talent.Manage", "Talent.ApproveProfiles", "Media.Moderate"];
  });
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  const showRecord = (over = {}) => {
    vi.spyOn(talentAdmin, "getTalentRecord").mockResolvedValue(record(over) as never);
    vi.spyOn(talentAdmin, "listTalentMedia").mockResolvedValue([] as never);
    return wrap(<TalentRecord />);
  };

  it("lists the exact blockers the server returned", async () => {
    showRecord({
      isPublic: false, isPublicationEligible: false, hasPublicationIssue: false,
      approvedPublicMediaCount: 0, hasValidPublicCover: false,
      publicationEligibilityBlockers: [
        "publication.no_public_photograph",
        "publication.cover_not_public",
      ],
    });

    await waitFor(() =>
      expect(screen.getAllByText(/no approved, public photograph/i).length).toBeGreaterThan(0)
    );
    expect(screen.getAllByText(/cover is not an approved, public photograph/i).length)
      .toBeGreaterThan(0);
  });

  it("renders an unrecognised blocker code verbatim rather than swallowing it", () => {
    // A build that meets a code it does not know must still SHOW it. Hiding it
    // would leave the operator with a refusal and no reason at all.
    expect(talentAdmin.describePublicationBlocker("publication.some_future_rule"))
      .toBe("publication.some_future_rule");
  });

  it("raises the alarm when a live profile no longer meets the rules", async () => {
    showRecord({
      isPublic: true, isFeatured: true, isPublicationEligible: false,
      hasPublicationIssue: true, approvedPublicMediaCount: 0, hasValidPublicCover: false,
      publicationEligibilityBlockers: ["publication.no_public_photograph"],
    });

    await waitFor(() =>
      expect(screen.getAllByText(/publication issue/i).length).toBeGreaterThan(0)
    );
    expect(screen.getAllByRole("alert").length).toBeGreaterThan(0);
  });

  it("says nothing alarming about a healthy profile", async () => {
    showRecord();
    await waitFor(() =>
      expect(screen.getAllByText(/meets publication requirements/i).length).toBeGreaterThan(0)
    );
    expect(screen.queryByText(/publication issue/i)).toBeNull();
  });

  it("shows the approved public count and cover state from the server", async () => {
    showRecord({ approvedPublicMediaCount: 4, hasValidPublicCover: false });
    await waitFor(() => expect(screen.getAllByText("4").length).toBeGreaterThan(0));
    expect(screen.getAllByText(/not set/i).length).toBeGreaterThan(0);
  });

  it("refuses to offer Publish when the server says it would be refused", async () => {
    showRecord({
      isPublic: false, isPublicationEligible: false, hasPublicationIssue: false,
      approvedPublicMediaCount: 0, hasValidPublicCover: false,
      publicationEligibilityBlockers: ["publication.no_public_photograph"],
    });

    const publish = await screen.findByRole("button", { name: /publish/i });
    expect(publish).toBeDisabled();
  });

  it("offers Publish when the server says the profile is eligible", async () => {
    showRecord({ isPublic: false, publishedAtUtc: null });
    const publish = await screen.findByRole("button", { name: /^publish$/i });
    expect(publish).not.toBeDisabled();
  });

  it("does not offer Feature on a published profile that fails the rules", async () => {
    showRecord({
      isPublic: true, isFeatured: false, isPublicationEligible: false,
      hasPublicationIssue: true, approvedPublicMediaCount: 0,
      publicationEligibilityBlockers: ["publication.no_public_photograph"],
    });

    const feature = await screen.findByRole("button", { name: /^feature$/i });
    expect(feature).toBeDisabled();
  });

  it("keeps publication and featured as two separate controls", async () => {
    showRecord({ isPublic: true, isFeatured: false });

    await waitFor(() => expect(screen.getAllByText(/featured placement/i).length).toBe(1));
    // Two states, two permissions, two buttons. One toggle would make "feature"
    // imply publishing, which the backend refuses anyway.
    expect(screen.getByRole("button", { name: /unpublish/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /^feature$/i })).toBeTruthy();
  });

  it("never derives eligibility locally in the record or the panel", () => {
    for (const file of [
      "src/pages/TalentRecord.jsx",
      "src/features/talentAdmin/PublicationHealthPanel.jsx",
    ]) {
      const source = code(file);

      // Read, never computed. A local verdict would disagree with the API that
      // actually refuses the action. (Comparing the COUNT for a colour is fine —
      // that is presentation, not a decision.)
      expect(source).toContain("talent.isPublicationEligible");
      expect(source).not.toMatch(/(const|let)\s+\w*[Ee]ligible\w*\s*=\s*[^;]*(approvedPublicMediaCount|hasValidPublicCover)/);
      expect(source).not.toMatch(/hasPublicationIssue\s*=\s*[^=]/);
    }
  });
});

// ---- the consequence stated before a media change --------------------------------

describe("media change consequences", () => {
  const cover = photo({ id: "m-1", isCover: true, sortOrder: 0 });
  const second = photo({ id: "m-2", sortOrder: 1 });
  const third = photo({ id: "m-3", sortOrder: 2 });

  it("names the replacement cover when another public photograph exists", () => {
    const text = withdrawalConsequence({
      items: [cover, second, third], item: cover, isPublic: true, isFeatured: true,
    });

    expect(text).toMatch(/becomes the cover automatically/i);
    expect(text).toMatch(/stays published and featured/i);
    expect(text).not.toMatch(/unpublish/i);
  });

  it("warns of automatic unpublish and unfeature when it is the last public photograph", () => {
    const text = withdrawalConsequence({
      items: [cover], item: cover, isPublic: true, isFeatured: true,
    });

    expect(text).toMatch(/LAST approved, public photograph/);
    expect(text).toMatch(/automatically\s+unpublish/i);
    expect(text).toMatch(/remove it from featured placement/i);
    // Withdrawal, not deletion — the difference matters to the person involved.
    expect(text).toMatch(/nothing is deleted or cancelled/i);
  });

  it("does not threaten an unpublish when the profile is already withdrawn", () => {
    const text = withdrawalConsequence({
      items: [cover], item: cover, isPublic: false, isFeatured: false,
    });

    expect(text).toMatch(/already unpublished/i);
    expect(text).not.toMatch(/will automatically/i);
  });

  it("says nothing about a photograph that was never in the public set", () => {
    const hidden = photo({ id: "m-9", visibility: "Private" });
    expect(withdrawalConsequence({
      items: [cover, hidden], item: hidden, isPublic: true, isFeatured: false,
    })).toBeNull();
  });

  it("picks the fallback by gallery order, as the backend does", () => {
    const late = photo({ id: "m-late", sortOrder: 9 });
    const early = photo({ id: "m-early", sortOrder: 1 });

    expect(fallbackCoverAfter([cover, late, early], cover)?.id).toBe("m-early");
    expect(remainingPublicAfter([cover, late, early], cover)).toBe(2);
  });

  it("counts only approved AND public photographs", () => {
    const pending = photo({ id: "m-p", moderationStatus: "PendingReview" });
    const vip = photo({ id: "m-v", visibility: "VipOnly" });
    const managementOnly = photo({ id: "m-m", visibility: "ManagementOnly" });

    expect(remainingPublicAfter([cover, pending, vip, managementOnly], cover)).toBe(0);
  });

  it("states plainly that restoring never republishes", () => {
    expect(NO_AUTOMATIC_REPUBLISH_NOTE).toMatch(/never republishes or re-features/i);
    expect(code("src/features/talentAdmin/MediaManager.jsx"))
      .toContain("NO_AUTOMATIC_REPUBLISH_NOTE");
  });

  it("no longer claims the backend leaves the profile with no cover", () => {
    // The old wording described the behaviour this work replaced. A UI that
    // explains the previous version of the system is worse than one that says
    // nothing.
    const manager = read("src/features/talentAdmin/MediaManager.jsx");
    expect(manager).not.toContain("the backend does not pick a replacement");
    expect(manager).not.toContain("with no cover image until you set another");
  });

  it("confirms before a change that would take the talent down", () => {
    const manager = code("src/features/talentAdmin/MediaManager.jsx");
    expect(manager).toContain("changeVisibility");
    expect(manager).toContain("This will unpublish the talent");
  });
});

// ---- media mutations refresh everything the reconciliation touched ----------------

describe("cache invalidation after a media change", () => {
  it("invalidates media, the record, the roster, discovery and the dashboard", () => {
    const hooks = code("src/features/talentAdmin/hooks.ts");
    const invalidation = hooks.slice(
      hooks.indexOf("function useMediaInvalidation"),
      hooks.indexOf("export type MediaAction")
    );

    // A media change is no longer only a media change: the backend may have
    // unpublished the talent in the same transaction.
    expect(invalidation).toContain("talentAdmin.media");
    expect(invalidation).toContain("talentAdmin.record");
    expect(invalidation).toContain("talentAdmin.all()");
    expect(invalidation).toContain('["discovery"]');
    expect(invalidation).toContain('["talent"]');
    expect(invalidation).toContain('["admin", "dashboard"]');
  });
});

// ---- refusal codes ---------------------------------------------------------------

describe("publication refusal codes", () => {
  it("maps the new cover refusal to the media tab", () => {
    const guidance = publicationGuidance(PUBLICATION_ERROR_CODES.coverNotPublic);
    expect(guidance).not.toBeNull();
    expect(guidance!.action).toBe("Media");
  });

  it("still carries the three established codes unchanged", () => {
    expect(PUBLICATION_ERROR_CODES.notPublishable).toBe("talent_profile.not_publishable");
    expect(PUBLICATION_ERROR_CODES.noPublicPhotograph).toBe("talent_profile.no_public_photograph");
    expect(PUBLICATION_ERROR_CODES.cannotFeature).toBe("talent_lifecycle.cannot_feature");
  });

  it("returns null for a code it does not know rather than inventing a cause", () => {
    expect(publicationGuidance("talent_profile.invented_code")).toBeNull();
  });

  it("describes every blocker the backend can emit", () => {
    // The complete catalogue, read from the backend's PublicationBlockers.
    for (const emitted of [
      "publication.profile_not_approved",
      "publication.talent_archived",
      "publication.talent_suspended",
      "publication.talent_paused",
      "publication.account_suspended",
      "publication.no_public_photograph",
      "publication.cover_not_public",
      "publication.display_name_missing",
      "publication.not_adult",
    ]) {
      expect(talentAdmin.PUBLICATION_BLOCKERS[emitted], emitted).toBeTruthy();
    }
  });
});

// ---- the navigation must not regress ---------------------------------------------

describe("Talent Applications navigation", () => {
  it("survives this change, in both workspaces, still under People", async () => {
    const { ROUTES, navForGroup } = await import("@/app/routeRegistry");

    for (const group of ["management", "admin"] as const) {
      const item = navForGroup(group, () => true).find((n) => n.label === "Talent Applications");
      expect(item, `${group} lost Talent Applications`).toBeTruthy();
      expect(item?.section).toBe("People");
      expect(item?.to).toBe("/admin/talent-applications");
    }

    expect(ROUTES.some((r) => r.path === "/admin/talent-applications")).toBe(true);
    expect(ROUTES.some((r) => r.path === "/admin/talent-applications/:id")).toBe(true);
  });
});
