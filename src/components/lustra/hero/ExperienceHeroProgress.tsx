import React from "react";
import { cn } from "@/lib/utils";

interface Props {
  index: number;
  count: number;
  /** 0..1 fill of the active segment. */
  progress: number;
  onSelect: (i: number) => void;
  className?: string;
}

/**
 * Numbered carousel progress: five thin rose-gold segments. Past segments are
 * filled, the active one fills with autoplay progress, future ones are faint.
 * Segments are clickable (with a comfortable tap target).
 */
export default function ExperienceHeroProgress({ index, count, progress, onSelect, className }: Props) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    <div className={cn("flex items-center gap-3 sm:gap-4", className)}>
      <span className="font-body text-[0.6rem] tracking-luxe text-rose-gold/90 tabular-nums">{pad(index + 1)}</span>
      <div className="flex items-center gap-1.5 sm:gap-2">
        {Array.from({ length: count }).map((_, i) => {
          const fill = i < index ? 100 : i === index ? progress * 100 : 0;
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
                  className="block h-full bg-rose-gold"
                  style={{ width: `${fill}%`, transition: i === index ? "none" : "width 400ms ease" }}
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
