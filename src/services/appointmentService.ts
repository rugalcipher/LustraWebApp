import { api } from "@/api/client";
import type { PagedResult } from "@/services/discoveryService";

/**
 * Internal appointments — Lustra's operational schedule.
 *
 * Management arranges an engagement in conversation with the client, confirms the slot
 * with the talent privately, and then records it here. The client never sees this record:
 * there is no client-facing appointment route, and the client booking API is withdrawn.
 * Do not add one.
 *
 * The backend still calls this domain `Booking` (`/management/bookings`). That naming is
 * kept deliberately — renaming a live API to match display terminology would be pure risk
 * — but everything the user reads says APPOINTMENT or INTERNAL BOOKING, never anything
 * implying the client completed an online booking.
 */

/** Mirrors `ManagementBookingDto`. */
export interface AppointmentDto {
  id: string;
  bookingReference: string;
  inquiryId: string;
  acceptedProposalId: string | null;
  clientUserId: string;
  talentProfileId: string;
  talentDisplayName: string;
  engagementCategory: string;
  status: string;
  settlementStatus: string;
  confirmedDate: string | null;
  startTime: string | null;
  endTime: string | null;
  durationMinutes: number | null;
  timeZone: string;
  cityId: string | null;
  venueTypeId: string | null;
  venueName: string | null;
  generalLocation: string | null;
  /** The exact address. Management and the assigned talent only. */
  privateLocationDetails: string | null;
  agreedAmount: number | null;
  additionalCosts: number | null;
  currencyCode: string;
  clientVisibleNotes: string | null;
  /** The talent's operational brief. Distinct from notes written for the client. */
  talentInstructions: string | null;
  assignedManagementUserId: string | null;
  createdAtUtc: string;
  conversationId: string | null;
  /** Whether the client can currently see this appointment. */
  isVisibleToClient: boolean;
  history: { fromStatus: string | null; toStatus: string; reason: string | null; createdAtUtc: string }[];
  internalNotes: { id: string; authorUserId: string; note: string; createdAtUtc: string }[];
}

/** Mirrors `BookingListItemDto`. */
export interface AppointmentListItemDto {
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
  /**
   * A MANAGEMENT signal. Safe on this row because it already carries
   * `agreedAmount` and has never been a client-facing shape — the client's own
   * list is `ClientAppointmentListItemDto`, which cannot contain a hidden
   * appointment at all and so has no need of the flag.
   */
  isVisibleToClient: boolean;
}

/** Mirrors `CalendarBookingDto`. */
export interface CalendarAppointmentDto {
  id: string;
  bookingReference: string;
  talentProfileId: string;
  talentDisplayName: string;
  status: string;
  confirmedDate: string | null;
  startTime: string | null;
  endTime: string | null;
}

/** Mirrors `ConflictDto`. */
export interface AppointmentConflictDto {
  talentProfileId: string;
  date: string;
  bookingId: string;
  bookingReference: string;
  conflictingBookingId: string;
  conflictingReference: string;
}

/**
 * What management submits to record an appointment.
 *
 * `talentAvailabilityConfirmed` is the operational acknowledgement that the slot was
 * already agreed with the talent. The API rejects the request without it — it is not a
 * talent-facing acceptance step, which Lustra deliberately does not have.
 */
export interface CreateAppointmentInput {
  clientUserId: string;
  talentProfileId: string;
  conversationId?: string | null;
  engagementCategoryId: string;
  confirmedDate?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  durationMinutes?: number | null;
  cityId?: string | null;
  venueTypeId?: string | null;
  venueName?: string | null;
  generalLocation?: string | null;
  privateLocationDetails?: string | null;
  agreedAmount?: number | null;
  additionalCosts?: number | null;
  currencyCode?: string | null;
  clientVisibleNotes?: string | null;
  talentInstructions?: string | null;
  talentAvailabilityConfirmed: boolean;
  /**
   * Whether the client may see the appointment. Defaults to TRUE, matching the
   * backend: an appointment reserved for someone is normally theirs to know
   * about, and concealment should be a deliberate act rather than a default.
   */
  isVisibleToClient?: boolean;
}

/**
 * Records an appointment. The idempotency key must be minted once when the form opens and
 * reused for every retry, so a resubmitted request replays the original rather than
 * double-booking the talent.
 */
export function createAppointment(
  input: CreateAppointmentInput,
  idempotencyKey: string
): Promise<{ bookingId: string }> {
  return api.post<{ bookingId: string }>("/management/bookings", input, { idempotencyKey });
}

export function listAppointments(
  filters: {
    status?: string | null;
    talentProfileId?: string | null;
    /** `false` reviews everything currently concealed from its client. */
    isVisibleToClient?: boolean | null;
    page?: number;
    pageSize?: number;
  } = {},
  signal?: AbortSignal
): Promise<PagedResult<AppointmentListItemDto>> {
  return api.get<PagedResult<AppointmentListItemDto>>("/management/bookings", {
    query: {
      status: filters.status ?? undefined,
      talentProfileId: filters.talentProfileId ?? undefined,
      isVisibleToClient: filters.isVisibleToClient ?? undefined,
      page: filters.page ?? 1,
      pageSize: filters.pageSize ?? 50,
    },
    signal,
  });
}

export function getAppointment(bookingId: string, signal?: AbortSignal): Promise<AppointmentDto> {
  return api.get<AppointmentDto>(`/management/bookings/${bookingId}`, { signal });
}

export function listCalendar(
  filters: { from?: string | null; to?: string | null; talentProfileId?: string | null } = {},
  signal?: AbortSignal
): Promise<CalendarAppointmentDto[]> {
  return api.get<CalendarAppointmentDto[]>("/management/calendar", {
    query: {
      from: filters.from ?? undefined,
      to: filters.to ?? undefined,
      talentProfileId: filters.talentProfileId ?? undefined,
    },
    signal,
  });
}

