import { useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/api/queryKeys";
import { usePrincipal } from "@/auth/PrincipalContext";
import * as managementService from "@/services/managementService";
import { columnFor, PIPELINE_COLUMNS } from "@/services/managementService";
import type { ManagementInquiryListItemDto, PipelineColumn } from "@/services/managementService";

/**
 * Management-console hooks.
 *
 * Queries are gated on the caller actually holding the permission, so a talent or client
 * who somehow reaches an internal route fires no request rather than collecting 403s. The
 * server remains the authorization boundary — this only avoids pointless traffic.
 */

const MANAGEMENT_STALE_TIME = 20_000;

function usePermission(permission: string): boolean {
  const { principal } = usePrincipal();
  return principal.isAuthenticated && principal.permissions.includes(permission);
}

// ---- dashboard -------------------------------------------------------------

export function useManagementDashboard() {
  const enabled = usePermission("Analytics.View");
  return useQuery({
    queryKey: queryKeys.management.dashboard(),
    queryFn: ({ signal }) => managementService.getDashboard(signal),
    enabled,
    staleTime: MANAGEMENT_STALE_TIME,
  });
}

// ---- inquiries -------------------------------------------------------------

export function useManagementInquiries(
  filters: { status?: string | null; assignedTo?: string | null; page?: number } = {}
) {
  const enabled = usePermission("Inquiries.View");
  return useQuery({
    queryKey: queryKeys.management.inquiries(filters),
    queryFn: ({ signal }) => managementService.listInquiries(filters, signal),
    enabled,
    staleTime: MANAGEMENT_STALE_TIME,
  });
}

/** Inquiries bucketed into the pipeline columns the board renders. */
export function useInquiryPipeline(pageSize = 100) {
  const query = useManagementInquiries({ page: 1 });

  const columns = useMemo(() => {
    const grouped = {} as Record<PipelineColumn, ManagementInquiryListItemDto[]>;
    for (const column of PIPELINE_COLUMNS) grouped[column.id] = [];
    for (const inquiry of query.data?.items ?? []) {
      grouped[columnFor(inquiry.status)].push(inquiry);
    }
    return grouped;
  }, [query.data]);

  return { columns, total: query.data?.totalCount ?? 0, ...query, pageSize };
}

export function useManagementInquiry(inquiryId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.management.inquiry(inquiryId ?? ""),
    queryFn: ({ signal }) => managementService.getInquiry(inquiryId!, signal),
    enabled: Boolean(inquiryId),
    staleTime: MANAGEMENT_STALE_TIME,
  });
}

/**
 * Any inquiry mutation invalidates the list, the detail AND the dashboard.
 *
 * The dashboard's "open inquiries" count is derived from the same rows, so leaving it
 * cached would show a number that contradicts the board the user is looking at.
 */
function useInquiryInvalidation() {
  const queryClient = useQueryClient();
  return (inquiryId?: string) => {
    if (inquiryId) {
      queryClient.invalidateQueries({ queryKey: queryKeys.management.inquiry(inquiryId) });
    }
    queryClient.invalidateQueries({ queryKey: ["management", "inquiries"] });
    queryClient.invalidateQueries({ queryKey: queryKeys.management.dashboard() });
  };
}

export function useChangeInquiryStatus() {
  const invalidate = useInquiryInvalidation();
  return useMutation({
    mutationFn: ({ inquiryId, status, reason }: { inquiryId: string; status: string; reason?: string | null }) =>
      managementService.changeInquiryStatus(inquiryId, status, reason),
    retry: false,
    onSuccess: (_r, { inquiryId }) => invalidate(inquiryId),
  });
}

export function useAddInquiryNote() {
  const invalidate = useInquiryInvalidation();
  return useMutation({
    mutationFn: ({ inquiryId, note }: { inquiryId: string; note: string }) =>
      managementService.addInquiryNote(inquiryId, note),
    onSuccess: (_r, { inquiryId }) => invalidate(inquiryId),
  });
}

