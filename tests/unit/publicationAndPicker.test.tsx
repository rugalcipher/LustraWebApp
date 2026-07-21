import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import React from "react";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ROUTES, navForGroup, requiredPermissionsFor } from "@/app/routeRegistry";
import * as appointmentService from "@/services/appointmentService";
import * as talentAdmin from "@/services/talentAdminService";
import { ApiError } from "@/api/problemDetails";
import { notificationTarget, notificationIcon, safeInternalPath } from "@/services/notificationService";
import {
  PUBLICATION_ERROR_CODES, publicationGuidance,
} from "@/features/talentAdmin/publicationErrors";
import TalentRecord from "@/pages/TalentRecord";
import ManagementAppointmentDetail from "@/pages/ManagementAppointmentDetail";

/**
 * Booking-scoped picker, publication/featured controls, and the compatibility of
 * the notification renderer with the Phase 5 producers.
 *
 * The distinctions with teeth here: choosing who to schedule must not require
 * read access to the talent record; publication and featured placement are two
 * states with two permissions and must never collapse into one toggle; and the
 * refusal codes are the small real set, not the larger speculative one.
 */

const ROOT = join(__dirname, "../..");
const read = (p: string) => readFileSync(join(ROOT, p), "utf8");
const paths = ROUTES.map((r) => r.path);

let permissions: string[] = [];

vi.mock("@/auth/PrincipalContext", () => ({
  usePrincipal: () => ({
    principal: { isAuthenticated: true, permissions, roles: ["superadmin"], isLoading: false },
    hasPermission: (p: string) => permissions.includes(p),
    isLoading: false,
  }),
}));

function wrap(ui: React.ReactElement, route = "/admin/talent/tp-1") {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[route]}>
        <Routes>
          <Route path="/admin/talent/:id" element={ui} />
          <Route path="/admin/appointments/:id" element={ui} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

const record = (over = {}) => ({
  talentProfileId: "tp-1", userId: "u-1", displayName: "Aurelia", slug: "aurelia",
  legalFirstName: "Aurelia", legalSurname: "Vos", headline: null, shortBiography: null,
  fullBiography: null, dateOfBirth: null, isAgePublic: false, cityId: null,
  cityName: "Cape Town", regionId: null, email: "a@x.test", cellphoneNumber: null,
  whatsAppNumber: null, instagramUrl: null, additionalSocialUrl: null,
  availabilityStatus: "Available", travelAvailable: false, eventAvailable: false,
  profileStatus: "Approved", isPublic: false, isFeatured: false, isVerified: true,
  publishedAtUtc: null, pausedAtUtc: null, suspensionReason: null,
  accountStatus: "PendingActivation", emailConfirmed: false, hasPassword: false,
  hasActiveLogin: false, lastLoginAtUtc: null, activeSessionCount: 0, invitation: null,
  categoryIds: [], rates: [], upcomingAppointmentCount: 0, conversationCount: 0,
  createdAtUtc: "2026-01-01T00:00:00Z", ...over,
});

const option = (over = {}) => ({
  talentProfileId: "tp-2", displayName: "Celeste",
  coverImage: { url: "https://cdn.test/c.jpg", srcSet: null, width: 800, height: 1200 },
  cityName: "Johannesburg", profileStatus: "Approved", accountStatus: "Active",
  isArchived: false, isSuspended: false, isPublished: true,
  canReceiveNewBooking: true, unavailableReason: null, ...over,
});

// ---- booking-scoped picker -----------------------------------------------------

