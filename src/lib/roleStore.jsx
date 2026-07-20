import { usePrincipal } from "@/auth/PrincipalContext";
import { useDevPreview } from "@/auth/devPreview";
import { ROLES as DOMAIN_ROLES, ROLE_LABELS as DOMAIN_ROLE_LABELS, GUEST } from "@/domain/roles";

/**
 * Backward-compatible role façade.
 *
 * Historically this file was a standalone mock role store. It is now a thin
 * read/label adapter over the canonical principal (see
 * src/auth/PrincipalContext.jsx) and the dev-preview store
 * (src/auth/devPreview.jsx). Existing presentational callers keep using
 * `useRole()`; authorization decisions should prefer `usePrincipal()` directly.
 */

export const ROLES = [GUEST, ...DOMAIN_ROLES];
export const ROLE_LABELS = DOMAIN_ROLE_LABELS;

/** Demo identities shown when previewing a role in development. */
const DEMO_USERS = {
  [GUEST]: { name: "Guest", membership: "Visitor" },
  client: { name: "A. Laurent", membership: "Private Member", email: "a.laurent@lustra.app" },
  talent: { name: "Isabelle Moreau", membership: "Represented Talent" },
  management: { name: "V. Castellan", membership: "Concierge · Lustra" },
  admin: { name: "Director", membership: "Administrator" },
  superadmin: { name: "Director", membership: "Super Administrator" },
};

export function useRole() {
  const { principal, primaryRole, isLoading, isVip } = usePrincipal();
  const dev = useDevPreview();

  const role = primaryRole; // canonical token or "guest"
  const demo = DEMO_USERS[role] || DEMO_USERS[GUEST];
  // Demo identities are ONLY used for the development role preview. A real
  // authenticated principal never has placeholder names substituted in.
  const useDemoIdentity = dev.isActive;
  const user = {
    role,
    name: principal.displayName || (useDemoIdentity ? demo.name : ""),
    email: principal.email || (useDemoIdentity ? demo.email : ""),
    membership: demo.membership,
  };

  return {
    role,
    isHydrated: !isLoading,
    setRole: dev.setRole,
    clearRole: dev.clear,
    user,
    labels: ROLE_LABELS,
    isVip,
    membershipTier: principal.membership.tier,
    setMembershipTier: dev.setMembershipTier,
  };
}
