import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import type { Role } from "@/domain/roles";
import { ROLES } from "@/domain/roles";
import type { MembershipTier } from "@/domain/entitlements";
import { MEMBERSHIP_TIER } from "@/domain/entitlements";
import { env } from "@/config/env";

/**
 * Development-only role/entitlement PREVIEW store.
 *
 * NOT an authorization source. It exists so the team can preview the app as any
 * role (and toggle VIP) while the real .NET auth is not yet wired. It is inert
 * unless `env.devRolePreviewEnabled` (force-disabled in production builds), and
 * it never mutates the real principal — it only overlays a preview in dev.
 */

const STORAGE_KEY = "lustra-dev-preview";

interface DevPreviewState {
  role: Role | null;
  membershipTier: MembershipTier;
}

interface DevPreviewContextValue extends DevPreviewState {
  enabled: boolean;
  isHydrated: boolean;
  isActive: boolean;
  setRole: (role: Role | null) => void;
  setMembershipTier: (tier: MembershipTier) => void;
  clear: () => void;
}

function readStored(): DevPreviewState {
  const fallback: DevPreviewState = { role: null, membershipTier: MEMBERSHIP_TIER.Standard };
  if (!env.devRolePreviewEnabled || typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<DevPreviewState>;
    const role = parsed.role && (ROLES as readonly string[]).includes(parsed.role) ? parsed.role : null;
    const tier = parsed.membershipTier === MEMBERSHIP_TIER.Vip ? MEMBERSHIP_TIER.Vip : MEMBERSHIP_TIER.Standard;
    return { role, membershipTier: tier };
  } catch {
    return fallback;
  }
}

const DevPreviewContext = createContext<DevPreviewContextValue | null>(null);

export function DevPreviewProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<DevPreviewState>(readStored);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  const persist = useCallback((next: DevPreviewState) => {
    if (!env.devRolePreviewEnabled) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* ignore storage errors */
    }
  }, []);

  const setRole = useCallback(
    (role: Role | null) => {
      if (role !== null && !(ROLES as readonly string[]).includes(role)) return;
      setState((prev) => {
        const next = { ...prev, role };
        persist(next);
        return next;
      });
    },
    [persist]
  );

  const setMembershipTier = useCallback(
    (tier: MembershipTier) => {
      setState((prev) => {
        const next = { ...prev, membershipTier: tier };
        persist(next);
        return next;
      });
    },
    [persist]
  );

  const clear = useCallback(() => {
    setState({ role: null, membershipTier: MEMBERSHIP_TIER.Standard });
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }, []);

  const value: DevPreviewContextValue = {
    enabled: env.devRolePreviewEnabled,
    isHydrated,
    isActive: env.devRolePreviewEnabled && state.role !== null,
    role: state.role,
    membershipTier: state.membershipTier,
    setRole,
    setMembershipTier,
    clear,
  };

  return <DevPreviewContext.Provider value={value}>{children}</DevPreviewContext.Provider>;
}

export function useDevPreview(): DevPreviewContextValue {
  const ctx = useContext(DevPreviewContext);
  if (!ctx) throw new Error("useDevPreview must be used within DevPreviewProvider");
  return ctx;
}
