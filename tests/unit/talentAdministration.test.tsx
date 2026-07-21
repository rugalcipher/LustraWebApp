import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import React from "react";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ROUTES, navForGroup, requiredPermissionsFor } from "@/app/routeRegistry";
import * as talentAdmin from "@/services/talentAdminService";
import * as mediaAdmin from "@/services/mediaAdminService";
import * as adminService from "@/services/adminService";
import { ApiError } from "@/api/problemDetails";
import TalentRoster from "@/pages/TalentRoster";
import TalentCreate from "@/pages/TalentCreate";
import TalentRecord from "@/pages/TalentRecord";
import AdminUserDetail from "@/pages/AdminUserDetail";
import AdminRoles from "@/pages/AdminRoles";
import AdminStaffProvision from "@/pages/AdminStaffProvision";

/**
 * Talent, media and account administration.
 *
 * The through-line of this suite is that staff may write credentials but never
 * read them, and that the UI must not soften a refusal into an apparent success.
 * A screen that shows a password, or that reports "done" when the server said
 * `admin.last_superadmin`, is worse than no screen at all.
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

function wrap(ui: React.ReactElement, route = "/admin/talent") {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[route]}>
        <Routes>
          <Route path="/admin/talent" element={ui} />
          <Route path="/admin/talent/new" element={ui} />
          <Route path="/admin/talent/:id" element={ui} />
          <Route path="/admin/users/:id" element={ui} />
          <Route path="/admin/users/new" element={ui} />
          <Route path="/admin/roles" element={ui} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

const rosterRow = (over = {}) => ({
  talentProfileId: "tp-1",
  userId: "u-1",
  displayName: "Aurelia",
  slug: "aurelia",
  email: "aurelia@example.com",
  profileStatus: "Approved",
  accountStatus: "PendingActivation",
  isPublic: false,
  isFeatured: false,
  isVerified: false,
  cityName: "Cape Town",
  hasActiveLogin: false,
  hasPendingInvitation: true,
  approvedPublicMediaCount: 0,
  createdAtUtc: "2026-01-01T00:00:00Z",
  publishedAtUtc: null,
  ...over,
});

const record = (over = {}) => ({
  talentProfileId: "tp-1",
  userId: "u-1",
  displayName: "Aurelia",
  slug: "aurelia",
  legalFirstName: "Aurelia",
  legalSurname: "Vos",
  headline: "Fine dining companion",
  shortBiography: "Short bio.",
  fullBiography: "Full bio.",
  dateOfBirth: "1996-05-04",
  isAgePublic: false,
  cityId: null,
  cityName: "Cape Town",
  regionId: null,
  email: "aurelia@example.com",
  cellphoneNumber: "+27820000000",
  whatsAppNumber: null,
  instagramUrl: "https://instagram.com/aurelia",
  additionalSocialUrl: null,
  availabilityStatus: "Available",
  travelAvailable: true,
  eventAvailable: true,
  profileStatus: "Approved",
  isPublic: false,
  isFeatured: false,
  isVerified: true,
  publishedAtUtc: null,
  pausedAtUtc: null,
  suspensionReason: null,
  accountStatus: "PendingActivation",
  emailConfirmed: false,
  hasPassword: false,
  hasActiveLogin: false,
  lastLoginAtUtc: null,
  activeSessionCount: 0,
  invitation: null,
  categoryIds: [],
  rates: [],
  upcomingAppointmentCount: 0,
  conversationCount: 0,
  createdAtUtc: "2026-01-01T00:00:00Z",
  ...over,
});

const mediaItem = (over = {}) => ({
  id: "m-1",
  talentProfileId: "tp-1",
  mediaType: "Photo",
  caption: null,
  sortOrder: 0,
  isCover: false,
  visibility: "Public",
  moderationStatus: "Approved",
  originalFileName: "one.jpg",
  mimeType: "image/jpeg",
  sizeBytes: 1000,
  width: 800,
  height: 1200,
  rejectionReason: null,
  createdAtUtc: "2026-01-01T00:00:00Z",
  readUrl: "https://storage.test/signed?sig=abc",
  ...over,
});

// ---- navigation --------------------------------------------------------------

describe("PEOPLE navigation", () => {
  it("registers every mandated destination", () => {
    for (const path of [
      "/admin/talent-applications",
      "/admin/talent",
      "/admin/talent/new",
      "/admin/talent/:id",
      "/admin/users",
      "/admin/users/:id",
      "/admin/users/new",
      "/admin/roles",
      "/management-clients",
    ]) {
      expect(paths).toContain(path);
    }
  });

  it("KEEPS Talent Applications fully operational under PEOPLE", () => {
    // The locked rule. It must survive every later phase, and must not be
    // downgraded to a dashboard card.
    for (const group of ["management", "admin"] as const) {
      const item = navForGroup(group, () => true).find((n) => n.label === "Talent Applications");
      expect(item?.section).toBe("People");
      expect(item?.to).toBe("/admin/talent-applications");
    }
    expect(requiredPermissionsFor("/admin/talent-applications")).toContain(
      "TalentApplications.View"
    );
    expect(requiredPermissionsFor("/admin/talent-applications/:id")).toContain(
      "TalentApplications.View"
    );
  });

  it("groups the PEOPLE destinations together for an admin", () => {
    const people = navForGroup("admin", () => true).filter((n) => n.section === "People");
    expect(people.map((n) => n.label)).toEqual([
      "Talent Applications", "Talent", "All Users", "Roles & Permissions", "Clients",
    ]);
  });

  it("shows Talent only with Talent.View", () => {
    expect(navForGroup("admin", (p) => p === "Talent.View").map((n) => n.label)).toContain("Talent");
    expect(navForGroup("admin", () => false).map((n) => n.label)).not.toContain("Talent");
  });

  it("shows Roles & Permissions only with Roles.Manage", () => {
    const withIt = navForGroup("admin", (p) => p === "Roles.Manage");
    expect(withIt.map((n) => n.label)).toContain("Roles & Permissions");
    expect(navForGroup("admin", () => false).map((n) => n.label)).not.toContain(
      "Roles & Permissions"
    );
  });

  it("leaves no dead link in any workspace", () => {
    for (const group of ["client", "talent", "management", "admin"] as const) {
      for (const item of navForGroup(group, () => true)) {
        expect(paths, `${item.label} → ${item.to}`).toContain(item.to);
      }
    }
  });

  it("matches /admin/talent/new before the :id wildcard", () => {
    // Otherwise React Router reads "new" as a profile id and the create page
    // renders a failed lookup instead.
    expect(paths.indexOf("/admin/talent/new")).toBeLessThan(paths.indexOf("/admin/talent/:id"));
    expect(paths.indexOf("/admin/users/new")).toBeLessThan(paths.indexOf("/admin/users/:id"));
  });
});

// ---- API surface -------------------------------------------------------------

describe("talent administration API", () => {
  let calls: { url: string; init: RequestInit }[] = [];

  beforeEach(() => {
    calls = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init: RequestInit = {}) => {
        calls.push({ url: String(url), init });
        return new Response(JSON.stringify({ items: [], totalCount: 0 }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      })
    );
  });
  afterEach(() => vi.unstubAllGlobals());

  const last = () => calls[calls.length - 1];
  const lastUrl = () => new URL(last().url, "https://example.test");

  it.each([
    ["roster", () => talentAdmin.searchTalent(), "/management/talents"],
    ["record", () => talentAdmin.getTalentRecord("tp-1"), "/management/talents/tp-1/record"],
    ["archive", () => talentAdmin.archiveTalent("tp-1", "why"), "/management/talents/tp-1/archive"],
    ["restore", () => talentAdmin.restoreTalent("tp-1"), "/management/talents/tp-1/restore"],
    ["invitation", () => talentAdmin.issueTalentInvitation("tp-1"), "/management/talents/tp-1/invitation"],
    ["temporary password", () => talentAdmin.setTalentTemporaryPassword("tp-1"), "/management/talents/tp-1/temporary-password"],
    ["media", () => talentAdmin.listTalentMedia("tp-1"), "/management/talents/tp-1/media"],
    ["reorder", () => talentAdmin.reorderTalentMedia("tp-1", []), "/management/talents/tp-1/media/reorder"],
  ])("uses the contract path for %s", async (_n, call, expected) => {
    await call();
    expect(lastUrl().pathname.endsWith(expected)).toBe(true);
  });

  it("sends the roster filters under the names the backend binds", async () => {
    await talentAdmin.searchTalent({
      query: "aur",
      status: "Approved",
      isPublic: false,
      isFeatured: true,
      cityId: "c-1",
      categoryId: "cat-1",
      accountStatus: "PendingActivation",
      hasActiveLogin: false,
      hasPendingInvitation: true,
      pendingProfileReview: true,
      page: 2,
    });
    const q = lastUrl().searchParams;
    expect(q.get("query")).toBe("aur");
    expect(q.get("status")).toBe("Approved");
    expect(q.get("isPublic")).toBe("false");
    expect(q.get("isFeatured")).toBe("true");
    expect(q.get("cityId")).toBe("c-1");
    expect(q.get("categoryId")).toBe("cat-1");
    expect(q.get("accountStatus")).toBe("PendingActivation");
    expect(q.get("hasActiveLogin")).toBe("false");
    expect(q.get("hasPendingInvitation")).toBe("true");
    expect(q.get("pendingProfileReview")).toBe("true");
    expect(q.get("page")).toBe("2");
  });

  it("posts the exact create body", async () => {
    await talentAdmin.createTalent({
      email: "a@b.test",
      profile: {
        displayName: "Aurelia",
        isAgePublic: false,
        travelAvailable: false,
        eventAvailable: false,
      },
      loginMode: talentAdmin.TALENT_LOGIN_MODES.invitation,
      publishImmediately: false,
      isFeatured: false,
    });
    expect(lastUrl().pathname.endsWith("/management/talents")).toBe(true);
    const body = JSON.parse(String(last().init.body));
    expect(body.loginMode).toBe("Invitation");
    expect(body.profile.displayName).toBe("Aurelia");
  });

  it.each([
    ["request changes", () => mediaAdmin.requestMediaChanges("m-1", "r"), "/management/media-reviews/m-1/request-changes"],
    ["visibility", () => mediaAdmin.setMediaVisibility("m-1", "Private"), "/management/media-reviews/m-1/visibility"],
    ["cover", () => mediaAdmin.setMediaCover("m-1"), "/management/media-reviews/m-1/cover"],
    ["soft delete", () => mediaAdmin.softDeleteMedia("m-1"), "/management/media-reviews/m-1/soft-delete"],
    ["restore", () => mediaAdmin.restoreMedia("m-1"), "/management/media-reviews/m-1/restore"],
    ["history", () => mediaAdmin.getMediaHistory("m-1"), "/management/media-reviews/m-1/history"],
  ])("uses the contract path for media %s", async (_n, call, expected) => {
    await call();
    expect(lastUrl().pathname.endsWith(expected)).toBe(true);
  });

  it.each([
    ["security", () => adminService.getUserSecurity("u-1"), "/admin/users/u-1/security"],
    ["effective permissions", () => adminService.getEffectivePermissions("u-1"), "/admin/users/u-1/effective-permissions"],
    ["lock", () => adminService.lockUser("u-1", "why"), "/admin/users/u-1/lock"],
    ["unlock", () => adminService.unlockUser("u-1"), "/admin/users/u-1/unlock"],
    ["confirm email", () => adminService.confirmUserEmail("u-1"), "/admin/users/u-1/confirm-email"],
    ["resend verification", () => adminService.resendUserVerification("u-1"), "/admin/users/u-1/resend-verification"],
    ["force reset", () => adminService.forcePasswordReset("u-1"), "/admin/users/u-1/force-password-reset"],
    ["temporary password", () => adminService.setUserTemporaryPassword("u-1"), "/admin/users/u-1/temporary-password"],
    ["revoke sessions", () => adminService.revokeUserSessions("u-1"), "/admin/users/u-1/revoke-sessions"],
    ["roles", () => adminService.setUserRoles("u-1", ["Admin"]), "/admin/users/u-1/roles"],
    ["staff provision", () => adminService.provisionStaff({ email: "a@b.test", displayName: "A", roles: ["Admin"], loginMode: "PasswordReset" }), "/admin/users/staff/provision"],
  ])("uses the contract path for account %s", async (_n, call, expected) => {
    await call();
    expect(lastUrl().pathname.endsWith(expected)).toBe(true);
  });

  it("never duplicates the /api/v1 prefix", async () => {
    await talentAdmin.searchTalent();
    await adminService.getUserSecurity("u-1");
    for (const call of calls) {
      expect(new URL(call.url, "https://x.test").pathname).not.toContain("/api/v1/api/v1");
    }
  });
});

// ---- roster ------------------------------------------------------------------

describe("talent roster", () => {
  beforeEach(() => {
    permissions = ["Talent.View", "Talent.Create", "Talent.Manage"];
  });
  afterEach(() => vi.restoreAllMocks());

  const page = (items: unknown[], totalCount = items.length) =>
    vi.spyOn(talentAdmin, "searchTalent").mockResolvedValue({
      items, totalCount, page: 1, pageSize: 25,
    } as never);

  it("renders real rows and the server's own total", async () => {
    page([rosterRow()], 12);
    wrap(<TalentRoster />);
    expect(await screen.findByText("Aurelia")).toBeInTheDocument();
    expect(screen.getByText(/12 profiles/)).toBeInTheDocument();
  });

  it("shows publication, account and invitation state", async () => {
    page([rosterRow()]);
    wrap(<TalentRoster />);
    expect(await screen.findByText("Not published")).toBeInTheDocument();
    // The status appears both as a filter option and on the row; the row is what matters.
    expect(screen.getAllByText("PendingActivation").length).toBeGreaterThan(0);
    expect(screen.getByText("Invited")).toBeInTheDocument();
  });

  it("flags a profile with no approved photograph, because it cannot be published", async () => {
    page([rosterRow({ approvedPublicMediaCount: 0 })]);
    wrap(<TalentRoster />);
    expect(await screen.findByText("0 approved")).toBeInTheDocument();
  });

  it.each([
    ["Published", "isPublic", "true"],
    ["Featured", "isFeatured", "true"],
    ["Active login", "hasActiveLogin", "false"],
    ["Pending invitation", "hasPendingInvitation", "true"],
    ["Pending review", "pendingProfileReview", "true"],
  ])("passes the %s filter through", async (label, field, value) => {
    const spy = page([rosterRow()]);
    const user = userEvent.setup();
    wrap(<TalentRoster />);
    await screen.findByText("Aurelia");
    await user.selectOptions(screen.getByLabelText(label), value);
    await waitFor(() =>
      expect(spy).toHaveBeenLastCalledWith(
        expect.objectContaining({ [field]: value === "true" }),
        expect.anything()
      )
    );
  });

  it("shows an empty state rather than fixture rows", async () => {
    page([], 0);
    wrap(<TalentRoster />);
    expect(await screen.findByText("No talent matches")).toBeInTheDocument();
  });

  it("hardcodes no talent", () => {
    const source = read("src/pages/TalentRoster.jsx");
    expect(source).not.toMatch(/const\s+(MOCK|SAMPLE|FIXTURE|DEMO)_/i);
    expect(source).toContain("roster.data?.items");
    expect(source).toContain("roster.data?.totalCount");
  });

  it("fires no request without Talent.View", async () => {
    permissions = [];
    const spy = page([rosterRow()]);
    wrap(<TalentRoster />);
    await new Promise((r) => setTimeout(r, 30));
    expect(spy).not.toHaveBeenCalled();
  });
});

// ---- create ------------------------------------------------------------------

describe("add talent", () => {
  beforeEach(() => {
    permissions = ["Talent.View", "Talent.Create", "Talent.Manage"];
    vi.spyOn(adminService, "listTaxonomy").mockResolvedValue([] as never);
  });
  afterEach(() => vi.restoreAllMocks());

  it("explains that the account is always created", async () => {
    wrap(<TalentCreate />, "/admin/talent/new");
    const user = userEvent.setup();
    await user.type(screen.getByLabelText(/^Email/), "a@b.test");
    await user.click(screen.getByRole("button", { name: /Continue/ }));
    await user.type(screen.getByLabelText(/Display name/), "Aurelia");
    await user.click(screen.getByRole("button", { name: /Continue/ }));
    await user.click(screen.getByRole("button", { name: /Continue/ }));
    await user.click(screen.getByRole("button", { name: /Continue/ }));

    expect(await screen.findByText(/Profile only — no login yet/)).toBeInTheDocument();
    expect(screen.getByText(/cannot sign in/i)).toBeInTheDocument();
    expect(screen.getByText(/adopts this profile/i)).toBeInTheDocument();
  });

  it("warns that publication needs an approved photograph", async () => {
    const source = read("src/pages/TalentCreate.jsx");
    expect(source).toContain("approved public photograph");
    expect(source).toContain("TALENT_ADMIN_ERROR_CODES.notPublishable");
  });

  it("reports not_publishable as a refusal, never as a partial success", () => {
    const source = read("src/pages/TalentCreate.jsx");
    expect(source).toContain("was not created");
    expect(source).not.toMatch(/created but not published/i);
  });

  it("offers all three login modes with the backend's own values", () => {
    expect(talentAdmin.TALENT_LOGIN_MODES.none).toBe("None");
    expect(talentAdmin.TALENT_LOGIN_MODES.invitation).toBe("Invitation");
    expect(talentAdmin.TALENT_LOGIN_MODES.temporaryPassword).toBe("TemporaryPassword");
  });
});

// ---- record ------------------------------------------------------------------

describe("talent record", () => {
  beforeEach(() => {
    permissions = ["Talent.View", "Talent.Create", "Talent.Manage", "Talent.ModerateMedia"];
  });
  afterEach(() => vi.restoreAllMocks());

  const show = (over = {}) =>
    vi.spyOn(talentAdmin, "getTalentRecord").mockResolvedValue(record(over) as never);

  it("renders every operational tab", async () => {
    show();
    wrap(<TalentRecord />, "/admin/talent/tp-1");
    await screen.findByRole("heading", { name: "Aurelia" });
    for (const tab of ["Overview", "Public profile", "Media", "Rates", "Account & login"]) {
      expect(screen.getByRole("tab", { name: tab })).toBeInTheDocument();
    }
  });

  it("explains a PendingActivation account rather than implying it can sign in", async () => {
    show();
    const user = userEvent.setup();
    wrap(<TalentRecord />, "/admin/talent/tp-1");
    await screen.findByRole("heading", { name: "Aurelia" });
    await user.click(screen.getByRole("tab", { name: "Account & login" }));
    expect(await screen.findByText(/cannot sign in/i)).toBeInTheDocument();
    expect(screen.getByText(/adopts this profile/i)).toBeInTheDocument();
  });

  it("NEVER displays a password, hash or token", async () => {
    show({ invitation: { id: "i-1", status: "Pending", expiresAtUtc: "2026-08-01T00:00:00Z", usedAtUtc: null, createdAtUtc: "2026-07-01T00:00:00Z", isActivatable: true } });
    const user = userEvent.setup();
    wrap(<TalentRecord />, "/admin/talent/tp-1");
    await screen.findByRole("heading", { name: "Aurelia" });
    await user.click(screen.getByRole("tab", { name: "Account & login" }));
    await screen.findByText(/Password set/);

    const body = document.body.textContent ?? "";
    for (const leak of ["passwordHash", "securityStamp", "refreshToken", "resetToken", "invitationToken"]) {
      expect(body).not.toContain(leak);
    }
    // Only the boolean. And the invitation link is explicitly stated as unavailable.
    expect(screen.getByText("Password set")).toBeInTheDocument();
    expect(screen.getByText(/never shown here/i)).toBeInTheDocument();
  });

  it("issues an invitation through the real endpoint", async () => {
    show();
    const spy = vi.spyOn(talentAdmin, "issueTalentInvitation").mockResolvedValue({} as never);
    const user = userEvent.setup();
    wrap(<TalentRecord />, "/admin/talent/tp-1");
    await screen.findByRole("heading", { name: "Aurelia" });
    await user.click(screen.getByRole("tab", { name: "Account & login" }));
    await user.click(await screen.findByRole("button", { name: /Send invitation/i }));
    const dialog = await screen.findByRole("dialog", { name: "Send invitation" });
    await user.click(within(dialog).getByRole("button", { name: /Send invitation/i }));
    await waitFor(() => expect(spy).toHaveBeenCalledWith("tp-1"));
  });

  it("shows a temporary password once, with a warning that it cannot be retrieved", async () => {
    show();
    vi.spyOn(talentAdmin, "setTalentTemporaryPassword").mockResolvedValue({
      temporaryPassword: "Xk8!vQ2mN4pL",
    } as never);
    const user = userEvent.setup();
    wrap(<TalentRecord />, "/admin/talent/tp-1");
    await screen.findByRole("heading", { name: "Aurelia" });
    await user.click(screen.getByRole("tab", { name: "Account & login" }));
    await user.click(await screen.findByRole("button", { name: /Set temporary password/i }));
    const dialog = await screen.findByRole("dialog", { name: "Set a temporary password" });
    await user.click(within(dialog).getByRole("button", { name: /Set temporary password/i }));

    expect(await screen.findByText("Xk8!vQ2mN4pL")).toBeInTheDocument();
    expect(screen.getByText(/shown once/i)).toBeInTheDocument();
    expect(screen.getByText(/not stored in readable form/i)).toBeInTheDocument();
  });

  it("archives and restores through the real endpoints", async () => {
    show();
    const archive = vi.spyOn(talentAdmin, "archiveTalent").mockResolvedValue(undefined as never);
    const user = userEvent.setup();
    wrap(<TalentRecord />, "/admin/talent/tp-1");
    await screen.findByRole("heading", { name: "Aurelia" });
    await user.click(screen.getByRole("button", { name: /Archive/i }));
    const dialog = await screen.findByRole("dialog", { name: "Archive talent" });
    await user.type(screen.getByLabelText(/^Reason/i), "Withdrawn at their request");
    await user.click(within(dialog).getByRole("button", { name: /^Archive$/i }));
    await waitFor(() =>
      expect(archive).toHaveBeenCalledWith("tp-1", "Withdrawn at their request")
    );
  });

  it("says restore returns the profile UNPUBLISHED", async () => {
    show({ profileStatus: "Archived" });
    const user = userEvent.setup();
    wrap(<TalentRecord />, "/admin/talent/tp-1");
    await screen.findByRole("heading", { name: "Aurelia" });
    await user.click(screen.getByRole("button", { name: /Restore/i }));
    const dialog = await screen.findByRole("dialog", { name: "Restore talent" });
    expect(within(dialog).getByText(/UNPUBLISHED/)).toBeInTheDocument();
  });
});

// ---- media --------------------------------------------------------------------

describe("talent media administration", () => {
  beforeEach(() => {
    permissions = ["Talent.View", "Talent.Manage", "Talent.ModerateMedia"];
    vi.spyOn(talentAdmin, "getTalentRecord").mockResolvedValue(record() as never);
  });
  afterEach(() => vi.restoreAllMocks());

  const gallery = (items: unknown[]) =>
    vi.spyOn(talentAdmin, "listTalentMedia").mockResolvedValue(items as never);

  const openMedia = async () => {
    const user = userEvent.setup();
    wrap(<TalentRecord />, "/admin/talent/tp-1");
    await screen.findByRole("heading", { name: "Aurelia" });
    await user.click(screen.getByRole("tab", { name: "Media" }));
    return user;
  };

  it("renders each photograph from the API's own signed URL", async () => {
    gallery([mediaItem()]);
    await openMedia();
    const img = await screen.findByAltText("one.jpg");
    expect(img).toHaveAttribute("src", "https://storage.test/signed?sig=abc");
    expect(img).toHaveAttribute("referrerpolicy", "no-referrer");
  });

  it("never manufactures a public URL from an id", () => {
    const source = read("src/features/talentAdmin/MediaManager.jsx");
    expect(source).toContain("item.readUrl");
    expect(source).not.toMatch(/https?:\/\/[^"']*\$\{/);
  });

  it("labels hidden as hidden, not deleted", async () => {
    gallery([mediaItem({ visibility: "Private" })]);
    await openMedia();
    // "Hidden" is both the pill and the select option — both must say hidden,
    // and neither may say deleted.
    expect((await screen.findAllByText("Hidden")).length).toBeGreaterThan(0);
    expect(screen.getByText(/kept, not deleted/i)).toBeInTheDocument();
  });

  it("says VIP-only is not public", async () => {
    gallery([mediaItem({ visibility: "VipOnly" })]);
    await openMedia();
    expect((await screen.findAllByText("VIP only")).length).toBeGreaterThan(0);
    expect(screen.getByText(/This is not public/i)).toBeInTheDocument();
  });

  it("says management-only never reaches a client", async () => {
    gallery([mediaItem({ visibility: "ManagementOnly" })]);
    await openMedia();
    expect(await screen.findByText(/never reaches a client/i)).toBeInTheDocument();
  });

  it.each([
    ["Pending", "Public"],
    ["Approved", "Private"],
    ["Rejected", "Public"],
  ])("refuses cover for %s / %s media", async (moderationStatus, visibility) => {
    gallery([mediaItem({ moderationStatus, visibility })]);
    await openMedia();
    expect(await screen.findByRole("button", { name: /Cover/i })).toBeDisabled();
  });

  it("allows cover only for approved AND public media", async () => {
    gallery([mediaItem({ moderationStatus: "Approved", visibility: "Public" })]);
    await openMedia();
    expect(await screen.findByRole("button", { name: /Cover/i })).toBeEnabled();
  });

  it("warns that archiving the cover leaves the profile without one", async () => {
    gallery([mediaItem({ isCover: true })]);
    const user = await openMedia();
    await user.click(await screen.findByRole("button", { name: /Archive/i }));
    const dialog = await screen.findByRole("dialog", { name: "Archive photograph" });
    // The backend now reconciles: a replacement cover is chosen, or — when this
    // was the last approved public photograph — the talent is withdrawn. Either
    // way the photograph itself is kept.
    expect(within(dialog).getByText(/last approved, public photograph/i)).toBeInTheDocument();
    expect(within(dialog).getByText(/kept, not deleted/i)).toBeInTheDocument();
  });

  it("says restoring returns an item to pending review, not to public", async () => {
    gallery([mediaItem({ moderationStatus: "Archived" })]);
    await openMedia();
    const restore = await screen.findByRole("button", { name: /Restore/i });
    expect(restore).toHaveAttribute("title", expect.stringContaining("pending review"));
  });

  it("changes visibility through the real endpoint", async () => {
    gallery([mediaItem()]);
    const spy = vi.spyOn(mediaAdmin, "setMediaVisibility").mockResolvedValue(undefined as never);
    const user = await openMedia();
    await user.selectOptions(await screen.findByLabelText(/Visibility for one.jpg/), "VipOnly");
    await waitFor(() => expect(spy).toHaveBeenCalledWith("m-1", "VipOnly", undefined));
  });

  it("reorders through the real endpoint", async () => {
    gallery([mediaItem(), mediaItem({ id: "m-2", originalFileName: "two.jpg", sortOrder: 1 })]);
    const spy = vi.spyOn(talentAdmin, "reorderTalentMedia").mockResolvedValue(undefined as never);
    const user = await openMedia();
    await user.click(await screen.findByLabelText(/Move two.jpg earlier/));
    await waitFor(() =>
      expect(spy).toHaveBeenCalledWith("tp-1", [
        { mediaId: "m-2", sortOrder: 0 },
        { mediaId: "m-1", sortOrder: 1 },
      ])
    );
  });

  it("explains a cover refusal from the server rather than repeating the raw error", async () => {
    gallery([mediaItem()]);
    vi.spyOn(mediaAdmin, "setMediaCover").mockRejectedValue(
      ApiError.fromProblem(409, { errorCode: "media.cover_not_public", title: "Nope" })
    );
    const user = await openMedia();
    await user.click(await screen.findByRole("button", { name: /Cover/i }));
    expect(
      await screen.findByText(/Only an approved, publicly visible photograph/i)
    ).toBeInTheDocument();
  });

  it("shows moderation history on demand", async () => {
    gallery([mediaItem()]);
    vi.spyOn(mediaAdmin, "getMediaHistory").mockResolvedValue([
      {
        id: "h-1",
        actorUserId: "u-9",
        action: "Approved",
        fromStatus: "Pending",
        toStatus: "Approved",
        fromVisibility: null,
        toVisibility: null,
        reason: null,
        note: null,
        createdAtUtc: "2026-02-01T10:00:00Z",
      },
    ] as never);
    const user = await openMedia();
    await user.click(await screen.findByRole("button", { name: /History/i }));
    expect(await screen.findByText(/Pending → Approved/)).toBeInTheDocument();
  });
});

// ---- account administration ---------------------------------------------------

describe("account administration", () => {
  beforeEach(() => {
    permissions = ["Users.View", "Users.Manage", "Roles.Manage"];
    vi.spyOn(adminService, "listRoles").mockResolvedValue([
      { id: "r-1", name: "Admin", description: null, isSystemRole: true, permissionCount: 12 },
      { id: "r-2", name: "Management", description: null, isSystemRole: true, permissionCount: 8 },
    ] as never);
    vi.spyOn(adminService, "getEffectivePermissions").mockResolvedValue({
      userId: "u-1",
      roles: ["Admin"],
      permissions: ["Users.View", "Talent.View"],
      sources: [{ role: "Admin", permissions: ["Users.View", "Talent.View"] }],
    } as never);
  });
  afterEach(() => vi.restoreAllMocks());

  const security = (over = {}) =>
    vi.spyOn(adminService, "getUserSecurity").mockResolvedValue({
      userId: "u-1",
      accountStatus: "Active",
      emailConfirmed: false,
      hasPassword: true,
      mustChangePassword: false,
      mustChangePasswordSetAtUtc: null,
      isLockedOut: false,
      lockoutEndUtc: null,
      accessFailedCount: 0,
      activeSessionCount: 2,
      lastLoginAtUtc: "2026-07-01T10:00:00Z",
      talentProfileId: null,
      ...over,
    } as never);

  it("renders the security state without any secret", async () => {
    security();
    wrap(<AdminUserDetail />, "/admin/users/u-1");
    await screen.findByText("Password set");
    const body = document.body.textContent ?? "";
    for (const leak of ["passwordHash", "securityStamp", "refreshToken", "PasswordHash"]) {
      expect(body).not.toContain(leak);
    }
  });

  it.each([
    [/Lock account/i, "Lock account", "lock"],
    [/Force password reset/i, "Force a password reset", "force-password-reset"],
  ])("confirms before %s", async (button, title) => {
    security();
    const user = userEvent.setup();
    wrap(<AdminUserDetail />, "/admin/users/u-1");
    await screen.findByText("Password set");
    await user.click(screen.getByRole("button", { name: button }));
    expect(await screen.findByRole("dialog", { name: title })).toBeInTheDocument();
  });

  it("confirms email through the real endpoint", async () => {
    security({ emailConfirmed: false });
    const spy = vi.spyOn(adminService, "confirmUserEmail").mockResolvedValue(undefined as never);
    const user = userEvent.setup();
    wrap(<AdminUserDetail />, "/admin/users/u-1");
    await screen.findByText("Password set");
    await user.click(screen.getByRole("button", { name: /Confirm email/i }));
    const dialog = await screen.findByRole("dialog", { name: "Confirm email" });
    await user.click(within(dialog).getByRole("button", { name: /Confirm email/i }));
    await waitFor(() => expect(spy).toHaveBeenCalledWith("u-1"));
  });

  it("unlocks a locked account", async () => {
    security({ isLockedOut: true });
    const spy = vi.spyOn(adminService, "unlockUser").mockResolvedValue(undefined as never);
    const user = userEvent.setup();
    wrap(<AdminUserDetail />, "/admin/users/u-1");
    await screen.findByText("Password set");
    await user.click(screen.getByRole("button", { name: /Unlock/i }));
    const dialog = await screen.findByRole("dialog", { name: "Unlock account" });
    await user.click(within(dialog).getByRole("button", { name: /^Unlock$/i }));
    await waitFor(() => expect(spy).toHaveBeenCalledWith("u-1"));
  });

  it("revokes sessions through the real endpoint", async () => {
    security();
    const spy = vi.spyOn(adminService, "revokeUserSessions").mockResolvedValue(undefined as never);
    const user = userEvent.setup();
    wrap(<AdminUserDetail />, "/admin/users/u-1");
    await screen.findByText("Password set");
    await user.click(screen.getByRole("tab", { name: "Sessions & security" }));
    await user.click(await screen.findByRole("button", { name: /Revoke all sessions/i }));
    const dialog = await screen.findByRole("dialog", { name: "Revoke all sessions" });
    await user.click(within(dialog).getByRole("button", { name: /Revoke sessions/i }));
    await waitFor(() => expect(spy).toHaveBeenCalledWith("u-1"));
  });

  it("shows a temporary password once", async () => {
    security();
    vi.spyOn(adminService, "setUserTemporaryPassword").mockResolvedValue({
      userId: "u-1",
      temporaryPassword: "Tm9!zR4qW7yB",
      sessionsRevoked: true,
    } as never);
    const user = userEvent.setup();
    wrap(<AdminUserDetail />, "/admin/users/u-1");
    await screen.findByText("Password set");
    await user.click(screen.getByRole("button", { name: /Set temporary password/i }));
    const dialog = await screen.findByRole("dialog", { name: "Set a temporary password" });
    await user.click(within(dialog).getByRole("button", { name: /Set temporary password/i }));
    expect(await screen.findByText("Tm9!zR4qW7yB")).toBeInTheDocument();
    expect(screen.getByText(/shown once/i)).toBeInTheDocument();
  });

  it("renders effective permissions as returned, with their source role", async () => {
    security();
    const user = userEvent.setup();
    wrap(<AdminUserDetail />, "/admin/users/u-1");
    await screen.findByText("Password set");
    await user.click(screen.getByRole("tab", { name: "Effective permissions" }));
    expect(await screen.findByText("Talent.View")).toBeInTheDocument();
    expect(screen.getByText(/nothing is inferred here from a role name/i)).toBeInTheDocument();
  });

  it("assumes nothing about what SuperAdmin grants", () => {
    // The grants live in the database. A hardcoded belief here would eventually
    // contradict the server, and it is the server that decides.
    const source = read("src/pages/AdminUserDetail.jsx");
    expect(source).not.toMatch(/SuperAdmin.*(all|every) permission/i);
    expect(source).not.toMatch(/roles\.includes\("SuperAdmin"\)\s*\?/);
  });

  it("surfaces admin.last_superadmin as a refusal, never as success", async () => {
    security();
    vi.spyOn(adminService, "setUserRoles").mockRejectedValue(
      ApiError.fromProblem(409, { errorCode: "admin.last_superadmin", title: "Conflict" })
    );
    const user = userEvent.setup();
    wrap(<AdminUserDetail />, "/admin/users/u-1");
    await screen.findByText("Password set");
    await user.click(screen.getByRole("tab", { name: "Roles" }));
    await user.click(await screen.findByRole("button", { name: "Management" }));
    await user.click(screen.getByRole("button", { name: /Replace roles/i }));
    const dialog = await screen.findByRole("dialog", { name: "Replace roles" });
    await user.click(within(dialog).getByRole("button", { name: /Replace roles/i }));

    expect(await screen.findByText(/no usable SuperAdmin/i)).toBeInTheDocument();
    expect(screen.getByText(/NOT applied/)).toBeInTheDocument();
  });

  it("replaces roles through the real endpoint", async () => {
    security();
    const spy = vi.spyOn(adminService, "setUserRoles").mockResolvedValue(undefined as never);
    const user = userEvent.setup();
    wrap(<AdminUserDetail />, "/admin/users/u-1");
    await screen.findByText("Password set");
    await user.click(screen.getByRole("tab", { name: "Roles" }));
    await user.click(await screen.findByRole("button", { name: "Management" }));
    await user.click(screen.getByRole("button", { name: /Replace roles/i }));
    const dialog = await screen.findByRole("dialog", { name: "Replace roles" });
    await user.click(within(dialog).getByRole("button", { name: /Replace roles/i }));
    await waitFor(() => expect(spy).toHaveBeenCalledWith("u-1", ["Admin", "Management"]));
  });
});

// ---- staff provisioning --------------------------------------------------------

describe("staff provisioning", () => {
  beforeEach(() => {
    permissions = ["Users.View", "Users.Manage", "Roles.Manage"];
    vi.spyOn(adminService, "listRoles").mockResolvedValue([
      { id: "r-1", name: "Management", description: null, isSystemRole: true, permissionCount: 8 },
    ] as never);
  });
  afterEach(() => vi.restoreAllMocks());

  it("provisions through the real endpoint with the backend's login modes", async () => {
    const spy = vi.spyOn(adminService, "provisionStaff").mockResolvedValue({
      userId: "u-2",
      email: "s@lustra.test",
      accountStatus: "PendingActivation",
      roles: ["Management"],
      loginMode: "PasswordReset",
      temporaryPassword: null,
    } as never);
    const user = userEvent.setup();
    wrap(<AdminStaffProvision />, "/admin/users/new");

    await user.type(document.getElementById("email") as HTMLInputElement, "s@lustra.test");
    await user.type(screen.getByLabelText(/Display name/), "Sam");
    await user.click(await screen.findByRole("button", { name: "Management" }));
    await user.click(screen.getByRole("button", { name: /Create staff account/i }));

    await waitFor(() =>
      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({
          email: "s@lustra.test",
          displayName: "Sam",
          roles: ["Management"],
          loginMode: "PasswordReset",
        })
      )
    );
  });

  it("never asks the operator to choose a password", () => {
    // A password typed by one person and handed to another has been known to two
    // people from the moment it existed. The backend generates it instead.
    const source = read("src/pages/AdminStaffProvision.jsx");
    expect(source).not.toContain('type="password"');
    // The component is NAMED in prose to record why it is absent; what matters is
    // that it is not imported and there is no password input.
    expect(source).not.toMatch(/^import .*PasswordField/m);
    expect(source).toContain("never chooses a password");
  });

  it("exposes the backend's staff login modes verbatim", () => {
    expect(adminService.STAFF_LOGIN_MODES.passwordReset).toBe("PasswordReset");
    expect(adminService.STAFF_LOGIN_MODES.temporaryPassword).toBe("TemporaryPassword");
    expect(adminService.STAFF_LOGIN_MODES.none).toBe("None");
  });
});

// ---- roles ---------------------------------------------------------------------

describe("roles and permissions", () => {
  beforeEach(() => {
    permissions = ["Roles.Manage"];
    vi.spyOn(adminService, "listRoles").mockResolvedValue([
      { id: "r-1", name: "SuperAdmin", description: null, isSystemRole: true, permissionCount: 2 },
    ] as never);
    vi.spyOn(adminService, "getRole").mockResolvedValue({
      id: "r-1",
      name: "SuperAdmin",
      description: "Everything",
      isSystemRole: true,
      permissions: ["Users.View"],
    } as never);
    vi.spyOn(adminService, "listPermissionCatalogue").mockResolvedValue([
      {
        category: "Users",
        permissions: [
          { name: "Users.View", category: "Users" },
          { name: "Users.Manage", category: "Users" },
        ],
      },
    ] as never);
  });
  afterEach(() => vi.restoreAllMocks());

  it("renders the catalogue and the role's actual grants", async () => {
    wrap(<AdminRoles />, "/admin/roles");
    expect(await screen.findByRole("heading", { name: "SuperAdmin" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Users.View" })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
    // NOT assumed to hold everything just because it is SuperAdmin.
    expect(screen.getByRole("button", { name: "Users.Manage" })).toHaveAttribute(
      "aria-pressed",
      "false"
    );
  });

  it("saves permissions through the real endpoint after confirmation", async () => {
    const spy = vi.spyOn(adminService, "setRolePermissions").mockResolvedValue(undefined as never);
    const user = userEvent.setup();
    wrap(<AdminRoles />, "/admin/roles");
    await screen.findByRole("heading", { name: "SuperAdmin" });
    await user.click(screen.getByRole("button", { name: "Users.Manage" }));
    await user.click(screen.getByRole("button", { name: /Save permissions/i }));
    const dialog = await screen.findByRole("dialog", { name: /Replace permissions for SuperAdmin/ });
    await user.click(within(dialog).getByRole("button", { name: /Replace permissions/i }));
    await waitFor(() =>
      expect(spy).toHaveBeenCalledWith("SuperAdmin", ["Users.View", "Users.Manage"])
    );
  });

  it("hardcodes no role's permissions anywhere in deployed source", () => {
    const files: string[] = [];
    const walk = (dir: string) => {
      for (const entry of readdirSync(dir)) {
        const full = join(dir, entry);
        if (statSync(full).isDirectory()) walk(full);
        else if (/\.(jsx?|tsx?)$/.test(entry)) files.push(full);
      }
    };
    walk(join(ROOT, "src"));

    const offenders = files.filter((file) =>
      /SUPERADMIN_PERMISSIONS|ROLE_PERMISSIONS\s*=|hasAllPermissions/.test(
        readFileSync(file, "utf8")
      )
    );
    expect(offenders.map((f) => relative(ROOT, f))).toEqual([]);
  });
});

// ---- talent picker ---------------------------------------------------------------

describe("talent picker", () => {
  beforeEach(() => {
    permissions = ["Talent.View", "Bookings.Manage"];
  });
  afterEach(() => vi.restoreAllMocks());

  it("leaves no raw talent GUID input anywhere in deployed source", () => {
    const files: string[] = [];
    const walk = (dir: string) => {
      for (const entry of readdirSync(dir)) {
        const full = join(dir, entry);
        if (statSync(full).isDirectory()) walk(full);
        else if (/\.(jsx?|tsx?)$/.test(entry)) files.push(full);
      }
    };
    walk(join(ROOT, "src"));

    // A label asking a person to type or paste a profile id. One wrong digit
    // reassigns an appointment to a different human being, and nothing catches it.
    const offenders = files.filter((file) =>
      /(talent|profile)\s*(profile\s*)?id\s*<span|New talent profile id/i.test(
        readFileSync(file, "utf8")
      )
    );
    expect(offenders.map((f) => relative(ROOT, f))).toEqual([]);
  });

  it("searches the BOOKING-SCOPED endpoint, not the administration roster", () => {
    // Moved off /management/talents once the backend exposed a booking-scoped
    // lookup: choosing who to schedule must not require read access to legal
    // names, contact details and account security.
    const source = read("src/features/talentAdmin/TalentPicker.jsx");
    expect(source).toContain("useBookingTalentOptions");
    expect(source).not.toContain("useTalentRoster");
  });

  it("no longer needs a Talent.View fallback message", () => {
    // The permission coupling is gone, so the warning that explained it would
    // now be a lie about a restriction that no longer exists.
    const source = read("src/features/talentAdmin/TalentPicker.jsx");
    expect(source).not.toContain("permission to view talent");
  });
});
