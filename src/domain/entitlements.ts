/**
 * Canonical Client membership / entitlement model.
 *
 * VIP is a **Client entitlement**, not a role (see ./roles.ts). This is the
 * single canonical naming scheme for membership — do not reintroduce parallel
 * `isVip`/`vipStatus`/bare-`tier` fields elsewhere. Read VIP eligibility
 * exclusively through `isVipActive()`.
 */

export type MembershipTier = "Standard" | "Vip";

export interface Membership {
  tier: MembershipTier;
  vipActivatedAtUtc?: string | null;
  vipExpiresAtUtc?: string | null;
}

export const MEMBERSHIP_TIER = {
  Standard: "Standard",
  Vip: "Vip",
} as const satisfies Record<MembershipTier, MembershipTier>;

/** Default membership for any authenticated Client until the backend says otherwise. */
export const STANDARD_MEMBERSHIP: Membership = {
  tier: "Standard",
  vipActivatedAtUtc: null,
  vipExpiresAtUtc: null,
};

/**
 * Whether a membership currently confers active VIP access. Expiry is honoured
 * when present. `now` is injectable for testability.
 */
export function isVipActive(membership: Membership | null | undefined, now: Date = new Date()): boolean {
  if (!membership || membership.tier !== MEMBERSHIP_TIER.Vip) return false;
  if (membership.vipExpiresAtUtc) {
    const expires = new Date(membership.vipExpiresAtUtc);
    if (!Number.isNaN(expires.getTime()) && expires.getTime() <= now.getTime()) {
      return false;
    }
  }
  return true;
}

/**
 * Normalize a backend membership payload into the canonical shape. Tolerant of
 * absent data (returns Standard). The ONLY place that interprets raw membership
 * fields from an API response.
 */
export function normalizeMembership(raw: unknown): Membership {
  const r = (raw ?? {}) as Record<string, unknown>;
  const tier: MembershipTier =
    r.tier === MEMBERSHIP_TIER.Vip || r.membershipTier === MEMBERSHIP_TIER.Vip ? "Vip" : "Standard";
  return {
    tier,
    vipActivatedAtUtc: (r.vipActivatedAtUtc as string | null | undefined) ?? null,
    vipExpiresAtUtc: (r.vipExpiresAtUtc as string | null | undefined) ?? null,
  };
}
