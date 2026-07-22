import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronUp, ChevronDown, Undo2, Clock, X } from "lucide-react";
import TalentCard from "@/components/lustra/TalentCard";
import { useSavedTalent } from "@/layouts/AppShell";
import DiscoveryGate from "@/components/lustra/immersive/DiscoveryGate";
import { useMessageAction } from "@/features/conversations/useMessageAction";
import {
  useDiscoverState,
  usePrefersReducedMotion,
  SLIDE_TITLES,
} from "./useDiscoverState";
import DiscoverToolbar from "./DiscoverToolbar";
import TalentStory from "./TalentStory";
import TalentActionBar from "./TalentActionBar";
import TalentNavigationControls from "./TalentNavigationControls";
import TalentFilterSheet from "./TalentFilterSheet";
import DiscoverSkeleton from "./DiscoverSkeleton";
import DiscoverEmptyState from "./DiscoverEmptyState";

const SWIPE_THRESHOLD = 60;
const DIRECTION_LOCK_THRESHOLD = 10;

/**
 * The full immersive discovery experience — one talent at a time, with a
 * swipeable seven-slide profile story, persistent action bar, search /
 * filter / sort toolbar, and an optional Browse-All grid. Horizontal
 * gestures change talent; profile slides change via progress taps, subtle
 * up/down controls, or keyboard.
 */
