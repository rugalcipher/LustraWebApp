import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ROUTES, navForGroup, navMetas } from "@/app/routeRegistry";
import * as service from "@/services/clientAppointmentService";
import { ApiError } from "@/api/problemDetails";
import ClientAppointments from "@/pages/ClientAppointments";
import ClientAppointmentDetail from "@/pages/ClientAppointmentDetail";

/**
 * The client's own appointments.
 *
 * The privacy assertions are the point of this suite. The client DTO is a
 * deliberately narrow projection, and the ways it gets widened by accident are
 * predictable: importing the management service "just for a type", rendering a
 * field that happens to be present, or explaining a 404 helpfully enough to
 * disclose that something exists.
 */

const ROOT = join(__dirname, "../..");
const read = (p: string) => readFileSync(join(ROOT, p), "utf8");
const paths = ROUTES.map((r) => r.path);

function wrap(ui: React.ReactElement, route = "/app/appointments") {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[route]}>
        <Routes>
          <Route path="/app/appointments" element={ui} />
          <Route path="/app/appointments/:id" element={ui} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

const listItem = (over = {}) => ({
  id: "ap-1",
  reference: "LB-2026-0001",
  status: "Confirmed",
  confirmedDate: "2026-02-14",
  startTime: "19:00:00",
  endTime: "22:00:00",
  timeZone: "Africa/Johannesburg",
  cityName: "Cape Town",
  venueName: "The Silo",
  engagementCategory: "Dinner",
  talentProfileId: "tp-1",
  talentDisplayName: "Aurelia",
  talentCoverImage: { url: "https://cdn.test/aurelia.jpg", srcSet: null, width: 800, height: 1200, aspectRatio: 0.66 },
  createdAtUtc: "2026-01-20T10:00:00Z",
  ...over,
});

const detail = (over = {}) => ({
  id: "ap-1",
  reference: "LB-2026-0001",
  status: "Confirmed",
  confirmedDate: "2026-02-14",
  startTime: "19:00:00",
  endTime: "22:00:00",
  durationMinutes: 180,
  timeZone: "Africa/Johannesburg",
  cityName: "Cape Town",
  venueType: "Restaurant",
  venueName: "The Silo",
  generalLocation: "V&A Waterfront",
  engagementCategory: "Dinner",
  clientVisibleNotes: "Your table is booked under Lustra.",
  createdAtUtc: "2026-01-20T10:00:00Z",
  completedAtUtc: null,
  cancelledAtUtc: null,
  talent: {
    talentProfileId: "tp-1",
    slug: "aurelia",
    displayName: "Aurelia",
    coverImage: { url: "https://cdn.test/aurelia.jpg", srcSet: null, width: 800, height: 1200, aspectRatio: 0.66 },
    images: [],
  },
  conversationId: "conv-1",
  ...over,
});

// ---- navigation ------------------------------------------------------------

describe("client bottom navigation", () => {
  const clientNav = navForGroup("client");

  it("offers five destinations in order", () => {
    expect(clientNav.map((n) => n.label)).toEqual([
      "Discover", "Saved", "Messages", "Appointments", "Profile",
    ]);
  });

  it("makes Appointments a real destination, not a dead item", () => {
    const item = clientNav.find((n) => n.label === "Appointments");
    expect(item?.to).toBe("/app/appointments");
    expect(paths).toContain("/app/appointments");
  });

  it("lays the bar out with one column per destination", () => {
    // Four links previously sat in a hardcoded six-column grid, which pushed
    // every item off-centre. The column count now follows the link count.
    const shell = read("src/layouts/AppShell.jsx");
    expect(shell).toContain("COLUMNS[nav.length]");
    expect(shell).not.toContain('grid-cols-6 px-2');
  });

  it("keeps every column able to shrink, so 320px cannot overflow", () => {
    const shell = read("src/layouts/AppShell.jsx");
    expect(shell).toContain("min-w-0");
    expect(shell).toContain("truncate");
  });

  it("respects the safe area and marks the active destination", () => {
    const shell = read("src/layouts/AppShell.jsx");
    expect(shell).toContain("safe-bottom");
    expect(shell).toContain('aria-current={active ? "page" : undefined}');
  });

  it("registers the detail route for deep links and refreshes", () => {
    expect(paths).toContain("/app/appointments/:id");
    // The detail route is reachable but is not a second menu item.
    const nav = ROUTES.flatMap((r) => navMetas(r.nav)).filter((m) => m.group === "client");
    expect(nav.filter((m) => m.label === "Appointments")).toHaveLength(1);
  });
});

