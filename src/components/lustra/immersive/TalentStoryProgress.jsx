import React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

/**
 * Seven thin rose-gold segments that fill as the client progresses through
 * the profile story, plus a "1 / 7" counter. Segments are tappable to
 * jump directly to a slide.
 */
export default function TalentStoryProgress({ current, total, titles, onJump, reduced }) {
  return (
    <div className="absolute top-0 left-0 right-0 z-20 px-4 pt-3 pb-2 pointer-events-none">
      <div className="flex items-center gap-1.5">
        {Array.from({ length: total }).map((_, i) => {
          const active = i === current;
          const done = i < current;
          return (
            <button
              key={i}
              onClick={() => onJump?.(i)}
              aria-label={`Go to ${titles?.[i] || `slide ${i + 1}`}`}
              className="flex-1 h-[3px] rounded-full bg-white/15 overflow-hidden pointer-events-auto group"
            >
              <motion.span
                className={cn(
                  "block h-full rounded-full",
                  active ? "bg-rose-gold" : done ? "bg-rose-gold/50" : "bg-transparent"
                )}
                initial={false}
                animate={{ width: active ? "100%" : done ? "100%" : "0%" }}
                transition={{ duration: reduced ? 0 : 0.5, ease: [0.22, 1, 0.36, 1] }}
              />
            </button>
          );
        })}
      </div>
      <div className="flex items-center justify-center mt-1.5">
        <span className="text-[0.5rem] tracking-luxe uppercase text-soft-ivory/50 font-body">
          {current + 1} <span className="text-soft-ivory/25">/</span> {total}
          {titles?.[current] && (
            <span className="ml-2 text-rose-gold/70 normal-case tracking-wide-luxe">
              · {titles[current]}
            </span>
          )}
        </span>
      </div>
    </div>
  );
}