import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/api/queryKeys";
import * as siteService from "@/services/siteService";

/**
 * Public site content.
 *
 * Cached under the PUBLIC `cms` namespace, not a user-scoped one: the landing page is
 * identical for every visitor, so it survives sign-out and is shared between guests and
 * signed-in users.
 */

// The landing page changes when marketing publishes, not per request. A long stale time
// keeps the site's most-hit endpoint cheap; React Query still refetches on remount.
const SITE_STALE_TIME = 5 * 60_000;

export function useHomePage() {
  return useQuery({
    queryKey: queryKeys.cms.home(),
    queryFn: ({ signal }) => siteService.getHomePage(signal),
    staleTime: SITE_STALE_TIME,
    // The hero has a shipped fallback, so a failed fetch must not retry aggressively and
    // delay first paint — one retry, then let the caller render its built-in slides.
    retry: 1,
  });
}

export function useAnnouncements() {
  return useQuery({
    queryKey: queryKeys.cms.announcements(),
    queryFn: ({ signal }) => siteService.getAnnouncements(signal),
    staleTime: SITE_STALE_TIME,
    retry: 1,
  });
}
