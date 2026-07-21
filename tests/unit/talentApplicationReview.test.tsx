import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import React from "react";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ROUTES, navForGroup, requiredPermissionsFor, navMetas } from "@/app/routeRegistry";
import * as service from "@/services/talentApplicationService";
import { statusLabel, QUEUE_STATUS_FILTERS } from "@/features/talentApplication/StatusPill";
import TalentApplicationsQueue from "@/pages/TalentApplicationsQueue";
import TalentApplicationReview from "@/pages/TalentApplicationReview";

/**
 * Management review of talent applications.
 *
 * The distinctions asserted here are the ones that cause real harm when blurred:
 * a Draft shown as a submitted application puts an unfinished record in front of
 * a reviewer; an internal note rendered without its label invites someone to
 * paste it to an applicant; and "Approved" read as "Published" publishes a
 * person who never agreed to it.
 */

const ROOT = join(__dirname, "../..");
const read = (p: string) => readFileSync(join(ROOT, p), "utf8");

// ---- principal harness ----------------------------------------------------

let permissions: string[] = [];

vi.mock("@/auth/PrincipalContext", () => ({
  usePrincipal: () => ({
    principal: { isAuthenticated: true, permissions, roles: ["management"], isLoading: false },
    hasPermission: (p: string) => permissions.includes(p),
    isLoading: false,
  }),
}));

function wrap(ui: React.ReactElement, route = "/admin/talent-applications") {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[route]}>
        <Routes>
          <Route path="/admin/talent-applications" element={ui} />
          <Route path="/admin/talent-applications/:id" element={ui} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

const listItem = (over: Partial<service.TalentApplicationListItemDto> = {}) => ({
  id: "app-1",
  reference: "LA-2026-0001",
  requestedDisplayName: "Ada",
  legalFullName: "Ada Lovelace",
  email: "ada@example.com",
  cityName: "Cape Town",
  cityFreeText: null,
  age: 29,
  status: "Submitted",
  publishOnApproval: true,
  photographCount: 5,
  submittedAtUtc: "2026-02-01T10:00:00Z",
  createdAtUtc: "2026-01-30T10:00:00Z",
  reviewedByUserId: null,
  reviewedAtUtc: null,
  ...over,
});

const detail = (over: Partial<service.TalentApplicationDetailDto> = {}) => ({
  id: "app-1",
  reference: "LA-2026-0001",
  status: "Submitted",
  legalFirstName: "Ada",
  legalMiddleNames: null,
  legalSurname: "Lovelace",
  requestedDisplayName: "Ada",
  email: "ada@example.com",
  cellphoneNumber: "+27820000000",
  whatsAppNumber: null,
  instagramUrl: "https://instagram.com/ada",
  additionalSocialUrl: null,
  cityId: null,
  cityName: "Cape Town",
  cityFreeText: null,
  dateOfBirth: "1996-12-10",
  age: 29,
  shortBiography: "A short biography.",
  requestedHourlyRate: 1500,
  currencyCode: "ZAR",
  publishOnApproval: true,
  isAdultDeclared: true,
  consentToContact: true,
  submittedAtUtc: "2026-02-01T10:00:00Z",
  createdAtUtc: "2026-01-30T10:00:00Z",
  reviewedByUserId: null,
  reviewedAtUtc: null,
  decisionReason: null,
  convertedTalentProfileId: null,
  convertedUserId: null,
  convertedAtUtc: null,
  media: [],
  notes: [],
  ...over,
});

// ---- routing and navigation ------------------------------------------------

describe("management routing", () => {
  const paths = ROUTES.map((r) => r.path);

  it("registers the queue and the detail route", () => {
    expect(paths).toContain("/admin/talent-applications");
    expect(paths).toContain("/admin/talent-applications/:id");
  });

  it("guards both behind TalentApplications.View", () => {
    expect(requiredPermissionsFor("/admin/talent-applications")).toContain("TalentApplications.View");
    expect(requiredPermissionsFor("/admin/talent-applications/:id")).toContain(
      "TalentApplications.View"
    );
  });

  it("matches the queue before the detail route", () => {
    expect(paths.indexOf("/admin/talent-applications")).toBeLessThan(
      paths.indexOf("/admin/talent-applications/:id")
    );
  });

  it("shows the nav entry only with the view permission", () => {
    const withPermission = navForGroup("management", (p) => p === "TalentApplications.View");
    const without = navForGroup("management", () => false);
    expect(withPermission.map((n) => n.label)).toContain("Talent Applications");
    expect(without.map((n) => n.label)).not.toContain("Talent Applications");
  });

  it("groups the entry under a People heading in both workspaces", () => {
    for (const group of ["management", "admin"] as const) {
      const item = navForGroup(group, () => true).find((n) => n.label === "Talent Applications");
      expect(item?.section).toBe("People");
      expect(item?.to).toBe("/admin/talent-applications");
    }
  });

  it("adds no dead links for later phases", () => {
    const labels = ROUTES.flatMap((r) => navMetas(r.nav)).map((m) => m.label);
    for (const later of ["Locations", "CMS", "Content", "Appointments Admin", "Talent Administration"]) {
      expect(labels).not.toContain(later);
    }
  });
});

