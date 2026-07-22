import { useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/api/queryKeys";
import { usePrincipal } from "@/auth/PrincipalContext";
import * as profileService from "@/services/talentProfileService";
import * as mediaService from "@/services/talentMediaService";
import * as availabilityService from "@/services/availabilityService";
import * as engagementService from "@/services/talentEngagementService";
import type { UpdateTalentDraftInput, UpsertRateInput, TagType } from "@/services/talentProfileService";
import type { MediaReorderItem } from "@/services/talentMediaService";

/**
 * Talent-portal hooks.
 *
 * Everything here lives under the `talent-portal` query namespace, which is user-scoped
 * and dropped on sign-out — deliberately SEPARATE from the public `talent` namespace, so
 * an unapproved draft or an unpublished photo can never survive into another session or
 * leak into the public cache.
 */

const PORTAL_STALE_TIME = 30_000;

function useTalentEnabled(): boolean {
  const { principal } = usePrincipal();
  return principal.isAuthenticated;
}

// ---- profile & draft -------------------------------------------------------

export function useMyTalentProfile() {
  const enabled = useTalentEnabled();
  return useQuery({
    queryKey: queryKeys.talentPortal.profile(),
    queryFn: ({ signal }) => profileService.getMyProfile(signal),
    enabled,
    staleTime: PORTAL_STALE_TIME,
  });
}

export function useMyDraft() {
  const enabled = useTalentEnabled();
  return useQuery({
    queryKey: queryKeys.talentPortal.draft(),
    queryFn: ({ signal }) => profileService.getMyDraft(signal),
    enabled,
    staleTime: PORTAL_STALE_TIME,
  });
}

export function useMyPreview(enabled = true) {
  const authenticated = useTalentEnabled();
  return useQuery({
    queryKey: queryKeys.talentPortal.preview(),
    queryFn: ({ signal }) => profileService.getMyPreview(signal),
    enabled: authenticated && enabled,
    staleTime: PORTAL_STALE_TIME,
  });
}

export function useMyVersions(enabled = true) {
  const authenticated = useTalentEnabled();
  return useQuery({
    queryKey: queryKeys.talentPortal.versions(),
    queryFn: ({ signal }) => profileService.getMyVersions(signal),
    enabled: authenticated && enabled,
    staleTime: PORTAL_STALE_TIME,
  });
}

export function useUpdateDraft() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateTalentDraftInput) => profileService.updateMyDraft(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.talentPortal.draft() });
      // The preview renders the draft, so a saved edit makes it stale immediately.
      queryClient.invalidateQueries({ queryKey: queryKeys.talentPortal.preview() });
    },
  });
}

/**
 * Submit the draft for management review.
 *
 * This does NOT publish. It moves the profile to `PendingReview`, after which the draft is
 * no longer editable until management decides — so the live profile is invalidated too.
 */
export function useSubmitDraft() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => profileService.submitMyDraft(),
    retry: false,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.talentPortal.all() });
    },
  });
}

// ---- private base address --------------------------------------------------

/** The talent's private base/working address — owner only, never public. */
export function useMyBaseAddress() {
  const enabled = useTalentEnabled();
  return useQuery({
    queryKey: queryKeys.talentPortal.baseAddress(),
    queryFn: ({ signal }) => profileService.getMyBaseAddress(signal),
    enabled,
    staleTime: PORTAL_STALE_TIME,
  });
}

export function useUpdateMyBaseAddress() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: import("@/domain/address").StructuredAddressInput) =>
      profileService.updateMyBaseAddress(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.talentPortal.baseAddress() });
    },
  });
}

// ---- tags ------------------------------------------------------------------

export function useMyTags() {
  const enabled = useTalentEnabled();
  return useQuery({
    queryKey: queryKeys.talentPortal.tags(),
    queryFn: ({ signal }) => profileService.getMyTags(signal),
    enabled,
    staleTime: PORTAL_STALE_TIME,
  });
}

