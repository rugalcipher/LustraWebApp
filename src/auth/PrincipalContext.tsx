import React, { createContext, useContext, useMemo } from "react";
import { useAuth } from "@/lib/AuthContext";
import { useDevPreview } from "@/auth/devPreview";
import type { Principal } from "@/auth/principal";
import {
  GUEST_PRINCIPAL,
  LOADING_PRINCIPAL,
  principalFromAuthUser,
  principalFromDevPreview,
} from "@/auth/principal";
import type { Role } from "@/domain/roles";
import { primaryRole as pickPrimaryRole, GUEST } from "@/domain/roles";
import { isVipActive, MEMBERSHIP_TIER } from "@/domain/entitlements";

/**
 * Composes the canonical Principal from the available identity sources and
 * exposes read-only access helpers. The single hook route guards, shells, and
 * access policies use for authorization decisions.
 *
 * Source precedence: dev-preview overlay → real authenticated user → guest.
 * The dev overlay never mutates the real user; it is a separate, clearly tagged
 * principal (`source: "dev-preview"`).
 */

export interface PrincipalContextValue {
  principal: Principal;
  isLoading: boolean;
  hasRole: (role: Role) => boolean;
  hasAnyRole: (allowed: readonly Role[] | undefined | null) => boolean;
  hasPermission: (permission: string) => boolean;
  isVip: boolean;
  primaryRole: Role | typeof GUEST;
  GUEST: typeof GUEST;
}

const PrincipalContext = createContext<PrincipalContextValue | null>(null);

export function PrincipalProvider({ children }: { children: React.ReactNode }) {
  const auth = useAuth();
  const dev = useDevPreview();

  const principal = useMemo<Principal>(() => {
    // 1. Dev preview overlay
    if (dev.isActive && dev.role) {
      return principalFromDevPreview({
        role: dev.role,
        membership: {
          tier: dev.membershipTier,
          vipActivatedAtUtc: dev.membershipTier === MEMBERSHIP_TIER.Vip ? "2026-01-01T00:00:00Z" : null,
          vipExpiresAtUtc: null,
        },
      });
    }

    // 2. Real auth (wait for it to settle before deciding)
    if (auth.isLoadingAuth || auth.isLoadingPublicSettings) {
      return LOADING_PRINCIPAL;
    }
    if (auth.isAuthenticated && auth.user) {
      return principalFromAuthUser(auth.user);
    }

    // 3. Guest
    return GUEST_PRINCIPAL;
  }, [
    dev.isActive,
    dev.role,
    dev.membershipTier,
    auth.isLoadingAuth,
    auth.isLoadingPublicSettings,
    auth.isAuthenticated,
    auth.user,
  ]);

  const api = useMemo<PrincipalContextValue>(() => {
    const roles = principal.roles;
    const vip = isVipActive(principal.membership);
    return {
      principal,
      isLoading: principal.isLoading,
      hasRole: (role: Role) => roles.includes(role),
      hasAnyRole: (allowed) => Array.isArray(allowed) && allowed.some((r) => roles.includes(r)),
      hasPermission: (permission: string) => principal.permissions.includes(permission),
      isVip: vip,
      primaryRole: pickPrimaryRole(roles),
      GUEST,
    };
  }, [principal]);

  return <PrincipalContext.Provider value={api}>{children}</PrincipalContext.Provider>;
}

export function usePrincipal(): PrincipalContextValue {
  const ctx = useContext(PrincipalContext);
  if (!ctx) throw new Error("usePrincipal must be used within PrincipalProvider");
  return ctx;
}
