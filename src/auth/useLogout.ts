import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/AuthContext";
import { useDevPreview } from "@/auth/devPreview";
import { clearUserScopedCaches } from "@/services/cache";

/**
 * Canonical logout / account-switch action.
 *
 * Order matters: clear all user-scoped client state (React Query caches +
 * user-scoped storage, so no protected/VIP data survives) and the dev-preview
 * overlay BEFORE handing off to the auth provider's token teardown. Use this
 * everywhere instead of calling `auth.logout()` directly.
 */
export function useLogout(): (opts?: { redirect?: boolean }) => void {
  const queryClient = useQueryClient();
  const { logout } = useAuth();
  const dev = useDevPreview();

  return (opts) => {
    clearUserScopedCaches(queryClient);
    dev.clear();
    logout(opts?.redirect ?? true);
  };
}
