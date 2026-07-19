/**
 * Canonical React Query key factory.
 *
 * Rules:
 *  - Every key is an array beginning with a stable namespace segment.
 *  - Any query returning user-scoped data (or that could include protected/VIP
 *    media) MUST include the principal's userId, so account switching misses
 *    the previous user's cache and invalidation can be targeted.
 *  - Public, non-personalized data omits userId.
 *
 * Single source of truth so invalidation and cache-clearing (see ./cache.ts)
 * stay consistent.
 */

export const queryKeys = {
  talent: {
    all: () => ["talent"] as const,
    list: (filters?: unknown) => ["talent", "list", filters ?? null] as const,
    detail: (talentId: string) => ["talent", "detail", talentId] as const,
  },

  referenceData: {
    all: () => ["reference-data"] as const,
    taxonomy: (type: string) => ["reference-data", "taxonomy", type] as const,
  },

  me: (userId: string | null) => ["me", userId] as const,

  media: {
    gallery: (userId: string | null, talentId: string | undefined) =>
      ["media", "gallery", userId ?? "guest", talentId] as const,
    moderationQueue: (userId: string | null) => ["media", "moderation-queue", userId] as const,
  },

  inquiries: {
    list: (userId: string | null) => ["inquiries", userId] as const,
    detail: (userId: string | null, inquiryId: string) => ["inquiries", userId, inquiryId] as const,
  },

  saved: (userId: string | null) => ["saved", userId ?? "guest"] as const,
} as const;

/**
 * Namespaces whose cached data is user-scoped and must be dropped on logout /
 * account switch. Used by ./cache.ts.
 */
export const USER_SCOPED_NAMESPACES: readonly string[] = ["me", "media", "inquiries", "saved"];
