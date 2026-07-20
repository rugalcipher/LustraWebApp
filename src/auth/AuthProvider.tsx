import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/api/queryKeys";
import { clearUserScopedCaches } from "@/services/cache";
import { onSessionEnded, type SessionEndedReason } from "@/api/authTokenCoordinator";
import { registerForbiddenHandler } from "@/api/client";
import * as authService from "@/services/authService";
import type { AuthUserDto } from "@/services/dto/authDto";
import { useAuthStore } from "@/stores/authStore";
import { isUnauthorized } from "@/api/problemDetails";

/**
 * The real, API-backed authentication provider (replaces the Base44 provider).
 *
 * Session lifecycle:
 *  1. On mount, if a usable refresh token exists we fetch `GET /auth/me`. The
 *     central client transparently exchanges the refresh token for an access
 *     token first, so a page reload restores the session in one round trip.
 *  2. `GET /auth/me` is the single source of truth for identity, roles and
 *     permissions — never a decoded JWT, and never a client-side guess.
 *  3. When the refresh coordinator reports the session is over, every
 *     user-scoped cache is dropped and the user is routed to sign-in with the
 *     attempted route preserved.
 */

export interface AuthContextValue {
  user: AuthUserDto | null;
  isAuthenticated: boolean;
  /** True until the initial session restore settles. Guards must wait on this. */
  isLoadingAuth: boolean;
  /** Retained for API compatibility with the previous provider; always false. */
  isLoadingPublicSettings: boolean;
  authChecked: boolean;
  authError: { type: string; message: string } | null;
  /** Re-read `/auth/me` (after a role change, verification, or VIP grant). */
  refreshUser: () => Promise<void>;
  logout: (opts?: { allDevices?: boolean; redirect?: boolean }) => Promise<void>;
  navigateToLogin: (opts?: { from?: string }) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();
  const setAuthenticated = useAuthStore((s) => s.setAuthenticated);
  const setGuest = useAuthStore((s) => s.setGuest);
  const setHydrating = useAuthStore((s) => s.setHydrating);
  const setIntendedRoute = useAuthStore((s) => s.setIntendedRoute);

  // Whether a session could exist at all on this device. Captured once so the
  // initial render already knows not to show a loader for a plain guest.
  const canRestore = useRef(authService.canRestoreSession()).current;

  useEffect(() => {
    if (canRestore) setHydrating();
    else setGuest();
  }, [canRestore, setHydrating, setGuest]);

  const meQuery = useQuery({
    queryKey: queryKeys.auth.me(),
    queryFn: ({ signal }) => authService.getCurrentUser(signal),
    enabled: canRestore,
    staleTime: 60_000,
    // A 401 here means "not signed in" — a legitimate answer, not a failure to
    // retry. Anything else may be transient.
    retry: (failureCount, error) => !isUnauthorized(error) && failureCount < 1,
    refetchOnWindowFocus: false,
  });

  const user = (meQuery.data ?? null) as AuthUserDto | null;
  const isLoadingAuth = canRestore && meQuery.isPending;

  useEffect(() => {
    if (isLoadingAuth) return;
    if (user) setAuthenticated(user);
    else setGuest();
  }, [user, isLoadingAuth, setAuthenticated, setGuest]);

  const navigateToLogin = useCallback(
    (opts?: { from?: string }) => {
      const from = opts?.from ?? `${location.pathname}${location.search}`;
      if (from && from !== "/login") setIntendedRoute(from);
      navigate("/login", { replace: true, state: { from } });
    },
    [navigate, location.pathname, location.search, setIntendedRoute]
  );

  // Refresh failed / session revoked → tear down local state exactly once.
  useEffect(() => {
    return onSessionEnded((reason: SessionEndedReason) => {
      clearUserScopedCaches(queryClient);
      setGuest();
      if (reason !== "logout") {
        navigateToLogin();
      }
    });
  }, [queryClient, setGuest, navigateToLogin]);

  // Observe 403s for diagnostics; authorization decisions stay server-side.
  useEffect(() => {
    registerForbiddenHandler(null);
    return () => registerForbiddenHandler(null);
  }, []);

  const refreshUser = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.auth.me() });
  }, [queryClient]);

  const logout = useCallback(
    async (opts?: { allDevices?: boolean; redirect?: boolean }) => {
      clearUserScopedCaches(queryClient);
      if (opts?.allDevices) await authService.logoutAll();
      else await authService.logout();
      setGuest();
      if (opts?.redirect !== false) navigate("/", { replace: true });
    },
    [queryClient, navigate, setGuest]
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: user !== null,
      isLoadingAuth,
      isLoadingPublicSettings: false,
      authChecked: !isLoadingAuth,
      authError: null,
      refreshUser,
      logout,
      navigateToLogin,
    }),
    [user, isLoadingAuth, refreshUser, logout, navigateToLogin]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
