import React, { useState } from "react";
import { cn } from "@/lib/utils";
import type { PublicImage } from "./publicImages";

interface Props {
  image: PublicImage;
  /** Which edge dissolves into the page noir (no hard split line). */
  fade: "right" | "bottom";
  /** Eager-load (above the fold). */
  eager?: boolean;
  className?: string;
}

/**
 * A cinematic, edge-to-edge image panel that blends into the page rather than
 * sitting in a visible box. The image fades into noir on its content-facing edge
 * (right on desktop side panels, bottom on mobile bands), with layered vignettes
 * for atmosphere and text contrast — never a single flat overlay. Per-image
 * responsive `object-position` keeps the subject framed. Falls back gracefully
 * if the placeholder source fails.
 */
export default function MarketingImage({ image, fade, eager, className }: Props) {
  const [errored, setErrored] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const src = errored ? image.fallbackSrc ?? image.src : image.src;

  return (
    <div className={cn("absolute inset-0 overflow-hidden bg-deep-black", className)} aria-hidden="true">
      <img
        src={src}
        srcSet={errored ? undefined : image.srcSet}
        sizes={image.sizes}
        alt=""
        draggable={false}
        loading={eager ? "eager" : "lazy"}
        onLoad={() => setLoaded(true)}
        onError={() => !errored && setErrored(true)}
        style={{ "--focal-m": image.focalMobile, "--focal-d": image.focalDesktop } as React.CSSProperties}
        className={cn(
          "hero-focal absolute inset-0 h-full w-full object-cover transition-opacity duration-700",
          loaded ? "opacity-100" : "opacity-0"
        )}
      />

      {/* Atmospheric darkening — keeps detail, adds mood */}
      <div className="absolute inset-0 bg-gradient-to-t from-noir/70 via-noir/15 to-noir/35 pointer-events-none" />

      {/* Dissolve into the page on the content-facing edge — reaches full noir
          well before the panel edge so there is no hard split line. */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            fade === "right"
              ? "linear-gradient(90deg, rgba(11,11,13,0) 0%, rgba(11,11,13,0) 40%, rgba(11,11,13,0.85) 74%, #0B0B0D 92%)"
              : "linear-gradient(180deg, rgba(11,11,13,0) 0%, rgba(11,11,13,0) 45%, rgba(11,11,13,0.9) 82%, #0B0B0D 100%)",
        }}
      />

      {/* Soft corner vignette */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: "radial-gradient(115% 90% at 40% 40%, transparent 55%, rgba(11,11,13,0.5) 100%)" }}
      />
    </div>
  );
}
