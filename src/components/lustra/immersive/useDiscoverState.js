import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useDiscoveryUiStore, countActiveFilters } from "@/stores/discoveryUiStore";
import {
  useDiscoverySearch,
  usePrefetchTalent,
  useDiscoveryFilterOptions,
} from "@/features/discovery/hooks";

export const TOTAL_SLIDES = 7;

export const SLIDE_TITLES = [
  "Introduction",
  "About",
  "Gallery",
  "Experiences & Rates",
  "Availability",
  "Reviews & Reputation",
  "Profile Summary",
];

/**
 * Centralised discover-session state, backed by the real API.
 *
 * Server data (the talent list) comes from React Query via `useDiscoverySearch`;
 * client state (filters, sort, cursor, skipped/recently-viewed ids, view mode) lives in
 * `discoveryUiStore` and persists to sessionStorage — so returning from an inquiry or a
 * sign-in detour restores the exact talent and slide the client was viewing.
 *
 * No talent records are ever stored in the client store.
 */
export function useDiscoverState() {
  const appliedFilters = useDiscoveryUiStore((s) => s.appliedFilters);
  const sort = useDiscoveryUiStore((s) => s.sort);
  const mode = useDiscoveryUiStore((s) => s.mode);
  const currentIndex = useDiscoveryUiStore((s) => s.currentIndex);
  const slideIndex = useDiscoveryUiStore((s) => s.slideIndex);
  const recentlyViewedIds = useDiscoveryUiStore((s) => s.recentlyViewedIds);
  const skippedIds = useDiscoveryUiStore((s) => s.skippedIds);
  const location = useDiscoveryUiStore((s) => s.location);

  const setQueryText = useDiscoveryUiStore((s) => s.setQuery);
  const setSortValue = useDiscoveryUiStore((s) => s.setSort);
  const setModeValue = useDiscoveryUiStore((s) => s.setMode);
  const setCurrentIndex = useDiscoveryUiStore((s) => s.setCurrentIndex);
  const setSlideIndex = useDiscoveryUiStore((s) => s.setSlideIndex);
  const setDraftFilters = useDiscoveryUiStore((s) => s.setDraftFilters);
  const applyFilters = useDiscoveryUiStore((s) => s.applyFilters);
  const resetFiltersInStore = useDiscoveryUiStore((s) => s.resetFilters);
  const markViewed = useDiscoveryUiStore((s) => s.markViewed);
  const markSkipped = useDiscoveryUiStore((s) => s.markSkipped);
  const undoSkipInStore = useDiscoveryUiStore((s) => s.undoSkip);

  const search = useDiscoverySearch({ pageSize: 48 });
  const prefetchTalent = usePrefetchTalent();
  const filterOptions = useDiscoveryFilterOptions();

  const [direction, setDirection] = useState(0);
  const results = search.talent;

  // Clamp the cursor when the result set shrinks (a filter narrowed it).
  useEffect(() => {
    if (results.length > 0 && currentIndex >= results.length) {
      setCurrentIndex(0);
    }
  }, [results.length, currentIndex, setCurrentIndex]);

  const current = results[currentIndex] ?? null;

  // Record the viewed talent, and prefetch the next couple so advancing is instant.
  const lastViewed = useRef(null);
  useEffect(() => {
    if (!current || lastViewed.current === current.id) return;
    lastViewed.current = current.id;
    markViewed(current.id);
    prefetchTalent(results[currentIndex + 1]?.slug);
    prefetchTalent(results[currentIndex + 2]?.slug);
  }, [current, currentIndex, results, markViewed, prefetchTalent]);

  const goNextTalent = useCallback(() => {
    if (current) markSkipped(current.id);
    setSlideIndex(0);
    setDirection(1);
    setCurrentIndex(Math.min(currentIndex + 1, Math.max(results.length - 1, 0)));
  }, [current, currentIndex, results.length, markSkipped, setCurrentIndex, setSlideIndex]);

  const goPrevTalent = useCallback(() => {
    setSlideIndex(0);
    setDirection(-1);
    setCurrentIndex(Math.max(currentIndex - 1, 0));
  }, [currentIndex, setCurrentIndex, setSlideIndex]);

  const undoSkip = useCallback(() => {
    setSlideIndex(0);
    setDirection(-1);
    setCurrentIndex(Math.max(currentIndex - 1, 0));
    undoSkipInStore();
  }, [currentIndex, setCurrentIndex, setSlideIndex, undoSkipInStore]);

  const goToTalent = useCallback(
    (idx) => {
      setSlideIndex(0);
      setDirection(idx > currentIndex ? 1 : -1);
      setCurrentIndex(Math.max(0, Math.min(idx, Math.max(results.length - 1, 0))));
    },
    [currentIndex, results.length, setCurrentIndex, setSlideIndex]
  );

  const goNextSlide = useCallback(
    () => setSlideIndex(Math.min(slideIndex + 1, TOTAL_SLIDES - 1)),
    [slideIndex, setSlideIndex]
  );
  const goPrevSlide = useCallback(
    () => setSlideIndex(Math.max(slideIndex - 1, 0)),
    [slideIndex, setSlideIndex]
  );
  const goToSlide = useCallback(
    (i) => setSlideIndex(Math.max(0, Math.min(i, TOTAL_SLIDES - 1))),
    [setSlideIndex]
  );

  const resetFilters = useCallback(() => {
    resetFiltersInStore();
    setDirection(0);
  }, [resetFiltersInStore]);

  // The filter sheet still speaks in names; translate ids ↔ names at this boundary so
  // the presentational components stay unchanged.
  const filters = useMemo(() => {
    const city = filterOptions.cities.find((c) => c.id === appliedFilters.cityId);
    const engagement = filterOptions.engagementCategories.find(
      (e) => e.id === appliedFilters.engagementCategoryId
    );
    return {
      city: city?.name ?? "",
      category: engagement?.name ?? "",
      travel: appliedFilters.travelOnly ? "yes" : "",
    };
  }, [appliedFilters, filterOptions.cities, filterOptions.engagementCategories]);

  const setFilters = useCallback(
    (next) => {
      const city = filterOptions.cities.find((c) => c.name === next.city);
      const engagement = filterOptions.engagementCategories.find((e) => e.name === next.category);
      setDraftFilters({
        cityId: city?.id ?? null,
        engagementCategoryId: engagement?.id ?? null,
        travelOnly: next.travel === "yes",
      });
      applyFilters();
    },
    [filterOptions.cities, filterOptions.engagementCategories, setDraftFilters, applyFilters]
  );

  /** Look up an already-loaded talent by id, for the "recently viewed" strip. */
  const findLoadedTalent = useCallback((id) => results.find((t) => t.id === id) ?? null, [results]);

  return {
    // Loading reflects the real request, not a cosmetic timer.
    loaded: !search.isLoading,
    isFetching: search.isFetching,
    isError: search.isError,
    error: search.error,
    gate: search.gate,
    totalCount: search.totalCount,

    results,
    current,
    currentIndex,
    slideIndex,
    mode,
    direction,
    query: appliedFilters.query,
    sort,
    filters,
    location,
    skipped: skippedIds,
    recentlyViewed: recentlyViewedIds,
    activeFilterCount: countActiveFilters(appliedFilters),
    totalSlides: TOTAL_SLIDES,
    filterOptions,

    setQuery: setQueryText,
    setSort: setSortValue,
    setFilters,
    setMode: setModeValue,
    goNextTalent,
    goPrevTalent,
    undoSkip,
    goToTalent,
    goNextSlide,
    goPrevSlide,
    goToSlide,
    resetFilters,
    findLoadedTalent,
    refetch: search.refetch,
  };
}

/** Detects the user's reduced-motion preference. */
export function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const handler = (e) => setReduced(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return reduced;
}
