import React, { useState } from "react";
import { ChevronUp, MapPin, Star, Shield } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { AvailabilityPill } from "@/components/lustra/Primitives";

/**
 * Expandable summary overlay for the intro slide. Collapsed shows name,
 * city, rate, availability. Expanded adds headline, short bio, tags,
 * languages. The image stays dominant behind the gradient.
 */
export default function TalentOverlay({ talent, saved, reduced }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="absolute bottom-0 left-0 right-0 z-10">
      <div className="bg-gradient-to-t from-noir via-noir/85 to-transparent pt-16 pb-6 px-5">
        <AnimatePresence initial={false} mode="wait">
          {expanded ? (
            <motion.div
              key="expanded"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: reduced ? 0 : 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="overflow-hidden"
            >
              <p className="font-body text-[0.65rem] tracking-wide-luxe uppercase text-rose-gold/80 mb-3">
                {talent.headline}
              </p>
              <p className="font-body text-sm text-soft-ivory/85 leading-relaxed mb-4">
                {talent.bio}
              </p>
              <div className="flex flex-wrap gap-1.5 mb-4">
                {talent.tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-[0.55rem] tracking-wide-luxe uppercase px-2.5 py-1 rounded-full border border-rose-gold/25 text-rose-gold/80"
                  >
                    {tag}
                  </span>
                ))}
              </div>
              <p className="text-[0.6rem] tracking-wide-luxe uppercase text-muted-grey">
                {talent.languages.join(" · ")}
              </p>
            </motion.div>
          ) : (
            <motion.div
              key="collapsed"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: reduced ? 0 : 0.3 }}
            >
              <p className="font-body text-[0.65rem] tracking-wide-luxe uppercase text-soft-ivory/60 mb-1">
                {talent.headline}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Always-visible identity row */}
        <div className="flex items-end justify-between gap-3 mt-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="font-heading font-light text-3xl sm:text-4xl text-ivory leading-none truncate">
                {talent.name}
              </h2>
              {talent.age && (
                <span className="text-soft-ivory/40 text-xl font-heading">{talent.age}</span>
              )}
              <Shield className="w-3.5 h-3.5 text-rose-gold shrink-0" strokeWidth={1.4} />
            </div>
            <div className="flex items-center gap-3 mt-2 flex-wrap">
              <span className="inline-flex items-center gap-1 text-[0.6rem] text-muted-grey font-body">
                <MapPin className="w-3 h-3" strokeWidth={1.2} /> {talent.city}
              </span>
              <span className="text-[0.6rem] tracking-wide-luxe uppercase text-soft-ivory/50">
                {talent.category}
              </span>
              <AvailabilityPill status={talent.availability} />
              <span className="inline-flex items-center gap-1 text-[0.6rem] text-rose-gold font-body">
                <Star className="w-3 h-3 fill-rose-gold" /> {talent.rating.toFixed(1)}
              </span>
            </div>
          </div>
          <div className="text-right shrink-0">
            <p className="text-[0.5rem] tracking-luxe uppercase text-muted-grey">From</p>
            <p className="font-heading text-xl text-light-rose-gold leading-none mt-0.5">
              ${talent.startingRate.toLocaleString()}
            </p>
          </div>
        </div>

        {/* Expand toggle */}
        <button
          onClick={() => setExpanded((e) => !e)}
          className="mt-3 inline-flex items-center gap-1 text-[0.55rem] tracking-luxe uppercase text-soft-ivory/50 hover:text-rose-gold transition"
        >
          {expanded ? "Less" : "More"}
          <ChevronUp
            className={cn("w-3 h-3 transition-transform", expanded ? "" : "rotate-180")}
            strokeWidth={1.2}
          />
        </button>
      </div>
    </div>
  );
}