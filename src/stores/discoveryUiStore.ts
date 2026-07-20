import { create } from "zustand";

/**
 * Discovery CLIENT state — never server data.
 *
 * Holds only what the browser owns: the visitor's chosen location, pending and
 * applied filters, sort, the immersive cursor (which talent / which slide), and
 * the small id-lists that make the experience feel continuous across a session.
 *
 * It deliberately does NOT hold talent records. Those live in React Query,
 * keyed by the applied filters, so a filter change is a cache lookup rather
 * than a store mutation, and no server data survives here across sign-out.
 *
 * Persisted to sessionStorage so returning from an inquiry or a sign-in detour
 * restores the exact talent and slide the visitor was looking at.
 */

const STORAGE_KEY = "lustra-discover";

export type DiscoverySort = "Featured" | "Newest" | "RateAsc" | "RateDesc" | "Rating";
export type DiscoveryMode = "immersive" | "grid";

export interface DiscoveryFilters {
  /** City id (backend Guid) — the canonical location filter. */
  cityId: string | null;
  /** Region id, used when the visitor picks a whole region. */
  regionId: string | null;
  /** Engagement-category id. */
  engagementCategoryId: string | null;
  /** Talent-category id. */
  talentCategoryId: string | null;
  /** Language id. */
  languageId: string | null;
  /** Only talent willing to travel. */
  travelOnly: boolean;
  minRate: number | null;
  maxRate: number | null;
  /** Free-text search (debounced by the feature hook, not here). */
  query: string;
}

export const EMPTY_FILTERS: DiscoveryFilters = {
  cityId: null,
  regionId: null,
  engagementCategoryId: null,
  talentCategoryId: null,
  languageId: null,
  travelOnly: false,
  minRate: null,
  maxRate: null,
  query: "",
};

/** How the visitor's current location was determined. */
export type LocationSource = "explicit" | "resolved" | "profile" | "none";

export interface SelectedLocation {
  cityId: string | null;
  cityName: string | null;
  regionId: string | null;
  countryId: string | null;
  source: LocationSource;
}

export const NO_LOCATION: SelectedLocation = {
  cityId: null,
  cityName: null,
  regionId: null,
  countryId: null,
  source: "none",
};

interface DiscoveryUiState {
  /** Filters bound to the filter sheet, before the visitor applies them. */
  draftFilters: DiscoveryFilters;
  /** Filters actually driving the query. */
  appliedFilters: DiscoveryFilters;
  sort: DiscoverySort;
  mode: DiscoveryMode;
  location: SelectedLocation;

  currentIndex: number;
  slideIndex: number;
  /** Ids skipped in this session (immersive "next"). */
  skippedIds: string[];
  /** Most-recently-viewed ids, newest first, capped. */
  recentlyViewedIds: string[];
  /** Whether the visitor has dismissed the location prompt this session. */
  locationPromptDismissed: boolean;

  setDraftFilters: (patch: Partial<DiscoveryFilters>) => void;
  applyFilters: () => void;
  resetFilters: () => void;
  setQuery: (query: string) => void;
  setSort: (sort: DiscoverySort) => void;
  setMode: (mode: DiscoveryMode) => void;
  setLocation: (location: SelectedLocation) => void;
  clearLocation: () => void;
  dismissLocationPrompt: () => void;

  setCurrentIndex: (index: number) => void;
  setSlideIndex: (index: number) => void;
  markViewed: (talentId: string) => void;
  markSkipped: (talentId: string) => void;
  undoSkip: () => void;
}

interface PersistedShape {
  appliedFilters: DiscoveryFilters;
  draftFilters: DiscoveryFilters;
  sort: DiscoverySort;
  mode: DiscoveryMode;
  location: SelectedLocation;
  currentIndex: number;
  slideIndex: number;
  skippedIds: string[];
  recentlyViewedIds: string[];
  locationPromptDismissed: boolean;
}

const MAX_RECENT = 10;

function readPersisted(): Partial<PersistedShape> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Partial<PersistedShape>) : {};
  } catch {
    return {};
  }
}

