import React, { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import TalentStorySlide from "./TalentStorySlide";
import { Eyebrow } from "@/components/lustra/Primitives";

/**
 * SLIDE 3 — Gallery.
 *
 * Renders the talent's approved media straight from the view model, which is
 * built from the public profile the API returned. THE API IS THE AUTHORIZATION
 * BOUNDARY: it server-filters by the caller's entitlement, so whatever arrives
 * here is already permitted and no VIP check happens in the browser.
 *
 * It previously went through a separate media service that existed only for
 * mock data and threw outright in API mode — so this slide was permanently
 * broken in any deployed build.
 *
 * @param {{ talent: any; reduced?: boolean }} props
 */
export default function TalentGallerySlide({ talent, reduced }) {
  const media = talent?.galleryImages ?? [];
  const [imgIdx, setImgIdx] = useState(0);
  const total = media.length;

  // Clamp when the resolved set changes (e.g. VIP toggled, talent changed).
  useEffect(() => {
    setImgIdx(0);
  }, [talent?.id, total]);

  if (total === 0) {
    return (
      <TalentStorySlide image={talent?.cover} gradient>
        <div className="absolute inset-0 flex items-center justify-center px-8 text-center">
          <p className="font-body text-[0.7rem] tracking-luxe uppercase text-soft-ivory/60">
            No gallery available
          </p>
        </div>
      </TalentStorySlide>
    );
  }

  const current = media[Math.min(imgIdx, total - 1)];
  const next = (e) => {
    e?.stopPropagation();
    setImgIdx((i) => (i + 1) % total);
  };
  const prev = (e) => {
    e?.stopPropagation();
    setImgIdx((i) => (i - 1 + total) % total);
  };

  return (
    <TalentStorySlide image={current.url} gradient={false}>
      <div className="absolute inset-0 bg-gradient-to-b from-noir/50 via-transparent to-noir/60 pointer-events-none" />

      {/* Label */}
      <div className="absolute top-0 left-0 right-0 z-10 px-5 pt-12">
        <Eyebrow>Gallery</Eyebrow>
        <p className="font-body text-[0.6rem] text-soft-ivory/50 mt-0.5">
          {total} approved {total === 1 ? "photograph" : "photographs"}
        </p>
      </div>

      {/* Tap zones */}
      {total > 1 && (
        <button
          onClick={prev}
          className="absolute left-0 top-0 bottom-0 w-1/3 z-10 flex items-center justify-start group"
          aria-label="Previous photograph"
        >
          <span className="ml-3 w-8 h-8 rounded-full bg-noir/40 backdrop-blur-md border border-white/10 flex items-center justify-center text-ivory/70 group-hover:border-rose-gold/50 group-hover:text-rose-gold transition opacity-0 group-hover:opacity-100">
            <ChevronLeft className="w-4 h-4" strokeWidth={1.4} />
          </span>
        </button>
      )}
      {total > 1 && (
        <button
          onClick={next}
          className="absolute right-0 top-0 bottom-0 w-1/3 z-10 flex items-center justify-end group"
          aria-label="Next photograph"
        >
          <span className="mr-3 w-8 h-8 rounded-full bg-noir/40 backdrop-blur-md border border-white/10 flex items-center justify-center text-ivory/70 group-hover:border-rose-gold/50 group-hover:text-rose-gold transition opacity-0 group-hover:opacity-100">
            <ChevronRight className="w-4 h-4" strokeWidth={1.4} />
          </span>
        </button>
      )}

      {/* Counter + dots */}
      {total > 1 && (
        <div className="absolute bottom-0 left-0 right-0 z-10 flex flex-col items-center gap-2 pb-6">
          <AnimatePresence mode="wait">
            <motion.span
              key={imgIdx}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: reduced ? 0 : 0.25 }}
              className="text-[0.55rem] tracking-luxe uppercase text-soft-ivory/60 font-body"
            >
              {imgIdx + 1} / {total}
            </motion.span>
          </AnimatePresence>
          <div className="flex gap-1.5">
            {media.map((m, i) => (
              <button
                key={m.id ?? i}
                onClick={(e) => {
                  e.stopPropagation();
                  setImgIdx(i);
                }}
                className={cn(
                  "h-1 rounded-full transition-all",
                  i === imgIdx
                    ? m.state === "locked"
                      ? "w-5 bg-rose-gold/60"
                      : "w-5 bg-rose-gold"
                    : "w-1.5 bg-ivory/30"
                )}
                aria-label={m.state === "locked" ? "VIP-only photograph (locked)" : `Photograph ${i + 1}`}
              />
            ))}
          </div>
        </div>
      )}
    </TalentStorySlide>
  );
}