// ---- status vocabulary -----------------------------------------------------

describe("status vocabulary", () => {
  it("never lets Approved read as Published", () => {
    expect(statusLabel("Approved")).toMatch(/not published/i);
    expect(statusLabel("Approved").toLowerCase()).not.toBe("published");
  });

  it("marks a converted application as having a profile, not a public one", () => {
    expect(statusLabel("ConvertedToTalent")).toMatch(/profile created/i);
    expect(statusLabel("ConvertedToTalent")).not.toMatch(/\bpublished\b/i);
  });

  it("labels a draft as not submitted", () => {
    expect(statusLabel("Draft")).toMatch(/not submitted/i);
  });

  it("offers no Draft filter — the API never returns one", () => {
    expect(QUEUE_STATUS_FILTERS.map((f) => f.value)).not.toContain("Draft");
  });
});

// ---- the queue -------------------------------------------------------------

describe("talent applications queue", () => {
  beforeEach(() => {
    permissions = ["TalentApplications.View"];
  });
  afterEach(() => vi.restoreAllMocks());

  const page = (items: unknown[], totalCount = items.length) =>
    vi.spyOn(service, "listApplications").mockResolvedValue({
      items,
      totalCount,
      page: 1,
      pageSize: 25,
    } as never);

  it("calls the exact management endpoint", async () => {
    const spy = page([listItem()]);
    wrap(<TalentApplicationsQueue />);
    await waitFor(() => expect(spy).toHaveBeenCalled());
    expect(read("src/services/talentApplicationService.ts")).toContain(
      'const MANAGEMENT = "/management/talent-applications"'
    );
  });

  it("renders real rows and the server's own total", async () => {
    page([listItem()], 41);
    wrap(<TalentApplicationsQueue />);
    expect(await screen.findByText("LA-2026-0001")).toBeInTheDocument();
    expect(screen.getByText(/41 applications/)).toBeInTheDocument();
  });

  it("shows an empty state rather than invented rows", async () => {
    page([], 0);
    wrap(<TalentApplicationsQueue />);
    expect(await screen.findByText(/No applications match/i)).toBeInTheDocument();
  });

  it("offers a recoverable error state", async () => {
    vi.spyOn(service, "listApplications").mockRejectedValue(new Error("boom"));
    wrap(<TalentApplicationsQueue />);
    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Try again/i })).toBeInTheDocument();
  });

  it("fires no request without the view permission", async () => {
    permissions = [];
    const spy = page([listItem()]);
    wrap(<TalentApplicationsQueue />);
    await new Promise((r) => setTimeout(r, 30));
    expect(spy).not.toHaveBeenCalled();
  });

  it("passes the filters through under the backend's own names", async () => {
    const spy = page([listItem()]);
    const user = userEvent.setup();
    wrap(<TalentApplicationsQueue />);
    await waitFor(() => expect(spy).toHaveBeenCalled());

    await user.selectOptions(screen.getByLabelText("Filter by status"), "UnderReview");
    await waitFor(() =>
      expect(spy).toHaveBeenLastCalledWith(
        expect.objectContaining({ status: "UnderReview", page: 1 }),
        expect.anything()
      )
    );

    await user.selectOptions(screen.getByLabelText("Filter by publish preference"), "yes");
    await waitFor(() =>
      expect(spy).toHaveBeenLastCalledWith(
        expect.objectContaining({ publishOnApproval: true }),
        expect.anything()
      )
    );
  });

  it("describes the publish column as the applicant's request, not a decision", async () => {
    page([listItem({ publishOnApproval: true })]);
    wrap(<TalentApplicationsQueue />);
    expect(await screen.findByText(/Asked to publish/i)).toBeInTheDocument();
    expect(screen.queryByText(/^Published$/)).toBeNull();
  });

  it("hardcodes no fixture rows", () => {
    const source = read("src/pages/TalentApplicationsQueue.jsx");
    expect(source).not.toMatch(/const\s+(MOCK|SAMPLE|FIXTURE|DEMO)_/i);
    expect(source).toContain("query.data?.items");
    expect(source).toContain("query.data?.totalCount");
  });
});

// ---- the detail page -------------------------------------------------------

