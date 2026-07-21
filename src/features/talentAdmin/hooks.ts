import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/api/queryKeys";
import { usePrincipal } from "@/auth/PrincipalContext";
import * as talentAdmin from "@/services/talentAdminService";
import * as mediaAdmin from "@/services/mediaAdminService";
import type {
  CreateTalentRequest, TalentAdminSearch, TalentProfileFields,
} from "@/services/talentAdminService";
import type { MediaVisibility } from "@/services/mediaAdminService";

/**
 * Direct talent administration.
 *
 * Queries are gated on the caller holding the permission so someone who reaches
 * an internal route without it fires no request rather than collecting 403s. The
 * server remains the authorization boundary and re-checks every call.
 *
 * The three permissions are deliberately distinct, mirroring the controller:
 * viewing the roster, creating a talent (which creates an ACCOUNT), and managing
 * an existing one are separate privileges, and moderating media is a fourth.
 */

export const TALENT_ADMIN_PERMISSIONS = {
  view: "Talent.View",
  create: "Talent.Create",
  manage: "Talent.Manage",
  moderateMedia: "Talent.ModerateMedia",
} as const;

const STALE_TIME = 20_000;

export function useTalentAdminPermissions() {
  const { principal } = usePrincipal();
  const has = (permission: string) =>
    principal.isAuthenticated && principal.permissions.includes(permission);
  return {
    canView: has(TALENT_ADMIN_PERMISSIONS.view),
    canCreate: has(TALENT_ADMIN_PERMISSIONS.create),
    canManage: has(TALENT_ADMIN_PERMISSIONS.manage),
    canModerateMedia: has(TALENT_ADMIN_PERMISSIONS.moderateMedia),
  };
}

export function useTalentRoster(filters: TalentAdminSearch = {}, enabled = true) {
  const { canView } = useTalentAdminPermissions();
  return useQuery({
    queryKey: queryKeys.talentAdmin.roster(filters),
    queryFn: ({ signal }) => talentAdmin.searchTalent(filters, signal),
    enabled: canView && enabled,
    staleTime: STALE_TIME,
  });
}

export function useTalentRecord(profileId: string | undefined) {
  const { canView } = useTalentAdminPermissions();
  return useQuery({
    queryKey: queryKeys.talentAdmin.record(profileId ?? ""),
    queryFn: ({ signal }) => talentAdmin.getTalentRecord(profileId!, signal),
    enabled: canView && Boolean(profileId),
    staleTime: STALE_TIME,
  });
}

/**
 * Anything that changes a talent invalidates the record, the roster AND the
 * public caches: publishing, archiving or featuring changes what a visitor sees
 * on discovery, so leaving those cached would contradict the roster in hand.
 */
