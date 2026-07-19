import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  onPrev: () => void;
  onNext: () => void;
  /** Called when a control gains/loses focus, so the hero can pause autoplay. */
  onFocusChange?: (focused: boolean) => void;
}

const base =
  "absolute top-1/2 -translate-y-1/2 z-30 w-10 h-10 sm:w-12 sm:h-12 rounded-full " +
  "bg-noir/40 backdrop-blur-md border border-white/15 flex items-center justify-center " +
  "text-soft-ivory/80 hover:text-rose-gold hover:border-rose-gold/50 transition " +
  "focus:outline-none focus-visible:ring-1 focus-visible:ring-rose-gold/70";

/** Restrained previous/next controls at the viewport edges (not generic slider arrows). */
export default function ExperienceHeroControls({ onPrev, onNext, onFocusChange }: Props) {
  const focusProps = {
    onFocus: () => onFocusChange?.(true),
    onBlur: () => onFocusChange?.(false),
  };
  return (
    <>
      <button type="button" aria-label="Previous experience" onClick={onPrev} {...focusProps} className={cn(base, "left-3 sm:left-5")}>
        <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" strokeWidth={1.4} />
      </button>
      <button type="button" aria-label="Next experience" onClick={onNext} {...focusProps} className={cn(base, "right-3 sm:right-5")}>
        <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" strokeWidth={1.4} />
      </button>
    </>
  );
}
