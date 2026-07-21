import {
  MEDIA_VISIBILITY,
  MEDIA_MODERATION_STATUS,
} from "@/services/mediaAdminService";

/**
 * What the backend will do to a talent's publication when a photograph changes.
 *
 * This mirrors the locked reconciliation policy — it does NOT decide anything.
 * The consequence is computed and enforced server-side inside the same
 * transaction as the media change; all this does is say it out loud beforehand,
 * so an operator hiding the last photograph of a live talent learns that the
 * profile is about to come down BEFORE they click, not from a notification
 * afterwards.
 *
 * Deliberately conservative. Where the answer depends on facts the media list
 * does not carry, it says so rather than asserting an outcome — a confident
 * wrong warning is worse than a hedged right one.
 */

/** Whether a media item currently counts towards the approved-and-public set. */
export function countsAsPublicPhotograph(item) {
  return (
    item.moderationStatus === MEDIA_MODERATION_STATUS.approved &&
    item.visibility === MEDIA_VISIBILITY.public
  );
}

/**
 * How many approved, public photographs would remain if `item` stopped being one.
 *
 * @param {Array} items the talent's full media list
 * @param {object} item the photograph being changed
 */
export function remainingPublicAfter(items, item) {
  return items.filter((m) => m.id !== item.id && countsAsPublicPhotograph(m)).length;
}

/**
 * The photograph the backend would promote to cover, by the same rule it uses:
 * the first approved-and-public image in gallery order.
 */
export function fallbackCoverAfter(items, item) {
  return (
    items
      .filter((m) => m.id !== item.id && countsAsPublicPhotograph(m))
      .slice()
      .sort((a, b) => a.sortOrder - b.sortOrder)[0] ?? null
  );
}

/**
 * The sentence to show before a change that removes a photograph from the public
 * set — hiding it, rejecting it, archiving it, or making it VIP/management-only.
 *
 * Returns null when the change has no publication consequence worth stating.
 *
 * @param {{ items: Array, item: object, isPublic: boolean, isFeatured: boolean }} context
 */
export function withdrawalConsequence({ items, item, isPublic, isFeatured }) {
  if (!countsAsPublicPhotograph(item)) {
    // It was not part of the public set, so removing it changes nothing public.
    return null;
  }

  const remaining = remainingPublicAfter(items, item);

  if (remaining === 0) {
    if (!isPublic && !isFeatured) {
      return "This is the last approved, public photograph. The profile is already unpublished, so nothing else changes.";
    }

    return (
      "This is the LAST approved, public photograph. Removing it will automatically " +
      "unpublish the profile" +
      (isFeatured ? " and remove it from featured placement" : "") +
      ". The photograph, the account, appointments and conversations are all kept — " +
      "nothing is deleted or cancelled. Republishing is a decision you make again later."
    );
  }

  if (item.isCover) {
    const fallback = fallbackCoverAfter(items, item);
    return (
      "This is the current cover. Another approved, public photograph" +
      (fallback?.caption ? ` (“${fallback.caption}”)` : "") +
      " becomes the cover automatically, and the profile stays published" +
      (isFeatured ? " and featured" : "") +
      "."
    );
  }

  return `${remaining} other approved, public ${
    remaining === 1 ? "photograph remains" : "photographs remain"
  }, so the profile stays published.`;
}

/**
 * The note shown when restoring an archived photograph, or approving one.
 *
 * Always the same, because the rule is absolute: reconciliation only ever removes
 * publication. Nothing a moderator does to a photograph can put a withdrawn
 * profile back on the public site — that stays a deliberate act.
 */
export const NO_AUTOMATIC_REPUBLISH_NOTE =
  "Restoring or approving a photograph never republishes or re-features the talent. " +
  "If the profile was withdrawn, publish it again deliberately once it is ready.";
