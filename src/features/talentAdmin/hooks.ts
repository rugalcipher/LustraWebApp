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
