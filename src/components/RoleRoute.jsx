import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { usePrincipal } from "@/auth/PrincipalContext";
import { allowedRolesFor, requiredPermissionsFor } from "@/app/routeRegistry";
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
 * Route guard driven by the canonical principal.
 *
 * 1. Waits for the principal to settle (branded loader) — never decides on a
 *    loading/unsettled principal.
 * 2. Resolves allowed roles from the centralized ROUTE_ACCESS map (or explicit
 *    `allowed` prop) and checks them against the principal's roles.
 * 3. Optionally enforces fine-grained `requiredPermissions` (all must be held) —
 *    the hook the .NET permission claims plug into.
 * 4. On denial, redirects to /unauthorized (not home), passing the attempted
 *    route + requirements so the user can resume after switching.
 *
 * @param {{
 *   allowed?: string[];
 *   requiredPermissions?: string[];
 *   children: React.ReactNode;
 * }} props
 */
export default function RoleRoute({ allowed, requiredPermissions, children }) {
  const { isLoading, hasAnyRole, hasPermission } = usePrincipal();
  const location = useLocation();

  if (isLoading) return <HydrationLoader />;

  const permittedRoles = allowed ?? allowedRolesFor(location.pathname);
  const perms = requiredPermissions ?? requiredPermissionsFor(location.pathname);
  const roleOk = !permittedRoles || hasAnyRole(permittedRoles);
  const permsOk = !perms || perms.every(hasPermission);

  if (!roleOk || !permsOk) {
    return (
      <Navigate
        to="/unauthorized"
        replace
        state={{ from: location.pathname, required: permittedRoles, requiredPermissions: perms }}
      />
    );
  }
  return children;
}
