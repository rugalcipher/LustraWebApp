import React, { useState } from "react";
import { Heart, MoreHorizontal, Share2, Flag } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import TalentStorySlide from "./TalentStorySlide";
import TalentOverlay from "./TalentOverlay";

/**
 * SLIDE 1 — Cinematic introduction. Full-screen cover photograph with an
 * expandable identity overlay. Save, share, and report controls at top.
 */
export default function TalentIntroSlide({ talent, saved, onToggleSave, reduced }) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <TalentStorySlide image={talent.cover} gradient>
      {/* Top controls */}
      <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-4 pt-12 pb-2">
        <button
          onClick={onToggleSave}
          className="w-9 h-9 rounded-full bg-noir/50 backdrop-blur-md border border-white/10 flex items-center justify-center hover:border-rose-gold/50 transition"
          aria-label={saved ? "Remove from saved" : "Save talent"}
        >
          <Heart
            className={cn("w-4 h-4", saved ? "fill-rose-gold text-rose-gold" : "text-ivory/80")}
            strokeWidth={1.4}
          />
        </button>

        <div className="relative">
          <button
            onClick={() => setMenuOpen((o) => !o)}
            className="w-9 h-9 rounded-full bg-noir/50 backdrop-blur-md border border-white/10 flex items-center justify-center text-ivory/80 hover:border-rose-gold/50 transition"
            aria-label="More options"
          >
            <MoreHorizontal className="w-4 h-4" strokeWidth={1.4} />
          </button>
          <AnimatePresence>
            {menuOpen && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: reduced ? 0 : 0.2 }}
                className="absolute right-0 top-11 w-36 bg-elevated-black border border-white/10 rounded-md py-1 shadow-xl"
              >
                <button className="w-full flex items-center gap-2 px-3 py-2 text-[0.6rem] tracking-wide-luxe uppercase text-soft-ivory/70 hover:text-rose-gold transition">
                  <Share2 className="w-3 h-3" strokeWidth={1.2} /> Share
                </button>
                <button className="w-full flex items-center gap-2 px-3 py-2 text-[0.6rem] tracking-wide-luxe uppercase text-soft-ivory/70 hover:text-error transition">
                  <Flag className="w-3 h-3" strokeWidth={1.2} /> Report
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Expandable identity overlay */}
      <TalentOverlay talent={talent} saved={saved} reduced={reduced} />

    </TalentStorySlide>
  );
}