describe("booking talent picker", () => {
  let calls: string[] = [];

  beforeEach(() => {
    permissions = ["Bookings.View", "Bookings.Manage"];
    calls = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        calls.push(String(url));
        return new Response(JSON.stringify({ items: [], totalCount: 0 }), {
          status: 200, headers: { "content-type": "application/json" },
        });
      })
    );
  });
  afterEach(() => vi.unstubAllGlobals());

  const path = () => new URL(calls[calls.length - 1], "https://x.test").pathname;

  it("searches the booking-scoped endpoint", async () => {
    await appointmentService.searchBookingTalentOptions({ query: "cel" });
    expect(path().endsWith("/management/bookings/talent-options")).toBe(true);
  });

  it("resolves one option by id for an already-assigned talent", async () => {
    await appointmentService.getBookingTalentOption("tp-2");
    expect(path().endsWith("/management/bookings/talent-options/tp-2")).toBe(true);
  });

  it("never calls the talent administration roster", async () => {
    await appointmentService.searchBookingTalentOptions({ query: "cel" });
    for (const url of calls) {
      expect(new URL(url, "https://x.test").pathname).not.toMatch(/\/management\/talents(\/|$)/);
    }
  });

  it("sends the exact query names the backend binds", async () => {
    await appointmentService.searchBookingTalentOptions({
      query: "cel", includeUnavailable: true, page: 2, pageSize: 10,
    });
    const q = new URL(calls[0], "https://x.test").searchParams;
    expect(q.get("query")).toBe("cel");
    expect(q.get("includeUnavailable")).toBe("true");
    expect(q.get("page")).toBe("2");
    expect(q.get("pageSize")).toBe("10");
  });

  it("never duplicates the /api/v1 prefix", async () => {
    await appointmentService.searchBookingTalentOptions();
    expect(path()).not.toContain("/api/v1/api/v1");
  });

  it("is gated on Bookings.Manage, not Talent.View", () => {
    const hooks = read("src/features/appointments/hooks.ts");
    expect(hooks).toContain('usePermission("Bookings.Manage")');
    const picker = read("src/features/talentAdmin/TalentPicker.jsx");
    expect(picker).toContain("useBookingTalentOptions");
    // The permission is NAMED in prose to record why the picker does not need it;
    // what matters is that it neither imports the roster hook nor gates on it.
    expect(picker).not.toContain("useTalentRoster");
    expect(picker).not.toContain("useTalentAdminPermissions");
    expect(picker).not.toMatch(/^import .*talentAdmin\/hooks/m);
  });

  it("no longer shows the obsolete Talent.View warning", () => {
    const picker = read("src/features/talentAdmin/TalentPicker.jsx");
    expect(picker).not.toContain("permission to view talent");
  });

  it("exposes no legal or private field in the option DTO", () => {
    const service = read("src/services/appointmentService.ts");
    const dto = service.slice(
      service.indexOf("interface BookingTalentOptionDto"),
      service.indexOf("BookingTalentOptionSearch")
    );
    for (const field of ["legalFirstName", "legalSurname", "email", "cellphone", "whatsApp", "invitation"]) {
      expect(dto).not.toContain(field);
    }
  });
});

