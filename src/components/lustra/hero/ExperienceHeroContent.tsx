import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import LustraButton from "@/components/lustra/Button";
import { StarDivider } from "@/lib/lustra/Brand";
import { cn } from "@/lib/utils";
import type { ExperienceSlide } from "./experienceSlides";

/**
 * Per-slide copy + the consistent CTA hierarchy (rose-gold REQUEST ACCESS as the
 * strongest action, DISCOVER LUSTRA as the outlined secondary). Desktop
 * alignment varies per slide (center/left/right rhythm); mobile always sits in
 * the lower third, left-aligned, above the actions and safe area. Re-keyed by
 * slide id so the copy re-animates on each change.
 */
export default function ExperienceHeroContent({ slide }: { slide: ExperienceSlide }) {
  return (
    <div
      className={cn(
        "w-full px-6 sm:px-10 lg:px-16",
        "flex flex-col justify-end md:justify-center h-full",
        "pb-4 md:pb-0"
      )}
    >
      <div
        key={slide.id}
        className={cn(
          "flex flex-col gap-4 sm:gap-6 animate-fade-up",
          "max-w-[92%] sm:max-w-lg md:max-w-2xl",
          "items-start text-left", // mobile default
          slide.align === "center" && "md:mx-auto md:items-center md:text-center",
          slide.align === "left" && "md:mr-auto md:items-start md:text-left",
          slide.align === "right" && "md:ml-auto md:items-end md:text-right"
        )}
      >
        <p className="font-body text-[0.55rem] sm:text-[0.6rem] tracking-luxe uppercase text-rose-gold/85">
          {slide.label}
        </p>

        <h1 className="font-heading font-light text-ivory leading-[1.05] text-4xl sm:text-5xl lg:text-6xl">
          {slide.headline}
        </h1>

        <div className={cn("w-40", slide.align === "center" && "md:mx-auto", slide.align === "right" && "md:ml-auto")}>
          <StarDivider />
        </div>

        <p className="font-body text-sm sm:text-base text-soft-ivory/75 leading-relaxed max-w-md">
          {slide.copy}
        </p>

        <div
          className={cn(
            "flex flex-col sm:flex-row gap-3 mt-1 w-full sm:w-auto",
            slide.align === "center" && "md:justify-center",
            slide.align === "right" && "md:justify-end"
          )}
        >
          <LustraButton as={Link} to="/request-access" size="lg" className="w-full sm:w-auto">
            Request Access
          </LustraButton>
          <LustraButton as={Link} to="/talent" variant="outline" size="lg" className="w-full sm:w-auto">
            Discover Lustra <ArrowRight className="w-3.5 h-3.5" strokeWidth={1.4} />
          </LustraButton>
        </div>
      </div>
    </div>
  );
}
