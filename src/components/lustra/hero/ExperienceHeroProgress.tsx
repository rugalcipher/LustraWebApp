import React from "react";
import { cn } from "@/lib/utils";

interface Props {
  index: number;
  count: number;
  /** 0..1 fill of the active segment. */
  progress: number;
  onSelect: (i: number) => void;
  /** With reduced motion there is no autoplay, so the fill is a static state. */
  reducedMotion?: boolean;
  className?: string;
}

/**
 * Numbered carousel progress: five thin rose-gold segments. Past segments are
 * filled, the active one fills with autoplay progress, future ones are faint.
 * Segments are clickable (with a comfortable tap target).
 *
 * The fill animates `transform: scaleX()` from `transform-origin: left`, not
 * `width` — the transform is composited, so a value updated every frame by the
 * autoplay rAF stays smooth and never triggers layout. The active segment
 * carries no CSS transition (the rAF is the animation); neighbours ease briefly
 * so a manual jump doesn't snap.
 */
export default function ExperienceHeroProgress({ index, count, progress, onSelect, reducedMotion, className }: Props) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    <div className={cn("flex items-center gap-3 sm:gap-4", className)}>
      <span className="font-body text-[0.6rem] tracking-luxe text-rose-gold/90 tabular-nums">{pad(index + 1)}</span>
      <div className="flex items-center gap-1.5 sm:gap-2">
        {Array.from({ length: count }).map((_, i) => {
          // Reduced motion: no moving fill — the active segment is simply "on".
          const scale = reducedMotion
            ? i <= index
              ? 1
              : 0
            : i < index
              ? 1
              : i === index
                ? progress
                : 0;
          return (
            <button
              key={i}
              type="button"
              onClick={() => onSelect(i)}
              aria-label={`Go to slide ${i + 1}`}
              aria-current={i === index || undefined}
              className="group relative py-2"
            >
              <span className="block h-px w-8 sm:w-12 lg:w-16 bg-ivory/20 overflow-hidden group-hover:bg-ivory/35 transition-colors">
                <span
                  className="block h-full w-full bg-rose-gold origin-left will-change-transform"
                  style={{
                    transform: `scaleX(${scale})`,
                    transition: i === index && !reducedMotion ? "none" : "transform 400ms ease",
                  }}
                />
              </span>
            </button>
          );
        })}
      </div>
      <span className="font-body text-[0.6rem] tracking-luxe text-muted-grey tabular-nums">{pad(count)}</span>
    </div>
  );
}
