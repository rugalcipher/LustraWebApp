import React, { useEffect } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { usePrincipal } from "@/auth/PrincipalContext";
import { useAuth } from "@/auth/AuthProvider";
import { registerForbiddenHandler } from "@/api/client";
import { ROUTES } from "@/app/routeRegistry";
import { CHANGE_PASSWORD_PATH, PASSWORD_CHANGE_REQUIRED, isAllowedWhileRestricted } from "@/auth/restrictedSession";

/**
 * Holds a restricted session on the change-password screen.
 *
 * Wraps the whole routed app rather than individual routes, for the same reason
 * the backend middleware is deny-by-default: a route added next month is covered
 * because nobody had to remember to opt it in. Opt-in guards fail silently, and
 * the failure is invisible until someone finds the gap.
 *
 * It sits ABOVE the role guards deliberately, mirroring the middleware running
 * before authorization. A restricted user who lacks a role would otherwise be
 * sent to "unauthorized" — a dead end that cannot help them — instead of to the
 * one screen that can.
 *
 * The restriction is read from the principal on every render, so it survives a
 * refresh and cannot be dismissed by client state. Clearing it locally would
 * only hide the screen: every request would still be refused.
 */
export default function RestrictedSessionGate({ children }: { children: React.ReactNode }) {
  const { principal, isLoading } = usePrincipal();
  const auth = useAuth();
  const location = useLocation();
  const restricted = principal.isAuthenticated && principal.mustChangePassword;

  /**
   * Catch the restriction appearing DURING a session.
   *
   * An administrator can force a reset while someone is already signed in. Their
   * cached principal still says unrestricted, so the first they would know is an
   * unexplained 403 on whatever they clicked. Re-reading the session on that
   * specific refusal turns it into the change-password screen.
   *
   * Only this errorCode triggers a re-read — an ordinary permission denial is
   * not a session change and must not cost a round trip. `/auth/me` is on the
   * backend's allow-list, so the refresh itself cannot be refused and loop.
   */
  useEffect(() => {
    registerForbiddenHandler((error) => {
      if (error.code === PASSWORD_CHANGE_REQUIRED && !restricted) {
        void auth.refreshUser?.();
      }
    });
    return () => registerForbiddenHandler(null);
  }, [auth, restricted]);

  // Never decide on a principal that has not settled — a flash of the lockout
  // screen for an unrestricted user is its own bug.
  if (isLoading || !restricted) {
    return <>{children}</>;
  }

  const route = ROUTES.find((r) => r.path === location.pathname);
  // Unknown paths are treated as protected: if it is not a route we publish as
  // public, assume the API will refuse it and keep the user where they can act.
  const isProtected = route ? route.access === "protected" : true;

  if (isAllowedWhileRestricted(location.pathname, isProtected)) {
    return <>{children}</>;
  }

  return <Navigate to={CHANGE_PASSWORD_PATH} replace />;
}
