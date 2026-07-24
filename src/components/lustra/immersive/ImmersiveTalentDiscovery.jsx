import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, Heart, Undo2, Clock, X } from "lucide-react";
import { cn } from "@/lib/utils";
import TalentCard from "@/components/lustra/TalentCard";
import { useSavedTalent } from "@/layouts/AppShell";
import DiscoveryGate from "@/components/lustra/immersive/DiscoveryGate";
import { useMessageAction } from "@/features/conversations/useMessageAction";
import { useDiscoverState, usePrefersReducedMotion } from "./useDiscoverState";
import DiscoverToolbar from "./DiscoverToolbar";
import TalentGallery from "@/features/discovery/TalentGallery";
import { formatDistanceBand } from "@/features/discovery/NearbyLocation";
import { formatRate } from "@/domain/talent";
import { AvailabilityPill } from "@/components/lustra/Primitives";
import TalentActionBar from "./TalentActionBar";
import TalentFilterSheet from "./TalentFilterSheet";
import DiscoverSkeleton from "./DiscoverSkeleton";
import DiscoverEmptyState from "./DiscoverEmptyState";

/**
 * The immersive discovery experience — one talent at a time, MEDIA-FIRST.
 *
 * Each talent is a gallery of their real approved images (cover first); horizontal
 * tap/swipe/arrow changes the IMAGE only. Talent-to-talent navigation is explicit through the
 * bottom controls (Previous / View profile / Message / Next) — the two gestures are deliberately
 * never the same. A compact overlay carries only the launch-critical summary; everything else
 * lives on the full detail page.
 */
export default function ImmersiveTalentDiscovery() {
  const { isSaved, toggle } = useSavedTalent();
  const navigate = useNavigate();
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
  const undoTimer = useRef(null);

  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < results.length - 1;

  const showUndoToast = useCallback(() => {
    setUndoVisible(true);
    clearTimeout(undoTimer.current);
    undoTimer.current = setTimeout(() => setUndoVisible(false), 4000);
  }, []);

  const nextTalentWithToast = useCallback(() => {
    goNextTalent();
    showUndoToast();
  }, [goNextTalent, showUndoToast]);

  // --- Keyboard: arrows change the IMAGE (talent changes only via the bottom controls, so one
  // gesture never does both). ---
  useEffect(() => {
    const onKey = (e) => {
      if (mode !== "immersive" || !current) return;
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
      if (e.key === "ArrowLeft") { e.preventDefault(); goPrevSlide(); }
      else if (e.key === "ArrowRight") { e.preventDefault(); goNextSlide(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mode, current, goNextSlide, goPrevSlide]);

  // Guests get their intent parked and are returned here after signing in.
  const handleMessage = useCallback(() => {
    if (current) message(current);
  }, [current, message]);

  const handleToggleSave = useCallback(() => {
    if (current) toggle(current);
  }, [current, toggle]);

  // Open the full authenticated detail, telling it to return to discovery on Back.
  const handleViewProfile = useCallback(() => {
    if (current) navigate(`/app/talent/${encodeURIComponent(current.slug)}`, { state: { from: "/app/discover" } });
  }, [current, navigate]);

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

      {/* Stage — media-first. Talent-to-talent is the bottom controls only; horizontal gestures
          here change the IMAGE (handled inside TalentGallery). */}
      <div className="flex-1 relative overflow-hidden">
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
            {/* Talent transition wraps the gallery, keyed by talent id. */}
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
                <TalentGallery
                  images={currentStory?.galleryImages?.length ? currentStory.galleryImages : current.coverImage ? [current.coverImage] : []}
                  index={slideIndex}
                  onIndexChange={goToSlide}
                  headerOffset="4rem"
                  indicatorPosition="top"
                  className="absolute inset-0"
                  ariaLabel={`${current.name} photographs`}
                >
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-noir via-transparent to-noir/30" />

                  {/* Top save — the discovery save lives here, not duplicated at the bottom. */}
                  <button
                    onClick={handleToggleSave}
                    aria-label={isSaved(current.talentProfileId) ? "Remove from saved" : "Save talent"}
                    className="absolute top-3 right-3 z-30 w-11 h-11 rounded-full bg-noir/50 backdrop-blur border border-white/10 flex items-center justify-center"
                  >
                    <Heart
                      className={cn("w-4 h-4", isSaved(current.talentProfileId) ? "fill-rose-gold text-rose-gold" : "text-ivory")}
                      strokeWidth={1.4}
                    />
                  </button>

                  {/* Compact launch summary — never covers the image with long copy. */}
                  <button
                    onClick={handleViewProfile}
                    className="absolute inset-x-0 bottom-0 z-20 text-left px-5 pb-4 pt-10"
                    aria-label={`View ${current.name}'s full profile`}
                  >
                    <h2 className="font-heading font-light text-3xl text-ivory leading-none">
                      {current.name}
                      {current.age ? <span className="text-soft-ivory/50 text-xl">, {current.age}</span> : null}
                    </h2>
                    <div className="flex items-center gap-2.5 mt-2 flex-wrap">
                      {current.city && (
                        <span className="inline-flex items-center gap-1 text-[0.6rem] text-soft-ivory/80 font-body">
                          <MapPin className="w-3 h-3" strokeWidth={1.2} /> {current.city}
                        </span>
                      )}
                      {formatDistanceBand(current.distanceKm) && (
                        <span className="text-[0.55rem] tracking-wide-luxe uppercase text-rose-gold/90 font-body">
                          {formatDistanceBand(current.distanceKm)}
                        </span>
                      )}
                      <AvailabilityPill status={current.availability} />
                      {current.startingRate != null && (
                        <span className="text-[0.6rem] font-body text-light-rose-gold">
                          From {formatRate(current.startingRate, current.startingRateCurrency)}
                        </span>
                      )}
                    </div>
                  </button>
                </TalentGallery>
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
                  className="absolute bottom-3 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 px-4 py-2.5 rounded-full bg-elevated-black/95 border border-rose-gold/25 backdrop-blur-md shadow-xl"
                >
                  <span className="text-[0.6rem] tracking-wide-luxe uppercase text-soft-ivory/70">Skipped</span>
                  <button
                    onClick={() => { undoSkip(); setUndoVisible(false); }}
                    className="inline-flex items-center gap-1 text-[0.6rem] tracking-luxe uppercase text-rose-gold hover:text-light-rose-gold transition"
                  >
                    <Undo2 className="w-3 h-3" strokeWidth={1.4} /> Undo
                  </button>
                  <button onClick={() => setUndoVisible(false)} className="text-muted-grey hover:text-ivory">
                    <X className="w-3 h-3" strokeWidth={1.2} />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </>
        ) : null}

        {/* Screen-reader announcement */}
        <div aria-live="polite" className="sr-only">
          {current ? `Viewing ${current.name}, ${current.city}. Photo ${slideIndex + 1} of ${totalSlides}.` : ""}
        </div>
      </div>

      {/* Persistent action bar — Previous / View profile / Message / Next. */}
      {current && (
        <div className="shrink-0 py-2.5 px-3 mb-[calc(52px_+_env(safe-area-inset-bottom))]">
          <TalentActionBar
            onViewProfile={handleViewProfile}
            onMessage={handleMessage}
            onPrev={goPrevTalent}
            onNext={nextTalentWithToast}
            hasPrev={hasPrev}
            hasNext={hasNext}
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