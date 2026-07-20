import { api } from "@/api/client";

/**
 * Client bookings, settlement and reviews — `/api/v1/client/bookings`.
 *
 * Settlement here is a MANUALLY MAINTAINED external status. The API processes no money:
 * there is no checkout, no card, no payout and no automated reconciliation, and the copy
 * in this module is written so a client cannot mistake it for any of those.
 */

/** Mirrors the backend `BookingListItemDto`. */
export interface BookingListItemDto {
  id: string;
  bookingReference: string;
  inquiryId: string;
  talentProfileId: string;
  talentDisplayName: string;
  status: string;
  confirmedDate: string | null;
  startTime: string | null;
  currencyCode: string;
  agreedAmount: number | null;
  createdAtUtc: string;
}

/** Mirrors the backend `ClientBookingDto` — no private location, no internal notes. */
export interface ClientBookingDto {
  id: string;
  bookingReference: string;
  inquiryId: string;
  talentProfileId: string;
  talentDisplayName: string;
  engagementCategory: string;
  status: string;
  confirmedDate: string | null;
  startTime: string | null;
  endTime: string | null;
  durationMinutes: number | null;
  timeZone: string;
  cityName: string | null;
  venueType: string | null;
  venueName: string | null;
  generalLocation: string | null;
  agreedAmount: number | null;
  additionalCosts: number | null;
  currencyCode: string;
  settlementStatus: string;
  clientVisibleNotes: string | null;
  createdAtUtc: string;
}

/** Mirrors the backend `ClientSettlementDto` — status and the client-visible note only. */
export interface ClientSettlementDto {
  bookingId: string;
  bookingReference: string;
  status: string;
  currencyCode: string;
  agreedAmount: number | null;
  clientVisibleNote: string | null;
}

/** Mirrors the backend `ClientReviewDto`. */
export interface ClientReviewDto {
  id: string;
  bookingId: string;
  talentProfileId: string;
  rating: number;
  title: string | null;
  body: string;
  status: string;
  talentResponse: string | null;
  createdAtUtc: string;
}

/** Mirrors the backend `CreateReviewRequest`. */
export interface CreateReviewInput {
  rating: number;
  title: string | null;
  body: string;
}

export function listBookings(signal?: AbortSignal): Promise<BookingListItemDto[]> {
  return api.get<BookingListItemDto[]>("/client/bookings", { signal });
}

export function getBooking(bookingId: string, signal?: AbortSignal): Promise<ClientBookingDto> {
  return api.get<ClientBookingDto>(`/client/bookings/${bookingId}`, { signal });
}

export function getSettlement(bookingId: string, signal?: AbortSignal): Promise<ClientSettlementDto> {
  return api.get<ClientSettlementDto>(`/client/bookings/${bookingId}/settlement`, { signal });
}

export function requestBookingChange(bookingId: string, message: string): Promise<void> {
  return api.post<void>(`/client/bookings/${bookingId}/request-change`, { message });
}

export function requestBookingCancellation(bookingId: string, message: string): Promise<void> {
  return api.post<void>(`/client/bookings/${bookingId}/request-cancellation`, { message });
}

export function getReview(bookingId: string, signal?: AbortSignal): Promise<ClientReviewDto> {
  return api.get<ClientReviewDto>(`/client/bookings/${bookingId}/review`, { signal });
}

export function createReview(bookingId: string, input: CreateReviewInput): Promise<{ reviewId: string }> {
  return api.post<{ reviewId: string }>(`/client/bookings/${bookingId}/review`, input);
}

// ---- presentation ----------------------------------------------------------

/** Backend `BookingStatus` → client-facing label and tone. */
const STATUS_PRESENTATION: Record<string, { label: string; tone: "confirmed" | "active" | "closed" | "warning" }> = {
  Draft: { label: "Being prepared", tone: "active" },
  Confirmed: { label: "Confirmed", tone: "confirmed" },
  Scheduled: { label: "Scheduled", tone: "confirmed" },
  InProgress: { label: "In progress", tone: "active" },
  Completed: { label: "Completed", tone: "closed" },
  Declined: { label: "Declined", tone: "closed" },
  Cancelled: { label: "Cancelled", tone: "closed" },
  NoShow: { label: "Not attended", tone: "warning" },
  UnderReview: { label: "Under review", tone: "warning" },
};

