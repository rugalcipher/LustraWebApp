import React from "react";
import { Heart, ChevronLeft, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Sparkle } from "@/lib/lustra/Brand";

/**
 * Persistent floating action bar — Previous talent, Save, Inquire (central,
 * rose-gold, strongest), Next talent. Sits above the client bottom
 * navigation.
 */
export default function TalentActionBar({
  saved,
  onToggleSave,
  onInquire,
  onPrev,
  onNext,
  hasPrev,
  hasNext,
  reduced,
}) {
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

      {/* Save */}
      <button
        onClick={onToggleSave}
        aria-label={saved ? "Remove from saved" : "Save talent"}
        className="w-11 h-11 sm:w-12 sm:h-12 rounded-full border border-white/15 bg-noir/60 backdrop-blur-md flex items-center justify-center transition hover:border-rose-gold/50"
      >
        <motion.span
          key={saved ? "saved" : "unsaved"}
          initial={{ scale: reduced ? 1 : 0.7 }}
          animate={{ scale: 1 }}
          transition={{ duration: reduced ? 0 : 0.3, ease: [0.22, 1, 0.36, 1] }}
        >
          <Heart
            className={cn("w-4 h-4", saved ? "fill-rose-gold text-rose-gold" : "text-soft-ivory")}
            strokeWidth={1.4}
          />
        </motion.span>
      </button>

      {/* Inquire — central, strongest */}
      <button
        onClick={onInquire}
        className="relative h-12 sm:h-14 px-7 sm:px-10 rounded-full bg-gradient-to-r from-light-rose-gold via-rose-gold to-rose-gold text-noir font-body text-[0.65rem] sm:text-[0.7rem] tracking-luxe uppercase font-medium flex items-center gap-2 shadow-lg shadow-rose-gold/20 hover:shadow-rose-gold/40 transition-all active:scale-[0.97]"
        aria-label="Send an inquiry"
      >
        <Sparkle size={11} className="shrink-0" />
        Inquire
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