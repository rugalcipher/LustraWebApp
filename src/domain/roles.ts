/**
 * Canonical role model for the Lustra frontend.
 *
 * Roles describe *who a principal is* (identity), kept separate from
 * *entitlements* (./entitlements.ts) which describe what a Client may access
 * (e.g. VIP media). Do not model VIP as a role.
 *
 * The frontend uses lowercase tokens as its single canonical scheme; the .NET
 * backend (`Lustra.Domain/Identity/RoleNames.cs`) uses PascalCase, mapped by
 * `normalizeRole()`. `superadmin` mirrors the backend `SuperAdmin`.
 */

export type Role = "client" | "talent" | "management" | "admin" | "superadmin";

/** Guest is an unauthenticated UI state, NOT a role. */
export const GUEST = "guest" as const;
export type Guest = typeof GUEST;

/** Backend `RoleNames` (PascalCase). */
export type BackendRoleName = "Client" | "Talent" | "Management" | "Admin" | "SuperAdmin";

export const ROLE = {
  Client: "client",
  Talent: "talent",
  Management: "management",
  Admin: "admin",
  SuperAdmin: "superadmin",
} as const satisfies Record<BackendRoleName, Role>;

/** All real roles, ascending privilege. */
export const ROLES: readonly Role[] = ["client", "talent", "management", "admin", "superadmin"];

/** Staff roles (backend `RoleNames.Staff` + SuperAdmin). */
export const STAFF_ROLES: readonly Role[] = ["management", "admin", "superadmin"];

export const ROLE_LABELS: Record<Role | Guest, string> = {
  [GUEST]: "Guest",
  client: "Client",
  talent: "Talent",
  management: "Management",
  admin: "Administrator",
  superadmin: "Super Administrator",
};

/** Where each role/guest lands on entry. */
export const ROLE_HOME: Record<Role | Guest, string> = {
  [GUEST]: "/",
  client: "/app/discover",
  talent: "/talent-portal",
  management: "/management-dashboard",
  admin: "/admin",
  superadmin: "/admin",
};

/** Backend PascalCase → canonical frontend token. */
export const BACKEND_ROLE_MAP: Record<BackendRoleName, Role> = {
  Client: "client",
  Talent: "talent",
  Management: "management",
  Admin: "admin",
  SuperAdmin: "superadmin",
};

function isRole(value: string): value is Role {
  return (ROLES as readonly string[]).includes(value);
}

/**
 * Normalize any inbound role string (backend PascalCase or already-lowercase)
 * to the canonical frontend token. Returns null when unrecognized.
 */
export function normalizeRole(raw: string | null | undefined): Role | null {
  if (!raw) return null;
  if (raw in BACKEND_ROLE_MAP) return BACKEND_ROLE_MAP[raw as BackendRoleName];
  const lower = String(raw).toLowerCase();
  return isRole(lower) ? lower : null;
}

/** Pick the highest-privilege role from a set (for landing/home decisions). */
export function primaryRole(roles: readonly Role[]): Role | Guest {
  for (let i = ROLES.length - 1; i >= 0; i--) {
    const r = ROLES[i];
    if (roles.includes(r)) return r;
  }
  return GUEST;
}
