import { useCallback, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/api/queryKeys";
import { toUserMessage } from "@/api/problemDetails";
import { usePrincipal } from "@/auth/PrincipalContext";
import * as clientService from "@/services/clientService";
import type { CollectionDto, ClientProfileDto } from "@/services/clientService";

/**
 * Client-owned data hooks: profile, saved talent and collections.
 *
 * All server state lives in React Query under user-scoped keys, so logout drops it and
 * an account switch cannot serve the previous client's saves. Nothing here is mirrored
 * into Zustand or localStorage.
 */

const PROFILE_STALE_TIME = 5 * 60_000;
const SAVED_STALE_TIME = 60_000;

// --- Profile -----------------------------------------------------------------

export function useClientProfile() {
  const { principal } = usePrincipal();
  return useQuery<ClientProfileDto>({
    queryKey: queryKeys.client.profile(),
    queryFn: ({ signal }) => clientService.getProfile(signal),
    enabled: principal.isAuthenticated,
    staleTime: PROFILE_STALE_TIME,
  });
}

export function useUpdateClientProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: clientService.updateProfile,
    onSuccess: (profile) => {
      // The server returns the saved profile, so we adopt it rather than guessing.
      queryClient.setQueryData(queryKeys.client.profile(), profile);
    },
  });
}

// --- Saved talent ------------------------------------------------------------

/**
 * The set of talent ids this client has saved.
 *
 * This is the ONLY place saved state is fetched for merging. Public discovery responses
 * stay publicly cacheable and identical for every visitor; the UI overlays saved state
 * from this one small user-scoped query.
 */
export function useSavedTalentIds(): {
  savedIds: Set<string>;
  isSaved: (talentProfileId: string | null | undefined) => boolean;
  isLoading: boolean;
} {
  const { principal } = usePrincipal();

  const query = useQuery({
    queryKey: queryKeys.client.savedIds(),
    queryFn: ({ signal }) => clientService.listSavedIds(signal),
    enabled: principal.isAuthenticated,
    staleTime: SAVED_STALE_TIME,
  });

  const savedIds = useMemo(() => new Set(query.data ?? []), [query.data]);

  return {
    savedIds,
    isSaved: useCallback((id) => (id ? savedIds.has(id) : false), [savedIds]),
    isLoading: query.isPending,
  };
}

/** The client's saved talent, with enough detail to render cards. */
export function useSavedTalent() {
  const { principal } = usePrincipal();
  return useQuery({
    queryKey: queryKeys.client.saved(),
    queryFn: ({ signal }) => clientService.listSaved(signal),
    enabled: principal.isAuthenticated,
    staleTime: SAVED_STALE_TIME,
  });
}

/**
 * Save / unsave with an OPTIMISTIC update and a real rollback.
 *
 * The heart shows the new state immediately, but if the server rejects the change the
 * previous id set is restored — the UI never claims a save that did not happen.
 */
export function useToggleSavedTalent() {
  const queryClient = useQueryClient();
  const key = queryKeys.client.savedIds();

  return useMutation({
    mutationFn: ({ talentProfileId, save }: { talentProfileId: string; save: boolean }) =>
      save ? clientService.saveTalent(talentProfileId) : clientService.unsaveTalent(talentProfileId),

    onMutate: async ({ talentProfileId, save }) => {
      // Stop any in-flight refetch from overwriting the optimistic value.
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<string[]>(key);

      queryClient.setQueryData<string[]>(key, (current = []) =>
        save
          ? current.includes(talentProfileId)
            ? current
            : [...current, talentProfileId]
          : current.filter((id) => id !== talentProfileId)
      );

      return { previous };
    },

    onError: (_error, _variables, context) => {
      // Roll back to exactly what was there before the attempt.
      if (context?.previous !== undefined) {
        queryClient.setQueryData(key, context.previous);
      }
    },

    onSettled: () => {
      // Reconcile with the server either way.
      queryClient.invalidateQueries({ queryKey: key });
      queryClient.invalidateQueries({ queryKey: queryKeys.client.saved() });
      queryClient.invalidateQueries({ queryKey: queryKeys.client.collections() });
    },
  });
}

// --- Collections -------------------------------------------------------------

export function useCollections() {
  const { principal } = usePrincipal();
  return useQuery<CollectionDto[]>({
    queryKey: queryKeys.client.collections(),
    queryFn: ({ signal }) => clientService.listCollections(signal),
    enabled: principal.isAuthenticated,
    staleTime: SAVED_STALE_TIME,
  });
}

export function useCollection(collectionId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.client.collection(collectionId ?? ""),
    queryFn: ({ signal }) => clientService.getCollection(collectionId!, signal),
    enabled: Boolean(collectionId),
    staleTime: SAVED_STALE_TIME,
  });
}

function useCollectionInvalidation() {
  const queryClient = useQueryClient();
  return useCallback(
    (collectionId?: string) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.client.collections() });
      if (collectionId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.client.collection(collectionId) });
      }
    },
    [queryClient]
  );
}

export function useCreateCollection() {
  const invalidate = useCollectionInvalidation();
  return useMutation({
    mutationFn: clientService.createCollection,
    onSuccess: () => invalidate(),
  });
}

export function useUpdateCollection() {
  const invalidate = useCollectionInvalidation();
  return useMutation({
    mutationFn: ({ collectionId, input }: { collectionId: string; input: clientService.UpsertCollectionInput }) =>
      clientService.updateCollection(collectionId, input),
    onSuccess: (_r, { collectionId }) => invalidate(collectionId),
  });
}

export function useDeleteCollection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (collectionId: string) => clientService.deleteCollection(collectionId),
    onSuccess: (_r, collectionId) => {
      queryClient.removeQueries({ queryKey: queryKeys.client.collection(collectionId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.client.collections() });
    },
  });
}

export function useAddTalentToCollection() {
  const invalidate = useCollectionInvalidation();
  return useMutation({
    mutationFn: ({ collectionId, talentProfileId }: { collectionId: string; talentProfileId: string }) =>
      clientService.addTalentToCollection(collectionId, talentProfileId),
    onSuccess: (_r, { collectionId }) => invalidate(collectionId),
  });
}

export function useRemoveTalentFromCollection() {
  const invalidate = useCollectionInvalidation();
  return useMutation({
    mutationFn: ({ collectionId, talentProfileId }: { collectionId: string; talentProfileId: string }) =>
      clientService.removeTalentFromCollection(collectionId, talentProfileId),
    onSuccess: (_r, { collectionId }) => invalidate(collectionId),
  });
}

// ---- VIP entitlements ------------------------------------------------------

/**
 * The client's own entitlement state.
 *
 * Read from the server every time rather than cached in the principal or a token claim:
 * management can revoke VIP access at any moment, and a stale local copy would keep
 * showing VIP affordances that every request then refuses.
 */
export function useMyEntitlements() {
  const { principal } = usePrincipal();
  return useQuery({
    queryKey: queryKeys.client.entitlements(),
    queryFn: ({ signal }) => clientService.getEntitlements(signal),
    enabled: principal.isAuthenticated,
    staleTime: 60_000,
  });
}

/**
 * Ask to be considered for VIP access.
 *
 * `retry: false` — a duplicate submission is a 409 the client did not cause, and this
 * endpoint has no idempotency key.
 */
export function useRequestVipAccess() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (message: string | null) => clientService.requestVipAccess(message),
    retry: false,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.client.entitlements() });
    },
  });
}

/** A safe, user-facing message for any client-data failure. */
export function clientErrorMessage(error: unknown): string | null {
  return error ? toUserMessage(error) : null;
}
