/**
 * Canonical talent-media contract + access policy.
 *
 * Two INDEPENDENT dimensions (never conflate them):
 *   - approvalStatus: moderation lifecycle (management-controlled)
 *   - visibility:     audience intent (talent-selected, management-correctable)
 *
 * Only Approved media may be shown to clients. VIP-only media is shown to VIP
 * clients, locked (no URL) for standard clients, and hidden from guests.
 *
 * The `ResolvedMedia` discriminated union makes invalid states unrepresentable:
 * only the `visible` variant carries a `url`; `locked`/`hidden` have `url: null`
 * by TYPE, so a protected URL cannot leak through the presentation layer.
 *
 * This selector is defense-in-depth for presentation only; the API remains the
 * authority and must never return a protected URL to an unauthorized caller.
 */

export type MediaApprovalStatus = "Pending" | "Approved" | "Rejected";
export type MediaVisibility = "Public" | "VipOnly";
export type MediaAccessState = "visible" | "locked" | "hidden";

export interface TalentMediaItem {
  id: string;
  talentId?: string;
  url?: string | null;
  visibility: MediaVisibility;
  approvalStatus: MediaApprovalStatus;
  category?: string;
}

export interface MediaViewer {
  isAuthenticated: boolean;
  isVip: boolean;
}

interface ResolvedMediaBase {
  id: string;
  visibility: MediaVisibility;
  approvalStatus: MediaApprovalStatus;
  isProtected: boolean;
}

/** Discriminated union — only `visible` has a URL. */
export type ResolvedMedia =
  | (ResolvedMediaBase & { state: "visible"; url: string })
  | (ResolvedMediaBase & { state: "locked"; url: null })
  | (ResolvedMediaBase & { state: "hidden"; url: null });

export const MEDIA_APPROVAL_STATUS = {
  Pending: "Pending",
  Approved: "Approved",
  Rejected: "Rejected",
} as const satisfies Record<MediaApprovalStatus, MediaApprovalStatus>;

export const MEDIA_VISIBILITY = {
  Public: "Public",
  VipOnly: "VipOnly",
} as const satisfies Record<MediaVisibility, MediaVisibility>;

/**
 * Resolve a single media item to a presentation-safe state for a viewer.
 * Never returns a URL for locked/hidden items (enforced by the return type).
 */
export function resolveMediaAccess(item: TalentMediaItem, viewer: MediaViewer): ResolvedMedia {
  const { visibility, approvalStatus } = item;
  const isProtected = visibility === MEDIA_VISIBILITY.VipOnly;
  const base: ResolvedMediaBase = { id: item.id, visibility, approvalStatus, isProtected };

  // Only approved media is ever eligible for a client audience.
  if (approvalStatus !== MEDIA_APPROVAL_STATUS.Approved) return { ...base, state: "hidden", url: null };

  if (visibility === MEDIA_VISIBILITY.Public) {
    return { ...base, state: "visible", url: item.url ?? "" };
  }

  // VIP-only from here.
  if (!viewer.isAuthenticated) return { ...base, state: "hidden", url: null }; // guests never learn it exists
  return viewer.isVip
    ? { ...base, state: "visible", url: item.url ?? "" }
    : { ...base, state: "locked", url: null };
}

/**
 * Resolve a gallery for a viewer. `keepLocked` controls whether locked slides
 * are retained (so the UI can render a premium locked placeholder) or dropped.
 * Hidden items are always removed.
 */
export function presentGallery(
  items: readonly TalentMediaItem[] | null | undefined,
  viewer: MediaViewer,
  opts: { keepLocked?: boolean } = {}
): ResolvedMedia[] {
  const { keepLocked = true } = opts;
  return (items ?? [])
    .map((it) => resolveMediaAccess(it, viewer))
    .filter((r) => r.state === "visible" || (keepLocked && r.state === "locked"));
}

/** Normalize a raw backend/mock media record into the canonical shape. */
export function normalizeMedia(raw: unknown): TalentMediaItem {
  const r = (raw ?? {}) as Record<string, unknown>;
  const approvalStatus: MediaApprovalStatus =
    r.approvalStatus === MEDIA_APPROVAL_STATUS.Approved || r.status === "approved"
      ? "Approved"
      : r.approvalStatus === MEDIA_APPROVAL_STATUS.Rejected || r.status === "rejected"
      ? "Rejected"
      : "Pending";
  return {
    id: String(r.id),
    talentId: (r.talentId as string | undefined) ?? (r.talent as string | undefined) ?? undefined,
    url: (r.url as string | null | undefined) ?? null,
    visibility: r.visibility === MEDIA_VISIBILITY.VipOnly ? "VipOnly" : "Public",
    approvalStatus,
    category: r.category as string | undefined,
  };
}
