import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import React from "react";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ROUTES, navForGroup, requiredPermissionsFor } from "@/app/routeRegistry";
import * as service from "@/services/appointmentService";
import * as adminService from "@/services/adminService";
import ManagementAppointments from "@/pages/ManagementAppointments";
import ManagementAppointmentDetail from "@/pages/ManagementAppointmentDetail";

/**
 * Management appointments: the register, the detail record and client visibility.
 *
 * Visibility is the part with teeth. Revealing an appointment notifies its
 * client; concealing one deliberately does not, because announcing a
 * disappearance discloses exactly what concealing it withholds. Both directions
 * are therefore confirmed, and both record a reason for other staff.
 */

const ROOT = join(__dirname, "../..");
const read = (p: string) => readFileSync(join(ROOT, p), "utf8");
const paths = ROUTES.map((r) => r.path);

let permissions: string[] = [];

vi.mock("@/auth/PrincipalContext", () => ({
  usePrincipal: () => ({
    principal: { isAuthenticated: true, permissions, roles: ["management"], isLoading: false },
    hasPermission: (p: string) => permissions.includes(p),
    isLoading: false,
  }),
}));

function wrap(ui: React.ReactElement, route = "/admin/appointments") {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[route]}>
        <Routes>
          <Route path="/admin/appointments" element={ui} />
          <Route path="/admin/appointments/:id" element={ui} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

const listItem = (over = {}) => ({
  id: "ap-1",
  bookingReference: "LB-2026-0001",
  inquiryId: "inq-1",
  talentProfileId: "tp-1",
  talentDisplayName: "Aurelia",
  status: "Confirmed",
  confirmedDate: "2026-02-14",
  startTime: "19:00:00",
  currencyCode: "ZAR",
  agreedAmount: 5000,
  createdAtUtc: "2026-01-20T10:00:00Z",
  isVisibleToClient: true,
  ...over,
});

const detail = (over = {}) => ({
  id: "ap-1",
  bookingReference: "LB-2026-0001",
  inquiryId: "inq-1",
  acceptedProposalId: null,
  clientUserId: "cu-1",
  talentProfileId: "tp-1",
  talentDisplayName: "Aurelia",
  engagementCategory: "Dinner",
  status: "Confirmed",
  settlementStatus: "Pending",
  confirmedDate: "2026-02-14",
  startTime: "19:00:00",
  endTime: "22:00:00",
  durationMinutes: 180,
  timeZone: "Africa/Johannesburg",
  cityId: null,
  venueTypeId: null,
  venueName: "The Silo",
  generalLocation: "V&A Waterfront",
  privateLocationDetails: "Report to the staff entrance on Dock Road",
  agreedAmount: 5000,
  additionalCosts: null,
  currencyCode: "ZAR",
  clientVisibleNotes: "Your table is booked under Lustra.",
  talentInstructions: "Arrive 20 minutes early.",
  assignedManagementUserId: "mu-1",
  createdAtUtc: "2026-01-20T10:00:00Z",
  conversationId: "conv-1",
  isVisibleToClient: true,
  history: [{ fromStatus: null, toStatus: "Confirmed", reason: null, createdAtUtc: "2026-01-20T10:00:00Z" }],
  internalNotes: [],
  ...over,
});

// ---- navigation ------------------------------------------------------------

describe("operations navigation", () => {
  beforeEach(() => {
    permissions = ["Bookings.View", "TalentApplications.View"];
  });

  it("registers appointments, detail and calendar", () => {
    for (const path of ["/admin/appointments", "/admin/appointments/:id", "/admin/calendar"]) {
      expect(paths).toContain(path);
    }
  });

  it("guards them behind Bookings.View", () => {
    expect(requiredPermissionsFor("/admin/appointments")).toContain("Bookings.View");
    expect(requiredPermissionsFor("/admin/appointments/:id")).toContain("Bookings.View");
    expect(requiredPermissionsFor("/admin/calendar")).toContain("Bookings.View");
  });

  it.each(["management", "admin"] as const)("adds an Operations section to %s", (group) => {
    const nav = navForGroup(group, (p) => permissions.includes(p));
    const appointments = nav.find((n) => n.label === "Appointments");
    const calendar = nav.find((n) => n.label === "Calendar");
    expect(appointments?.section).toBe("Operations");
    expect(calendar?.section).toBe("Operations");
    expect(appointments?.to).toBe("/admin/appointments");
    expect(calendar?.to).toBe("/admin/calendar");
  });

  it("keeps neither a dead link — both resolve to a registered route", () => {
    for (const group of ["management", "admin"] as const) {
      for (const item of navForGroup(group, () => true)) {
        expect(paths).toContain(item.to);
      }
    }
  });

  it("hides the Operations entries without Bookings.View", () => {
    const nav = navForGroup("management", (p) => p === "TalentApplications.View");
    expect(nav.map((n) => n.label)).not.toContain("Appointments");
    expect(nav.map((n) => n.label)).not.toContain("Calendar");
  });

  it("KEEPS Talent Applications under People for an authorised user", () => {
    // The locked navigation rule: this must survive every later phase.
    for (const group of ["management", "admin"] as const) {
      const item = navForGroup(group, () => true).find((n) => n.label === "Talent Applications");
      expect(item?.section).toBe("People");
      expect(item?.to).toBe("/admin/talent-applications");
    }
  });

  it("renders section headings in the sidebar", () => {
    const shell = read("src/layouts/WorkspaceShell.jsx");
    expect(shell).toContain("toSections");
    expect(shell).toContain("section.title");
  });
});

