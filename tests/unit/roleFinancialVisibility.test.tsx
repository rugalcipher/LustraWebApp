import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import * as clientService from "@/services/clientAppointmentService";
import * as talentService from "@/services/talentEngagementService";
import * as mgmtService from "@/services/appointmentService";
import * as adminService from "@/services/adminService";
import ClientAppointmentDetail from "@/pages/ClientAppointmentDetail";
import TalentBookingDetail from "@/pages/TalentBookingDetail";
import ManagementAppointmentDetail from "@/pages/ManagementAppointmentDetail";

/**
 * Role-specific financial visibility.
 *
 * The same priced booking is projected three ways, and the point of this suite is that each
 * projection is a SEPARATE server DTO rendered by a SEPARATE page — never one broad shape
 * filtered in the browser. The client is shown their booking total and never the payout or
 * the margin; the talent is shown their payout and never the client rate or the margin;
 * management is shown the whole breakdown. A leak here is a real disclosure of money, so the
 * assertions check the rendered text for the words that must not appear, not just that the
 * right words do.
 */

const ROOT = join(__dirname, "../..");
const read = (p: string) => readFileSync(join(ROOT, p), "utf8");

let permissions: string[] = [];
vi.mock("@/auth/PrincipalContext", () => ({
  usePrincipal: () => ({
    principal: { isAuthenticated: true, permissions, roles: ["management"], userId: "mu-1", isLoading: false },
    hasPermission: (p: string) => permissions.includes(p),
    isLoading: false,
  }),
}));

function wrap(ui: React.ReactElement, route: string, path: string) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[route]}>
        <Routes>
          <Route path={path} element={ui} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

const body = () => document.body.textContent ?? "";

// ---- client: booking total only -------------------------------------------

describe("client sees only the booking total", () => {
  afterEach(() => vi.restoreAllMocks());

  const detail = (over = {}) => ({
    id: "ap-1",
    reference: "LB-2026-0001",
    status: "Confirmed",
    confirmedDate: "2026-02-14",
    startTime: "19:00:00",
    endTime: "22:00:00",
    durationMinutes: 120,
    timeZone: "Africa/Johannesburg",
    cityName: "Cape Town",
    venueType: "Restaurant",
    venueName: "The Silo",
    generalLocation: "V&A Waterfront",
    engagementCategory: "Dinner",
    clientVisibleNotes: null,
    createdAtUtc: "2026-01-20T10:00:00Z",
    completedAtUtc: null,
    cancelledAtUtc: null,
    talent: { talentProfileId: "tp-1", slug: "aurelia", displayName: "Aurelia", coverImage: null, images: [] },
    conversationId: "conv-1",
    bookingConversationId: null,
    addressSnapshot: null,
    bookingTotalMinor: 400_000,
    bookingCurrency: "ZAR",
    ...over,
  });

  it("renders the client's booking total", async () => {
    vi.spyOn(clientService, "getClientAppointment").mockResolvedValue(detail() as never);
    wrap(<ClientAppointmentDetail />, "/app/appointments/ap-1", "/app/appointments/:id");
    expect(await screen.findByText(/Booking total/i)).toBeInTheDocument();
    // R4,000 total for the 2h booking; the currency symbol may vary by locale, the digits do not.
    expect(body()).toMatch(/4[.,\s]?000/);
  });

  it("never renders the payout or the margin", async () => {
    vi.spyOn(clientService, "getClientAppointment").mockResolvedValue(detail() as never);
    wrap(<ClientAppointmentDetail />, "/app/appointments/ap-1", "/app/appointments/:id");
    await screen.findByText(/Booking total/i);
    for (const leak of ["payout", "Payout", "margin", "Margin", "2,000", "2000"]) {
      expect(body()).not.toContain(leak);
    }
  });

  it("shows no total when the booking was never priced", async () => {
    vi.spyOn(clientService, "getClientAppointment").mockResolvedValue(
      detail({ bookingTotalMinor: null, bookingCurrency: null }) as never
    );
    wrap(<ClientAppointmentDetail />, "/app/appointments/ap-1", "/app/appointments/:id");
    await screen.findByText("Aurelia");
    expect(screen.queryByText(/Booking total/i)).toBeNull();
  });
});

// ---- talent: payout only ---------------------------------------------------

describe("talent sees only their payout", () => {
  afterEach(() => vi.restoreAllMocks());

  const detail = (over = {}) => ({
    id: "bk-1",
    bookingReference: "LB-2026-0001",
    engagementCategory: "Dinner",
    status: "Confirmed",
    confirmedDate: "2026-02-14",
    startTime: "19:00:00",
    endTime: "22:00:00",
    durationMinutes: 120,
    timeZone: "Africa/Johannesburg",
    cityName: "Cape Town",
    venueType: "Restaurant",
    venueName: "The Silo",
    generalLocation: "V&A Waterfront",
    privateLocationDetails: null,
    talentInstructions: null,
    addressSnapshot: null,
    talentHourlyPayoutMinor: 100_000,
    talentTotalPayoutMinor: 200_000,
    payoutCurrency: "ZAR",
    ...over,
  });

  it("renders the talent's own payout", async () => {
    vi.spyOn(talentService, "getMyBooking").mockResolvedValue(detail() as never);
    wrap(<TalentBookingDetail />, "/talent/bookings/bk-1", "/talent/bookings/:id");
    expect(await screen.findByText(/Your payout/i)).toBeInTheDocument();
    // R2,000 total payout for the booking.
    expect(body()).toMatch(/2[.,\s]?000/);
  });

  it("never renders the client rate, the booking total or the margin", async () => {
    vi.spyOn(talentService, "getMyBooking").mockResolvedValue(detail() as never);
    wrap(<TalentBookingDetail />, "/talent/bookings/bk-1", "/talent/bookings/:id");
    await screen.findByText(/Your payout/i);
    for (const leak of ["margin", "Margin", "Client rate", "client rate", "Booking total", "4,000", "4000"]) {
      expect(body()).not.toContain(leak);
    }
  });
});

