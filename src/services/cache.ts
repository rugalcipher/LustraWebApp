import type { QueryClient } from "@tanstack/react-query";
import { USER_SCOPED_NAMESPACES } from "@/services/queryKeys";

/**
 * User-scoped browser storage keys cleared on logout / account switch so one
 * account's state (and any future protected media references) never bleeds into
 * the next session.
 */
/**
 * `lustra-saved` is a LEGACY key: saved talent used to live in localStorage and is now
 * server-owned. It is still cleared so any value left on a device from before the
 * migration is removed rather than lingering indefinitely.
 */
const USER_SCOPED_STORAGE_KEYS = ["lustra-saved"];

/** Discovery position and any parked guest intent must not survive a sign-out. */
const USER_SCOPED_SESSION_KEYS = ["lustra-discover", "lustra.intendedAction"];

/**
 * Clear everything tied to the previous principal: React Query caches for
 * user-scoped namespaces (REMOVED, not just invalidated, so protected data
 * cannot be re-read from cache) and user-scoped storage. Does NOT touch the
 * auth token (the caller's logout handles that) or public reference caches.
 */
export function clearUserScopedCaches(queryClient: QueryClient): void {
  try {
    for (const ns of USER_SCOPED_NAMESPACES) {
      queryClient.removeQueries({ queryKey: [ns] });
    }
  } catch {
    /* query client may be unavailable in some contexts */
  }

  if (typeof window !== "undefined") {
    for (const key of USER_SCOPED_STORAGE_KEYS) {
      try {
        window.localStorage.removeItem(key);
      } catch {
        /* ignore */
      }
    }
    for (const key of USER_SCOPED_SESSION_KEYS) {
      try {
        window.sessionStorage.removeItem(key);
      } catch {
        /* ignore */
      }
    }
  }
}
