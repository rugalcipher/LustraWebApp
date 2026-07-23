import React from "react";
import { Eye, ChevronLeft, ChevronRight } from "lucide-react";
import { Sparkle } from "@/lib/lustra/Brand";

/**
 * Persistent floating action bar for immersive discovery: Previous talent, View full profile,
 * Message (central, rose-gold, strongest), Next talent. Sits above the client bottom navigation.
 *
 * The save/heart lives at the top of discovery, so it is NOT duplicated here; the bottom heart is
 * replaced by a View-full-profile control that opens the complete authenticated detail page.
 */
export default function TalentActionBar({ onViewProfile, onMessage, onPrev, onNext, hasPrev, hasNext }) {
  return (
    <div className="flex items-center justify-center gap-3 sm:gap-4">
      {/* Previous talent */}
      <button
        onClick={onPrev}
        disabled={!hasPrev}
        aria-label="Previous talent"
        className="w-11 h-11 sm:w-12 sm:h-12 rounded-full border border-white/15 bg-noir/60 backdrop-blur-md flex items-center justify-center text-soft-ivory hover:border-rose-gold/50 hover:text-rose-gold transition disabled:opacity-25 disabled:pointer-events-none"
      >
        <ChevronLeft className="w-4 h-4" strokeWidth={1.4} />
      </button>

      {/* View full profile */}
      <button
        onClick={onViewProfile}
        aria-label="View full profile"
        className="w-11 h-11 sm:w-12 sm:h-12 rounded-full border border-white/15 bg-noir/60 backdrop-blur-md flex items-center justify-center text-soft-ivory hover:border-rose-gold/50 hover:text-rose-gold transition"
      >
        <Eye className="w-4 h-4" strokeWidth={1.4} />
      </button>

      {/* Message — central, strongest: this is the primary Lustra action */}
      <button
        onClick={onMessage}
        className="relative h-12 sm:h-14 px-7 sm:px-10 rounded-full bg-gradient-to-r from-light-rose-gold via-rose-gold to-rose-gold text-noir font-body text-[0.65rem] sm:text-[0.7rem] tracking-luxe uppercase font-medium flex items-center gap-2 shadow-lg shadow-rose-gold/20 hover:shadow-rose-gold/40 transition-all active:scale-[0.97]"
        aria-label="Message Lustra management about this talent"
      >
        <Sparkle size={11} className="shrink-0" />
        Message
      </button>

      {/* Next talent */}
      <button
        onClick={onNext}
        disabled={!hasNext}
        aria-label="Next talent"
        className="w-11 h-11 sm:w-12 sm:h-12 rounded-full border border-white/15 bg-noir/60 backdrop-blur-md flex items-center justify-center text-soft-ivory hover:border-rose-gold/50 hover:text-rose-gold transition disabled:opacity-25 disabled:pointer-events-none"
      >
        <ChevronRight className="w-4 h-4" strokeWidth={1.4} />
      </button>
    </div>
  );
}
