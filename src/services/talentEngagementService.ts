import { api } from "@/api/client";

/**
 * The talent's own appointments and reviews — `/api/v1/talent/bookings*`, `/talent/reviews*`.
 *
 * The talent's view is OPERATIONAL: exactly what they need in order to attend, including
 * the private address they must travel to, and their OWN payout — never the client rate,
 * the booking total or the management margin. No client identity, no settlement state, no
 * internal notes, and none of the notes written for the client. The API withholds all of
 * it — do not reintroduce any of it here.
 */

/** Mirrors the backend `TalentBookingDto`. */
export interface TalentBookingDto {
  id: string;
  bookingReference: string;
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
  /** The private address. Talent-only — never render it on a shared or public surface. */
  privateLocationDetails: string | null;
  /** The talent's operational brief: where to report, what to bring, who to ask for. */
  talentInstructions: string | null;
  /**
   * The talent's OWN agreed payout, minor units — their fee and never the client rate,
   * booking total or margin. Null when the booking carries no priced snapshot.
   */
  talentHourlyPayoutMinor: number | null;
  /** The talent's total agreed payout for the booking, minor units. */
  talentTotalPayoutMinor: number | null;
  /** Currency of the payout amounts. */
  payoutCurrency: string | null;
}

/**
 * Mirrors `TalentAppointmentListItemDto`.
 *
 * Separate from the management list row, which carries the agreed amount and the client
 * linkage. Sharing one list type across audiences is how money ends up on a talent's
 * screen.
 */
export interface TalentAppointmentListItemDto {
  id: string;
  bookingReference: string;
  engagementCategory: string;
  status: string;
  confirmedDate: string | null;
  startTime: string | null;
  endTime: string | null;
  cityName: string | null;
  venueName: string | null;
}

/** Mirrors the backend `TalentReviewDto` — carries NO client identity, by design. */
export interface TalentReviewDto {
  id: string;
  bookingId: string;
  rating: number;
  title: string | null;
  body: string;
  status: string;
  talentResponse: string | null;
  publishedAtUtc: string | null;
}

export function listMyBookings(signal?: AbortSignal): Promise<TalentAppointmentListItemDto[]> {
  return api.get<TalentAppointmentListItemDto[]>("/talent/bookings", { signal });
}

export function getMyBooking(bookingId: string, signal?: AbortSignal): Promise<TalentBookingDto> {
  return api.get<TalentBookingDto>(`/talent/bookings/${bookingId}`, { signal });
}

export function listMyReviews(signal?: AbortSignal): Promise<TalentReviewDto[]> {
  return api.get<TalentReviewDto[]>("/talent/reviews", { signal });
}

export function respondToReview(reviewId: string, response: string): Promise<void> {
  return api.post<void>(`/talent/reviews/${reviewId}/response`, { response });
}

/**
 * Whether the talent may respond to a review.
 *
 * Mirrors `ReviewErrors.NotApproved` and `AlreadyResponded`: only an approved review can
 * be answered, and only once. A UI affordance — the server re-checks.
 */
export function canRespond(review: TalentReviewDto): boolean {
  return review.status === "Approved" && !review.talentResponse;
}
