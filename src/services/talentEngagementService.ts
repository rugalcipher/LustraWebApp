import { api } from "@/api/client";
import type { BookingListItemDto } from "@/services/bookingService";

/**
 * The talent's own bookings and reviews — `/api/v1/talent/bookings*`, `/talent/reviews*`.
 *
 * The talent's booking view is OPERATIONAL: it carries the private location they need to
 * turn up, and deliberately carries no client identity, no settlement status and no
 * internal notes. Do not add them.
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
  agreedAmount: number | null;
  currencyCode: string;
  clientVisibleNotes: string | null;
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

export function listMyBookings(signal?: AbortSignal): Promise<BookingListItemDto[]> {
  return api.get<BookingListItemDto[]>("/talent/bookings", { signal });
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
