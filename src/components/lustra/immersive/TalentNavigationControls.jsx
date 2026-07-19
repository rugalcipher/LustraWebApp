import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

/**
 * Visible talent-navigation chevrons on the stage edges (accessibility —
 * gestures are never the only option). Rendered as small circles so they
 * don't create full-height click strips that conflict with gallery tap
 * zones. On lg+ screens, subtle previous / next talent cover previews
 * appear beside the chevrons.
 */
export default function TalentNavigationControls({
  prevTalent,
  nextTalent,
  onPrev,
  onNext,
  hasPrev,
  hasNext,
}) {
  return (
    <>
      {/* Left / previous */}
      <button
        onClick={onPrev}
        disabled={!hasPrev}
        aria-label="Previous talent"
        className="absolute left-2 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-noir/50 backdrop-blur-md border border-white/10 flex items-center justify-center text-soft-ivory hover:border-rose-gold/50 hover:text-rose-gold transition disabled:opacity-0 disabled:pointer-events-none group"
      >
        <ChevronLeft className="w-4 h-4" strokeWidth={1.4} />
        {prevTalent && (
          <img
            src={prevTalent.cover}
            alt=""
            className="hidden lg:block absolute left-11 w-14 h-20 object-cover rounded-sm border border-white/10 opacity-40 group-hover:opacity-75 transition"
          />
        )}
      </button>

      {/* Right / next */}
      <button
        onClick={onNext}
        disabled={!hasNext}
        aria-label="Next talent"
        className="absolute right-2 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-noir/50 backdrop-blur-md border border-white/10 flex items-center justify-center text-soft-ivory hover:border-rose-gold/50 hover:text-rose-gold transition disabled:opacity-0 disabled:pointer-events-none group"
      >
        {nextTalent && (
          <img
            src={nextTalent.cover}
            alt=""
            className="hidden lg:block absolute right-11 w-14 h-20 object-cover rounded-sm border border-white/10 opacity-40 group-hover:opacity-75 transition"
          />
        )}
        <ChevronRight className="w-4 h-4" strokeWidth={1.4} />
      </button>
    </>
  );
}