describe("booking picker selection rules", () => {
  beforeEach(() => {
    permissions = ["Bookings.View", "Bookings.Manage", "Bookings.Cancel"];
    vi.spyOn(appointmentService, "getAppointment").mockResolvedValue({
      id: "ap-1", bookingReference: "LB-1", inquiryId: "i", acceptedProposalId: null,
      clientUserId: "c", talentProfileId: "tp-1", talentDisplayName: "Aurelia",
      engagementCategory: "Dinner", status: "Confirmed", settlementStatus: "Pending",
      confirmedDate: null, startTime: null, endTime: null, durationMinutes: null,
      timeZone: "UTC", cityId: null, venueTypeId: null, venueName: null,
      generalLocation: null, privateLocationDetails: null, agreedAmount: null,
      additionalCosts: null, currencyCode: "ZAR", clientVisibleNotes: null,
      talentInstructions: null, assignedManagementUserId: null,
      createdAtUtc: "2026-01-01T00:00:00Z", conversationId: null,
      isVisibleToClient: true, history: [], internalNotes: [],
    } as never);
    vi.spyOn(appointmentService, "getAppointmentVisibilityHistory").mockResolvedValue([] as never);
  });
  afterEach(() => vi.restoreAllMocks());

  const openReassign = async (options: unknown[]) => {
    vi.spyOn(appointmentService, "searchBookingTalentOptions").mockResolvedValue({
      items: options, totalCount: options.length, page: 1, pageSize: 10,
    } as never);
    const user = userEvent.setup();
    wrap(<ManagementAppointmentDetail />, "/admin/appointments/ap-1");
    await screen.findByText("Aurelia");
    await user.click(screen.getByRole("button", { name: /Reassign talent/i }));
    await screen.findByRole("dialog", { name: "Reassign talent" });
    await user.type(screen.getByLabelText(/^New talent/i), "cel");
    return user;
  };

  it("selects an assignable talent and submits only the id", async () => {
    const spy = vi
      .spyOn(appointmentService, "reassignAppointmentTalent")
      .mockResolvedValue(undefined as never);
    const user = await openReassign([option()]);
    await user.click(await screen.findByRole("option", { name: /Celeste/ }));
    await user.type(screen.getByLabelText(/^Reason/i), "Original unavailable");
    await user.click(
      within(await screen.findByRole("dialog", { name: "Reassign talent" }))
        .getByRole("button", { name: /^Reassign$/i })
    );
    await waitFor(() =>
      expect(spy).toHaveBeenCalledWith("ap-1", "tp-2", "Original unavailable")
    );
  });

  it("refuses a talent the server marked unassignable, and shows its reason", async () => {
    const spy = vi.spyOn(appointmentService, "reassignAppointmentTalent");
    const user = await openReassign([
      option({ canReceiveNewBooking: false, isArchived: true, unavailableReason: "Archived" }),
    ]);
    const row = await screen.findByRole("option", { name: /Celeste/ });
    expect(row).toBeDisabled();
    expect(screen.getByText("Archived")).toBeInTheDocument();
    await user.click(row);
    expect(spy).not.toHaveBeenCalled();
  });

  it("handles a talent with no cover image", async () => {
    await openReassign([option({ coverImage: null })]);
    expect(await screen.findByRole("option", { name: /Celeste/ })).toBeInTheDocument();
  });

  it("leaves no raw talent GUID input in deployed source", () => {
    const files: string[] = [];
    const walk = (dir: string) => {
      for (const entry of readdirSync(dir)) {
        const full = join(dir, entry);
        if (statSync(full).isDirectory()) walk(full);
        else if (/\.(jsx?|tsx?)$/.test(entry)) files.push(full);
      }
    };
    walk(join(ROOT, "src"));
    const offenders = files.filter((f) =>
      /New talent profile id|(talent|profile)\s*id\s*<span/i.test(readFileSync(f, "utf8"))
    );
    expect(offenders.map((f) => relative(ROOT, f))).toEqual([]);
  });
});

// ---- publication and featured ----------------------------------------------------

describe("publication error codes", () => {
  it("uses only codes that exist in the backend catalogue at cc6c34c", () => {
    // The earlier brief speculated about .archived, .suspended,
    // .public_details_incomplete and .invalid_cover. None were implemented, and a
    // branch that can never fire is worse than none — it looks handled.
    expect(Object.values(PUBLICATION_ERROR_CODES)).toEqual([
      "talent_profile.not_publishable",
      "talent_profile.no_public_photograph",
      "talent_profile.not_found",
      "talent_lifecycle.cannot_feature",
      "talent_lifecycle.not_found",
    ]);
  });

  it("has no speculative code anywhere", () => {
    const source = read("src/features/talentAdmin/publicationErrors.js");
    for (const invented of [
      '"talent_profile.archived"', '"talent_profile.suspended"',
      '"talent_profile.public_details_incomplete"', '"talent_profile.invalid_cover"',
      '"talent_profile.not_approved"',
    ]) {
      expect(source).not.toContain(invented);
    }
  });

  it("sends a media failure to the Media tab", () => {
    const guidance = publicationGuidance(PUBLICATION_ERROR_CODES.noPublicPhotograph);
    expect(guidance?.action).toBe("Media");
    expect(guidance?.body).toMatch(/approved and set to Public/i);
  });

  it("sends an approval failure to the Public profile tab", () => {
    expect(publicationGuidance(PUBLICATION_ERROR_CODES.notPublishable)?.action).toBe(
      "Public profile"
    );
  });

  it("explains that featuring never publishes", () => {
    const guidance = publicationGuidance(PUBLICATION_ERROR_CODES.cannotFeature);
    expect(guidance?.body).toMatch(/never publishes/i);
  });

  it("returns null for an unrecognised code rather than guessing", () => {
    expect(publicationGuidance("something.new")).toBeNull();
    expect(publicationGuidance(undefined)).toBeNull();
  });
});

