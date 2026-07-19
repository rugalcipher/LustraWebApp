import React from "react";
import { Globe, Sparkles, Award } from "lucide-react";
import TalentStorySlide from "./TalentStorySlide";
import { Eyebrow } from "@/components/lustra/Primitives";
import { StarDivider } from "@/lib/lustra/Brand";

/**
 * SLIDE 2 — About. Secondary portrait, short + full biography, personality
 * tags, interests, languages, and professional experience. Editorial
 * typography over a dark content panel.
 */
export default function TalentAboutSlide({ talent }) {
  const portrait = talent.gallery[1] || talent.gallery[0] || talent.cover;

  return (
    <TalentStorySlide image={portrait} gradient>
      <div className="h-full overflow-y-auto lustra-scroll-hide pt-12 pb-24">
        <div className="px-5">
          <Eyebrow>About</Eyebrow>
          <h2 className="font-heading font-light text-3xl text-ivory mt-2 leading-tight">
            {talent.name}
          </h2>
          <p className="font-body text-[0.65rem] tracking-wide-luxe uppercase text-rose-gold/70 mt-1.5">
            {talent.headline}
          </p>
        </div>

        <div className="px-5 mt-5">
          <p className="font-body text-sm text-soft-ivory/85 leading-relaxed">{talent.bio}</p>
          <p className="font-body text-[0.8rem] text-soft-ivory/65 leading-relaxed mt-4">
            {talent.fullBio}
          </p>
        </div>

        <div className="px-5 my-6">
          <StarDivider />
        </div>

        {/* Demeanour tags */}
        <div className="px-5">
          <Eyebrow>Demeanour</Eyebrow>
          <div className="flex flex-wrap gap-2 mt-3">
            {talent.tags.map((tag) => (
              <span
                key={tag}
                className="text-[0.55rem] tracking-wide-luxe uppercase px-3 py-1.5 rounded-full border border-rose-gold/25 text-rose-gold/80"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>

        <div className="px-5 mt-6 space-y-4">
          <Row icon={Sparkles} label="Interests" value={talent.interests.join(" · ")} />
          <Row icon={Globe} label="Languages" value={talent.languages.join(" · ")} />
          <Row icon={Award} label="Experience" value={`${talent.reviews}+ completed engagements`} />
        </div>
      </div>
    </TalentStorySlide>
  );
}

function Row({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-3 py-2 border-b border-white/[0.04]">
      <Icon className="w-3.5 h-3.5 text-rose-gold/60 mt-0.5 shrink-0" strokeWidth={1.2} />
      <div className="min-w-0">
        <p className="text-[0.5rem] tracking-luxe uppercase text-muted-grey">{label}</p>
        <p className="text-xs text-soft-ivory/80 font-body mt-0.5">{value}</p>
      </div>
    </div>
  );
}