describe("application review", () => {
  beforeEach(() => {
    permissions = ["TalentApplications.View", "TalentApplications.Review", "TalentApplications.Approve"];
    vi.spyOn(service, "getMediaUrl").mockResolvedValue({
      url: "https://storage.example/signed?sig=abc",
      expiresAtUtc: "2026-01-01T00:00:00Z",
    } as never);
  });
  afterEach(() => vi.restoreAllMocks());

  const show = (over = {}) =>
    vi.spyOn(service, "getApplication").mockResolvedValue(detail(over) as never);

  it("uses the exact detail endpoint and renders the applicant record", async () => {
    const spy = show();
    wrap(<TalentApplicationReview />, "/admin/talent-applications/app-1");
    await waitFor(() => expect(spy).toHaveBeenCalledWith("app-1", expect.anything()));
    expect(await screen.findByText("Ada Lovelace")).toBeInTheDocument();
    expect(screen.getByText("ada@example.com")).toBeInTheDocument();
    expect(screen.getByText(/ZAR 1500/)).toBeInTheDocument();
    expect(screen.getByText(/Declared 18 or older/)).toBeInTheDocument();
  });

  it("links out to the applicant's social profiles", async () => {
    show();
    wrap(<TalentApplicationReview />, "/admin/talent-applications/app-1");
    const link = await screen.findByRole("link", { name: /Instagram/i });
    expect(link).toHaveAttribute("href", "https://instagram.com/ada");
    expect(link).toHaveAttribute("rel", expect.stringContaining("noreferrer"));
  });

  it("fetches each private photograph through the signed-URL operation", async () => {
    show({
      media: [
        {
          id: "m1",
          originalFileName: "one.jpg",
          mimeType: "image/jpeg",
          sizeBytes: 1,
          width: null,
          height: null,
          sortOrder: 0,
          isCover: true,
          uploadStatus: "Ready",
          createdAtUtc: "2026-01-01T00:00:00Z",
        },
      ],
    });
    wrap(<TalentApplicationReview />, "/admin/talent-applications/app-1");
    await waitFor(() => expect(service.getMediaUrl).toHaveBeenCalledWith("app-1", "m1", expect.anything()));
    const img = await screen.findByAltText("one.jpg");
    expect(img).toHaveAttribute("referrerpolicy", "no-referrer");
    expect(await screen.findByText(/Preferred cover/i)).toBeInTheDocument();
  });

  it("never treats application media as a public URL", () => {
    // The list DTO carries no URL at all; a page building one from an id would be
    // handing out access to everyone the response is ever cached for.
    const source = read("src/features/talentApplication/PrivatePhoto.jsx");
    expect(source).toContain("useApplicationMediaUrl");
    expect(source).not.toMatch(/https?:\/\/[^"']*\$\{/);
  });

  it("marks internal notes as Management-only", async () => {
    show({
      notes: [
        {
          id: "n1",
          authorUserId: "u1",
          authorDisplayName: "Reviewer",
          note: "Verify the identity document.",
          createdAtUtc: "2026-02-02T10:00:00Z",
        },
      ],
    });
    wrap(<TalentApplicationReview />, "/admin/talent-applications/app-1");
    expect(await screen.findByText("Verify the identity document.")).toBeInTheDocument();
    expect(screen.getByText(/never shown to the applicant/i)).toBeInTheDocument();
  });

  it("separates approval from publication in the sidebar", async () => {
    show();
    wrap(<TalentApplicationReview />, "/admin/talent-applications/app-1");
    expect(await screen.findByText(/does not publish one/i)).toBeInTheDocument();
    expect(screen.getByText(/preference only/i)).toBeInTheDocument();
  });

  it("offers approve and approve-and-publish as distinct actions", async () => {
    show();
    wrap(<TalentApplicationReview />, "/admin/talent-applications/app-1");
    expect(await screen.findByRole("button", { name: "Approve" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Approve and publish/i })).toBeInTheDocument();
  });

  it.each([
    [/Mark under review/i, "Mark under review"],
    [/Request changes/i, "Request changes"],
    [/^Reject$/i, "Reject application"],
    [/^Approve$/, "Approve application"],
    [/Approve and publish/i, "Approve and publish"],
  ])("confirms before %s", async (button, dialogTitle) => {
    show();
    const user = userEvent.setup();
    wrap(<TalentApplicationReview />, "/admin/talent-applications/app-1");
    await screen.findByText("Ada Lovelace");
    await user.click(screen.getByRole("button", { name: button }));
    expect(await screen.findByRole("dialog", { name: dialogTitle })).toBeInTheDocument();
  });

  it("will not request changes without a message for the applicant", async () => {
    show();
    const spy = vi.spyOn(service, "requestChanges");
    const user = userEvent.setup();
    wrap(<TalentApplicationReview />, "/admin/talent-applications/app-1");
    await screen.findByText("Ada Lovelace");

    await user.click(screen.getByRole("button", { name: /Request changes/i }));
    const confirm = await screen.findByRole("button", { name: /Send request/i });
    expect(confirm).toBeDisabled();

    await user.type(screen.getByLabelText(/Message to the applicant/i), "Please resend photo 3.");
    expect(confirm).toBeEnabled();
    expect(spy).not.toHaveBeenCalled();
  });

  it("will not reject without a reason", async () => {
    show();
    const user = userEvent.setup();
    wrap(<TalentApplicationReview />, "/admin/talent-applications/app-1");
    await screen.findByText("Ada Lovelace");
    await user.click(screen.getByRole("button", { name: /^Reject$/i }));
    expect(await screen.findByRole("button", { name: /Reject application/i })).toBeDisabled();
  });

  it("sends the real under-review call on confirmation", async () => {
    show();
    const spy = vi.spyOn(service, "markUnderReview").mockResolvedValue(detail({ status: "UnderReview" }) as never);
    const user = userEvent.setup();
    wrap(<TalentApplicationReview />, "/admin/talent-applications/app-1");
    await screen.findByText("Ada Lovelace");
    await user.click(screen.getByRole("button", { name: /Mark under review/i }));
    const dialog = await screen.findByRole("dialog", { name: "Mark under review" });
    await user.click(within(dialog).getByRole("button", { name: /Mark under review/i }));
    await waitFor(() => expect(spy).toHaveBeenCalled());
  });

  it("approves without publishing, and reports PendingActivation honestly", async () => {
    show();
    const spy = vi.spyOn(service, "approveApplication").mockResolvedValue({
      applicationId: "app-1",
      talentProfileId: "tp-1",
      userId: "u-1",
      invitationId: "inv-1",
      loginCreated: true,
      activationEmailSent: true,
      published: false,
      mediaCopied: 5,
      status: "ConvertedToTalent",
    } as never);
    const user = userEvent.setup();
    wrap(<TalentApplicationReview />, "/admin/talent-applications/app-1");
    await screen.findByText("Ada Lovelace");

    await user.click(screen.getByRole("button", { name: "Approve" }));
    const dialog = await screen.findByRole("dialog", { name: "Approve application" });
    await user.click(within(dialog).getByRole("button", { name: "Approve" }));

    await waitFor(() => expect(spy).toHaveBeenCalled());
    const [, request] = spy.mock.calls[0];
    expect(request.publishImmediately).toBe(false);
    expect(request.createLogin).toBe(true);

    expect(await screen.findByText(/pending activation/i)).toBeInTheDocument();
    expect(screen.getByText(/is NOT published/i)).toBeInTheDocument();
    expect(screen.getByText(/already approved/i)).toBeInTheDocument();
  });

  it("sets publishImmediately only on approve-and-publish", async () => {
    show();
    const spy = vi.spyOn(service, "approveApplication").mockResolvedValue({
      applicationId: "app-1",
      talentProfileId: "tp-1",
      userId: "u-1",
      invitationId: "inv-1",
      loginCreated: true,
      activationEmailSent: true,
      published: true,
      mediaCopied: 5,
      status: "ConvertedToTalent",
    } as never);
    const user = userEvent.setup();
    wrap(<TalentApplicationReview />, "/admin/talent-applications/app-1");
    await screen.findByText("Ada Lovelace");

    await user.click(screen.getByRole("button", { name: /Approve and publish/i }));
    const dialog = await screen.findByRole("dialog", { name: "Approve and publish" });
    await user.click(within(dialog).getByRole("button", { name: /Approve and publish/i }));

    await waitFor(() => expect(spy).toHaveBeenCalled());
    expect(spy.mock.calls[0][1].publishImmediately).toBe(true);
    // Copied photographs arrive approved; null means copy them all.
    expect(spy.mock.calls[0][1].mediaIdsToCopy).toBeNull();
    expect(spy.mock.calls[0][2]).toBeTruthy(); // idempotency key
  });

  it("hides review actions without the review permission", async () => {
    permissions = ["TalentApplications.View"];
    show();
    wrap(<TalentApplicationReview />, "/admin/talent-applications/app-1");
    await screen.findByText("Ada Lovelace");
    expect(screen.queryByRole("button", { name: /Request changes/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /^Reject$/i })).toBeNull();
    expect(screen.getByText(/read-only access/i)).toBeInTheDocument();
  });

  it("hides approval without the approve permission", async () => {
    permissions = ["TalentApplications.View", "TalentApplications.Review"];
    show();
    wrap(<TalentApplicationReview />, "/admin/talent-applications/app-1");
    await screen.findByText("Ada Lovelace");
    expect(screen.getByRole("button", { name: /Request changes/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Approve" })).toBeNull();
  });

  it("relies on the server as the authorization boundary, not on hidden buttons", () => {
    const source = read("src/features/talentApplication/hooks.ts");
    expect(source).toContain("The server remains the authorization boundary");
    expect(source).toContain("TalentApplications.Approve");
  });
});