export default function ImmersiveTalentDiscovery() {
  const { isSaved, toggle } = useSavedTalent();
  const message = useMessageAction();
  const state = useDiscoverState();
  const reduced = usePrefersReducedMotion();

  const {
    loaded,
    gate,
    totalCount,
    findLoadedTalent,
    results,
    current,
    currentStory,
    currentIndex,
    slideIndex,
    mode,
    direction,
    query,
    sort,
    filters,
    recentlyViewed,
    activeFilterCount,
    totalSlides,
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
  } = state;

  const [showFilters, setShowFilters] = useState(false);
  const [undoVisible, setUndoVisible] = useState(false);
  const [recentOpen, setRecentOpen] = useState(false);
  const stageRef = useRef(null);
  const touchRef = useRef({ startX: 0, startY: 0, locked: null });
  const undoTimer = useRef(null);

  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < results.length - 1;
  const prevTalent = hasPrev ? results[currentIndex - 1] : null;
  const nextTalent = hasNext ? results[currentIndex + 1] : null;

  // --- Horizontal swipe (talent navigation) ---
  // touch-action: pan-y lets the browser handle vertical scrolling while
  // we capture horizontal gestures for talent changes.
  const onTouchStart = useCallback((e) => {
    const t = e.touches[0];
    touchRef.current = { startX: t.clientX, startY: t.clientY, locked: null };
  }, []);

  const onTouchMove = useCallback((e) => {
    const t = e.touches[0];
    const dx = t.clientX - touchRef.current.startX;
    const dy = t.clientY - touchRef.current.startY;
    if (!touchRef.current.locked) {
      if (Math.abs(dx) > DIRECTION_LOCK_THRESHOLD || Math.abs(dy) > DIRECTION_LOCK_THRESHOLD) {
        touchRef.current.locked = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
      }
    }
  }, []);

  const onTouchEnd = useCallback(
    (e) => {
      if (touchRef.current.locked !== "x") return;
      const t = e.changedTouches[0];
      const dx = t.clientX - touchRef.current.startX;
      if (dx < -SWIPE_THRESHOLD && hasNext) {
        goNextTalent();
        showUndoToast();
      } else if (dx > SWIPE_THRESHOLD && hasPrev) {
        goPrevTalent();
      }
    },
    [goNextTalent, goPrevTalent, hasNext, hasPrev]
  );

  const showUndoToast = useCallback(() => {
    setUndoVisible(true);
    clearTimeout(undoTimer.current);
    undoTimer.current = setTimeout(() => setUndoVisible(false), 4000);
  }, []);

  // --- Keyboard navigation ---
  useEffect(() => {
    const onKey = (e) => {
      if (mode !== "immersive" || !current) return;
      // Don't intercept when typing in an input
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
      if (e.key === "ArrowLeft" && hasPrev) goPrevTalent();
      else if (e.key === "ArrowRight" && hasNext) {
        goNextTalent();
        showUndoToast();
      } else if (e.key === "ArrowUp" || e.key === "PageUp") {
        e.preventDefault();
        goPrevSlide();
      } else if (e.key === "ArrowDown" || e.key === "PageDown") {
        e.preventDefault();
        goNextSlide();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mode, current, hasPrev, hasNext, goNextTalent, goPrevTalent, goNextSlide, goPrevSlide, showUndoToast]);

  // Guests get their intent (talent + discovery position + slide) parked and are
  // returned here after signing in.
  const handleMessage = useCallback(() => {
    if (current) message(current);
  }, [current, message]);

  const handleToggleSave = useCallback(() => {
    if (current) toggle(current);
  }, [current, toggle]);

  const currentFilterLabel = [filters.city, filters.category, filters.travel === "yes" ? "Travels" : ""]
    .filter(Boolean)
    .join(" · ");

  // A policy gate (members-only, preview limit reached) replaces the stage entirely —
  // it must never render alongside the content it is gating. Placed after every hook so
  // hook order stays stable across renders.
  if (gate) {
    return (
      <div className="h-[calc(100dvh_-_3.5rem_-_env(safe-area-inset-top))] -mb-24">
        <DiscoveryGate gate={gate} />
      </div>
    );
  }

  // --- Grid (Browse All) mode ---
  if (mode === "grid") {
    return (
      <div className="px-4 pt-3 -mb-24 h-[calc(100dvh_-_3.5rem_-_env(safe-area-inset-top))] flex flex-col">
        <DiscoverToolbar
          query={query}
          onQuery={setQuery}
          sort={sort}
          onSort={setSort}
          onOpenFilters={() => setShowFilters(true)}
          activeFilterCount={activeFilterCount}
          resultCount={totalCount}
          currentFilterLabel={currentFilterLabel}
          onReset={resetFilters}
          mode={mode}
          onModeChange={setMode}
        />
        <div className="flex-1 overflow-y-auto lustra-scroll-hide pb-24">
          {loaded ? (
            results.length === 0 ? (
              <DiscoverEmptyState
                onAdjust={() => setShowFilters(true)}
                onReset={resetFilters}
                onBrowse={resetFilters}
              />
            ) : (
              <div className="grid grid-cols-2 gap-3 mt-3">
                {results.map((t, idx) => (
                  <div
                    key={t.id}
                    onClick={(e) => {
                      e.preventDefault();
                      if (/** @type {HTMLElement} */ (e.target).closest("button")) return;
                      goToTalent(idx);
                      setMode("immersive");
                    }}
                  >
                    <TalentCard
                      talent={t}
                      saved={isSaved(t.talentProfileId)}
                      onToggleSave={toggle}
                      variant="compact"
                    />
                  </div>
                ))}
              </div>
            )
          ) : (
            <DiscoverSkeleton />
          )}
        </div>
        <TalentFilterSheet
          open={showFilters}
          onClose={() => setShowFilters(false)}
          filters={filters}
          onChange={setFilters}
          onReset={resetFilters}
          reduced={reduced}
        />
      </div>
    );
  }

  // --- Immersive mode (default) ---
  return (
    <div className="flex flex-col h-[calc(100dvh_-_3.5rem_-_env(safe-area-inset-top))] -mb-24">
      <DiscoverToolbar
        query={query}
        onQuery={setQuery}
        sort={sort}
        onSort={setSort}
        onOpenFilters={() => setShowFilters(true)}
        activeFilterCount={activeFilterCount}
        resultCount={results.length}
        currentFilterLabel={currentFilterLabel}
        onReset={resetFilters}
        mode={mode}
        onModeChange={setMode}
      />

      {/* Recently viewed quick-access */}
      {recentlyViewed.length > 0 && (
        <div className="shrink-0 px-4 pb-1 flex items-center gap-2">
          <button
            onClick={() => setRecentOpen((o) => !o)}
            className="inline-flex items-center gap-1 text-[0.5rem] tracking-luxe uppercase text-muted-grey hover:text-rose-gold transition"
          >
            <Clock className="w-2.5 h-2.5" strokeWidth={1.2} /> Recent
          </button>
          <AnimatePresence>
            {recentOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="flex gap-2 overflow-x-auto lustra-scroll-hide"
              >
                {recentlyViewed.slice(0, 6).map((id) => {
                  // Only ids still present in the loaded results can be jumped to; we
                  // never refetch a profile just to render a 20px avatar.
                  const t = findLoadedTalent(id);
                  if (!t) return null;
                  const idx = results.findIndex((r) => r.id === id);
                  return (
                    <button
                      key={id}
                      onClick={() => {
                        if (idx >= 0) goToTalent(idx);
                        setRecentOpen(false);
                      }}
                      className="shrink-0 flex items-center gap-1.5 py-1 px-2 rounded-full border border-white/10 hover:border-rose-gold/40 transition"
                    >
                      <img src={t.cover} alt="" className="w-5 h-5 rounded-full object-cover" />
                      <span className="text-[0.5rem] tracking-wide-luxe uppercase text-soft-ivory/70">
                        {t.name}
                      </span>
                    </button>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Stage */}
      <div
        ref={stageRef}
        className="flex-1 relative overflow-hidden"
        style={{ touchAction: "pan-y" }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {!loaded ? (
          <DiscoverSkeleton />
        ) : results.length === 0 ? (
          <DiscoverEmptyState
            onAdjust={() => setShowFilters(true)}
            onReset={resetFilters}
            onBrowse={resetFilters}
          />
        ) : current ? (
          <>
            <TalentNavigationControls
              prevTalent={prevTalent}
              nextTalent={nextTalent}
              onPrev={goPrevTalent}
              onNext={() => {
                goNextTalent();
                showUndoToast();
              }}
              hasPrev={hasPrev}
              hasNext={hasNext}
            />

            {/* Subtle up/down slide controls */}
            <div className="absolute right-2 top-1/2 -translate-y-1/2 z-20 flex flex-col gap-1.5">
              <button
                onClick={goPrevSlide}
                disabled={slideIndex === 0}
                className="w-7 h-7 rounded-full bg-noir/40 backdrop-blur-md border border-white/10 flex items-center justify-center text-soft-ivory/60 hover:border-rose-gold/50 hover:text-rose-gold transition disabled:opacity-0 disabled:pointer-events-none"
                aria-label="Previous slide"
              >
                <ChevronUp className="w-3.5 h-3.5" strokeWidth={1.4} />
              </button>
              <button
                onClick={goNextSlide}
                disabled={slideIndex === totalSlides - 1}
                className="w-7 h-7 rounded-full bg-noir/40 backdrop-blur-md border border-white/10 flex items-center justify-center text-soft-ivory/60 hover:border-rose-gold/50 hover:text-rose-gold transition disabled:opacity-0 disabled:pointer-events-none"
                aria-label="Next slide"
              >
                <ChevronDown className="w-3.5 h-3.5" strokeWidth={1.4} />
              </button>
            </div>

            {/* Talent transition */}
            <AnimatePresence custom={direction} initial={false}>
              <motion.div
                key={current.id}
                custom={direction}
                initial={{ opacity: 0, x: reduced ? 0 : direction > 0 ? 40 : -40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: reduced ? 0 : direction > 0 ? -40 : 40 }}
                transition={{ duration: reduced ? 0 : 0.4, ease: [0.22, 1, 0.36, 1] }}
                className="absolute inset-0"
              >
                <TalentStory
                  talent={currentStory}
                  slideIndex={slideIndex}
                  totalSlides={totalSlides}
                  slideTitles={SLIDE_TITLES}
                  onSlideJump={goToSlide}
                  saved={isSaved(current.talentProfileId)}
                  onToggleSave={handleToggleSave}
                  onMessage={handleMessage}
                  reduced={reduced}
                />
              </motion.div>
            </AnimatePresence>

            {/* Undo skip toast */}
            <AnimatePresence>
              {undoVisible && hasPrev && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  transition={{ duration: reduced ? 0 : 0.3 }}
                  className="absolute bottom-3 left-1/2 -translate-x-1/2 z-30 flex items-center gap-3 px-4 py-2.5 rounded-full bg-elevated-black/95 border border-rose-gold/25 backdrop-blur-md shadow-xl"
                >
                  <span className="text-[0.6rem] tracking-wide-luxe uppercase text-soft-ivory/70">
                    Skipped
                  </span>
                  <button
                    onClick={() => {
                      undoSkip();
                      setUndoVisible(false);
                    }}
                    className="inline-flex items-center gap-1 text-[0.6rem] tracking-luxe uppercase text-rose-gold hover:text-light-rose-gold transition"
                  >
                    <Undo2 className="w-3 h-3" strokeWidth={1.4} /> Undo
                  </button>
                  <button
                    onClick={() => setUndoVisible(false)}
                    className="text-muted-grey hover:text-ivory"
                  >
                    <X className="w-3 h-3" strokeWidth={1.2} />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </>
        ) : null}

        {/* Screen-reader announcement */}
        <div aria-live="polite" className="sr-only">
          {current
            ? `Viewing ${current.name}, ${current.city}. Slide ${slideIndex + 1} of ${totalSlides}: ${SLIDE_TITLES[slideIndex]}`
            : ""}
        </div>
      </div>

      {/* Persistent action bar — above bottom navigation */}
      {current && (
        <div className="shrink-0 py-2.5 px-3 mb-[calc(52px_+_env(safe-area-inset-bottom))]">
          <TalentActionBar
            saved={isSaved(current.talentProfileId)}
            onToggleSave={handleToggleSave}
            onMessage={handleMessage}
            onPrev={goPrevTalent}
            onNext={() => {
              goNextTalent();
              showUndoToast();
            }}
            hasPrev={hasPrev}
            hasNext={hasNext}
            reduced={reduced}
          />
        </div>
      )}

      <TalentFilterSheet
        open={showFilters}
        onClose={() => setShowFilters(false)}
        filters={filters}
        onChange={setFilters}
        onReset={resetFilters}
        reduced={reduced}
      />
    </div>
  );
}