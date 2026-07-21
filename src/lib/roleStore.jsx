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

/**
 * How each role is described under the user's name in the shells.
 *
 * These are descriptions of the ROLE, derived from the principal's real role —
 * not invented facts about the person. They are safe in production for the same
 * reason "Administrator" is: it is true of anyone the server says is an admin.
 */
const ROLE_MEMBERSHIP_LABELS = {
  [GUEST]: "Visitor",
  client: "Private Member",
  talent: "Represented Talent",
  management: "Concierge · Lustra",
  admin: "Administrator",
  superadmin: "Super Administrator",
};

/**
 * Placeholder identities for the DEVELOPMENT role preview only.
 *
 * These ARE invented people, which is why they are kept strictly apart from the
 * role labels above and why the whole object is behind a build-time flag. Vite
 * replaces `import.meta.env.VITE_ENABLE_DEV_ROLE_SWITCHER` statically, so in a
 * deployed build the branch is dead and the minifier removes these names from
 * the bundle altogether — invented humans should not ship, even unreachable.
 */
const DEV_PREVIEW_IDENTITIES =
  import.meta.env.VITE_ENABLE_DEV_ROLE_SWITCHER === "true"
    ? {
        [GUEST]: { name: "Guest" },
        client: { name: "A. Laurent", email: "a.laurent@lustra.app" },
        talent: { name: "Isabelle Moreau" },
        management: { name: "V. Castellan" },
        admin: { name: "Director" },
        superadmin: { name: "Director" },
      }
    : {};

export function useRole() {
  const { principal, primaryRole, isLoading, isVip } = usePrincipal();
  const dev = useDevPreview();

  const role = primaryRole; // canonical token or "guest"
  const preview = DEV_PREVIEW_IDENTITIES[role] ?? DEV_PREVIEW_IDENTITIES[GUEST] ?? {};
  // Placeholder identities are ONLY used for the development role preview. A real
  // authenticated principal never has an invented name substituted in.
  const usePreviewIdentity = dev.isActive;
  const user = {
    role,
    name: principal.displayName || (usePreviewIdentity ? preview.name : ""),
    email: principal.email || (usePreviewIdentity ? preview.email : ""),
    // A description of the role, not a claim about the person.
    membership: ROLE_MEMBERSHIP_LABELS[role] ?? ROLE_MEMBERSHIP_LABELS[GUEST],
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
