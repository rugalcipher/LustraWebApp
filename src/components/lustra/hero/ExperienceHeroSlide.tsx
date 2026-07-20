import React, { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import type { ExperienceSlide } from "./experienceSlides";

interface Props {
  slide: ExperienceSlide;
  active: boolean;
  /** Whether this slide's image should be mounted (progressive loading). */
  mounted: boolean;
  /** Eager-load (first hero image) vs lazy. */
  priority: boolean;
  reducedMotion: boolean;
}

/**
 * One full-bleed cinematic slide: the approved Lustra artwork served through a
 * <picture> — the portrait `mobile` composition below 768px, the landscape
 * `wide` composition from 768px up — each as a WebP srcset with a JPEG
 * fallback. Per-slide focal point, a slow ken-burns drift while active
 * (disabled for reduced motion), and layered gradients (side darkening + bottom
 * vignette) that keep text readable WITHOUT a single flat dark overlay —
 * preserving the scene's detail. Crossfades via opacity; graceful load (image
 * fades in over noir).
 */
export default function ExperienceHeroSlide({ slide, active, mounted, priority, reducedMotion }: Props) {
  const [imgLoaded, setImgLoaded] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  // Cached-image race: if the image completed before onLoad attached, reveal it.
  useEffect(() => {
    const el = imgRef.current;
    if (el && el.complete && el.naturalWidth > 0) setImgLoaded(true);
  }, [mounted]);

  return (
    <div
      className={cn(
        "absolute inset-0 transition-opacity duration-[1200ms] ease-out will-change-[opacity]",
        active ? "opacity-100" : "opacity-0"
      )}
      aria-hidden={!active}
    >
      {/* Noir base (graceful loading + marble texture) */}
      <div className="absolute inset-0 bg-deep-black lustra-marble" />

      {mounted && (
        <picture>
          {/* Tablet / laptop / desktop — landscape composition */}
          <source media="(min-width: 768px)" type="image/webp" srcSet={slide.wide.srcSet} sizes="100vw" />
          <source media="(min-width: 768px)" srcSet={slide.wide.fallback} />
          {/* Mobile — portrait composition */}
          <source type="image/webp" srcSet={slide.mobile.srcSet} sizes="100vw" />
          <img
            ref={imgRef}
            src={slide.mobile.fallback}
            alt=""
            draggable={false}
            loading={priority ? "eager" : "lazy"}
            fetchPriority={priority ? "high" : undefined}
            decoding="async"
            onLoad={() => setImgLoaded(true)}
            style={{ "--focal-m": slide.focalMobile, "--focal-d": slide.focalDesktop } as React.CSSProperties}
            className={cn(
              "hero-focal absolute inset-0 h-full w-full object-cover transition-opacity duration-700",
              imgLoaded ? "opacity-100" : "opacity-0",
              active && !reducedMotion && "animate-ken-burns"
            )}
          />
        </picture>
      )}

      {/* Side darkening — keeps the centre of the scene visible */}
      <div className="absolute inset-0 bg-gradient-to-r from-noir/85 via-noir/5 to-noir/75 pointer-events-none" />
      {/* Bottom vignette for copy contrast + soft top */}
      <div className="absolute inset-0 bg-gradient-to-t from-noir via-noir/45 to-noir/15 pointer-events-none" />
      {/* Corner vignette */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: "radial-gradient(120% 80% at 50% 40%, transparent 55%, rgba(11,11,13,0.55) 100%)" }}
      />
    </div>
  );
}
