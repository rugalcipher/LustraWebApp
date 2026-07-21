import React from "react";
import { cn } from "@/lib/utils";
import type { ExperienceSlide } from "./experienceSlides";

interface Props {
  slides: ExperienceSlide[];
  index: number;
  progress: number;
  onSelect: (i: number) => void;
}

function PreviewPanel({
  slide,
  n,
  active,
  progress,
  onClick,
}: {
  slide: ExperienceSlide;
  n: number;
  active: boolean;
  progress: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`${slide.label} — go to slide ${n}`}
      aria-current={active || undefined}
      className={cn(
        "relative group overflow-hidden rounded-sm border h-20 lg:h-28 flex-1 min-w-0 text-left transition",
        active ? "border-rose-gold/60" : "border-white/10 hover:border-white/25"
      )}
    >
      <img
        src={slide.preview}
        alt=""
        loading="lazy"
        decoding="async"
        draggable={false}
        className={cn(
          "absolute inset-0 w-full h-full object-cover transition duration-500",
          active ? "opacity-75" : "opacity-35 grayscale group-hover:opacity-60"
        )}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-noir/90 via-noir/30 to-transparent" />
      <div className="relative h-full p-2.5 lg:p-3 flex flex-col justify-between">
        <span className={cn("font-body text-[0.6rem] tracking-luxe tabular-nums", active ? "text-rose-gold" : "text-ivory/70")}>
          {String(n).padStart(2, "0")}
        </span>
        <span className="font-body text-[0.5rem] lg:text-[0.55rem] tracking-luxe uppercase text-soft-ivory/80 leading-tight">
          {slide.label}
        </span>
      </div>
      {active && (
        <span
          className="absolute bottom-0 left-0 h-0.5 w-full bg-rose-gold origin-left will-change-transform"
          style={{ transform: `scaleX(${progress})`, transition: "none" }}
        />
      )}
    </button>
  );
}

/**
 * The five visual carousel-preview panels (desktop/tablet). Hidden on mobile,
 * where the thin progress segments take their place. On tablet the panels shrink
 * (flex) to reduce their footprint while staying legible.
 */
export default function ExperienceHeroPreviews({ slides, index, progress, onSelect }: Props) {
  return (
    <div className="hidden md:flex items-stretch gap-2 lg:gap-3">
      {slides.map((s, i) => (
        <PreviewPanel key={s.id} slide={s} n={i + 1} active={i === index} progress={progress} onClick={() => onSelect(i)} />
      ))}
    </div>
  );
}
