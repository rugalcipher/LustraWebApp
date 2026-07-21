import { api } from "@/api/client";
import type { PagedResult } from "@/services/discoveryService";

/**
 * A client's own appointments — read-only.
 *
 * A deliberately separate module from `appointmentService`, which is the
 * Management surface. The two are not the same shape and must never share one:
 * deriving a client model by deleting fields from a management model means the
 * next field added to the management DTO is disclosed to clients by default.
 * Here the types are written out in full, and every field on them was decided to
 * be safe for a client to hold.
 *
 * **No client id is ever sent.** The backend takes the client from the bearer
 * token, so there is no parameter through which one client could request
 * another's appointments. Adding an id here would create that parameter.
 *
 * Clients cannot create, change, reschedule or cancel: Lustra is concierge-led
 * and arrangements are made by talking to management. There are two functions in
 * this file for that reason.
 */

/** Which slice of their appointments the client is asking for. */
export const CLIENT_APPOINTMENT_SCOPES = ["Upcoming", "Past", "Cancelled", "All"] as const;
export type ClientAppointmentScope = (typeof CLIENT_APPOINTMENT_SCOPES)[number];

/** Mirrors `PublicImageDto`. Approved public imagery only. */
export interface PublicImageDto {
  url: string;
  srcSet: string | null;
  width: number | null;
  height: number | null;
  aspectRatio: number | null;
}

/**
 * Mirrors `AppointmentTalentDto` — the talent as they appear on a client's
 * appointment. Public marketing data: the name and the pictures already on their
 * public profile. No contact details, no legal name, no city of residence.
 */
export interface ClientAppointmentTalentDto {
  talentProfileId: string;
  slug: string;
  displayName: string;
  coverImage: PublicImageDto | null;
  images: PublicImageDto[];
}

/** Mirrors `ClientAppointmentListItemDto`. Carries no money and no free text. */
export interface ClientAppointmentListItemDto {
  id: string;
  reference: string;
  status: string;
  confirmedDate: string | null;
  startTime: string | null;
  endTime: string | null;
  timeZone: string;
  cityName: string | null;
  venueName: string | null;
  engagementCategory: string;
  talentProfileId: string;
  talentDisplayName: string;
  talentCoverImage: PublicImageDto | null;
  createdAtUtc: string;
}

/**
 * Mirrors `ClientAppointmentDto` — the privacy boundary.
 *
 * Absent by design, and not to be added: agreed amounts, additional costs and
 * settlement state; `privateLocationDetails` (the talent's reporting address);
 * `talentInstructions` and internal notes; `inquiryId`,
 * `assignedManagementUserId` and `acceptedProposalId`. Only `clientVisibleNotes`
 * is free text, and it is written knowing the client reads it.
 */
export interface ClientAppointmentDto {
  id: string;
  reference: string;
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
  engagementCategory: string;
  clientVisibleNotes: string | null;
  createdAtUtc: string;
  completedAtUtc: string | null;
  cancelledAtUtc: string | null;
  talent: ClientAppointmentTalentDto;
  conversationId: string | null;
}

/**
 * Lists the caller's own visible appointments.
 *
 * An unrecognised scope falls back to Upcoming server-side rather than returning
 * everything — the safe direction for a mistake to fail in.
 */
export function listClientAppointments(
  filters: { scope?: ClientAppointmentScope; page?: number; pageSize?: number } = {},
  signal?: AbortSignal
): Promise<PagedResult<ClientAppointmentListItemDto>> {
  return api.get<PagedResult<ClientAppointmentListItemDto>>("/client/appointments", {
    query: {
      scope: filters.scope ?? "Upcoming",
      page: filters.page ?? 1,
      pageSize: filters.pageSize ?? 20,
    },
    signal,
  });
}

/**
 * Gets one of the caller's own visible appointments.
 *
 * A hidden appointment, another client's appointment and an id that never
 * existed are all the same 404. The UI must keep them the same too: saying "this
 * was hidden from you" would disclose exactly what hiding it withholds.
 */
export function getClientAppointment(
  appointmentId: string,
  signal?: AbortSignal
): Promise<ClientAppointmentDto> {
  return api.get<ClientAppointmentDto>(`/client/appointments/${appointmentId}`, { signal });
}