// ---- API surface -----------------------------------------------------------

describe("client appointment API", () => {
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

  const lastUrl = () => new URL(calls[calls.length - 1].url, "https://example.test");

  it("lists from /client/appointments", async () => {
    await service.listClientAppointments();
    expect(lastUrl().pathname.endsWith("/client/appointments")).toBe(true);
  });

  it("reads one from /client/appointments/{id}", async () => {
    await service.getClientAppointment("ap-1");
    expect(lastUrl().pathname.endsWith("/client/appointments/ap-1")).toBe(true);
  });

  it("never duplicates the /api/v1 prefix", async () => {
    await service.listClientAppointments();
    expect(lastUrl().pathname).not.toContain("/api/v1/api/v1");
  });

  it.each(["Upcoming", "Past", "Cancelled", "All"] as const)("maps the %s scope", async (scope) => {
    await service.listClientAppointments({ scope });
    expect(lastUrl().searchParams.get("scope")).toBe(scope);
  });

  it("defaults to Upcoming rather than everything", async () => {
    await service.listClientAppointments();
    expect(lastUrl().searchParams.get("scope")).toBe("Upcoming");
  });

  it("sends pagination the backend binds", async () => {
    await service.listClientAppointments({ page: 3, pageSize: 20 });
    expect(lastUrl().searchParams.get("page")).toBe("3");
    expect(lastUrl().searchParams.get("pageSize")).toBe("20");
  });

  it("NEVER sends a client id", async () => {
    // The backend takes the client from the bearer token. A client id parameter
    // would be the very thing through which one client could read another's.
    await service.listClientAppointments({ scope: "All", page: 1 });
    await service.getClientAppointment("ap-1");
    for (const call of calls) {
      const url = new URL(call.url, "https://example.test");
      for (const key of [...url.searchParams.keys()]) {
        expect(key.toLowerCase()).not.toContain("clientid");
        expect(key.toLowerCase()).not.toContain("userid");
      }
      expect(call.init.body ?? "").not.toContain("clientUserId");
    }
  });

  it("keeps the client service free of the management module", () => {
    // Deriving a client model by deleting fields from a management model means
    // the next field added to the management DTO is disclosed by default.
    const source = read("src/services/clientAppointmentService.ts");
    expect(source).not.toMatch(/^import .*appointmentService/m);
    expect(source).not.toContain("/management/");
  });
});

// ---- list page -------------------------------------------------------------

describe("client appointment list", () => {
  afterEach(() => vi.restoreAllMocks());

  const page = (items: unknown[], totalCount = items.length) =>
    vi.spyOn(service, "listClientAppointments").mockResolvedValue({
      items, totalCount, page: 1, pageSize: 20,
    } as never);

  it("renders the client-safe card fields", async () => {
    page([listItem()]);
    wrap(<ClientAppointments />);
    expect(await screen.findByText("Aurelia")).toBeInTheDocument();
    expect(screen.getByText("LB-2026-0001")).toBeInTheDocument();
    expect(screen.getByText(/Saturday 14 February 2026/)).toBeInTheDocument();
    expect(screen.getByText(/19:00 – 22:00/)).toBeInTheDocument();
    expect(screen.getByText(/The Silo/)).toBeInTheDocument();
  });

  it("offers View appointment and Message Management on every card", async () => {
    page([listItem()]);
    wrap(<ClientAppointments />);
    expect(await screen.findByRole("link", { name: /View appointment/i })).toHaveAttribute(
      "href",
      "/app/appointments/ap-1"
    );
    expect(screen.getByRole("link", { name: /Message Management/i })).toBeInTheDocument();
  });

  it("handles a talent with no approved cover image", async () => {
    page([listItem({ talentCoverImage: null })]);
    wrap(<ClientAppointments />);
    // A lettered placeholder, not a broken frame and never another talent's picture.
    expect(await screen.findByText("Aurelia")).toBeInTheDocument();
    expect(screen.queryByRole("img")).toBeNull();
  });

  it("switches scope and refetches", async () => {
    const spy = page([listItem()]);
    const user = userEvent.setup();
    wrap(<ClientAppointments />);
    await screen.findByText("Aurelia");
    await user.click(screen.getByRole("tab", { name: "Past" }));
    await waitFor(() =>
      expect(spy).toHaveBeenLastCalledWith(expect.objectContaining({ scope: "Past" }), expect.anything())
    );
  });

  it("shows an empty state instead of invented rows", async () => {
    page([], 0);
    wrap(<ClientAppointments />);
    expect(await screen.findByText(/Nothing here yet/i)).toBeInTheDocument();
  });

  it("offers error recovery", async () => {
    vi.spyOn(service, "listClientAppointments").mockRejectedValue(new Error("offline"));
    wrap(<ClientAppointments />);
    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Try again/i })).toBeInTheDocument();
  });
});