// ---- API surface -----------------------------------------------------------

describe("management appointment API", () => {
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
    ["show", () => service.showAppointmentToClient("ap-1", "why"), "/management/bookings/ap-1/show-to-client"],
    ["hide", () => service.hideAppointmentFromClient("ap-1", "why"), "/management/bookings/ap-1/hide-from-client"],
    ["history", () => service.getAppointmentVisibilityHistory("ap-1"), "/management/bookings/ap-1/visibility-history"],
    ["reassign", () => service.reassignAppointmentTalent("ap-1", "tp-2", "why"), "/management/bookings/ap-1/reassign-talent"],
  ])("uses the contract path for %s", async (_n, call, expected) => {
    await call();
    expect(lastUrl().pathname.endsWith(expected)).toBe(true);
  });

  it("filters the list by client visibility", async () => {
    await service.listAppointments({ isVisibleToClient: false });
    expect(lastUrl().searchParams.get("isVisibleToClient")).toBe("false");
  });

  it("omits the visibility filter when none is chosen", async () => {
    await service.listAppointments({});
    expect(lastUrl().searchParams.has("isVisibleToClient")).toBe(false);
  });

  it("sends the internal reason on a visibility change", async () => {
    await service.hideAppointmentFromClient("ap-1", "  Client asked us to hold it back  ");
    expect(JSON.parse(String(last().init.body))).toEqual({
      internalReason: "Client asked us to hold it back",
    });
  });

  it("sends null rather than an empty reason", async () => {
    await service.showAppointmentToClient("ap-1", "   ");
    expect(JSON.parse(String(last().init.body))).toEqual({ internalReason: null });
  });
});

// ---- the register ----------------------------------------------------------

describe("appointment register", () => {
  beforeEach(() => {
    permissions = ["Bookings.View", "Bookings.Manage"];
  });
  afterEach(() => vi.restoreAllMocks());

  const page = (items: unknown[]) =>
    vi.spyOn(service, "listAppointments").mockResolvedValue({
      items, totalCount: items.length, page: 1, pageSize: 50,
    } as never);

  it("shows each row's client visibility", async () => {
    page([listItem({ isVisibleToClient: false })]);
    wrap(<ManagementAppointments />);
    expect(await screen.findByText("Hidden")).toBeInTheDocument();
  });

  it("filters by client visibility", async () => {
    const spy = page([listItem()]);
    const user = userEvent.setup();
    wrap(<ManagementAppointments />);
    await screen.findByText("LB-2026-0001");
    await user.selectOptions(screen.getByLabelText("Filter by client visibility"), "false");
    await waitFor(() =>
      expect(spy).toHaveBeenLastCalledWith(
        expect.objectContaining({ isVisibleToClient: false }),
        expect.anything()
      )
    );
  });

  it("renders no fixture rows", () => {
    const source = read("src/pages/ManagementAppointments.jsx");
    expect(source).not.toMatch(/const\s+(MOCK|SAMPLE|FIXTURE|DEMO)_/i);
    expect(source).toContain("query.data?.items");
  });
});

// ---- the detail record -----------------------------------------------------