describe("publication and featured controls", () => {
  beforeEach(() => {
    permissions = [
      "Talent.View", "Talent.Manage", "Talent.Create",
      "Talent.ModerateMedia", "Talent.ApproveProfiles",
    ];
  });
  afterEach(() => vi.restoreAllMocks());

  const show = (over = {}) =>
    vi.spyOn(talentAdmin, "getTalentRecord").mockResolvedValue(record(over) as never);

  it("publishes through the exact route", async () => {
    show();
    const spy = vi.spyOn(talentAdmin, "publishTalent").mockResolvedValue(undefined as never);
    const user = userEvent.setup();
    wrap(<TalentRecord />);
    await screen.findByRole("heading", { name: "Aurelia" });
    await user.click(screen.getByRole("button", { name: /^Publish$/i }));
    await user.click(
      within(await screen.findByRole("dialog", { name: "Publish profile" }))
        .getByRole("button", { name: /^Publish$/i })
    );
    await waitFor(() => expect(spy).toHaveBeenCalledWith("tp-1"));
  });

  it("unpublishes with the reason the backend expects", async () => {
    show({ isPublic: true });
    const spy = vi.spyOn(talentAdmin, "unpublishTalent").mockResolvedValue(undefined as never);
    const user = userEvent.setup();
    wrap(<TalentRecord />);
    await screen.findByRole("heading", { name: "Aurelia" });
    await user.click(screen.getByRole("button", { name: /^Unpublish$/i }));
    await user.type(screen.getByLabelText(/Internal reason/i), "Withdrawn pending review");
    await user.click(
      within(await screen.findByRole("dialog", { name: "Unpublish profile" }))
        .getByRole("button", { name: /^Unpublish$/i })
    );
    await waitFor(() =>
      expect(spy).toHaveBeenCalledWith("tp-1", "Withdrawn pending review")
    );
  });

  it("maps a publish refusal onto guidance with a link to Media", async () => {
    show();
    vi.spyOn(talentAdmin, "publishTalent").mockRejectedValue(
      ApiError.fromProblem(422, { errorCode: "talent_profile.no_public_photograph" })
    );
    const user = userEvent.setup();
    wrap(<TalentRecord />);
    await screen.findByRole("heading", { name: "Aurelia" });
    await user.click(screen.getByRole("button", { name: /^Publish$/i }));
    await user.click(
      within(await screen.findByRole("dialog", { name: "Publish profile" }))
        .getByRole("button", { name: /^Publish$/i })
    );
    expect(await screen.findByText("No approved public photograph")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Open Media/i })).toBeInTheDocument();
  });

  it("does not treat PendingActivation as a publication blocker", async () => {
    // The record fixture is PendingActivation; Publish must still be offered.
    show({ accountStatus: "PendingActivation" });
    const user = userEvent.setup();
    wrap(<TalentRecord />);
    await screen.findByRole("heading", { name: "Aurelia" });
    expect(screen.getByRole("button", { name: /^Publish$/i })).toBeEnabled();
    expect(user).toBeTruthy();
  });

  it("features through the exact route and never calls publish", async () => {
    show({ isPublic: true });
    const feature = vi.spyOn(talentAdmin, "featureTalent").mockResolvedValue(undefined as never);
    const publish = vi.spyOn(talentAdmin, "publishTalent");
    const user = userEvent.setup();
    wrap(<TalentRecord />);
    await screen.findByRole("heading", { name: "Aurelia" });
    await user.click(screen.getByRole("button", { name: /^Feature$/i }));
    await user.click(
      within(await screen.findByRole("dialog", { name: "Feature profile" }))
        .getByRole("button", { name: /^Feature$/i })
    );
    await waitFor(() => expect(feature).toHaveBeenCalledWith("tp-1"));
    expect(publish).not.toHaveBeenCalled();
  });

  it("unfeatures without unpublishing", async () => {
    show({ isPublic: true, isFeatured: true });
    const unfeature = vi.spyOn(talentAdmin, "unfeatureTalent").mockResolvedValue(undefined as never);
    const unpublish = vi.spyOn(talentAdmin, "unpublishTalent");
    const user = userEvent.setup();
    wrap(<TalentRecord />);
    await screen.findByRole("heading", { name: "Aurelia" });
    await user.click(screen.getByRole("button", { name: /Remove from featured/i }));
    await user.click(
      within(await screen.findByRole("dialog", { name: "Remove featured placement" }))
        .getByRole("button", { name: /Remove from featured/i })
    );
    await waitFor(() => expect(unfeature).toHaveBeenCalledWith("tp-1"));
    expect(unpublish).not.toHaveBeenCalled();
  });

  it("will not offer Feature for an unpublished profile", async () => {
    show({ isPublic: false });
    wrap(<TalentRecord />);
    await screen.findByRole("heading", { name: "Aurelia" });
    expect(screen.getByRole("button", { name: /^Feature$/i })).toBeDisabled();
  });

  it("keeps publication and featured as separate badges and controls", async () => {
    show({ isPublic: true, isFeatured: true });
    wrap(<TalentRecord />);
    await screen.findByRole("heading", { name: "Aurelia" });
    // The badge and the panel both say so; both must, and neither may merge them.
    expect(screen.getAllByText("Published").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Featured").length).toBeGreaterThan(0);
    // Two controls, never one toggle.
    expect(screen.getByRole("button", { name: /^Unpublish$/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Remove from featured/i })).toBeInTheDocument();
  });

  it("hides publication controls without Talent.ApproveProfiles", async () => {
    permissions = ["Talent.View", "Talent.Manage"];
    show();
    wrap(<TalentRecord />);
    await screen.findByRole("heading", { name: "Aurelia" });
    expect(screen.queryByRole("button", { name: /^Publish$/i })).toBeNull();
    expect(screen.getByText(/needs the profile-approval permission/i)).toBeInTheDocument();
  });
});

