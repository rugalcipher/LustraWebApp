import React, { useEffect, useRef, useState } from "react";
import { AUTH_BACKGROUNDS, type AuthBackgroundKey } from "./authBackgrounds";

interface Props {
  /** Which configured background to render. Login and register share one today. */
  variant?: AuthBackgroundKey;
}

/**
 * The atmospheric layer behind the auth pages.
 *
 * Layered editorial composition: a low-key figure sits right-of-centre on wide
 * screens (clear of the centred auth card) and centred-but-dimmer on phones, so
 * the page has mood without ever competing with the form. Readability is bought
 * with DARKNESS, not blur — a radial "spotlight" scrim pools noir directly
 * behind the card, a horizontal gradient keeps the left edge calm, and a bottom
 * vignette settles the composition. Nothing here is interactive or focusable,
 * and the image is decorative (empty alt, aria-hidden).
 *
 * With no master supplied yet the image simply doesn't render and the gradient
 * mood layer stands alone — the page is never broken by a missing asset.
 */
export default function AuthBackground({ variant = "default" }: Props) {
  const bg = AUTH_BACKGROUNDS[variant];
  const [loaded, setLoaded] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  // Cached-image race: reveal immediately if it completed before onLoad attached.
  useEffect(() => {
    const el = imgRef.current;
    if (el && el.complete && el.naturalWidth > 0) setLoaded(true);
  }, []);

  return (
    <div className="auth-bg pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {/* Marble noir base — also the whole treatment when no artwork exists. */}
      <div className="absolute inset-0 bg-noir lustra-marble" />

      {bg && (
        <picture>
          {/* Portrait viewports (phones, upright tablets) get the 9:16 master —
              the same query the CSS framing uses, so they never disagree. */}
          {bg.mobileSrcSet && (
            <source
              media="(max-width: 1023px) and (orientation: portrait)"
              type="image/webp"
              srcSet={bg.mobileSrcSet}
              sizes="100vw"
            />
          )}
          {bg.mobileFallbackSrc && (
            <source media="(max-width: 1023px) and (orientation: portrait)" srcSet={bg.mobileFallbackSrc} />
          )}
          <source type="image/webp" srcSet={bg.srcSet} sizes="100vw" />
          <img
            ref={imgRef}
            src={bg.fallbackSrc}
            alt={bg.alt}
            draggable={false}
            decoding="async"
            fetchPriority="low"
            onLoad={() => setLoaded(true)}
            style={
              {
                "--auth-pos-d": bg.posDesktop,
                "--auth-pos-t": bg.posTablet,
                "--auth-pos-m": bg.posMobile,
                "--auth-op-d": bg.intensityDesktop,
                "--auth-op-m": bg.intensityMobile,
              } as React.CSSProperties
            }
            className={`auth-bg-img absolute inset-0 h-full w-full object-cover transition-opacity duration-1000 ${
              loaded ? "opacity-100" : "opacity-0"
            }`}
          />
        </picture>
      )}

      {/* Spotlight scrim: deep noir pooled behind the card — centred on phones,
          shifted to the card's side on desktop. This is what guarantees form
          contrast, so no bright hotspot can ever land under a label or input. */}
      <div className="auth-bg-spot absolute inset-0" />
      {/* Horizontal wash: opens up over the figure, deepens under the form. */}
      <div className="auth-bg-side absolute inset-0" />
      {/* Settled base + soft top so the logo always has a calm field. */}
      <div className="absolute inset-0 bg-gradient-to-t from-noir via-noir/20 to-noir/45" />
      {/* A whisper of rose-gold so the noir never reads flat. */}
      <div className="auth-bg-tint absolute inset-0" />
    </div>
  );
}
