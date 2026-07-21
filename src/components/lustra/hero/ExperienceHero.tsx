import React, { useEffect, useRef, useState } from "react";
import { Crown, ShieldCheck, Clock, Gem } from "lucide-react";
import Monogram from "@/lib/lustra/Monogram";
import PublicHeader from "@/components/lustra/public/PublicHeader";
import { EXPERIENCE_SLIDES, AUTOPLAY_MS } from "./experienceSlides";
import { useExperienceHero } from "./useExperienceHero";
import ExperienceHeroSlide from "./ExperienceHeroSlide";
import ExperienceHeroContent from "./ExperienceHeroContent";
import ExperienceHeroProgress from "./ExperienceHeroProgress";
import ExperienceHeroPreviews from "./ExperienceHeroPreviews";

const BENEFITS = [
  { icon: Crown, title: "Curated Excellence", copy: "Carefully selected talent for exceptional experiences." },
  { icon: ShieldCheck, title: "Private & Secure", copy: "Discretion is our standard. Privacy is our promise." },
  { icon: Clock, title: "Tailored Service", copy: "Personalised support from inquiry to completion." },
  { icon: Gem, title: "Worldwide Access", copy: "Available in major cities and luxury destinations." },
];

const SWIPE_THRESHOLD = 45;

/**
 * The Lustra Experience Hero — a restrained luxury campaign-film carousel that
 * fills the first viewport. Preserves the noir/ivory/rose-gold identity and the
 * diamond monogram; autoplay with crossfade + slow ken-burns, manual controls,
 * swipe, keyboard, pause on hover/focus, reduced-motion fallback, and
 * screen-reader announcements. Slide data lives in experienceSlides.ts.
 */
export default function ExperienceHero() {
  const { index, count, progress, reducedMotion, loaded, setPaused, next, prev, goTo } = useExperienceHero(
    EXPERIENCE_SLIDES.length,
    AUTOPLAY_MS
  );
  const sectionRef = useRef<HTMLElement>(null);
  const [hover, setHover] = useState(false);
  const [focusWithin, setFocusWithin] = useState(false);
  const touchStartX = useRef<number | null>(null);

  // Sync hover/focus into the autoplay pause state.
  useEffect(() => {
    setPaused(hover || focusWithin);
  }, [hover, focusWithin, setPaused]);

  // Keyboard arrows — only while the hero is in view (don't hijack when scrolled away).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = sectionRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const inView = r.bottom > 80 && r.top < window.innerHeight - 80;
      if (!inView) return;
      const tag = (document.activeElement?.tagName || "").toLowerCase();
      if (tag === "input" || tag === "textarea") return;
      if (e.key === "ArrowLeft") prev();
      else if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, prev]);

  const active = EXPERIENCE_SLIDES[index];

  return (
    <>
      <section
        ref={sectionRef}
        aria-roledescription="carousel"
        aria-label="Lustra experiences"
        className="relative min-h-screen overflow-hidden isolate bg-noir"
        style={{ minHeight: "100dvh" }}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        onFocusCapture={() => setFocusWithin(true)}
        onBlurCapture={(e) => {
          if (!sectionRef.current?.contains(e.relatedTarget as Node)) setFocusWithin(false);
        }}
        onTouchStart={(e) => (touchStartX.current = e.touches[0]?.clientX ?? null)}
        onTouchEnd={(e) => {
          if (touchStartX.current == null) return;
          const dx = (e.changedTouches[0]?.clientX ?? 0) - touchStartX.current;
          if (Math.abs(dx) > SWIPE_THRESHOLD) (dx < 0 ? next : prev)();
          touchStartX.current = null;
        }}
      >
        {/* Slides */}
        <div className="absolute inset-0 z-0">
          {EXPERIENCE_SLIDES.map((s, i) => (
            <ExperienceHeroSlide
              key={s.id}
              slide={s}
              active={i === index}
              mounted={loaded.has(i)}
              priority={i === 0}
              reducedMotion={reducedMotion}
            />
          ))}
        </div>

        {/* Low-opacity monogram watermark (decorative), right side */}
        <div className="pointer-events-none absolute right-[-4%] top-1/2 -translate-y-1/2 z-10 hidden lg:block opacity-[0.06]">
          <Monogram size={520} />
        </div>

        {/* Foreground */}
        <div className="absolute inset-0 z-20 flex flex-col">
          {/* Shared public header (transparent over the hero image) */}
          <PublicHeader variant="transparent" sticky={false} />

          {/* Content */}
          <div className="relative flex-1 min-h-0">
            <ExperienceHeroContent slide={active} />
          </div>

          {/* Bottom bar: progress + previews */}
          <div className="px-6 sm:px-10 lg:px-16 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] space-y-3 lg:space-y-4">
            <ExperienceHeroProgress index={index} count={count} progress={progress} onSelect={goTo} reducedMotion={reducedMotion} />
            <ExperienceHeroPreviews slides={EXPERIENCE_SLIDES} index={index} progress={progress} onSelect={goTo} />
          </div>
        </div>

        {/* Screen-reader announcement */}
        <div className="sr-only" aria-live="polite" role="status">
          Slide {index + 1} of {count}: {active.label} — {active.headline}
        </div>
      </section>

      {/* Brand-benefit strip — transition into the next section (below the fold on mobile) */}
      <div className="border-t border-white/[0.05] bg-deep-black/80">
        <div className="max-w-6xl mx-auto px-6 sm:px-10 lg:px-16 py-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 lg:gap-8">
          {BENEFITS.map(({ icon: Icon, title, copy }) => (
            <div key={title} className="flex items-start gap-3">
              <Icon className="w-5 h-5 text-rose-gold/80 shrink-0 mt-0.5" strokeWidth={1.2} />
              <div>
                <p className="font-body text-[0.6rem] tracking-luxe uppercase text-ivory">{title}</p>
                <p className="font-body text-[0.65rem] text-muted-grey mt-1 leading-relaxed">{copy}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