export function useCloseInquiry() {
  const invalidate = useInquiryInvalidation();
  return useMutation({
    mutationFn: ({ inquiryId, reason }: { inquiryId: string; reason?: string | null }) =>
      managementService.closeInquiry(inquiryId, reason),
    retry: false,
    onSuccess: (_r, { inquiryId }) => invalidate(inquiryId),
  });
}

export function useReopenInquiry() {
  const invalidate = useInquiryInvalidation();
  return useMutation({
    mutationFn: (inquiryId: string) => managementService.reopenInquiry(inquiryId),
    retry: false,
    onSuccess: (_r, inquiryId) => invalidate(inquiryId),
  });
}

// ---- conversations ---------------------------------------------------------

export function useManagementConversations(
  filters: managementService.ManagementConversationFilters = {}
) {
  const enabled = usePermission("Conversations.View");
  return useQuery({
    queryKey: queryKeys.management.conversations(filters),
    queryFn: ({ signal }) => managementService.listConversations(filters, signal),
    enabled,
    staleTime: MANAGEMENT_STALE_TIME,
  });
}

export function useManagementConversation(conversationId: string | undefined) {
  const enabled = usePermission("Conversations.View") && Boolean(conversationId);
  return useQuery({
    queryKey: queryKeys.management.conversation(conversationId ?? ""),
    queryFn: ({ signal }) => managementService.getConversation(conversationId!, signal),
    enabled,
    staleTime: MANAGEMENT_STALE_TIME,
  });
}

/** The client summary panel. Staff-only, and never forwarded to a talent. */
export function useConversationClientSummary(conversationId: string | undefined) {
  const enabled = usePermission("Conversations.View") && Boolean(conversationId);
  return useQuery({
    queryKey: queryKeys.management.conversationClientSummary(conversationId ?? ""),
    queryFn: ({ signal }) => managementService.getConversationClientSummary(conversationId!, signal),
    enabled,
    staleTime: MANAGEMENT_STALE_TIME,
  });
}

/** The appointment this conversation produced, or null before one exists. */
export function useConversationAppointment(conversationId: string | undefined) {
  const enabled = usePermission("Conversations.View") && Boolean(conversationId);
  return useQuery({
    queryKey: queryKeys.management.conversationAppointment(conversationId ?? ""),
    queryFn: ({ signal }) => managementService.getConversationAppointment(conversationId!, signal),
    enabled,
    staleTime: MANAGEMENT_STALE_TIME,
  });
}

export function useConversationNotes(conversationId: string | undefined) {
  const enabled = usePermission("Conversations.View") && Boolean(conversationId);
  return useQuery({
    queryKey: queryKeys.management.conversationNotes(conversationId ?? ""),
    queryFn: ({ signal }) => managementService.listConversationNotes(conversationId!, signal),
    enabled,
    staleTime: MANAGEMENT_STALE_TIME,
  });
}

export function useAddConversationNote(conversationId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (note: string) => managementService.addConversationNote(conversationId!, note),
    retry: false,
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.management.conversationNotes(conversationId ?? ""),
      }),
  });
}

export function useAssignConversation(conversationId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (assignToUserId: string) =>
      managementService.assignConversation(conversationId!, assignToUserId),
    retry: false,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.management.conversation(conversationId ?? ""),
      });
      // The inbox shows the owner, so every filtered list is stale.
      queryClient.invalidateQueries({ queryKey: ["management", "conversations"] });
    },
  });
}

/** Total unread across management conversations, for the console badge. */
export function useManagementUnreadCount(): number {
  const { data } = useManagementConversations();
  return useMemo(
    () => (data?.items ?? []).reduce((total, c) => total + (c.unreadCount ?? 0), 0),
    [data]
  );
}

// ---- talent lifecycle ------------------------------------------------------

/**
 * Pause, resume, suspend or feature a talent.
 *
 * These change PUBLIC VISIBILITY, so the public discovery cache is invalidated too —
 * otherwise a just-paused talent would keep appearing in a staff member's own browse view.
 */
