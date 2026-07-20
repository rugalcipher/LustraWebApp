/**
 * Canonical React Query key factory — the single source of truth so that
 * invalidation (after mutations) and cache clearing (on logout / account
 * switch) stay consistent.
 *
 * Rules:
 *  - Every key is an array beginning with a stable namespace segment, and no
 *    two unrelated endpoints share a namespace.
 *  - Any user-scoped query includes the principal's userId, so an account
 *    switch misses the previous user's cache and invalidation can be targeted.
 *  - Public, non-personalized data omits userId so guests and signed-in users
 *    share one cache entry.
 */

type Filters = unknown;

export const queryKeys = {
  // --- Auth / session (user-scoped) ---
  auth: {
    me: () => ["auth", "me"] as const,
    sessions: () => ["auth", "sessions"] as const,
  },

  // --- Public reference data (long stale time, not user-scoped) ---
  reference: {
    all: () => ["reference"] as const,
    taxonomy: (type: string) => ["reference", "taxonomy", type] as const,
    countries: () => ["reference", "countries"] as const,
    regions: (countryId?: string | null) => ["reference", "regions", countryId ?? null] as const,
    cities: (regionId?: string | null) => ["reference", "cities", regionId ?? null] as const,
  },

  // --- Public CMS / marketing ---
  cms: {
    page: (slug: string) => ["cms", "page", slug] as const,
    faqs: () => ["cms", "faqs"] as const,
    publicSettings: () => ["cms", "public-settings"] as const,
    home: () => ["cms", "home"] as const,
    announcements: () => ["cms", "announcements"] as const,
  },

  // --- Public discovery & talent profiles ---
  discovery: {
    search: (filters: Filters) => ["discovery", "search", filters ?? null] as const,
    policy: () => ["discovery", "policy"] as const,
  },
  /** PUBLIC talent data — safe to keep cached across sign-out. */
  talent: {
    all: () => ["talent"] as const,
    public: (slug: string) => ["talent", "public", slug] as const,
    reviews: (slug: string) => ["talent", "public", slug, "reviews"] as const,
  },

  /**
   * Talent-portal data — the signed-in talent's OWN drafts, rates, availability
   * and bookings. Deliberately a separate namespace from public `talent` so it
   * is dropped on sign-out while the public cache survives.
   */
  talentPortal: {
    all: () => ["talent-portal"] as const,
    profile: () => ["talent-portal", "profile"] as const,
    draft: () => ["talent-portal", "profile", "draft"] as const,
    preview: () => ["talent-portal", "profile", "preview"] as const,
    versions: () => ["talent-portal", "profile", "versions"] as const,
    tags: () => ["talent-portal", "profile", "tags"] as const,
    rates: () => ["talent-portal", "profile", "rates"] as const,
    /** The talent's OWN media, including unapproved and rejected items. */
    media: () => ["talent-portal", "media"] as const,
    availability: () => ["talent-portal", "availability"] as const,
    /** Prefix for every calendar range, so one edit can invalidate them all. */
    calendarAll: () => ["talent-portal", "calendar"] as const,
    calendar: (from?: string, to?: string) =>
      ["talent-portal", "calendar", from ?? null, to ?? null] as const,
    bookings: () => ["talent-portal", "bookings"] as const,
    booking: (id: string) => ["talent-portal", "bookings", id] as const,
    reviews: () => ["talent-portal", "reviews"] as const,
  },

  // --- Media (user-scoped: may reference private/VIP items) ---
  media: {
    all: () => ["media"] as const,
    mine: () => ["media", "mine"] as const,
    gallery: (userId: string | null, talentId: string | undefined) =>
      ["media", "gallery", userId ?? "guest", talentId ?? null] as const,
    delivery: (mediaId: string) => ["media", "delivery", mediaId] as const,
    moderationQueue: (status?: string) => ["media", "moderation-queue", status ?? null] as const,
  },

  // --- Client workspace (user-scoped) ---
  client: {
    all: () => ["client"] as const,
    profile: () => ["client", "profile"] as const,
    saved: (filters?: Filters) => ["client", "saved", filters ?? null] as const,
    /**
     * Just the saved talent ids. Separate from `saved` so the UI can merge saved state
     * into the PUBLIC discovery cache without making those responses user-specific.
     */
    savedIds: () => ["client", "saved-ids"] as const,
    collections: () => ["client", "collections"] as const,
    collection: (collectionId: string) => ["client", "collections", collectionId] as const,
    entitlements: () => ["client", "entitlements"] as const,
  },
  inquiries: {
    all: () => ["inquiries"] as const,
    mine: (filters?: Filters) => ["inquiries", "mine", filters ?? null] as const,
    detail: (inquiryId: string) => ["inquiries", "detail", inquiryId] as const,
  },
  conversations: {
    all: () => ["conversations"] as const,
    mine: (filters?: Filters) => ["conversations", "mine", filters ?? null] as const,
    detail: (conversationId: string) => ["conversations", "detail", conversationId] as const,
    messages: (conversationId: string, cursor?: number | string | null) =>
      ["conversations", conversationId, "messages", cursor ?? null] as const,
  },
  proposals: {
    all: () => ["proposals"] as const,
    mine: () => ["proposals", "mine"] as const,
    detail: (proposalId: string) => ["proposals", "detail", proposalId] as const,
  },
  bookings: {
    all: () => ["bookings"] as const,
    mine: (filters?: Filters) => ["bookings", "mine", filters ?? null] as const,
    detail: (bookingId: string) => ["bookings", "detail", bookingId] as const,
    settlement: (bookingId: string) => ["bookings", bookingId, "settlement"] as const,
    review: (bookingId: string) => ["bookings", bookingId, "review"] as const,
  },
  notifications: {
    all: () => ["notifications"] as const,
    list: (filters?: Filters) => ["notifications", "list", filters ?? null] as const,
    unreadCount: () => ["notifications", "unread-count"] as const,
    preferences: () => ["notifications", "preferences"] as const,
  },
  reports: {
    mine: () => ["reports", "mine"] as const,
  },

  // --- Management ---
  management: {
    dashboard: () => ["management", "dashboard"] as const,
    inquiries: (filters?: Filters) => ["management", "inquiries", filters ?? null] as const,
    inquiry: (id: string) => ["management", "inquiries", "detail", id] as const,
    conversations: (filters?: Filters) => ["management", "conversations", filters ?? null] as const,
    conversation: (id: string) => ["management", "conversations", "detail", id] as const,
    conversationMessages: (id: string, page: number) =>
      ["management", "conversations", id, "messages", page] as const,
    proposal: (id: string) => ["management", "proposals", id] as const,
    bookings: (filters?: Filters) => ["management", "bookings", filters ?? null] as const,
    booking: (id: string) => ["management", "bookings", "detail", id] as const,
    calendar: (filters?: Filters) => ["management", "calendar", filters ?? null] as const,
    conflicts: () => ["management", "calendar", "conflicts"] as const,
    invitations: (status?: string) => ["management", "invitations", status ?? null] as const,
    profileReviews: (status?: string) => ["management", "profile-reviews", status ?? null] as const,
    profileReview: (id: string) => ["management", "profile-reviews", "detail", id] as const,
    reviews: (filters?: Filters) => ["management", "reviews", filters ?? null] as const,
    safetyReports: (filters?: Filters) => ["management", "safety", "reports", filters ?? null] as const,
    safetyCases: (filters?: Filters) => ["management", "safety", "cases", filters ?? null] as const,
    safetyCase: (id: string) => ["management", "safety", "cases", "detail", id] as const,
    vipRequests: (filters?: Filters) => ["management", "vip-requests", filters ?? null] as const,
    entitlements: (clientUserId: string) => ["management", "entitlements", clientUserId] as const,
  },

  // --- Analytics ---
  analytics: {
    all: () => ["analytics"] as const,
    dataset: (name: string) => ["analytics", name] as const,
  },

  // --- Admin ---
  admin: {
    users: (filters?: Filters) => ["admin", "users", filters ?? null] as const,
    user: (id: string) => ["admin", "users", "detail", id] as const,
    roles: () => ["admin", "roles"] as const,
    role: (roleName: string) => ["admin", "roles", roleName] as const,
    permissions: () => ["admin", "permissions"] as const,
    taxonomies: (type: string) => ["admin", "taxonomies", type] as const,
    countries: () => ["admin", "locations", "countries"] as const,
    regions: (countryId?: string | null) => ["admin", "locations", "regions", countryId ?? null] as const,
    cities: (regionId?: string | null) => ["admin", "locations", "cities", regionId ?? null] as const,
    cmsPages: () => ["admin", "cms", "pages"] as const,
    faqs: () => ["admin", "cms", "faqs"] as const,
    heroSlides: (placement?: string) => ["admin", "cms", "hero-slides", placement ?? null] as const,
    settings: () => ["admin", "settings"] as const,
    featureFlags: () => ["admin", "feature-flags"] as const,
    auditLogs: (filters?: Filters) => ["admin", "audit-logs", filters ?? null] as const,
    placements: (filters?: Filters) => ["admin", "placements", filters ?? null] as const,
  },
} as const;

/**
 * Namespaces holding user-scoped data. These are REMOVED (not merely
 * invalidated) on logout, account switch and session revocation, so no
 * protected or VIP-derived data can be read back from cache by the next
 * principal. Public namespaces (`reference`, `cms`, `discovery`, `talent`
 * public detail) are deliberately excluded — that data is public and
 * re-fetching it on every sign-out would be wasteful.
 */
export const USER_SCOPED_NAMESPACES: readonly string[] = [
  "auth",
  "media",
  "talent-portal",
  "client",
  "inquiries",
  "conversations",
  "proposals",
  "bookings",
  "notifications",
  "reports",
  "management",
  "analytics",
  "admin",
];
