import React from "react";
import { StarDivider } from "@/lib/lustra/Brand";
import { cn } from "@/lib/utils";

type IconType = React.ComponentType<{ className?: string; strokeWidth?: number }>;

/** Rose-gold diamond frame around an upright icon, with an optional marker (e.g. "I."). */
export function DiamondIcon({ icon: Icon, marker }: { icon: IconType; marker?: string }) {
  return (
    <div className="relative w-12 h-12 sm:w-14 sm:h-14 shrink-0 flex items-center justify-center">
      <span className="absolute inset-1.5 border border-rose-gold/35 rotate-45" />
      {marker && (
        <span className="absolute top-0 font-body text-[0.45rem] tracking-luxe text-rose-gold/70">{marker}</span>
      )}
      <Icon className="relative z-10 w-5 h-5 text-rose-gold" strokeWidth={1.3} />
    </div>
  );
}

/** Eyebrow + large serif title + metallic divider — the page's opening block. */
export function MarketingIntro({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div>
      <p className="font-body text-[0.6rem] tracking-luxe uppercase text-rose-gold/80">{eyebrow}</p>
      <h1 className="font-heading font-light text-ivory leading-[1.05] text-4xl sm:text-5xl lg:text-6xl mt-3">
        {title}
      </h1>
      <div className="mt-6 w-44 sm:w-52">
        <StarDivider />
      </div>
    </div>
  );
}

/** Icon-led content block: diamond icon + thin connector + heading & copy. */
export function MarketingValueBlock({
  icon,
  marker,
  heading,
  copy,
}: {
  icon: IconType;
  marker?: string;
  heading: string;
  copy: string;
}) {
  return (
    <div className="flex items-stretch gap-4 sm:gap-6">
      <div className="flex flex-col items-center shrink-0">
        <DiamondIcon icon={icon} marker={marker} />
      </div>
      <div className="w-px self-stretch bg-gradient-to-b from-rose-gold/30 via-rose-gold/12 to-transparent shrink-0" />
      <div className="pt-1 min-w-0">
        <h3 className="font-heading text-xl sm:text-2xl text-light-rose-gold">
          {marker && <span className="text-rose-gold/60 mr-2">{marker}</span>}
          {heading}
        </h3>
        <p className="font-body text-sm text-soft-ivory/70 mt-2 leading-relaxed max-w-xl">{copy}</p>
      </div>
    </div>
  );
}

/** Italic closing brand statement, preceded by a subtle divider. */
export function MarketingClosing({ lines, className }: { lines: string[]; className?: string }) {
  return (
    <div className={cn("pt-2", className)}>
      <div className="w-full max-w-md h-px bg-gradient-to-r from-transparent via-rose-gold/25 to-transparent mb-6" />
      <p className="font-heading italic font-light text-lg sm:text-xl text-rose-gold/75 leading-relaxed">
        {lines.map((l, i) => (
          <span key={i} className="block">
            {l}
          </span>
        ))}
      </p>
    </div>
  );
}