export function useSetTags() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ type, tagIds }: { type: TagType; tagIds: string[] }) =>
      profileService.setMyTags(type, tagIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.talentPortal.tags() });
    },
  });
}

// ---- rates -----------------------------------------------------------------

export function useMyRates() {
  const enabled = useTalentEnabled();
  return useQuery({
    queryKey: queryKeys.talentPortal.rates(),
    queryFn: ({ signal }) => profileService.getMyRates(signal),
    enabled,
    staleTime: PORTAL_STALE_TIME,
    select: (rates) => [...rates].sort((a, b) => a.sortOrder - b.sortOrder),
  });
}

export function useSaveRate() {
  const queryClient = useQueryClient();
  return useMutation({
    // Create returns the new id, update returns nothing. The caller refetches either way,
    // so the result is normalised to void rather than being a union at every call site.
    mutationFn: async ({ rateId, input }: { rateId?: string; input: UpsertRateInput }) => {
      if (rateId) await profileService.updateRate(rateId, input);
      else await profileService.createRate(input);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.talentPortal.rates() });
    },
  });
}

export function useDeleteRate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (rateId: string) => profileService.deleteRate(rateId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.talentPortal.rates() });
    },
  });
}

// ---- media -----------------------------------------------------------------

export function useMyMedia() {
  const enabled = useTalentEnabled();
  return useQuery({
    queryKey: queryKeys.talentPortal.media(),
    queryFn: ({ signal }) => mediaService.listMyMedia(signal),
    enabled,
    staleTime: PORTAL_STALE_TIME,
    select: (items) => [...items].sort((a, b) => a.sortOrder - b.sortOrder),
  });
}

export function useUploadMedia() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ file, mediaType, caption }: { file: File; mediaType: string; caption?: string | null }) =>
      mediaService.uploadMedia(file, mediaType, caption),
    // An upload is expensive and not idempotent; a silent retry could duplicate the item.
    retry: false,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.talentPortal.media() });
    },
  });
}

export function useUpdateMediaCaption() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ mediaId, caption }: { mediaId: string; caption: string | null }) =>
      mediaService.updateCaption(mediaId, caption),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.talentPortal.media() });
    },
  });
}

export function useDeleteMedia() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (mediaId: string) => mediaService.deleteMedia(mediaId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.talentPortal.media() });
    },
  });
}

export function useSubmitMedia() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (mediaId: string) => mediaService.submitMedia(mediaId),
    retry: false,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.talentPortal.media() });
    },
  });
}

export function useSetCoverMedia() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (mediaId: string) => mediaService.setCover(mediaId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.talentPortal.media() });
      // The cover is part of the profile and its draft, so both go stale.
      queryClient.invalidateQueries({ queryKey: queryKeys.talentPortal.profile() });
      queryClient.invalidateQueries({ queryKey: queryKeys.talentPortal.draft() });
    },
  });
}

export function useReorderMedia() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (items: MediaReorderItem[]) => mediaService.reorderMedia(items),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.talentPortal.media() });
    },
  });
}

// ---- availability ----------------------------------------------------------

export function useMyAvailability() {
  const enabled = useTalentEnabled();
  return useQuery({
    queryKey: queryKeys.talentPortal.availability(),
    queryFn: ({ signal }) => availabilityService.getAvailability(signal),
    enabled,
    staleTime: PORTAL_STALE_TIME,
  });
}

export function useMyCalendar(from?: string, to?: string) {
  const enabled = useTalentEnabled();
  return useQuery({
    queryKey: queryKeys.talentPortal.calendar(from, to),
    queryFn: ({ signal }) => availabilityService.getCalendar(from, to, signal),
    enabled,
    staleTime: PORTAL_STALE_TIME,
  });
}

/**
 * Every availability mutation invalidates BOTH the configuration and the calendar.
 *
 * The calendar is computed SERVER-side from rules, exceptions and travel, so recomputing
 * it locally would be a second implementation of the same logic and would drift.
 */
function useAvailabilityInvalidation() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.talentPortal.availability() });
    queryClient.invalidateQueries({ queryKey: queryKeys.talentPortal.calendarAll() });
  };
}