// ---- cover consequence -------------------------------------------------------------

describe("cover consequence copy matches the backend", () => {
  it("says the cover is CLEARED, with no replacement chosen", () => {
    // ClearCoverIfNeededAsync nulls CoverMediaId and does nothing else: no
    // fallback, no unpublish, no unfeature, no refusal.
    const source = read("src/features/talentAdmin/MediaManager.jsx");
    expect(source).toContain("CLEARS the cover");
    expect(source).toContain("does not pick a replacement");
  });

  it("does not claim archiving the cover unpublishes or unfeatures", () => {
    const source = read("src/features/talentAdmin/MediaManager.jsx");
    expect(source).toContain("stays published and featured");
    expect(source).not.toMatch(/archiv\w+ .{0,40}will unpublish/i);
  });

  it("manufactures no client-side publication transition", () => {
    const source = read("src/features/talentAdmin/MediaManager.jsx");
    expect(source).not.toContain("publishTalent");
    expect(source).not.toContain("unpublishTalent");
    expect(source).not.toContain("unfeatureTalent");
  });
});

// ---- notification compatibility ------------------------------------------------------

describe("notification compatibility with the Phase 5 producers", () => {
  it("renders a safe generic fallback for an unknown future type", () => {
    expect(notificationIcon("SomethingAddedNextYear")).toBe("Bell");
  });

  it.each(["System", "Marketing", "InApp", "SafetyUpdate", "ReviewReceived"])(
    "handles the %s type",
    (type) => {
      expect(notificationIcon(type)).toBeTruthy();
    }
  );

  it("routes an unknown type nowhere rather than to a broken address", () => {
    expect(
      notificationTarget({ type: "Unknown", relatedEntityId: "x", linkUrl: null } as never)
    ).toBeNull();
  });

  it("sends booking notifications to the talent portal, not a client route", () => {
    expect(
      notificationTarget({ type: "BookingConfirmed", relatedEntityId: "b-1", linkUrl: null } as never)
    ).toBe("/talent-bookings/b-1");
  });

  it("resolves nothing for the withdrawn client lifecycle", () => {
    for (const type of ["ProposalReceived", "ProposalExpired", "InquiryUpdate"]) {
      expect(
        notificationTarget({ type, relatedEntityId: "x", linkUrl: null } as never)
      ).toBeNull();
    }
  });

  it("never follows an off-origin link", () => {
    expect(safeInternalPath("//evil.test/x")).toBeNull();
    expect(safeInternalPath("https://evil.test")).toBeNull();
    expect(safeInternalPath("/app/messages/1")).toBe("/app/messages/1");
  });

  it("resolves every target it returns to a registered route", () => {
    const target = notificationTarget({
      type: "MessageReceived", relatedEntityId: "c-1", linkUrl: null,
    } as never);
    expect(target).toBe("/app/messages/c-1");
    expect(paths).toContain("/app/messages/:id");
  });
});

