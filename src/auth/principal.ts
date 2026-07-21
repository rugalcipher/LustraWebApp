/**
 * The canonical authenticated principal for the Lustra frontend.
 *
 * API-shaped so the temporary Base44/dev-preview sources can later be replaced
 * by the .NET `GET /api/v1/auth/me` response (`AuthUserDto`) with only the
 * adapter below changing — no call sites. See src/services/dto/authMapper.ts
 * for the DTO→principal mapping used in API mode.
 */

import type { Role } from "@/domain/roles";
import { normalizeRole } from "@/domain/roles";
import type { Membership } from "@/domain/entitlements";
import { STANDARD_MEMBERSHIP, normalizeMembership } from "@/domain/entitlements";
import type { AccountStatus } from "@/domain/account";
import { normalizeAccountStatus } from "@/domain/account";

export type PrincipalSource = "guest" | "real" | "dev-preview";

export interface Principal {
  userId: string | null;
  email: string | null;
  displayName: string | null;
  accountStatus: AccountStatus | null;
  roles: Role[];
  permissions: string[];
  membership: Membership;
  /**
   * The session is restricted until a new password is chosen.
   *
   * Mirrors the `mcp` claim the API mints at sign-in and preserves across
   * refresh. The client cannot clear it — clearing it here would only hide the
   * screen, not lift the restriction, and every request would still be refused.
   */
  mustChangePassword: boolean;
  isAuthenticated: boolean;
  isLoading: boolean;
  source: PrincipalSource;
}

/** The immutable guest principal (no identity, no entitlements). */
export const GUEST_PRINCIPAL: Principal = Object.freeze({
  userId: null,
  email: null,
  displayName: null,
  accountStatus: null,
  roles: [],
  permissions: [],
  membership: STANDARD_MEMBERSHIP,
  mustChangePassword: false,
  isAuthenticated: false,
  isLoading: false,
  source: "guest",
}) as Principal;

/** A loading principal — guards must render a loader, never a decision, on this. */
export const LOADING_PRINCIPAL: Principal = Object.freeze({
  ...GUEST_PRINCIPAL,
  isLoading: true,
}) as Principal;

/**
 * Adapter: real `/api/v1/auth/me`-style user → Principal. Tolerant of the
 * current Base44 `me()` shape (which lacks Lustra roles/permissions/membership).
 * The ONLY place that interprets a raw auth-user object directly.
 */
export function principalFromAuthUser(authUser: unknown): Principal {
  if (!authUser) return GUEST_PRINCIPAL;
  const u = authUser as Record<string, unknown>;
  const roles = Array.isArray(u.roles)
    ? (u.roles as unknown[]).map((r) => normalizeRole(String(r))).filter((r): r is Role => r !== null)
    : [];
  return {
    userId: (u.id as string) ?? (u.userId as string) ?? null,
    email: (u.email as string) ?? null,
    displayName: (u.displayName as string) ?? (u.full_name as string) ?? (u.name as string) ?? null,
    accountStatus: normalizeAccountStatus((u.accountStatus as string) ?? (u.account_status as string)),
    roles,
    permissions: Array.isArray(u.permissions) ? (u.permissions as string[]) : [],
    membership: normalizeMembership(u.membership),
    mustChangePassword: u.mustChangePassword === true,
    isAuthenticated: true,
    isLoading: false,
    source: "real",
  };
}

export interface DevPreviewInput {
  role: Role;
  membership?: Membership;
  displayName?: string;
  email?: string;
}

/**
 * Adapter: dev role-preview selection → Principal. Clearly tagged
 * `source: "dev-preview"` so it can never be mistaken for a real session.
 */
export function principalFromDevPreview(preview: DevPreviewInput): Principal {
  return {
    // The dev preview never simulates a restricted session: it exists to look at
    // role-specific UI, and a lockout screen would just hide all of it.
    mustChangePassword: false,
    userId: `dev:${preview.role}`,
    email: preview.email ?? null,
    displayName: preview.displayName ?? null,
    accountStatus: "Active",
    roles: [preview.role],
    permissions: [],
    membership: preview.membership ?? STANDARD_MEMBERSHIP,
    isAuthenticated: true,
    isLoading: false,
    source: "dev-preview",
  };
}