describe("appointment detail", () => {
  beforeEach(() => {
    permissions = ["Bookings.View", "Bookings.Manage", "Bookings.Cancel", "Users.View"];
    vi.spyOn(service, "getAppointmentVisibilityHistory").mockResolvedValue([] as never);
    vi.spyOn(adminService, "listUsers").mockResolvedValue({
      items: [], totalCount: 0, page: 1, pageSize: 100,
    } as never);
  });
  afterEach(() => vi.restoreAllMocks());

  const show = (over = {}) =>
    vi.spyOn(service, "getAppointment").mockResolvedValue(detail(over) as never);

  it("renders the full operational record, marked as internal", async () => {
    show();
    wrap(<ManagementAppointmentDetail />, "/admin/appointments/ap-1");
    expect(await screen.findByText("Aurelia")).toBeInTheDocument();
    expect(screen.getByText(/Report to the staff entrance/)).toBeInTheDocument();
    expect(screen.getByText(/never shown to the client/i)).toBeInTheDocument();
  });

  it("shows the current client visibility", async () => {
    show({ isVisibleToClient: false });
    wrap(<ManagementAppointmentDetail />, "/admin/appointments/ap-1");
    expect(await screen.findByText(/Hidden from client/)).toBeInTheDocument();
    expect(screen.getByText(/They are not told it exists/i)).toBeInTheDocument();
  });

  it("confirms before hiding, and requires an internal reason", async () => {
    show();
    const spy = vi.spyOn(service, "hideAppointmentFromClient").mockResolvedValue(undefined as never);
    const user = userEvent.setup();
    wrap(<ManagementAppointmentDetail />, "/admin/appointments/ap-1");
    await screen.findByText("Aurelia");

    await user.click(screen.getByRole("button", { name: /Hide from client/i }));
    const dialog = await screen.findByRole("dialog", { name: "Hide from client" });
    expect(within(dialog).getByRole("button", { name: /Hide from client/i })).toBeDisabled();
    expect(spy).not.toHaveBeenCalled();

    await user.type(screen.getByLabelText(/Internal reason/i), "Awaiting venue confirmation");
    await user.click(within(dialog).getByRole("button", { name: /Hide from client/i }));
    await waitFor(() =>
      expect(spy).toHaveBeenCalledWith("ap-1", "Awaiting venue confirmation")
    );
  });

  it("confirms before showing to the client", async () => {
    show({ isVisibleToClient: false });
    const spy = vi.spyOn(service, "showAppointmentToClient").mockResolvedValue(undefined as never);
    const user = userEvent.setup();
    wrap(<ManagementAppointmentDetail />, "/admin/appointments/ap-1");
    await screen.findByText("Aurelia");

    await user.click(screen.getByRole("button", { name: /Show to client/i }));
    const dialog = await screen.findByRole("dialog", { name: "Show to client" });
    await user.type(screen.getByLabelText(/Internal reason/i), "Venue now confirmed");
    await user.click(within(dialog).getByRole("button", { name: /Show to client/i }));
    await waitFor(() => expect(spy).toHaveBeenCalledWith("ap-1", "Venue now confirmed"));
  });

  it("warns that hiding does not notify the client", async () => {
    show();
    const user = userEvent.setup();
    wrap(<ManagementAppointmentDetail />, "/admin/appointments/ap-1");
    await screen.findByText("Aurelia");
    await user.click(screen.getByRole("button", { name: /Hide from client/i }));
    const dialog = await screen.findByRole("dialog", { name: "Hide from client" });
    expect(within(dialog).getByText(/NOT notified/i)).toBeInTheDocument();
  });

  it("reassigns talent with an id and a reason", async () => {
    show();
    const spy = vi.spyOn(service, "reassignAppointmentTalent").mockResolvedValue(undefined as never);
    const user = userEvent.setup();
    wrap(<ManagementAppointmentDetail />, "/admin/appointments/ap-1");
    await screen.findByText("Aurelia");

    await user.click(screen.getByRole("button", { name: /Reassign talent/i }));
    const dialog = await screen.findByRole("dialog", { name: "Reassign talent" });
    await user.type(screen.getByLabelText(/New talent profile id/i), "tp-2");
    await user.type(screen.getByLabelText(/^Reason/i), "Original talent unavailable");
    await user.click(within(dialog).getByRole("button", { name: /^Reassign$/i }));
    await waitFor(() =>
      expect(spy).toHaveBeenCalledWith("ap-1", "tp-2", "Original talent unavailable")
    );
  });

  it.each([
    [/^Cancel$/i, "Cancel appointment"],
    [/Reschedule/i, "Reschedule appointment"],
  ])("confirms before %s", async (button, title) => {
    show();
    const user = userEvent.setup();
    wrap(<ManagementAppointmentDetail />, "/admin/appointments/ap-1");
    await screen.findByText("Aurelia");
    await user.click(screen.getByRole("button", { name: button }));
    expect(await screen.findByRole("dialog", { name: title })).toBeInTheDocument();
  });
});

// ---- visibility history ----------------------------------------------------

