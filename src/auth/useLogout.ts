import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/auth/AuthProvider";
import { useDevPreview } from "@/auth/devPreview";
import { clearUserScopedCaches } from "@/services/cache";
import { clearIntendedAction } from "@/features/auth/intendedAction";
import { disconnectChat } from "@/features/conversations/connection";

/**
 * Canonical logout / account-switch action.
 *
 * Order matters: clear all user-scoped client state (React Query caches +
 * user-scoped storage, so no protected/VIP data survives) and the dev-preview
 * overlay BEFORE handing off to the auth provider, which revokes the session
 * server-side and drops the tokens. Use this everywhere instead of calling
 * `auth.logout()` directly.
 *
 * `allDevices` maps to `POST /auth/logout-all`, revoking every session for the
 * user rather than just this device.
 */
export function useLogout(): (opts?: { redirect?: boolean; allDevices?: boolean }) => Promise<void> {
  const queryClient = useQueryClient();
  const { logout } = useAuth();
  const dev = useDevPreview();

  return async (opts) => {
    clearUserScopedCaches(queryClient);
    // A parked guest intent must not survive into the next session.
    clearIntendedAction();
    // Tear the chat socket down: it is authenticated with the outgoing user's token
    // and is still joined to their conversation groups.
    void disconnectChat();
    dev.clear();
    await logout({ redirect: opts?.redirect ?? true, allDevices: opts?.allDevices });
  };
}