export function presentBookingStatus(status: string): {
  label: string;
  tone: "confirmed" | "active" | "closed" | "warning";
} {
  return STATUS_PRESENTATION[status] ?? { label: status, tone: "active" };
}

/**
 * Backend `SettlementStatus` → client-facing label and explanation.
 *
 * Every label is worded to make clear the money moves OUTSIDE this platform. "Confirmed"
 * means management confirmed receipt externally — never that this app took a payment.
 */
const SETTLEMENT_PRESENTATION: Record<string, { label: string; detail: string }> = {
  NotDiscussed: {
    label: "Not yet discussed",
    detail: "Management has not issued settlement instructions for this booking yet.",
  },
  InstructionsIssued: {
    label: "Instructions issued",
    detail: "Management has sent you settlement instructions. Arrangements are handled directly with them.",
  },
  AwaitingExternalConfirmation: {
    label: "Awaiting confirmation",
    detail: "Management is confirming settlement outside the platform.",
  },
  ConfirmedExternally: {
    label: "Confirmed",
    detail: "Management has confirmed settlement was completed outside the platform.",
  },
  PartiallyConfirmed: {
    label: "Partially confirmed",
    detail: "Management has confirmed part of the settlement. Speak to them for the balance.",
  },
  Waived: { label: "Waived", detail: "Management has waived settlement for this booking." },
  RefundedExternally: {
    label: "Refunded",
    detail: "Management has confirmed a refund was arranged outside the platform.",
  },
  Disputed: { label: "Disputed", detail: "Settlement is in dispute. Management will be in touch." },
};

export function presentSettlement(status: string): { label: string; detail: string } {
  return (
    SETTLEMENT_PRESENTATION[status] ?? {
      label: status,
      detail: "Settlement is arranged directly with Lustra management, outside the platform.",
    }
  );
}

/**
 * Which tab a booking belongs to.
 *
 * Derived from the real `BookingStatus` values rather than a date comparison, so a booking
 * management has cancelled never sits in "Upcoming" merely because its date is in future.
 */
export type BookingTab = "Upcoming" | "Completed" | "Cancelled";

const UPCOMING = new Set(["Draft", "Confirmed", "Scheduled", "InProgress", "UnderReview"]);
const CLOSED = new Set(["Cancelled", "Declined", "NoShow"]);

export function tabFor(status: string): BookingTab {
  if (status === "Completed") return "Completed";
  if (CLOSED.has(status)) return "Cancelled";
  if (UPCOMING.has(status)) return "Upcoming";
  // An unrecognised status must still be reachable somewhere rather than silently vanish.
  return "Upcoming";
}

/**
 * Only a completed booking can be reviewed — mirrors `ReviewErrors.NotEligible`.
 * A UI affordance only; the server enforces it.
 */
export function isReviewable(status: string): boolean {
  return status === "Completed";
}

/** Statuses from which a client may still ask management to change or cancel. */
export function canRequestChanges(status: string): boolean {
  return UPCOMING.has(status);
}

/**
 * Format a backend `DateOnly` (`2026-07-25`) for display.
 *
 * Built from the parts rather than `new Date(iso)`, because that parses a bare date as
 * UTC midnight and then renders it in local time — which shows the previous day to every
 * client west of Greenwich. A booking date is a calendar date, not an instant.
 */
export function formatBookingDate(isoDate: string | null | undefined): string {
  if (!isoDate) return "Date to confirm";
  const [year, month, day] = isoDate.split("-").map(Number);
  if (!year || !month || !day) return isoDate;
  return new Date(year, month - 1, day).toLocaleDateString(undefined, {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/** Format a backend `TimeOnly` (`19:00:00`) as `19:00`. */
export function formatBookingTime(time: string | null | undefined): string | null {
  return time ? time.slice(0, 5) : null;
}
