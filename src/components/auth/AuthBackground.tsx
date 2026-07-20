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
          {bg.mobileSrcSet && (
            <source media="(max-width: 560px)" type="image/webp" srcSet={bg.mobileSrcSet} sizes="100vw" />
          )}
          {bg.mobileFallbackSrc && <source media="(max-width: 560px)" srcSet={bg.mobileFallbackSrc} />}
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

      {/* Spotlight scrim: deep noir pooled behind the centred card, opening up
          toward the figure. This is what guarantees contrast for the form. */}
      <div className="auth-bg-spot absolute inset-0" />
      {/* Calm left edge + settled base. */}
      <div className="absolute inset-0 bg-gradient-to-r from-noir via-noir/45 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-t from-noir via-noir/25 to-noir/55" />
      {/* A whisper of rose-gold so the noir never reads flat. */}
      <div
        className="absolute inset-0 opacity-[0.07]"
        style={{ background: "radial-gradient(60% 50% at 78% 40%, #b8876b 0%, transparent 70%)" }}
      />
    </div>
  );
}
