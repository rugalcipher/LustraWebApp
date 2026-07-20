import React, { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import type { PublicImage } from "./publicImages";

/**
 * The cinematic image element for the marketing layout. Fills its (absolute)
 * image layer, framed by per-breakpoint `object-position` (via the `.mkt-img`
 * CSS vars). Adds only atmospheric top/bottom vignettes — the HORIZONTAL blend
 * into the content is owned by PublicMarketingLayout so the image can continue
 * underneath the text gradient with no seam. Graceful load + onError fallback.
 *
 * Art direction: when a page supplies a portrait (9:16) phone master, a
 * <picture> serves it below 560px — the same breakpoint as the frozen mobile
 * focal point, so source and framing switch together. The browser picks exactly
 * one candidate, so a phone never downloads the landscape file. On error both
 * sources are dropped and the JPEG fallback is used directly.
 */
export default function MarketingImage({ image, eager }: { image: PublicImage; eager?: boolean }) {
  const [errored, setErrored] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const src = errored ? image.fallbackSrc ?? image.src : image.src;

  // Handle the cached-image race: if the image completed before onLoad attached,
  // reveal it on mount so it never stays stuck at opacity 0.
  useEffect(() => {
    const el = imgRef.current;
    if (el && el.complete && el.naturalWidth > 0) setLoaded(true);
  }, [src]);

  return (
    <div className="absolute inset-0 overflow-hidden bg-deep-black" aria-hidden="true">
      <picture>
        {!errored && image.mobileSrcSet && (
          <source media="(max-width: 560px)" type="image/webp" srcSet={image.mobileSrcSet} sizes="100vw" />
        )}
        {!errored && image.mobileFallbackSrc && (
          <source media="(max-width: 560px)" srcSet={image.mobileFallbackSrc} />
        )}
        <img
          ref={imgRef}
          src={src}
          srcSet={errored ? undefined : image.srcSet}
          sizes={image.sizes}
          alt=""
          draggable={false}
          loading={eager ? "eager" : "lazy"}
          onLoad={() => setLoaded(true)}
          onError={() => !errored && setErrored(true)}
          style={
            {
              "--mkt-pos-d": image.posDesktop,
              "--mkt-pos-t": image.posTablet,
              "--mkt-pos-m": image.posMobile,
              "--mkt-pos-xs": image.posNarrow,
              "--mkt-anchor-xs": image.anchorNarrow,
            } as React.CSSProperties
          }
          className={cn(
            "mkt-img absolute inset-0 h-full w-full object-cover transition-opacity duration-700",
            loaded ? "opacity-100" : "opacity-0"
          )}
        />
      </picture>
      {/* Atmospheric top + bottom fades (into the header and page foot) */}
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-noir/45 via-transparent to-noir/85" />
    </div>
  );
}