export function listConflicts(signal?: AbortSignal): Promise<AppointmentConflictDto[]> {
  return api.get<AppointmentConflictDto[]>("/management/calendar/conflicts", { signal });
}

export function rescheduleAppointment(
  bookingId: string,
  input: {
    confirmedDate?: string | null;
    startTime?: string | null;
    endTime?: string | null;
    durationMinutes?: number | null;
  }
): Promise<void> {
  return api.post<void>(`/management/bookings/${bookingId}/reschedule`, input);
}

export function cancelAppointment(bookingId: string, reason: string): Promise<void> {
  return api.post<void>(`/management/bookings/${bookingId}/cancel`, { reason });
}

export function startAppointment(bookingId: string): Promise<void> {
  return api.post<void>(`/management/bookings/${bookingId}/start`, undefined);
}

export function completeAppointment(bookingId: string): Promise<void> {
  return api.post<void>(`/management/bookings/${bookingId}/complete`, undefined);
}

export function markAppointmentNoShow(bookingId: string): Promise<void> {
  return api.post<void>(`/management/bookings/${bookingId}/no-show`, undefined);
}

export function addAppointmentNote(bookingId: string, note: string) {
  return api.post<{ noteId: string }>(`/management/bookings/${bookingId}/notes`, { note });
}

// ---- client visibility ----------------------------------------------------

/**
 * Mirrors `BookingVisibilityChangeDto`.
 *
 * Note what it does NOT carry: a display name for the actor. Only
 * `changedByUserId` is recorded, because a name captured at the time would go
 * stale and a name resolved at read time is a second query the audit trail does
 * not need to be correct. The UI resolves it opportunistically and must render
 * fine without it.
 */
export interface AppointmentVisibilityChangeDto {
  id: string;
  changedByUserId: string;
  previousValue: boolean;
  newValue: boolean;
  internalReason: string | null;
  createdAtUtc: string;
}

/**
 * Reveals an appointment to its client, and notifies them it is there.
 *
 * The optional reason is recorded on the visibility history for other staff and
 * is never shown to the client.
 */
export function showAppointmentToClient(bookingId: string, internalReason?: string | null) {
  return api.post<void>(`/management/bookings/${bookingId}/show-to-client`, {
    internalReason: internalReason?.trim() || null,
  });
}

/**
 * Hides an appointment from its client.
 *
 * The client is deliberately NOT notified: announcing a disappearance would
 * disclose exactly what hiding it withholds.
 */
export function hideAppointmentFromClient(bookingId: string, internalReason?: string | null) {
  return api.post<void>(`/management/bookings/${bookingId}/hide-from-client`, {
    internalReason: internalReason?.trim() || null,
  });
}

export function getAppointmentVisibilityHistory(
  bookingId: string,
  signal?: AbortSignal
): Promise<AppointmentVisibilityChangeDto[]> {
  return api.get<AppointmentVisibilityChangeDto[]>(
    `/management/bookings/${bookingId}/visibility-history`,
    { signal }
  );
}

/** Moves an appointment to a different talent, recording why. */
export function reassignAppointmentTalent(
  bookingId: string,
  talentProfileId: string,
  reason: string
) {
  return api.post<void>(`/management/bookings/${bookingId}/reassign-talent`, {
    talentProfileId,
    reason,
  });
}

// ---- presentation ----------------------------------------------------------

/**
 * The operational states this concierge model uses, in the order they occur.
 *
 * The backend enum also carries `Draft`, `Declined` and `UnderReview`, which belong to
 * the withdrawn proposal lifecycle. They are not offered as actions here — mapping the UI
 * to the states that matter avoids a risky enum migration while keeping the rejected
 * workflow off the screen entirely.
 */
export const APPOINTMENT_STATUSES = [
  "Confirmed",
  "Scheduled",
  "InProgress",
  "Completed",
  "Cancelled",
  "NoShow",
] as const;

export type AppointmentStatus = (typeof APPOINTMENT_STATUSES)[number];

/** Backend status → the words management and talent read. */
const STATUS_LABEL: Record<string, string> = {
  Draft: "Draft",
  Confirmed: "Scheduled",
  Scheduled: "Scheduled",
  InProgress: "In progress",
  Completed: "Completed",
  Declined: "Declined",
  Cancelled: "Cancelled",
  NoShow: "No-show",
  UnderReview: "Under review",
};

export function presentAppointmentStatus(status: string): string {
  return STATUS_LABEL[status] ?? status;
}

export type AppointmentTone = "confirmed" | "active" | "closed" | "warning" | "neutral";

const STATUS_TONE: Record<string, AppointmentTone> = {
  Draft: "neutral",
  Confirmed: "confirmed",
  Scheduled: "confirmed",
  InProgress: "active",
  Completed: "closed",
  Declined: "warning",
  Cancelled: "warning",
  NoShow: "warning",
  UnderReview: "neutral",
};

export function appointmentTone(status: string): AppointmentTone {
  return STATUS_TONE[status] ?? "neutral";
}

/**
 * Which lifecycle actions are legal from a given status.
 *
 * Mirrors the backend's transition rules so the UI does not offer a button that will be
 * refused. The backend remains the authority; this only avoids dead controls.
 */
export function allowedActions(status: string): ("start" | "complete" | "no-show" | "reschedule" | "cancel")[] {
  switch (status) {
    case "Confirmed":
    case "Scheduled":
      return ["start", "no-show", "reschedule", "cancel"];
    case "InProgress":
      return ["complete", "cancel"];
    default:
      // Completed, Cancelled, NoShow and the legacy states are terminal here.
      return [];
  }
}
