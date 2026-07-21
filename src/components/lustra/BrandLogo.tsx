import React from "react";
import { cn } from "@/lib/utils";

/**
 * Approved Lustra brand-logo components.
 *
 * These wrap the canonical PNG assets (generated from the supplied masters) so
 * pages never scatter raw <img> tags. They intentionally do NOT expose width +
 * height props — callers size via className (e.g. `h-7 w-auto`) and the image
 * keeps its intrinsic aspect ratio with `object-contain`, so the logo can never
 * be stretched or distorted. Paths are stable, lowercase public URLs (safe on
 * case-sensitive Linux hosting).
 *
 * Decorative vs primary: use these for primary brand placements (headers, nav,
 * auth, ceremonial). The CSS/SVG Monogram components remain for decorative use
 * (watermarks, loaders, VIP lock).
 */

interface BrandLogoProps {
  className?: string;
  /** Accessible label; ignored when `decorative`. */
  alt?: string;
  /** Mark as decorative (empty alt + aria-hidden) — use when a nearby text label exists. */
  decorative?: boolean;
  /** Eager-load + high priority for above-the-fold branding; else lazy. */
  eager?: boolean;
}

/** Intrinsic pixel sizes of the runtime assets (for aspect-ratio / no layout shift). */
const INTRINSIC = {
  vertical: { w: 785, h: 1000 },
  horizontal: { w: 1000, h: 276 },
  appIcon: { w: 512, h: 512 },
} as const;

function BrandImg({
  src,
  intrinsic,
  className,
  alt = "Lustra",
  decorative = false,
  eager = false,
}: BrandLogoProps & { src: string; intrinsic: { w: number; h: number } }) {
  return (
    <img
      src={src}
      width={intrinsic.w}
      height={intrinsic.h}
      alt={decorative ? "" : alt}
      aria-hidden={decorative || undefined}
      loading={eager ? "eager" : "lazy"}
      draggable={false}
      // Caller controls the box via className (e.g. `h-7 w-auto`); intrinsic
      // width/height preserve aspect ratio (no layout shift, no distortion).
      className={cn("object-contain select-none max-w-full", className)}
    />
  );
}

/** Stacked monogram + wordmark + tagline. For auth / centred / ceremonial brand moments. */
export function LustraVerticalLogo(props: BrandLogoProps) {
  return (
    <BrandImg
      {...props}
      src="/lustra-logo-vertical.png"
      intrinsic={INTRINSIC.vertical}
      alt={props.alt ?? "Lustra — Desire, Reserved."}
    />
  );
}

/** Horizontal lockup — monogram on the left, then wordmark. For sidebars, headers, nav.
 *
 *  The asset is `public/Logo_x.png` — CAPITAL L, which is how it is recorded in git and
 *  therefore how it is checked out on Vercel. This previously read `/logo_x.png` and
 *  404'd in every deployed environment while working perfectly on Windows, whose
 *  filesystem is case-insensitive (`core.ignorecase=true`), so `ls` shows a lowercase
 *  name that does not exist on Linux. Match git's casing exactly; do not "tidy" it. */
export function LustraHorizontalLogo(props: BrandLogoProps) {
  return (
    <BrandImg
      {...props}
      src="/Logo_x.png"
      intrinsic={INTRINSIC.horizontal}
      alt={props.alt ?? "Lustra"}
    />
  );
}

/** The canonical app icon (rounded tile). For in-app brand tiles / installed-app contexts. */
export function LustraAppIcon(props: BrandLogoProps) {
  return (
    <BrandImg {...props} src="/lustra-app-icon.png" intrinsic={INTRINSIC.appIcon} alt={props.alt ?? "Lustra"} />
  );
}