export function useTalentLifecycle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ profileId, action, reason, isFeatured }: {
      profileId: string;
      action: "pause" | "resume" | "suspend" | "feature";
      reason?: string;
      isFeatured?: boolean;
    }) => {
      if (action === "pause") await managementService.pauseTalent(profileId, reason ?? "");
      else if (action === "resume") await managementService.resumeTalent(profileId);
      else if (action === "suspend") await managementService.suspendTalent(profileId, reason ?? "");
      else await managementService.setTalentFeatured(profileId, isFeatured ?? false);
    },
    retry: false,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.management.dashboard() });
      queryClient.invalidateQueries({ queryKey: ["management", "profile-reviews"] });
      // Discovery and public profiles are cached PUBLICLY and are now stale.
      queryClient.invalidateQueries({ queryKey: queryKeys.discovery.search(undefined).slice(0, 1) });
      queryClient.invalidateQueries({ queryKey: queryKeys.talent.all() });
    },
  });
}

// ---- moderation: profiles --------------------------------------------------

export function useProfileReviews(status: string | null = "PendingReview") {
  const enabled = usePermission("Talent.ApproveProfiles");
  return useQuery({
    queryKey: queryKeys.management.profileReviews(status ?? undefined),
    queryFn: ({ signal }) => managementService.listProfileReviews(status, signal),
    enabled,
    staleTime: MANAGEMENT_STALE_TIME,
  });
}

function useModerationInvalidation() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ["management", "profile-reviews"] });
    queryClient.invalidateQueries({ queryKey: ["media", "moderation-queue"] });
    queryClient.invalidateQueries({ queryKey: ["management", "reviews"] });
    queryClient.invalidateQueries({ queryKey: queryKeys.management.dashboard() });
  };
}

export function useModerateProfile() {
  const invalidate = useModerationInvalidation();
  return useMutation({
    mutationFn: ({
      profileId,
      action,
      reason,
      publishImmediately,
    }: {
      profileId: string;
      action: "approve" | "reject" | "request-changes" | "publish" | "unpublish";
      reason?: string;
      publishImmediately?: boolean;
    }) => {
      if (action === "approve") {
        return managementService.approveProfile(profileId, reason ?? null, publishImmediately ?? false);
      }
      if (action === "publish") return managementService.publishProfile(profileId);
      if (action === "unpublish") return managementService.unpublishProfile(profileId, reason ?? null);
      if (action === "reject") return managementService.rejectProfile(profileId, reason ?? "");
      return managementService.requestProfileChanges(profileId, reason ?? "");
    },
    retry: false,
    onSuccess: invalidate,
  });
}

// ---- moderation: media -----------------------------------------------------

export function useMediaReviews(status: string | null = "PendingReview") {
  const enabled = usePermission("Talent.ModerateMedia");
  return useQuery({
    queryKey: queryKeys.media.moderationQueue(status ?? undefined),
    queryFn: ({ signal }) => managementService.listMediaReviews(status, signal),
    enabled,
    staleTime: MANAGEMENT_STALE_TIME,
  });
}

export function useModerateMedia() {
  const invalidate = useModerationInvalidation();
  return useMutation({
    mutationFn: ({ mediaId, action, visibility, reason }: {
      mediaId: string;
      action: "approve" | "reject" | "revoke";
      visibility?: string | null;
      reason?: string;
    }) => {
      if (action === "approve") return managementService.approveMedia(mediaId, visibility ?? null);
      if (action === "reject") return managementService.rejectMedia(mediaId, reason ?? "");
      return managementService.revokeMediaPublication(mediaId);
    },
    retry: false,
    onSuccess: invalidate,
  });
}

// ---- moderation: reviews ---------------------------------------------------

export function useReviewModeration(status: string | null = "Pending") {
  const enabled = usePermission("Reviews.View");
  return useQuery({
    queryKey: queryKeys.management.reviews({ status }),
    queryFn: ({ signal }) => managementService.listReviewModeration(status, 1, 50, signal),
    enabled,
    staleTime: MANAGEMENT_STALE_TIME,
  });
}

export function useModerateReview() {
  const invalidate = useModerationInvalidation();
  return useMutation({
    mutationFn: ({ reviewId, action, reason }: { reviewId: string; action: "approve" | "reject" | "hide"; reason?: string }) => {
      if (action === "approve") return managementService.approveReview(reviewId);
      if (action === "reject") return managementService.rejectReview(reviewId, reason ?? null);
      return managementService.hideReview(reviewId, reason ?? null);
    },
    retry: false,
    onSuccess: invalidate,
  });
}

