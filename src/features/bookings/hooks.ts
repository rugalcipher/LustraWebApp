import { useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/api/queryKeys";
import { isApiError } from "@/api/problemDetails";
import { usePrincipal } from "@/auth/PrincipalContext";
import * as bookingService from "@/services/bookingService";
import type { BookingTab, CreateReviewInput } from "@/services/bookingService";
import { tabFor } from "@/services/bookingService";

/** Client booking, settlement and review hooks. */

const BOOKING_STALE_TIME = 30_000;

export function useMyBookings() {
  const { principal } = usePrincipal();
  return useQuery({
    queryKey: queryKeys.bookings.mine(),
    queryFn: ({ signal }) => bookingService.listBookings(signal),
    enabled: principal.isAuthenticated,
    staleTime: BOOKING_STALE_TIME,
  });
}

/** Bookings grouped into the tabs the Bookings screen renders. */
export function useBookingsByTab(): {
  tabs: Record<BookingTab, bookingService.BookingListItemDto[]>;
  isPending: boolean;
  isError: boolean;
  error: unknown;
} {
  const { data, isPending, isError, error } = useMyBookings();

  const tabs = useMemo(() => {
    const grouped: Record<BookingTab, bookingService.BookingListItemDto[]> = {
      Upcoming: [],
      Completed: [],
      Cancelled: [],
    };
    for (const booking of data ?? []) {
      grouped[tabFor(booking.status)].push(booking);
    }
    // Upcoming reads best soonest-first; the closed tabs read best most-recent-first.
    grouped.Upcoming.sort((a, b) => compareDate(a.confirmedDate, b.confirmedDate));
    grouped.Completed.sort((a, b) => compareDate(b.confirmedDate, a.confirmedDate));
    grouped.Cancelled.sort((a, b) => compareDate(b.confirmedDate, a.confirmedDate));
    return grouped;
  }, [data]);

  return { tabs, isPending, isError, error };
}

/** Undated bookings sort last, never as if they were at the epoch. */
function compareDate(a: string | null, b: string | null): number {
  if (a === b) return 0;
  if (!a) return 1;
  if (!b) return -1;
  return a < b ? -1 : 1;
}

export function useBooking(bookingId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.bookings.detail(bookingId ?? ""),
    queryFn: ({ signal }) => bookingService.getBooking(bookingId!, signal),
    enabled: Boolean(bookingId),
    staleTime: BOOKING_STALE_TIME,
  });
}

export function useSettlement(bookingId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.bookings.settlement(bookingId ?? ""),
    queryFn: ({ signal }) => bookingService.getSettlement(bookingId!, signal),
    enabled: Boolean(bookingId),
    staleTime: BOOKING_STALE_TIME,
  });
}

/** The booking for one inquiry, if management has confirmed one. */
export function useBookingForInquiry(inquiryId: string | undefined) {
  const { data, isPending } = useMyBookings();
  const booking = useMemo(
    () => (data ?? []).find((b) => b.inquiryId === inquiryId) ?? null,
    [data, inquiryId]
  );
  return { booking, isPending };
}

/**
 * The client's own review of a booking.
 *
 * "No review yet" is a 404 from the API, which is the normal case rather than a failure —
 * so it resolves to `null` and is never retried. Any other error still surfaces.
 */
export function useMyReview(bookingId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: queryKeys.bookings.review(bookingId ?? ""),
    queryFn: async ({ signal }) => {
      try {
        return await bookingService.getReview(bookingId!, signal);
      } catch (error) {
        if (isApiError(error) && error.kind === "not_found") return null;
        throw error;
      }
    },
    enabled: Boolean(bookingId) && enabled,
    retry: (failureCount, error) =>
      !(isApiError(error) && error.kind === "not_found") && failureCount < 2,
    staleTime: BOOKING_STALE_TIME,
  });
}

export function useCreateReview(bookingId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateReviewInput) => bookingService.createReview(bookingId!, input),
    // A review is create-once (the server returns 409 on a second) and carries no
    // idempotency key, so retrying is the client's deliberate choice.
    retry: false,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.bookings.review(bookingId ?? "") });
    },
  });
}

/**
 * Ask management to change or cancel a booking.
 *
 * Note what this is NOT: it does not change the booking. It records a request and posts it
 * to the conversation for management to act on, which is exactly what the UI must say.
 */
export function useRequestBookingChange(bookingId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ message, cancellation }: { message: string; cancellation: boolean }) =>
      cancellation
        ? bookingService.requestBookingCancellation(bookingId!, message)
        : bookingService.requestBookingChange(bookingId!, message),
    retry: false,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.bookings.detail(bookingId ?? "") });
      queryClient.invalidateQueries({ queryKey: queryKeys.conversations.all() });
    },
  });
}