// ---- management: the full breakdown ---------------------------------------

describe("management sees the full breakdown", () => {
  beforeEach(() => {
    permissions = ["Bookings.View", "Bookings.Manage", "TalentCommercialTerms.View"];
    vi.spyOn(mgmtService, "getAppointmentVisibilityHistory").mockResolvedValue([] as never);
    vi.spyOn(adminService, "listUsers").mockResolvedValue({
      items: [], totalCount: 0, page: 1, pageSize: 100,
    } as never);
  });
  afterEach(() => vi.restoreAllMocks());

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
    durationMinutes: 120,
    timeZone: "Africa/Johannesburg",
    cityId: null,
    venueTypeId: null,
    venueName: "The Silo",
    generalLocation: "V&A Waterfront",
    privateLocationDetails: "Staff entrance, Dock Road",
    agreedAmount: null,
    additionalCosts: null,
    currencyCode: "ZAR",
    clientVisibleNotes: null,
    talentInstructions: null,
    assignedManagementUserId: "mu-1",
    createdAtUtc: "2026-01-20T10:00:00Z",
    conversationId: "conv-1",
    bookingConversationId: null,
    isVisibleToClient: true,
    addressSnapshot: null,
    history: [{ fromStatus: null, toStatus: "Confirmed", reason: null, createdAtUtc: "2026-01-20T10:00:00Z" }],
    internalNotes: [],
    financials: {
      pricingMode: "GradeLinked",
      gradeId: "gr-1",
      gradeName: "Gold",
      currencyCode: "ZAR",
      clientHourlyRateMinor: 200_000,
      clientTotalMinor: 400_000,
      talentHourlyPayoutMinor: 100_000,
      talentTotalPayoutMinor: 200_000,
      grossMarginMinor: 200_000,
      pricingOverridden: false,
      pricingOverrideReason: null,
      pricedAtUtc: "2026-01-20T10:00:00Z",
    },
    ...over,
  });

  it("renders the full breakdown including the gross margin", async () => {
    vi.spyOn(mgmtService, "getAppointment").mockResolvedValue(detail() as never);
    wrap(<ManagementAppointmentDetail />, "/admin/appointments/ap-1", "/admin/appointments/:id");
    expect(await screen.findByText(/Financials/i)).toBeInTheDocument();
    expect(screen.getByText(/Gross margin/i)).toBeInTheDocument();
    // Client total 4,000, talent total 2,000 and margin 2,000 all present for management.
    expect(body()).toMatch(/4[.,\s]?000/);
    expect(body()).toMatch(/2[.,\s]?000/);
  });

  it("marks an overridden price and shows the reason", async () => {
    vi.spyOn(mgmtService, "getAppointment").mockResolvedValue(
      detail({
        financials: {
          ...detail().financials,
          pricingOverridden: true,
          pricingOverrideReason: "VIP rate agreed",
        },
      }) as never
    );
    wrap(<ManagementAppointmentDetail />, "/admin/appointments/ap-1", "/admin/appointments/:id");
    expect(await screen.findByText(/Overridden/i)).toBeInTheDocument();
    expect(screen.getByText(/VIP rate agreed/)).toBeInTheDocument();
  });
});

// ---- source guards ---------------------------------------------------------

describe("the projections stay separate at the source", () => {
  it("keeps the management financial shape out of the client and talent services", () => {
    for (const file of ["src/services/clientAppointmentService.ts", "src/services/talentEngagementService.ts"]) {
      const source = read(file);
      expect(source).not.toContain("@/services/appointmentService");
      expect(source).not.toContain("grossMargin");
      expect(source).not.toContain("BookingFinancialsDto");
    }
  });

  it("never puts the payout or the margin on the client DTO", () => {
    const source = read("src/services/clientAppointmentService.ts");
    for (const field of ["talentHourlyPayoutMinor", "talentTotalPayoutMinor", "grossMarginMinor", "clientHourlyRateMinor"]) {
      expect(source).not.toContain(field);
    }
  });

  it("never puts the client rate or the margin on the talent DTO", () => {
    const source = read("src/services/talentEngagementService.ts");
    for (const field of ["clientHourlyRateMinor", "clientTotalMinor", "bookingTotalMinor", "grossMarginMinor"]) {
      expect(source).not.toContain(field);
    }
  });
});