// ---- VIP entitlements ------------------------------------------------------

export function useVipRequests(status: string | null = "Pending") {
  const enabled = usePermission("Clients.View");
  return useQuery({
    queryKey: queryKeys.management.vipRequests({ status }),
    queryFn: ({ signal }) => managementService.listVipRequests(status, 1, 50, signal),
    enabled,
    staleTime: MANAGEMENT_STALE_TIME,
  });
}

function useEntitlementInvalidation() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ["management", "vip-requests"] });
    queryClient.invalidateQueries({ queryKey: ["management", "entitlements"] });
    queryClient.invalidateQueries({ queryKey: queryKeys.management.dashboard() });
  };
}

export function useDecideVipRequest() {
  const invalidate = useEntitlementInvalidation();
  return useMutation({
    // Approve returns the new entitlement id, decline returns nothing. Both callers only
    // refetch, so the result is normalised to void rather than a union at every call site.
    mutationFn: async ({ requestId, action, expiresAtUtc, note }: {
      requestId: string;
      action: "approve" | "decline";
      expiresAtUtc?: string | null;
      note?: string;
    }) => {
      if (action === "approve") {
        await managementService.approveVipRequest(requestId, expiresAtUtc ?? null, note ?? null);
      } else {
        await managementService.declineVipRequest(requestId, note ?? "");
      }
    },
    // Deciding a request is a one-shot transition; a silent retry against an
    // already-decided request would surface a confusing 422.
    retry: false,
    onSuccess: invalidate,
  });
}

export function useClientEntitlements(clientUserId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.management.entitlements(clientUserId ?? ""),
    queryFn: ({ signal }) => managementService.listClientEntitlements(clientUserId!, signal),
    enabled: Boolean(clientUserId),
    staleTime: MANAGEMENT_STALE_TIME,
  });
}

export function useRevokeEntitlement() {
  const invalidate = useEntitlementInvalidation();
  return useMutation({
    mutationFn: ({ entitlementId, reason }: { entitlementId: string; reason: string }) =>
      managementService.revokeEntitlement(entitlementId, reason),
    retry: false,
    onSuccess: invalidate,
  });
}

// ---- client directory ------------------------------------------------------

export function useManagementClients(filters: { search?: string | null; page?: number } = {}) {
  const enabled = usePermission("Clients.View");
  return useQuery({
    queryKey: queryKeys.management.clients(filters),
    queryFn: ({ signal }) => managementService.listClients(filters, signal),
    enabled,
    staleTime: MANAGEMENT_STALE_TIME,
  });
}

export function useManagementClientConversations(clientUserId: string | undefined) {
  const enabled = usePermission("Clients.View") && Boolean(clientUserId);
  return useQuery({
    queryKey: queryKeys.management.clientConversations(clientUserId ?? ""),
    queryFn: ({ signal }) => managementService.listClientConversations(clientUserId!, signal),
    enabled,
    staleTime: MANAGEMENT_STALE_TIME,
  });
}

// ---- analytics -------------------------------------------------------------

export function useExecutiveAnalytics() {
  const enabled = usePermission("Analytics.View");
  return useQuery({
    queryKey: queryKeys.management.analytics("executive"),
    queryFn: ({ signal }) => managementService.getExecutiveAnalytics(signal),
    enabled,
    staleTime: MANAGEMENT_STALE_TIME,
  });
}

export function useClientAnalytics() {
  const enabled = usePermission("Analytics.View");
  return useQuery({
    queryKey: queryKeys.management.analytics("clients"),
    queryFn: ({ signal }) => managementService.getClientAnalytics(signal),
    enabled,
    staleTime: MANAGEMENT_STALE_TIME,
  });
}

export function useTalentAnalytics() {
  const enabled = usePermission("Analytics.View");
  return useQuery({
    queryKey: queryKeys.management.analytics("talent"),
    queryFn: ({ signal }) => managementService.getTalentAnalytics(signal),
    enabled,
    staleTime: MANAGEMENT_STALE_TIME,
  });
}
