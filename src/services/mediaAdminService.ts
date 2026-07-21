import { api } from "@/api/client";

/**
 * Staff administration of a talent's photographs.
 *
 * Mirrors `ManagementMediaReviewsController` and
 * `Lustra.Application/Media/MediaAdministration.cs`.
 *
 * The distinctions this surface exists to keep apart, because collapsing any of
 * them discloses something:
 *
 *  - **Hidden is not deleted.** `Private` withdraws an item from the public
 *    bucket; the original is kept and can be made public again.
 *  - **VIP-only is not public.** It reaches entitled clients, nobody else.
 *  - **Pending and rejected are not visible**, and neither can become a cover.
 *  - **Management-only never reaches a client at all.**
 *
 * A soft-deleted item is archived, not destroyed, and restoring it returns it to
 * **pending review** — never straight back to public, because the reason it was
 * withdrawn has not been re-examined.
 */

const BASE = "/management/media-reviews";

/**
 * The visibility values the API accepts.
 *
 * Names come from the backend enum; do not invent new ones. `Private` is the
 * hidden state — it is not a deletion, and the wording in the UI must not imply
 * one.
 */
export const MEDIA_VISIBILITY = {
  public: "Public",
  private: "Private",
  vipOnly: "VipOnly",
  managementOnly: "ManagementOnly",
} as const;

export type MediaVisibility = (typeof MEDIA_VISIBILITY)[keyof typeof MEDIA_VISIBILITY];

/** Moderation states. Only `Approved` may be public, and only public may be cover. */
export const MEDIA_MODERATION_STATUS = {
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
  changesRequested: "ChangesRequested",
  archived: "Archived",
} as const;

/** Mirrors `MediaModerationEventDto` — one decision in an item's history. */
export interface MediaModerationEventDto {
  id: string;
  actorUserId: string;
  action: string;
  fromStatus: string | null;
  toStatus: string | null;
  fromVisibility: string | null;
  toVisibility: string | null;
  reason: string | null;
  note: string | null;
  createdAtUtc: string;
}

/** Asks the talent for a different photograph, with a reason they will see. */
export function requestMediaChanges(mediaId: string, reason: string): Promise<void> {
  return api.post<void>(`${BASE}/${mediaId}/request-changes`, { reason });
}

/**
 * Sets an approved item's visibility, promoting it to or removing it from the
 * public bucket. The note is staff-to-staff and is never shown to the talent.
 */
export function setMediaVisibility(
  mediaId: string,
  visibility: MediaVisibility,
  note?: string | null
): Promise<void> {
  return api.post<void>(`${BASE}/${mediaId}/visibility`, {
    visibility,
    note: note?.trim() || null,
  });
}

/** Makes an item the profile cover. Refused unless it is approved AND public. */
export function setMediaCover(mediaId: string): Promise<void> {
  return api.post<void>(`${BASE}/${mediaId}/cover`, {});
}

/** Archives an item: withdrawn from public, private original kept. Not a deletion. */
export function softDeleteMedia(mediaId: string, note?: string | null): Promise<void> {
  return api.post<void>(`${BASE}/${mediaId}/soft-delete`, { note: note?.trim() || null });
}

/** Restores an archived item to PENDING REVIEW — never straight back to public. */
export function restoreMedia(mediaId: string): Promise<void> {
  return api.post<void>(`${BASE}/${mediaId}/restore`, {});
}

export function approveMedia(mediaId: string): Promise<void> {
  return api.post<void>(`${BASE}/${mediaId}/approve`, {});
}

export function rejectMedia(mediaId: string, reason: string): Promise<void> {
  return api.post<void>(`${BASE}/${mediaId}/reject`, { reason });
}

/** Withdraws an already-published item from the public bucket. */
export function revokeMediaPublication(mediaId: string, reason: string): Promise<void> {
  return api.post<void>(`${BASE}/${mediaId}/revoke-publication`, { reason });
}

export function getMediaHistory(
  mediaId: string,
  signal?: AbortSignal
): Promise<MediaModerationEventDto[]> {
  return api.get<MediaModerationEventDto[]>(`${BASE}/${mediaId}/history`, { signal });
}

/** Refusal codes the media UI branches on. */
export const MEDIA_ADMIN_ERROR_CODES = {
  /** Only an approved, publicly visible photograph can be the profile cover. */
  coverNotPublic: "media.cover_not_public",
  notArchived: "media.not_archived",
  talentNotFound: "media.talent_not_found",
} as const;

/** Whether an item is eligible to become the profile cover, by the server's rule. */
export function canBeCover(media: { moderationStatus: string; visibility: string }): boolean {
  return (
    media.moderationStatus === MEDIA_MODERATION_STATUS.approved &&
    media.visibility === MEDIA_VISIBILITY.public
  );
}

/** Whether an item is reachable by the public. Used for labels, never for access. */
export function isPubliclyVisible(media: {
  moderationStatus: string;
  visibility: string;
}): boolean {
  return (
    media.moderationStatus === MEDIA_MODERATION_STATUS.approved &&
    media.visibility === MEDIA_VISIBILITY.public
  );
}