// ---- detail page -----------------------------------------------------------

describe("client appointment detail", () => {
  afterEach(() => vi.restoreAllMocks());

  const show = (over = {}) =>
    vi.spyOn(service, "getClientAppointment").mockResolvedValue(detail(over) as never);

  it("calls /client/appointments/{id} and renders the client-safe record", async () => {
    const spy = show();
    wrap(<ClientAppointmentDetail />, "/app/appointments/ap-1");
    await waitFor(() => expect(spy).toHaveBeenCalledWith("ap-1", expect.anything()));
    expect(await screen.findByText("Aurelia")).toBeInTheDocument();
    expect(screen.getByText("LB-2026-0001")).toBeInTheDocument();
    expect(screen.getByText(/3 hours/)).toBeInTheDocument();
    expect(screen.getByText(/V&A Waterfront/)).toBeInTheDocument();
    expect(screen.getByText(/Your table is booked under Lustra/)).toBeInTheDocument();
  });

  it("renders only approved public talent imagery", async () => {
    show();
    wrap(<ClientAppointmentDetail />, "/app/appointments/ap-1");
    const img = await screen.findByAltText("Aurelia");
    expect(img).toHaveAttribute("src", "https://cdn.test/aurelia.jpg");
  });

  it("copes with no cover image", async () => {
    show({ talent: { ...detail().talent, coverImage: null } });
    wrap(<ClientAppointmentDetail />, "/app/appointments/ap-1");
    expect(await screen.findByText("Aurelia")).toBeInTheDocument();
  });

  it("offers Message Management, pointing at the linked conversation", async () => {
    show();
    wrap(<ClientAppointmentDetail />, "/app/appointments/ap-1");
    const links = await screen.findAllByRole("link", { name: /Message Management/i });
    expect(links[0]).toHaveAttribute("href", "/app/messages/conv-1");
  });

  it("falls back to the inbox when no conversation is linked", async () => {
    show({ conversationId: null });
    wrap(<ClientAppointmentDetail />, "/app/appointments/ap-1");
    const links = await screen.findAllByRole("link", { name: /Message Management/i });
    expect(links[0]).toHaveAttribute("href", "/app/messages");
  });

  it("treats a hidden appointment exactly like one that never existed", async () => {
    vi.spyOn(service, "getClientAppointment").mockRejectedValue(
      ApiError.fromProblem(404, { title: "Not Found" })
    );
    wrap(<ClientAppointmentDetail />, "/app/appointments/ap-1");
    expect(await screen.findByText("Appointment unavailable")).toBeInTheDocument();

    // Nothing may hint that the appointment exists and was concealed.
    const body = document.body.textContent ?? "";
    for (const leak of ["hidden", "Hidden", "management hid", "concealed", "not visible", "permission"]) {
      expect(body).not.toContain(leak);
    }
  });

  it("never renders a management field", async () => {
    show();
    wrap(<ClientAppointmentDetail />, "/app/appointments/ap-1");
    await screen.findByText("Aurelia");
    const body = document.body.textContent ?? "";
    for (const leak of ["Internal", "Private location", "Settlement", "Agreed", "Talent instructions"]) {
      expect(body).not.toContain(leak);
    }
  });

  it("keeps the management DTO out of both client pages", () => {
    for (const file of ["src/pages/ClientAppointments.jsx", "src/pages/ClientAppointmentDetail.jsx"]) {
      const source = read(file);
      expect(source).not.toContain("@/services/appointmentService");
      expect(source).not.toContain("features/appointments");
      for (const field of [
        "privateLocationDetails", "agreedAmount", "additionalCosts", "settlementStatus",
        "talentInstructions", "internalNotes", "assignedManagementUserId", "isVisibleToClient",
      ]) {
        expect(source).not.toContain(field);
      }
    }
  });

  it("does not offer the client a lifecycle action", () => {
    // Lustra is concierge-led: reschedule, cancel and confirm are arranged by
    // talking to management, and this surface must not grow one.
    const source = read("src/pages/ClientAppointmentDetail.jsx");
    for (const action of ["cancelAppointment", "rescheduleAppointment", "useMutation"]) {
      expect(source).not.toContain(action);
    }
  });
});
