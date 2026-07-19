import React from "react";
import { Star, ShieldCheck } from "lucide-react";
import { motion } from "framer-motion";
import TalentStorySlide from "./TalentStorySlide";
import { Eyebrow } from "@/components/lustra/Primitives";
import { StarDivider } from "@/lib/lustra/Brand";

const SUB_RATINGS = [
  { label: "Professionalism", delta: 0 },
  { label: "Communication", delta: -0.1 },
  { label: "Punctuality", delta: -0.2 },
  { label: "Presentation", delta: 0.1 },
];

const REVIEWS = [
  {
    text: "An exceptional evening. Poised, articulate, and discreet throughout. Lustra's concierge handled every detail flawlessly.",
    author: "Verified Member",
  },
  {
    text: "Exceeded expectations in every way. The level of sophistication and attentiveness was remarkable.",
    author: "Verified Member",
  },
];

/**
 * SLIDE 6 — Reviews & Reputation. Average rating, review count, selected
 * published reviews, sub-rating dimensions, and the verified-booking badge.
 */
export default function TalentReviewsSlide({ talent, reduced }) {
  const sub = SUB_RATINGS.map((s) => ({
    ...s,
    value: Math.min(5, Math.max(4, Math.round((talent.rating + s.delta) * 10) / 10)),
  }));

  return (
    <TalentStorySlide image={talent.gallery[0]} gradient>
      <div className="h-full overflow-y-auto lustra-scroll-hide pt-12 pb-24">
        <div className="px-5">
          <Eyebrow>Reviews & Reputation</Eyebrow>
          <div className="flex items-end gap-4 mt-3">
            <div>
              <p className="font-heading text-5xl text-ivory leading-none">
                {talent.rating.toFixed(1)}
              </p>
              <div className="flex items-center gap-0.5 mt-1.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className="w-3 h-3 text-rose-gold"
                    fill={i < Math.round(talent.rating) ? "#B8876B" : "none"}
                    strokeWidth={1.2}
                  />
                ))}
              </div>
            </div>
            <div className="pb-1">
              <p className="text-xs text-soft-ivory/70 font-body">{talent.reviews} reviews</p>
              <p className="text-[0.55rem] tracking-wide-luxe uppercase text-muted-grey mt-0.5">
                Verified bookings
              </p>
            </div>
          </div>
        </div>

        <div className="px-5 my-5">
          <StarDivider />
        </div>

        {/* Sub-ratings */}
        <div className="px-5 space-y-3">
          {sub.map((s) => (
            <div key={s.label}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[0.55rem] tracking-wide-luxe uppercase text-muted-grey">
                  {s.label}
                </span>
                <span className="text-xs text-soft-ivory/80 font-body">{s.value.toFixed(1)}</span>
              </div>
              <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-rose-gold to-light-rose-gold rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${(s.value / 5) * 100}%` }}
                  transition={{ duration: reduced ? 0 : 0.7, ease: [0.22, 1, 0.36, 1] }}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="px-5 my-5">
          <StarDivider />
        </div>

        {/* Selected reviews */}
        <div className="px-5 space-y-3">
          {REVIEWS.map((r, i) => (
            <div
              key={i}
              className="py-3 px-4 bg-card-black/60 border border-white/[0.05] rounded-md"
            >
              <div className="flex items-center gap-1 mb-2">
                {Array.from({ length: 5 }).map((_, j) => (
                  <Star key={j} className="w-2.5 h-2.5 text-rose-gold fill-rose-gold" />
                ))}
              </div>
              <p className="font-body text-sm text-soft-ivory/85 leading-relaxed italic">
                "{r.text}"
              </p>
              <p className="text-[0.5rem] tracking-luxe uppercase text-muted-grey mt-2.5 flex items-center gap-1">
                <ShieldCheck className="w-2.5 h-2.5" strokeWidth={1.2} /> — {r.author}
              </p>
            </div>
          ))}
        </div>

        <p className="px-5 mt-4 text-[0.55rem] text-muted-grey flex items-center gap-1.5">
          <ShieldCheck className="w-3 h-3" strokeWidth={1.2} /> Only clients with completed bookings
          may leave reviews.
        </p>
      </div>
    </TalentStorySlide>
  );
}