function useTalentInvalidation() {
  const queryClient = useQueryClient();
  return (profileId?: string) => {
    if (profileId) {
      queryClient.invalidateQueries({ queryKey: queryKeys.talentAdmin.record(profileId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.talentAdmin.media(profileId) });
    }
    queryClient.invalidateQueries({ queryKey: ["talent-admin"] });
    queryClient.invalidateQueries({ queryKey: ["discovery"] });
    queryClient.invalidateQueries({ queryKey: ["talent"] });
    queryClient.invalidateQueries({ queryKey: ["admin", "dashboard"] });
  };
}

export function useCreateTalent() {
  const invalidate = useTalentInvalidation();
  return useMutation({
    mutationFn: (request: CreateTalentRequest) => talentAdmin.createTalent(request),
    retry: false,
    onSuccess: (result) => invalidate(result.talentProfileId),
  });
}

export function useUpdateTalent(profileId: string | undefined) {
  const invalidate = useTalentInvalidation();
  return useMutation({
    mutationFn: (fields: TalentProfileFields) => talentAdmin.updateTalent(profileId!, fields),
    retry: false,
    onSuccess: () => invalidate(profileId),
  });
}

export function useArchiveTalent(profileId: string | undefined) {
  const invalidate = useTalentInvalidation();
  return useMutation({
    mutationFn: (reason: string) => talentAdmin.archiveTalent(profileId!, reason),
    retry: false,
    onSuccess: () => invalidate(profileId),
  });
}

export function useRestoreTalent(profileId: string | undefined) {
  const invalidate = useTalentInvalidation();
  return useMutation({
    mutationFn: () => talentAdmin.restoreTalent(profileId!),
    retry: false,
    onSuccess: () => invalidate(profileId),
  });
}

export function useIssueTalentInvitation(profileId: string | undefined) {
  const invalidate = useTalentInvalidation();
  return useMutation({
    mutationFn: () => talentAdmin.issueTalentInvitation(profileId!),
    retry: false,
    onSuccess: () => invalidate(profileId),
  });
}

/**
 * Sets a temporary password.
 *
 * The result carries the only copy of the value. The caller shows it once and
 * must not write it anywhere — no cache, no log, no analytics payload.
 */
export function useSetTalentTemporaryPassword(profileId: string | undefined) {
  const invalidate = useTalentInvalidation();
  return useMutation({
    mutationFn: () => talentAdmin.setTalentTemporaryPassword(profileId!),
    retry: false,
    onSuccess: () => invalidate(profileId),
  });
}

// ---- media ------------------------------------------------------------------

export function useTalentMedia(profileId: string | undefined, enabled = true) {
  const { canModerateMedia } = useTalentAdminPermissions();
  return useQuery({
    queryKey: queryKeys.talentAdmin.media(profileId ?? ""),
    queryFn: ({ signal }) => talentAdmin.listTalentMedia(profileId!, signal),
    enabled: canModerateMedia && enabled && Boolean(profileId),
    // The read URLs on these rows are short-lived and minted per request, so a
    // long cache would hand out links that have already expired.
    staleTime: 30_000,
    gcTime: 60_000,
  });
}

export function useMediaHistory(mediaId: string | undefined) {
  const { canModerateMedia } = useTalentAdminPermissions();
  return useQuery({
    queryKey: queryKeys.talentAdmin.mediaHistory(mediaId ?? ""),
    queryFn: ({ signal }) => mediaAdmin.getMediaHistory(mediaId!, signal),
    enabled: canModerateMedia && Boolean(mediaId),
    staleTime: STALE_TIME,
  });
}

/**
 * Every media decision invalidates the talent's gallery, the moderation queue
 * and the public caches together — one item changing visibility changes
 * discovery, the client's appointment imagery and the talent's own profile at
 * the same moment.
 */
function useMediaInvalidation(profileId: string | undefined) {
  const queryClient = useQueryClient();
  return (mediaId?: string) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.talentAdmin.media(profileId ?? "") });
    if (mediaId) {
      queryClient.invalidateQueries({ queryKey: queryKeys.talentAdmin.mediaHistory(mediaId) });
    }
    queryClient.invalidateQueries({ queryKey: ["media"] });
    queryClient.invalidateQueries({ queryKey: ["discovery"] });
    queryClient.invalidateQueries({ queryKey: ["talent"] });
    queryClient.invalidateQueries({ queryKey: queryKeys.talentAdmin.record(profileId ?? "") });
  };
}

export type MediaAction =
  | { kind: "approve"; mediaId: string }
  | { kind: "reject"; mediaId: string; reason: string }
  | { kind: "request-changes"; mediaId: string; reason: string }
  | { kind: "visibility"; mediaId: string; visibility: MediaVisibility; note?: string | null }
  | { kind: "cover"; mediaId: string }
  | { kind: "soft-delete"; mediaId: string; note?: string | null }
  | { kind: "restore"; mediaId: string }
  | { kind: "revoke-publication"; mediaId: string; reason: string };

export function useMediaAction(profileId: string | undefined) {
  const invalidate = useMediaInvalidation(profileId);
  return useMutation({
    mutationFn: (action: MediaAction) => {
      switch (action.kind) {
        case "approve":
          return mediaAdmin.approveMedia(action.mediaId);
        case "reject":
          return mediaAdmin.rejectMedia(action.mediaId, action.reason);
        case "request-changes":
          return mediaAdmin.requestMediaChanges(action.mediaId, action.reason);
        case "visibility":
          return mediaAdmin.setMediaVisibility(action.mediaId, action.visibility, action.note);
        case "cover":
          return mediaAdmin.setMediaCover(action.mediaId);
        case "soft-delete":
          return mediaAdmin.softDeleteMedia(action.mediaId, action.note);
        case "restore":
          return mediaAdmin.restoreMedia(action.mediaId);
        case "revoke-publication":
          return mediaAdmin.revokeMediaPublication(action.mediaId, action.reason);
      }
    },
    retry: false,
    onSuccess: (_result, action) => invalidate(action.mediaId),
  });
}

