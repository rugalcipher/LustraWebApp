import React from "react";
import { Clock, Plane, CalendarPlus, Info } from "lucide-react";
import TalentStorySlide from "./TalentStorySlide";
import { Eyebrow } from "@/components/lustra/Primitives";
import { Sparkle, StarDivider } from "@/lib/lustra/Brand";

const DURATIONS = {
  "Private Dinner": "3–5 hours",
  "Gala Hosting": "Full evening",
  "Brand Event": "4–8 hours",
  "Art Gallery Visit": "2–3 hours",
  "Weekend Escape": "2–3 days",
  "Travel Host": "1–7 days",
  "Wine Tasting": "2–3 hours",
  "Private Performance": "1–2 hours",
  "City Tour": "Half day",
};

/**
 * SLIDE 4 — Experiences & Rates. Engagement categories with starting rates,
 * duration, travel and event availability, custom booking, and the rate
 * disclaimer. Editorial rate cards — never ecommerce-style prices.
 */
export default function TalentRatesSlide({ talent }) {
  return (
    <TalentStorySlide image={talent.gallery[0]} gradient>
      <div className="h-full overflow-y-auto lustra-scroll-hide pt-12 pb-24">
        <div className="px-5">
          <Eyebrow>Experiences & Rates</Eyebrow>
          <h2 className="font-heading font-light text-2xl text-ivory mt-2">
            Engagements with {talent.name}
          </h2>
        </div>

        <div className="px-5 mt-5 space-y-2.5">
          {talent.engagements.map((eng) => (
            <div
              key={eng}
              className="flex items-center justify-between gap-3 py-3 px-4 bg-card-black/60 border border-white/[0.05] rounded-md"
            >
              <div className="min-w-0">
                <p className="font-body text-sm text-ivory">{eng}</p>
                <p className="text-[0.55rem] tracking-wide-luxe uppercase text-muted-grey mt-0.5 flex items-center gap-1">
                  <Clock className="w-2.5 h-2.5" strokeWidth={1.2} />
                  {DURATIONS[eng] || "Flexible"}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-[0.5rem] tracking-luxe uppercase text-muted-grey">From</p>
                <p className="font-heading text-base text-light-rose-gold">
                  ${talent.startingRate.toLocaleString()}
                </p>
              </div>
            </div>
          ))}

          {/* Custom booking */}
          <div className="flex items-center justify-between gap-3 py-3 px-4 border border-rose-gold/20 rounded-md bg-rose-gold/[0.03]">
            <div className="flex items-center gap-2">
              <Sparkle className="w-3.5 h-3.5 text-rose-gold" />
              <p className="font-body text-sm text-ivory">Custom Engagement</p>
            </div>
            <p className="text-[0.55rem] tracking-wide-luxe uppercase text-rose-gold/70">
              By Request
            </p>
          </div>
        </div>

        <div className="px-5 my-5">
          <StarDivider />
        </div>

        {/* Availability flags */}
        <div className="px-5 space-y-3">
          <Flag
            icon={Plane}
            label="Travel"
            value={talent.travel ? "Available to travel internationally" : "Local engagements only"}
          />
          <Flag
            icon={CalendarPlus}
            label="Events"
            value={talent.engagements.includes("Gala Hosting") ? "Gala & private events" : "Private & brand events"}
          />
        </div>

        {/* Disclaimer */}
        <div className="px-5 mt-6">
          <p className="text-[0.55rem] text-muted-grey leading-relaxed flex items-start gap-1.5 font-body italic">
            <Info className="w-3 h-3 shrink-0 mt-0.5" strokeWidth={1.2} />
            Displayed rates are starting estimates. Final pricing and availability are confirmed by
            Lustra management.
          </p>
        </div>
      </div>
    </TalentStorySlide>
  );
}

function Flag({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-3">
      <Icon className="w-3.5 h-3.5 text-rose-gold/60 shrink-0" strokeWidth={1.2} />
      <div>
        <p className="text-[0.5rem] tracking-luxe uppercase text-muted-grey">{label}</p>
        <p className="text-xs text-soft-ivory/80 font-body mt-0.5">{value}</p>
      </div>
    </div>
  );
}