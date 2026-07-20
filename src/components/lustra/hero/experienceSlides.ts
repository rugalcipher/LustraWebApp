/**
 * Centralized configuration for the Experience Hero carousel.
 *
 * Copy is the approved Lustra wording. Photography is the approved Lustra
 * campaign artwork (source PNGs live in `assets/home/`, optimised derivatives
 * are served from `public/home/`). Each slide has a dedicated MOBILE (portrait)
 * and WIDE (landscape) composition — the wide art is used from 768px up, the
 * mobile art below it, via <picture>. `focalDesktop`/`focalMobile` remain the
 * per-slide `object-position` knobs for fine framing.
 *
 * To swap an image: drop the new file in `assets/home/`, re-run the derivative
 * generation (WebP 1672/1440/1080 wide · 900/640 mobile + a JPEG fallback and a
 * 480w preview), keeping the same `home-{n}-{kind}-{w}` naming.
 */

export type SlideAlign = "center" | "left" | "right";

/** Responsive sources for one composition (portrait or landscape). */
export interface SlideArt {
  /** WebP srcset (width-descriptor). */
  srcSet: string;
  /** JPEG fallback for browsers without WebP. */
  fallback: string;
}

export interface ExperienceSlide {
  id: string;
  /** Small uppercase experience label. */
  label: string;
  headline: string;
  copy: string;
  /** Portrait artwork, used below 768px. */
  mobile: SlideArt;
  /** Landscape artwork, used from 768px up. */
  wide: SlideArt;
  /** Small preview crop for the panel strip. */
  preview: string;
  focalDesktop: string;
  focalMobile: string;
  align: SlideAlign;
}

const WIDE_WIDTHS = [1080, 1440, 1672];
const MOBILE_WIDTHS = [640, 900];

const art = (n: number, kind: "wide" | "mobile"): SlideArt => ({
  srcSet: (kind === "wide" ? WIDE_WIDTHS : MOBILE_WIDTHS)
    .map((w) => `/home/home-${n}-${kind}-${w}.webp ${w}w`)
    .join(", "),
  fallback: `/home/home-${n}-${kind}.jpg`,
});

const slideArt = (n: number) => ({
  mobile: art(n, "mobile"),
  wide: art(n, "wide"),
  preview: `/home/home-${n}-preview.webp`,
});

export const EXPERIENCE_SLIDES: ExperienceSlide[] = [
  {
    id: "brand",
    label: "The Brand",
    headline: "Desire, Reserved.",
    copy: "A private standard of introductions, curated around you.",
    ...slideArt(1),
    focalDesktop: "50% 50%",
    focalMobile: "50% 45%",
    align: "center",
  },
  {
    id: "private-events",
    label: "Private Events",
    headline: "Make every entrance unforgettable.",
    copy: "Curated talent for private celebrations, premieres and distinguished occasions.",
    ...slideArt(2),
    focalDesktop: "50% 50%",
    focalMobile: "50% 45%",
    align: "left",
  },
  {
    id: "travel",
    label: "Travel & Experiences",
    headline: "Wherever the occasion takes you.",
    copy: "Tailored social and travel experiences, arranged with care and discretion.",
    ...slideArt(3),
    focalDesktop: "50% 50%",
    focalMobile: "50% 45%",
    align: "right",
  },
  {
    id: "curated-talent",
    label: "Curated Talent",
    headline: "Exceptional presence. Personally selected.",
    copy: "Explore a private roster chosen for confidence, character and professionalism.",
    ...slideArt(4),
    focalDesktop: "50% 50%",
    focalMobile: "50% 45%",
    align: "left",
  },
  {
    id: "concierge",
    label: "Concierge Service",
    headline: "Every detail, handled privately.",
    copy: "From your first inquiry to the final arrangement, Lustra Management remains at your service.",
    ...slideArt(5),
    focalDesktop: "50% 50%",
    focalMobile: "50% 45%",
    align: "center",
  },
];

/** The first slide's artwork — preloaded/eager so the hero paints immediately. */
export const FIRST_SLIDE = EXPERIENCE_SLIDES[0];

/** Autoplay interval (ms) — restrained luxury pacing (6–8s). */
export const AUTOPLAY_MS = 7000;
