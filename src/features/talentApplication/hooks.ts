import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/api/queryKeys";
import { usePrincipal } from "@/auth/PrincipalContext";
import * as service from "@/services/talentApplicationService";
import type {
  ApproveTalentApplicationRequest,
  TalentApplicationSearch,
} from "@/services/talentApplicationService";

/**
 * Management review of talent applications.
 *
 * Queries are gated on the caller actually holding the permission so a user who
 * reaches an internal route without it fires no request rather than collecting
 * 403s. The server remains the authorization boundary — this only avoids
 * pointless traffic, and every mutation is re-authorized there.
 *
 * The three permissions are deliberately distinct, mirroring the controller:
 * seeing the queue, acting on an application, and converting one into a real
 * talent profile (which creates a user account) are separate privileges.
 */

export const TALENT_APPLICATION_PERMISSIONS = {
  view: "TalentApplications.View",
  review: "TalentApplications.Review",
  approve: "TalentApplications.Approve",
} as const;

const STALE_TIME = 20_000;

export function useTalentApplicationPermissions() {
  const { principal } = usePrincipal();
  const has = (permission: string) =>
    principal.isAuthenticated && principal.permissions.includes(permission);
  return {
    canView: has(TALENT_APPLICATION_PERMISSIONS.view),
    canReview: has(TALENT_APPLICATION_PERMISSIONS.review),
    canApprove: has(TALENT_APPLICATION_PERMISSIONS.approve),
  };
}

export function useTalentApplications(filters: TalentApplicationSearch = {}) {
  const { canView } = useTalentApplicationPermissions();
  return useQuery({
    queryKey: queryKeys.management.talentApplications(filters),
    queryFn: ({ signal }) => service.listApplications(filters, signal),
    enabled: canView,
    staleTime: STALE_TIME,
  });
}

export function useTalentApplication(id: string | undefined) {
  const { canView } = useTalentApplicationPermissions();
  return useQuery({
    queryKey: queryKeys.management.talentApplication(id ?? ""),
    queryFn: ({ signal }) => service.getApplication(id!, signal),
    enabled: canView && Boolean(id),
    staleTime: STALE_TIME,
  });
}

/**
 * A short-lived authorised URL for ONE private photograph.
 *
 * Not cached beyond its own life: the URL expires, and holding it in a shared
 * cache would keep a working link to private application media around after the
 * reviewer has moved on. `gcTime` is deliberately short for the same reason.
 */
export function useApplicationMediaUrl(id: string | undefined, mediaId: string | undefined) {
  const { canView } = useTalentApplicationPermissions();
  return useQuery({
    queryKey: queryKeys.management.talentApplicationMedia(id ?? "", mediaId ?? ""),
    queryFn: ({ signal }) => service.getMediaUrl(id!, mediaId!, signal),
    enabled: canView && Boolean(id) && Boolean(mediaId),
    staleTime: 60_000,
    gcTime: 120_000,
  });
}

/**
 * Every review action invalidates both the detail and the queue: the action
 * changes the row's status, and leaving the list cached would show a queue that
 * contradicts the application the reviewer is looking at.
 */
function useReviewMutation<TArgs, TResult>(
  id: string | undefined,
  fn: (args: TArgs) => Promise<TResult>
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.management.talentApplication(id ?? "") });
      queryClient.invalidateQueries({ queryKey: ["management", "talent-applications"] });
    },
  });
}

export function useAddApplicationNote(id: string | undefined) {
  return useReviewMutation(id, (note: string) => service.addNote(id!, note));
}

export function useMarkUnderReview(id: string | undefined) {
  return useReviewMutation(id, () => service.markUnderReview(id!));
}

export function useRequestChanges(id: string | undefined) {
  return useReviewMutation(id, (reason: string) => service.requestChanges(id!, reason));
}

export function useRejectApplication(id: string | undefined) {
  return useReviewMutation(id, (reason: string) => service.rejectApplication(id!, reason));
}

/**
 * Approval creates a talent profile and a user account, so it must never happen
 * twice. The caller supplies a key generated once when the confirmation dialog
 * opens; a retry after a network failure then reuses it and the server returns
 * the original result instead of converting again.
 */
export function useApproveApplication(id: string | undefined) {
  return useReviewMutation(
    id,
    ({
      request,
      idempotencyKey,
    }: {
      request: ApproveTalentApplicationRequest;
      idempotencyKey: string;
    }) => service.approveApplication(id!, request, idempotencyKey)
  );
}