export function useReorderTalentMedia(profileId: string | undefined) {
  const invalidate = useMediaInvalidation(profileId);
  return useMutation({
    mutationFn: (items: { mediaId: string; sortOrder: number }[]) =>
      talentAdmin.reorderTalentMedia(profileId!, items),
    retry: false,
    onSuccess: () => invalidate(),
  });
}

// ---- staff upload -------------------------------------------------------------

/**
 * Uploads a photograph on a talent's behalf.
 *
 * Three steps, and the order matters: ask for a slot, PUT the bytes straight to
 * storage, then tell the API the object landed. A photograph exists only once
 * finalize succeeds — showing it as uploaded before that would claim something
 * the server has not confirmed.
 *
 * It lands `PendingReview` and private. Staff uploading a photograph is not
 * staff moderating it, and the manager reflects that rather than auto-approving.
 */
export function useUploadTalentMedia(profileId: string | undefined) {
  const invalidate = useMediaInvalidation(profileId);
  return useMutation({
    mutationFn: async ({
      file,
      idempotencyKey,
      onProgress,
    }: {
      file: File;
      idempotencyKey: string;
      onProgress?: (fraction: number) => void;
    }) => {
      const ticket = await talentAdmin.requestTalentMediaUpload(
        profileId!,
        {
          contentType: file.type,
          expectedSizeBytes: file.size,
          fileName: file.name,
        },
        idempotencyKey
      );
      try {
        await talentAdmin.uploadTalentMediaToStorage(ticket, file, onProgress);
      } catch (error) {
        // Release the slot rather than leaving an orphan row waiting for bytes
        // that are never coming. Best-effort: the original failure is what the
        // operator needs to see.
        await talentAdmin.cancelTalentMediaUpload(profileId!, ticket.mediaId).catch(() => {});
        throw error;
      }
      return talentAdmin.finalizeTalentMediaUpload(profileId!, ticket.mediaId);
    },
    retry: false,
    onSuccess: () => invalidate(),
  });
}

/** What archiving would affect. Read before archiving, never as a side effect. */
export function useTalentArchiveImpact(profileId: string | undefined, enabled = false) {
  const { canManage } = useTalentAdminPermissions();
  return useQuery({
    queryKey: queryKeys.talentAdmin.archiveImpact(profileId ?? ""),
    queryFn: ({ signal }) => talentAdmin.getTalentArchiveImpact(profileId!, signal),
    enabled: canManage && enabled && Boolean(profileId),
    staleTime: 10_000,
  });
}

/**
 * Publication and promotion.
 *
 * Four separate mutations on purpose. Publication and featuring are distinct states with
 * distinct permissions — `Talent.ApproveProfiles` decides what the public can see,
 * `Talent.Manage` decides what gets promoted — and collapsing them into one toggle would
 * make "feature" silently publish, which the backend refuses anyway.
 */
export function usePublishTalent(profileId: string | undefined) {
  const invalidate = useTalentInvalidation();
  return useMutation({
    mutationFn: () => talentAdmin.publishTalent(profileId!),
    retry: false,
    onSuccess: () => invalidate(profileId),
  });
}

export function useUnpublishTalent(profileId: string | undefined) {
  const invalidate = useTalentInvalidation();
  return useMutation({
    mutationFn: (reason?: string | null) => talentAdmin.unpublishTalent(profileId!, reason),
    retry: false,
    onSuccess: () => invalidate(profileId),
  });
}

export function useFeatureTalent(profileId: string | undefined) {
  const invalidate = useTalentInvalidation();
  return useMutation({
    mutationFn: () => talentAdmin.featureTalent(profileId!),
    retry: false,
    onSuccess: () => invalidate(profileId),
  });
}

export function useUnfeatureTalent(profileId: string | undefined) {
  const invalidate = useTalentInvalidation();
  return useMutation({
    mutationFn: () => talentAdmin.unfeatureTalent(profileId!),
    retry: false,
    onSuccess: () => invalidate(profileId),
  });
}

/** Whether the caller may change publication. Distinct from `Talent.Manage`. */
export function useCanApproveProfiles() {
  const { principal } = usePrincipal();
  return principal.isAuthenticated && principal.permissions.includes("Talent.ApproveProfiles");
}