describe("visibility history", () => {
  beforeEach(() => {
    permissions = ["Bookings.View", "Bookings.Manage", "Users.View"];
    vi.spyOn(service, "getAppointment").mockResolvedValue(detail() as never);
  });
  afterEach(() => vi.restoreAllMocks());

  const entry = (over = {}) => ({
    id: "vh-1",
    changedByUserId: "11111111-2222-3333-4444-555555555555",
    previousValue: true,
    newValue: false,
    internalReason: "Awaiting venue confirmation",
    createdAtUtc: "2026-01-25T09:00:00Z",
    ...over,
  });

  it("renders the change, the actor and the reason", async () => {
    vi.spyOn(service, "getAppointmentVisibilityHistory").mockResolvedValue([entry()] as never);
    vi.spyOn(adminService, "listUsers").mockResolvedValue({
      items: [{ id: "11111111-2222-3333-4444-555555555555", displayName: "R. Mokoena", email: "r@x.test", accountStatus: "Active", roles: [], lastLoginAtUtc: null, createdAtUtc: "" }],
      totalCount: 1, page: 1, pageSize: 100,
    } as never);
    wrap(<ManagementAppointmentDetail />, "/admin/appointments/ap-1");
    expect(await screen.findByText(/Visible → Hidden/)).toBeInTheDocument();
    expect(await screen.findByText(/R. Mokoena/)).toBeInTheDocument();
    expect(screen.getByText(/Awaiting venue confirmation/)).toBeInTheDocument();
  });

  it("still renders when the actor cannot be resolved", async () => {
    // The backend records only changedByUserId — there is no display name on the
    // DTO. An unresolved actor must degrade to a traceable id, never blank the panel.
    vi.spyOn(service, "getAppointmentVisibilityHistory").mockResolvedValue([entry()] as never);
    vi.spyOn(adminService, "listUsers").mockRejectedValue(new Error("forbidden"));
    wrap(<ManagementAppointmentDetail />, "/admin/appointments/ap-1");
    expect(await screen.findByText(/Visible → Hidden/)).toBeInTheDocument();
    expect(screen.getByText(/User 11111111/)).toBeInTheDocument();
  });

  it("says so when nothing has changed", async () => {
    vi.spyOn(service, "getAppointmentVisibilityHistory").mockResolvedValue([] as never);
    vi.spyOn(adminService, "listUsers").mockResolvedValue({
      items: [], totalCount: 0, page: 1, pageSize: 100,
    } as never);
    wrap(<ManagementAppointmentDetail />, "/admin/appointments/ap-1");
    expect(await screen.findByText(/has not been changed/i)).toBeInTheDocument();
  });

  it("survives a failed history request without breaking the page", async () => {
    vi.spyOn(service, "getAppointmentVisibilityHistory").mockRejectedValue(new Error("boom"));
    vi.spyOn(adminService, "listUsers").mockResolvedValue({
      items: [], totalCount: 0, page: 1, pageSize: 100,
    } as never);
    wrap(<ManagementAppointmentDetail />, "/admin/appointments/ap-1");
    expect(await screen.findByText("Aurelia")).toBeInTheDocument();
    // The appointment itself still renders; only the panel degrades.
    expect(await screen.findByText(/history could not be loaded/i)).toBeInTheDocument();
  });

  it("does not expect a display name the backend never sends", () => {
    const source = read("src/services/appointmentService.ts");
    expect(source).toContain("changedByUserId");
    expect(source).not.toContain("changedByDisplayName");
  });
});

// ---- DTO separation --------------------------------------------------------

describe("client and management records stay separate", () => {
  it("keeps creation defaulting to visible, matching the backend", () => {
    const source = read("src/services/appointmentService.ts");
    expect(source).toContain("isVisibleToClient?: boolean;");
    expect(source).toMatch(/Defaults to TRUE/i);
  });

  it("keeps the two services in separate modules with separate types", () => {
    const management = read("src/services/appointmentService.ts");
    const client = read("src/services/clientAppointmentService.ts");
    expect(client).toContain("ClientAppointmentDto");
    expect(management).not.toContain("ClientAppointmentDto");
    expect(client).not.toContain("export interface AppointmentDto");
    // The management record has fields the client one must never DECLARE. The
    // client module names them in prose precisely so the omission is deliberate
    // and rereadable, so the check is for a property declaration, not a mention.
    const declares = (source: string, field: string) =>
      source.split("\n").some((line) => line.trim().startsWith(`${field}:`));

    for (const field of ["privateLocationDetails", "settlementStatus", "talentInstructions"]) {
      expect(declares(management, field), `management declares ${field}`).toBe(true);
      expect(declares(client, field), `client must not declare ${field}`).toBe(false);
    }
  });
});
