import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { usePrincipal } from "@/auth/PrincipalContext";
import { allowedRolesFor, requiredPermissionsFor } from "@/app/routeRegistry";
import { useAuthStore } from "@/stores/authStore";
import Monogram from "@/lib/lustra/Monogram";

/**
 * Branded loading screen shown while the principal resolves, so we never make
 * an access decision on unsettled state (prevents protected-content flashes).
 */
function HydrationLoader() {
  return (
    <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-noir">
      <Monogram size={36} />
      <div className="mt-6 h-5 w-5 border-2 border-rose-gold/25 border-t-rose-gold rounded-full animate-spin" />
      <p className="mt-4 font-body text-[0.55rem] tracking-luxe uppercase text-muted-grey">Lustra</p>
    </div>
  );
}

/**
 * Route guard driven by the canonical principal (roles/permissions come from
 * the real `GET /auth/me` claims — never from hidden navigation links).
 *
 * 1. Waits for the principal to settle (branded loader) — never decides on a
 *    loading/unsettled principal.
 * 2. UNAUTHENTICATED → /login, recording the attempted route so the user is
 *    returned there after signing in.
 * 3. AUTHENTICATED but wrong role/permission → /unauthorized (not home), so a
 *    signed-in user is never bounced to a sign-in form they don't need.
 * 4. Suspended/inactive accounts are denied even when the role matches.
 *
 * @param {{
 *   allowed?: string[];
 *   requiredPermissions?: string[];
 *   children: React.ReactNode;
 * }} props
 */
export default function RoleRoute({ allowed, requiredPermissions, children }) {
  const { isLoading, principal, hasAnyRole, hasPermission } = usePrincipal();
  const setIntendedRoute = useAuthStore((s) => s.setIntendedRoute);
  const location = useLocation();

  if (isLoading) return <HydrationLoader />;

  const permittedRoles = allowed ?? allowedRolesFor(location.pathname);
  const perms = requiredPermissions ?? requiredPermissionsFor(location.pathname);
  const attempted = `${location.pathname}${location.search}`;

  // Not signed in → sign-in, preserving where they were heading.
  if (!principal.isAuthenticated) {
    setIntendedRoute(attempted);
    return <Navigate to="/login" replace state={{ from: attempted }} />;
  }

  // Signed in but the account is not usable (suspended, pending closure…).
  if (principal.accountStatus && principal.accountStatus !== "Active") {
    return <Navigate to="/unauthorized" replace state={{ from: attempted, reason: principal.accountStatus }} />;
  }

  const roleOk = !permittedRoles || hasAnyRole(permittedRoles);
  const permsOk = !perms || perms.every(hasPermission);

  if (!roleOk || !permsOk) {
    return (
      <Navigate
        to="/unauthorized"
        replace
        state={{ from: attempted, required: permittedRoles, requiredPermissions: perms }}
      />
    );
  }
  return children;
}
