/**
 * Why a publication or featuring attempt was refused, and what to do about it.
 *
 * **Every code here was read from the backend catalogue at `cc6c34c`.** An
 * earlier brief speculated about `talent_profile.archived`,
 * `.suspended`, `.public_details_incomplete` and `.invalid_cover`; none of them
 * exist. Inventing them would produce a map whose branches never fire, which is
 * worse than no map — it looks like handled cases and silently falls through to
 * a generic message forever.
 *
 * The real catalogue is deliberately small:
 *
 *  - `talent_profile.not_publishable` — the profile fails a lifecycle, account
 *    or profile-data rule.
 *  - `talent_profile.no_public_photograph` — no approved, public photograph.
 *  - `talent_profile.cover_not_public` — the chosen cover is not an approved,
 *    public photograph. Added with the publication-integrity work; publishing
 *    would otherwise point the public site at a hidden or rejected image.
 *  - `talent_lifecycle.cannot_feature` — featuring something not published, or
 *    published but failing the current rules. Featuring never publishes
 *    implicitly, so this is a refusal rather than an upgrade.
 *
 * Each entry names the tab that can actually fix the problem, because "no
 * approved public photograph" is only useful next to a way to go and approve
 * one.
 */

/** Exact refusal codes. Read from the backend; do not add speculative entries. */
export const PUBLICATION_ERROR_CODES = {
  /** The profile is not Approved, so it cannot be published. */
  notPublishable: "talent_profile.not_publishable",
  /** Approved, but with no approved public photograph to show. */
  noPublicPhotograph: "talent_profile.no_public_photograph",
  /** The cover names an image that is not approved and public. */
  coverNotPublic: "talent_profile.cover_not_public",
  /** The profile could not be found. */
  profileNotFound: "talent_profile.not_found",
  /** Featuring was refused: the profile is not approved AND public. */
  cannotFeature: "talent_lifecycle.cannot_feature",
  /** The talent record could not be found by the lifecycle service. */
  lifecycleNotFound: "talent_lifecycle.not_found",
};

/** Which tab on the record can resolve each refusal. */
export const RESOLUTION_TAB = {
  media: "Media",
  publicProfile: "Public profile",
  account: "Account & login",
  overview: "Overview",
};

/**
 * Operator-facing guidance per code.
 *
 * `action` names the tab that fixes it. Nothing here reads the backend's
 * human-readable `detail`: message text is not an API, and branching on it
 * breaks the first time someone rewords a sentence.
 */
export const PUBLICATION_ERROR_GUIDANCE = {
  [PUBLICATION_ERROR_CODES.notPublishable]: {
    title: "This profile is not approved yet",
    body:
      "Only an approved profile can be published. Review and approve the submitted " +
      "profile first, then publish it.",
    action: RESOLUTION_TAB.publicProfile,
  },
  [PUBLICATION_ERROR_CODES.noPublicPhotograph]: {
    title: "No approved public photograph",
    body:
      "A profile needs at least one photograph that is both approved and set to Public " +
      "before it can go live. Approve a photograph and set its visibility to Public.",
    action: RESOLUTION_TAB.media,
  },
  [PUBLICATION_ERROR_CODES.coverNotPublic]: {
    title: "The cover is not an approved public photograph",
    body:
      "The chosen cover has been hidden, rejected or withdrawn, so publishing would point " +
      "the public site at an image nobody approved. Choose a different cover, or clear it " +
      "and let the first gallery photograph be used.",
    action: RESOLUTION_TAB.media,
  },
  [PUBLICATION_ERROR_CODES.cannotFeature]: {
    title: "Only a published profile that meets the requirements can be featured",
    body:
      "Featuring promotes a profile that is already public — it never publishes one. " +
      "Publish this profile first, and make sure it still meets the publication " +
      "requirements, then feature it.",
    action: RESOLUTION_TAB.overview,
  },
  [PUBLICATION_ERROR_CODES.profileNotFound]: {
    title: "Profile not found",
    body: "This talent profile no longer exists. Return to the roster and reload.",
    action: null,
  },
  [PUBLICATION_ERROR_CODES.lifecycleNotFound]: {
    title: "Talent not found",
    body: "This talent no longer exists. Return to the roster and reload.",
    action: null,
  },
};

/**
 * Guidance for a refusal, or null when the code is not one we recognise.
 *
 * Returning null rather than a fabricated explanation matters: an unrecognised
 * code means the backend refused for a reason this build does not know about,
 * and the honest response is to show the server's own message rather than to
 * guess at a cause and send the operator to the wrong tab.
 */
export function publicationGuidance(code) {
  return (code && PUBLICATION_ERROR_GUIDANCE[code]) || null;
}