function persist(state: DiscoveryUiState): void {
  if (typeof window === "undefined") return;
  try {
    const snapshot: PersistedShape = {
      appliedFilters: state.appliedFilters,
      draftFilters: state.draftFilters,
      sort: state.sort,
      mode: state.mode,
      location: state.location,
      currentIndex: state.currentIndex,
      slideIndex: state.slideIndex,
      skippedIds: state.skippedIds,
      recentlyViewedIds: state.recentlyViewedIds,
      locationPromptDismissed: state.locationPromptDismissed,
    };
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  } catch {
    /* quota or private mode — the session simply won't be restored */
  }
}

const restored = readPersisted();

export const useDiscoveryUiStore = create<DiscoveryUiState>((set, get) => {
  /** Apply a state patch and persist the result in one step. */
  const update = (patch: Partial<DiscoveryUiState>) => {
    set(patch);
    persist(get());
  };

  return {
    draftFilters: { ...EMPTY_FILTERS, ...restored.draftFilters },
    appliedFilters: { ...EMPTY_FILTERS, ...restored.appliedFilters },
    sort: restored.sort ?? "Featured",
    mode: restored.mode ?? "immersive",
    location: { ...NO_LOCATION, ...restored.location },
    currentIndex: restored.currentIndex ?? 0,
    slideIndex: restored.slideIndex ?? 0,
    skippedIds: restored.skippedIds ?? [],
    recentlyViewedIds: restored.recentlyViewedIds ?? [],
    locationPromptDismissed: restored.locationPromptDismissed ?? false,

    setDraftFilters: (patch) => update({ draftFilters: { ...get().draftFilters, ...patch } }),

    applyFilters: () =>
      update({ appliedFilters: { ...get().draftFilters }, currentIndex: 0, slideIndex: 0 }),

    resetFilters: () =>
      update({
        draftFilters: { ...EMPTY_FILTERS },
        appliedFilters: { ...EMPTY_FILTERS },
        sort: "Featured",
        currentIndex: 0,
        slideIndex: 0,
      }),

    // Search applies immediately (the hook debounces) rather than waiting for
    // the filter sheet's Apply button.
    setQuery: (query) =>
      update({
        draftFilters: { ...get().draftFilters, query },
        appliedFilters: { ...get().appliedFilters, query },
        currentIndex: 0,
        slideIndex: 0,
      }),

    setSort: (sort) => update({ sort, currentIndex: 0, slideIndex: 0 }),
    setMode: (mode) => update({ mode }),

    setLocation: (location) =>
      update({
        location,
        draftFilters: { ...get().draftFilters, cityId: location.cityId, regionId: location.regionId },
        appliedFilters: { ...get().appliedFilters, cityId: location.cityId, regionId: location.regionId },
        currentIndex: 0,
        slideIndex: 0,
      }),

    clearLocation: () =>
      update({
        location: { ...NO_LOCATION },
        draftFilters: { ...get().draftFilters, cityId: null, regionId: null },
        appliedFilters: { ...get().appliedFilters, cityId: null, regionId: null },
        currentIndex: 0,
      }),

    dismissLocationPrompt: () => update({ locationPromptDismissed: true }),

    setCurrentIndex: (index) => update({ currentIndex: Math.max(0, index) }),
    setSlideIndex: (index) => update({ slideIndex: Math.max(0, index) }),

    markViewed: (talentId) =>
      update({
        recentlyViewedIds: [talentId, ...get().recentlyViewedIds.filter((id) => id !== talentId)].slice(
          0,
          MAX_RECENT
        ),
      }),

    markSkipped: (talentId) => {
      const skipped = get().skippedIds;
      if (skipped.includes(talentId)) return;
      update({ skippedIds: [...skipped, talentId] });
    },

    undoSkip: () => update({ skippedIds: get().skippedIds.slice(0, -1) }),
  };
});

/** Count of active filters, for the "Refine" badge. */
export function countActiveFilters(filters: DiscoveryFilters): number {
  let count = 0;
  if (filters.cityId) count += 1;
  if (filters.regionId && !filters.cityId) count += 1;
  if (filters.engagementCategoryId) count += 1;
  if (filters.talentCategoryId) count += 1;
  if (filters.languageId) count += 1;
  if (filters.travelOnly) count += 1;
  if (filters.minRate !== null || filters.maxRate !== null) count += 1;
  return count;
}
