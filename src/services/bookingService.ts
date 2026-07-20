/**
 * Engagement date/time/status PRESENTATION, shared by the management console and the
 * talent portal.
 *
 * This module no longer calls the API. The client-facing booking routes it used to wrap
 * (`/client/bookings`, its detail, settlement, change and cancellation requests) are
 * withdrawn: Lustra is concierge-led, the appointment is management's internal record,
 * and a client who could fetch one would be reading operational data they were never
 * shown. See ClientBookingsController in the API for the full list and the reasoning.
 *
 * Only formatting helpers remain. Do not add a fetch back to this file.
 */

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
