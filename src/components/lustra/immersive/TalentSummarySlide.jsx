import React from "react";
import { Heart, Share2, Flag, MapPin } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import TalentStorySlide from "./TalentStorySlide";
import { AvailabilityPill } from "@/components/lustra/Primitives";
import { Sparkle, StarDivider } from "@/lib/lustra/Brand";
import { formatRate } from "@/domain/talent";

/**
 * SLIDE 7 — Final profile summary. Main portrait, display name, category,
 * city, starting rate, saved status, and a large final CTA:
 * "MESSAGE ABOUT [DISPLAY NAME]". Plus Save for Later, Share, and Report.
 */
export default function TalentSummarySlide({
  talent,
  saved,
  onToggleSave,
  onMessage,
  reduced,
}) {
  return (
    <TalentStorySlide image={talent.cover} gradient>
      <div className="h-full overflow-y-auto lustra-scroll-hide pt-12 pb-28">
        <div className="flex flex-col items-center px-5 pt-4">
          <div className="relative">
            <img
              src={talent.gallery[0]}
              alt={talent.name}
              className="w-32 h-32 rounded-full object-cover border-2 border-rose-gold/30"
            />
            <button
              onClick={onToggleSave}
              className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-elevated-black border border-rose-gold/30 flex items-center justify-center"
              aria-label={saved ? "Remove from saved" : "Save talent"}
            >
              <Heart
                className={cn("w-3.5 h-3.5", saved ? "fill-rose-gold text-rose-gold" : "text-ivory/70")}
                strokeWidth={1.4}
              />
            </button>
          </div>

          <h2 className="font-heading font-light text-3xl text-ivory mt-4 leading-none">
            {talent.name}
          </h2>
          <p className="font-body text-[0.6rem] tracking-wide-luxe uppercase text-rose-gold/70 mt-2">
            {talent.category}
          </p>

          <div className="flex items-center gap-3 mt-3 flex-wrap justify-center">
            <span className="inline-flex items-center gap-1 text-[0.6rem] text-muted-grey font-body">
              <MapPin className="w-3 h-3" strokeWidth={1.2} /> {talent.city}
            </span>
            <AvailabilityPill status={talent.availability} />
          </div>

          <div className="mt-5 flex items-baseline gap-2">
            {/* A talent may have published no public rate; formatRate renders "On request"
                rather than crashing on a null. */}
            {talent.startingRate != null && (
              <span className="text-[0.5rem] tracking-luxe uppercase text-muted-grey">From</span>
            )}
            <span className="font-heading text-2xl text-light-rose-gold">
              {formatRate(talent.startingRate, talent.startingRateCurrency)}
            </span>
          </div>
        </div>

        <div className="my-6">
          <StarDivider />
        </div>

        {/* Large final CTA */}
        <div className="px-5">
          <motion.button
            onClick={onMessage}
            whileTap={reduced ? undefined : { scale: 0.97 }}
            className="w-full py-4 rounded-full bg-gradient-to-r from-light-rose-gold via-rose-gold to-rose-gold text-noir font-body text-[0.7rem] tracking-luxe uppercase font-medium flex items-center justify-center gap-2 shadow-lg shadow-rose-gold/25"
          >
            <Sparkle size={12} className="shrink-0" />
            Message about {talent.name}
          </motion.button>

          {/* Secondary actions */}
          <div className="flex items-center justify-center gap-6 mt-5">
            <button
              onClick={onToggleSave}
              className="flex flex-col items-center gap-1 text-[0.5rem] tracking-luxe uppercase text-muted-grey hover:text-rose-gold transition"
            >
              <Heart
                className={cn("w-4 h-4", saved && "fill-rose-gold text-rose-gold")}
                strokeWidth={1.2}
              />
              {saved ? "Saved" : "Save for Later"}
            </button>
            <button className="flex flex-col items-center gap-1 text-[0.5rem] tracking-luxe uppercase text-muted-grey hover:text-rose-gold transition">
              <Share2 className="w-4 h-4" strokeWidth={1.2} /> Share
            </button>
            <button className="flex flex-col items-center gap-1 text-[0.5rem] tracking-luxe uppercase text-muted-grey hover:text-error transition">
              <Flag className="w-4 h-4" strokeWidth={1.2} /> Report
            </button>
          </div>
        </div>
      </div>
    </TalentStorySlide>
  );
}