// ---- navigation regression lock --------------------------------------------------------

describe("Talent Applications regression lock", () => {
  it("REMAINS a real destination under PEOPLE for both workspaces", () => {
    // Locked deliberately: this workflow has been re-verified every phase and
    // must not be dropped by a later navigation change.
    for (const group of ["management", "admin"] as const) {
      const item = navForGroup(group, () => true).find((n) => n.label === "Talent Applications");
      expect(item, `${group} lost Talent Applications`).toBeTruthy();
      expect(item?.section).toBe("People");
      expect(item?.to).toBe("/admin/talent-applications");
    }
  });

  it("keeps queue and detail routes behind the view permission", () => {
    expect(paths).toContain("/admin/talent-applications");
    expect(paths).toContain("/admin/talent-applications/:id");
    for (const path of ["/admin/talent-applications", "/admin/talent-applications/:id"]) {
      expect(requiredPermissionsFor(path)).toContain("TalentApplications.View");
    }
  });

  it("keeps every review action in the page", () => {
    const source = read("src/pages/TalentApplicationReview.jsx");
    for (const action of [
      "useMarkUnderReview", "useRequestChanges", "useRejectApplication",
      "useApproveApplication", "useAddApplicationNote",
    ]) {
      expect(source).toContain(action);
    }
    // Approve and publish stay distinct.
    expect(source).toContain("approveAndPublish");
    expect(source).toContain("publishImmediately");
  });

  it("keeps the private photo viewer and internal notes", () => {
    const source = read("src/pages/TalentApplicationReview.jsx");
    expect(source).toContain("PrivatePhoto");
    expect(source).toContain("never shown to the applicant");
  });

  it("keeps the talent roster present too", () => {
    expect(navForGroup("admin", () => true).map((n) => n.label)).toContain("Talent");
  });

  it("introduces no dead navigation", () => {
    for (const group of ["client", "talent", "management", "admin"] as const) {
      for (const item of navForGroup(group, () => true)) {
        expect(paths, `${item.label} → ${item.to}`).toContain(item.to);
      }
    }
  });
});