export function useUpdateAvailabilityStatus() {
  const invalidate = useAvailabilityInvalidation();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ status, note, timeZone }: { status: string; note: string | null; timeZone: string | null }) =>
      availabilityService.updateStatus(status, note, timeZone),
    onSuccess: () => {
      invalidate();
      // The live profile carries the availability status too.
      queryClient.invalidateQueries({ queryKey: queryKeys.talentPortal.profile() });
    },
  });
}

export function useSaveAvailabilityRule() {
  const invalidate = useAvailabilityInvalidation();
  return useMutation({
    mutationFn: async ({ ruleId, input }: { ruleId?: string; input: availabilityService.UpsertRuleInput }) => {
      if (ruleId) await availabilityService.updateRule(ruleId, input);
      else await availabilityService.addRule(input);
    },
    onSuccess: invalidate,
  });
}

export function useDeleteAvailabilityRule() {
  const invalidate = useAvailabilityInvalidation();
  return useMutation({
    mutationFn: (ruleId: string) => availabilityService.deleteRule(ruleId),
    onSuccess: invalidate,
  });
}

export function useAddAvailabilityException() {
  const invalidate = useAvailabilityInvalidation();
  return useMutation({
    mutationFn: (input: availabilityService.CreateExceptionInput) =>
      availabilityService.addException(input),
    onSuccess: invalidate,
  });
}

export function useDeleteAvailabilityException() {
  const invalidate = useAvailabilityInvalidation();
  return useMutation({
    mutationFn: (exceptionId: string) => availabilityService.deleteException(exceptionId),
    onSuccess: invalidate,
  });
}

export function useAddTravelPeriod() {
  const invalidate = useAvailabilityInvalidation();
  return useMutation({
    mutationFn: (input: availabilityService.CreateTravelInput) => availabilityService.addTravel(input),
    onSuccess: invalidate,
  });
}

export function useDeleteTravelPeriod() {
  const invalidate = useAvailabilityInvalidation();
  return useMutation({
    mutationFn: (travelId: string) => availabilityService.deleteTravel(travelId),
    onSuccess: invalidate,
  });
}

// ---- bookings & reviews ----------------------------------------------------

export function useMyTalentBookings() {
  const enabled = useTalentEnabled();
  return useQuery({
    queryKey: queryKeys.talentPortal.bookings(),
    queryFn: ({ signal }) => engagementService.listMyBookings(signal),
    enabled,
    staleTime: PORTAL_STALE_TIME,
  });
}

export function useMyTalentBooking(bookingId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.talentPortal.booking(bookingId ?? ""),
    queryFn: ({ signal }) => engagementService.getMyBooking(bookingId!, signal),
    enabled: Boolean(bookingId),
    staleTime: PORTAL_STALE_TIME,
  });
}

/** Confirmed and scheduled bookings on or after today, soonest first. */
export function useUpcomingTalentBookings() {
  const { data, isPending, isError } = useMyTalentBookings();

  const upcoming = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return (data ?? [])
      .filter((b) => ["Confirmed", "Scheduled", "InProgress"].includes(b.status))
      .filter((b) => !b.confirmedDate || b.confirmedDate >= today)
      .sort((a, b) => (a.confirmedDate ?? "9999").localeCompare(b.confirmedDate ?? "9999"));
  }, [data]);

  return { upcoming, isPending, isError };
}

export function useMyTalentReviews() {
  const enabled = useTalentEnabled();
  return useQuery({
    queryKey: queryKeys.talentPortal.reviews(),
    queryFn: ({ signal }) => engagementService.listMyReviews(signal),
    enabled,
    staleTime: PORTAL_STALE_TIME,
  });
}

export function useRespondToReview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ reviewId, response }: { reviewId: string; response: string }) =>
      engagementService.respondToReview(reviewId, response),
    // A response can only be given once (the server returns 409 on a second).
    retry: false,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.talentPortal.reviews() });
    },
  });
}
