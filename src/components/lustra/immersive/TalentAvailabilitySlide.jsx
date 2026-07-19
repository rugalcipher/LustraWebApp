import React from "react";
import { MapPin, Compass, Clock, ShieldCheck } from "lucide-react";
import TalentStorySlide from "./TalentStorySlide";
import { Eyebrow, AvailabilityPill } from "@/components/lustra/Primitives";
import { StarDivider } from "@/lib/lustra/Brand";

const DATES = ["22 Jul – 28 Jul", "12 Aug – 18 Aug", "05 Sep – 11 Sep"];

/**
 * SLIDE 5 — Availability. Status, indicative upcoming dates, operating
 * cities, travel regions, and response expectation. Makes clear that
 * management confirms final availability.
 */
export default function TalentAvailabilitySlide({ talent }) {
  return (
    <TalentStorySlide image={talent.gallery[0]} gradient>
      <div className="h-full overflow-y-auto lustra-scroll-hide pt-12 pb-24">
        <div className="px-5">
          <Eyebrow>Availability</Eyebrow>
          <div className="flex items-center gap-2 mt-2">
            <h2 className="font-heading font-light text-2xl text-ivory">{talent.name}</h2>
            <AvailabilityPill status={talent.availability} />
          </div>
        </div>

        <div className="px-5 my-5">
          <StarDivider />
        </div>

        {/* Upcoming dates */}
        <div className="px-5">
          <Eyebrow>Indicative Upcoming Dates</Eyebrow>
          <div className="mt-3 space-y-2">
            {DATES.map((d) => (
              <div
                key={d}
                className="flex items-center gap-3 py-2.5 px-4 bg-card-black/60 border border-white/[0.05] rounded-md"
              >
                <Clock className="w-3.5 h-3.5 text-rose-gold/60" strokeWidth={1.2} />
                <span className="text-sm text-soft-ivory/85 font-body">{d}</span>
              </div>
            ))}
          </div>
          <p className="text-[0.5rem] text-muted-grey mt-2.5 leading-relaxed">
            Indicative only — final dates confirmed by management.
          </p>
        </div>

        <div className="px-5 mt-6 space-y-4">
          <Row
            icon={MapPin}
            label="Operating City"
            value={`${talent.city} · ${talent.region}`}
          />
          <Row
            icon={Compass}
            label="Travel Regions"
            value={talent.travel ? "Europe · Middle East · North America" : talent.region}
          />
          <Row
            icon={Clock}
            label="Response"
            value="Typically within 24 hours"
          />
        </div>

        <div className="px-5 mt-6">
          <div className="flex items-start gap-2 py-3 px-4 border border-rose-gold/15 rounded-md bg-rose-gold/[0.02]">
            <ShieldCheck className="w-3.5 h-3.5 text-rose-gold/70 shrink-0 mt-0.5" strokeWidth={1.2} />
            <p className="text-[0.6rem] text-soft-ivory/70 leading-relaxed font-body">
              All availability is confirmed by Lustra management before an inquiry proceeds.
            </p>
          </div>
        </div>
      </div>
    </TalentStorySlide>
  );
}

function Row({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="w-3.5 h-3.5 text-rose-gold/60 mt-0.5 shrink-0" strokeWidth={1.2} />
      <div>
        <p className="text-[0.5rem] tracking-luxe uppercase text-muted-grey">{label}</p>
        <p className="text-sm text-soft-ivory/85 font-body mt-0.5">{value}</p>
      </div>
    </div>
  );
}