import { useQuery } from "@tanstack/react-query";
import { usePrincipal } from "@/auth/PrincipalContext";
import { fetchTalentGallery } from "@/services/mediaService";
import type { ResolvedMedia, TalentMediaItem } from "@/domain/media";
import { presentGallery } from "@/domain/media";
import { queryKeys } from "@/services/queryKeys";

interface TalentLike {
  id: string;
  gallery?: string[];
}

/**
 * Feature hook: resolve a talent's gallery into presentation-safe media for the
 * CURRENT principal.
 *
 * Flow: component → this hook → React Query → typed media service. The single
 * media-access policy (`presentGallery`) runs in `select`, so visual components
 * receive already-authorized data and never make VIP checks themselves. The
 * query key is user-scoped, so switching accounts cannot serve a previous
 * user's (potentially protected) gallery from cache.
 */
export function useTalentGallery(talent: TalentLike | null | undefined): {
  media: ResolvedMedia[];
  isLoading: boolean;
  isError: boolean;
} {
  const { principal, isVip } = usePrincipal();
  const viewer = { isAuthenticated: principal.isAuthenticated, isVip };

  const query = useQuery<TalentMediaItem[], unknown, ResolvedMedia[]>({
    queryKey: queryKeys.media.gallery(principal.userId, talent?.id),
    queryFn: () => fetchTalentGallery({ talent: talent as TalentLike }),
    enabled: !!talent,
    staleTime: 60_000,
    select: (items) => presentGallery(items, viewer, { keepLocked: true }),
  });

  return {
    media: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
  };
}
