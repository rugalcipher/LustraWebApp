import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { TALENT } from "@/mocks/talent";

const STORAGE_KEY = "lustra-discover-session";
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

function loadSession() {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveSession(data) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    /* ignore */
  }
}

/**
 * Centralised discover-session state. Holds filters, sort, the current
 * talent index, the current profile-slide index, skipped / recently-viewed
 * talent, and the Immersive / Browse-All view mode. Persists to
 * sessionStorage so that returning from an inquiry restores the exact
 * talent and slide the client was viewing.
 */
export function useDiscoverState() {
  const session = useRef(loadSession());

  const [query, setQuery] = useState(session.current?.query || "");
  const [sort, setSort] = useState(session.current?.sort || "Featured");
  const [filters, setFilters] = useState(
    session.current?.filters || { city: "", category: "", travel: "" }
  );
  const [mode, setMode] = useState(session.current?.mode || "immersive");
  const [currentIndex, setCurrentIndex] = useState(session.current?.currentIndex ?? 0);
  const [slideIndex, setSlideIndex] = useState(session.current?.slideIndex ?? 0);
  const [skipped, setSkipped] = useState(session.current?.skipped || []);
  const [recentlyViewed, setRecentlyViewed] = useState(session.current?.recentlyViewed || []);
  const [loaded, setLoaded] = useState(false);
  const [direction, setDirection] = useState(0);

  // Cinematic loading delay
  useEffect(() => {
    const t = setTimeout(() => setLoaded(true), 700);
    return () => clearTimeout(t);
  }, []);

  const results = useMemo(() => {
    let list = [...TALENT];
    if (query) {
      const q = query.toLowerCase();
      list = list.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          t.city.toLowerCase().includes(q) ||
          t.category.toLowerCase().includes(q)
      );
    }
    if (filters.city) list = list.filter((t) => t.city === filters.city);
    if (filters.category) list = list.filter((t) => t.engagements.includes(filters.category));
    if (filters.travel === "yes") list = list.filter((t) => t.travel);

    if (sort === "Featured") list.sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));
    if (sort === "Newest") list.reverse();
    if (sort === "Rate: Low to High") list.sort((a, b) => a.startingRate - b.startingRate);
    if (sort === "Rate: High to Low") list.sort((a, b) => b.startingRate - a.startingRate);
    return list;
  }, [query, sort, filters]);

  // Clamp index when results shrink
  useEffect(() => {
    if (currentIndex >= results.length && results.length > 0) setCurrentIndex(0);
  }, [results.length, currentIndex]);

  const current = results[currentIndex];

  // Persist session
  useEffect(() => {
    saveSession({
      query,
      sort,
      filters,
      mode,
      currentIndex,
      slideIndex,
      skipped,
      recentlyViewed,
    });
  }, [query, sort, filters, mode, currentIndex, slideIndex, skipped, recentlyViewed]);

  const goNextTalent = useCallback(() => {
    setRecentlyViewed((prev) =>
      current ? [...new Set([current.id, ...prev])].slice(0, 10) : prev
    );
    setSkipped((prev) =>
      current && !prev.includes(current.id) ? [...prev, current.id] : prev
    );
    setSlideIndex(0);
    setDirection(1);
    setCurrentIndex((i) => Math.min(i + 1, results.length - 1));
  }, [current, results.length]);

  const goPrevTalent = useCallback(() => {
    setSlideIndex(0);
    setDirection(-1);
    setCurrentIndex((i) => Math.max(i - 1, 0));
  }, []);

  const undoSkip = useCallback(() => {
    setSlideIndex(0);
    setDirection(-1);
    setCurrentIndex((i) => Math.max(i - 1, 0));
    setSkipped((prev) => prev.slice(0, -1));
  }, []);

  const goToTalent = useCallback(
    (idx) => {
      setSlideIndex(0);
      setDirection(idx > currentIndex ? 1 : -1);
      setCurrentIndex(Math.max(0, Math.min(idx, results.length - 1)));
    },
    [currentIndex, results.length]
  );

  const goNextSlide = useCallback(
    () => setSlideIndex((s) => Math.min(s + 1, TOTAL_SLIDES - 1)),
    []
  );
  const goPrevSlide = useCallback(() => setSlideIndex((s) => Math.max(s - 1, 0)), []);
  const goToSlide = useCallback(
    (i) => setSlideIndex(Math.max(0, Math.min(i, TOTAL_SLIDES - 1))),
    []
  );

  const resetFilters = useCallback(() => {
    setQuery("");
    setFilters({ city: "", category: "", travel: "" });
    setSort("Featured");
    setCurrentIndex(0);
    setSlideIndex(0);
  }, []);

  const activeFilterCount = Object.values(filters).filter(Boolean).length;

  return {
    loaded,
    results,
    current,
    currentIndex,
    slideIndex,
    mode,
    direction,
    query,
    sort,
    filters,
    skipped,
    recentlyViewed,
    activeFilterCount,
    totalSlides: TOTAL_SLIDES,
    setQuery,
    setSort,
    setFilters,
    setMode,
    goNextTalent,
    goPrevTalent,
    undoSkip,
    goToTalent,
    goNextSlide,
    goPrevSlide,
    goToSlide,
    resetFilters,
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