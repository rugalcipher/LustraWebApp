import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { slideSrcSet, type ExperienceSlide } from "./experienceSlides";

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
 * One full-bleed cinematic slide: responsive image with per-slide focal point,
 * a slow ken-burns drift while active (disabled for reduced motion), and layered
 * gradients (side darkening + bottom vignette) that keep text readable WITHOUT a
 * single flat dark overlay — preserving the scene's detail. Crossfades via
 * opacity; graceful load (image fades in over noir).
 */
export default function ExperienceHeroSlide({ slide, active, mounted, priority, reducedMotion }: Props) {
  const [imgLoaded, setImgLoaded] = useState(false);
  const [errored, setErrored] = useState(false);
  const id = errored ? slide.fallbackId : slide.photoId;
  const { src, srcSet, sizes } = slideSrcSet(id);

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
        <img
          key={`${slide.id}-${active ? "on" : "off"}`}
          src={src}
          srcSet={srcSet}
          sizes={sizes}
          alt=""
          draggable={false}
          loading={priority ? "eager" : "lazy"}
          onLoad={() => setImgLoaded(true)}
          onError={() => (errored ? undefined : setErrored(true))}
          style={{ "--focal-m": slide.focalMobile, "--focal-d": slide.focalDesktop } as React.CSSProperties}
          className={cn(
            "hero-focal absolute inset-0 h-full w-full object-cover transition-opacity duration-700",
            imgLoaded ? "opacity-100" : "opacity-0",
            active && !reducedMotion && "animate-ken-burns"
          )}
        />
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
