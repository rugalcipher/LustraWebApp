/**
 * Centralized configuration for the Experience Hero carousel.
 *
 * Copy is the approved Lustra wording. Photography is the approved Lustra
 * campaign artwork: masters live in `assets/home/`, and the optimised
 * derivatives in `src/assets/home/` are imported through Vite's module graph,
 * so production filenames are CONTENT-HASHED — replacing a slide's art emits a
 * new URL that no browser or CDN can serve stale. Each slide has a MOBILE (portrait)
 * and WIDE (landscape) composition — the wide art is used from 768px up, the
 * mobile art below it, via <picture>. `focalDesktop`/`focalMobile` remain the
 * per-slide `object-position` knobs for fine framing.
 *
 * ── SWAPPING ONE SLIDE'S ARTWORK ────────────────────────────────────────────
 * Each slide names its own asset set, so a slide can be re-shot without
 * touching any other:
 *
 *   1. Save the new masters in `assets/home/` as
 *        <name>_wide.{webp,png}    (landscape, ~16:9 — desktop/tablet)
 *        <name>_mobile.{webp,png}  (portrait,  ~9:16 — phones)
 *      Overwriting the existing name is fine — the emitted filename is hashed
 *      from the CONTENT, so new art always gets a new URL.
 *   2. Only if you want a different name: `...slideArt(4, "home-4b")`.
 *   3. Run `npm run images` — the generator hashes every master, rebuilds only
 *      what changed, deletes the previous crops, and `npm run build` fails if a
 *      master was replaced without regenerating.
 *
 * Nothing else needs to change: crops, focal points, overlays, the <picture>
 * desktop/mobile switch and the preview strip all follow the name.
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

/** Every hero derivative, resolved to its hashed production URL by Vite. */
const ASSETS = Object.fromEntries(
  Object.entries(
    import.meta.glob("../../../assets/home/*.{webp,jpg}", {
      eager: true,
      query: "?url",
      import: "default",
    }) as Record<string, string>
  ).map(([path, url]) => [path.split("/").pop() as string, url])
);

function asset(file: string): string {
  const url = ASSETS[file];
  if (!url) {
    throw new Error(
      `[Lustra] Missing hero image "src/assets/home/${file}". Run \`npm run images\`.`
    );
  }
  return url;
}

const art = (name: string, kind: "wide" | "mobile"): SlideArt => ({
  srcSet: (kind === "wide" ? WIDE_WIDTHS : MOBILE_WIDTHS)
    .map((w) => `${asset(`${name}-${kind}-${w}.webp`)} ${w}w`)
    .join(", "),
  fallback: asset(`${name}-${kind}.jpg`),
});

/**
 * Resolve a slide's artwork. `name` defaults to the slide's position
 * (`home-1` … `home-5`); pass an explicit name to re-point ONE slide at a new
 * asset set without disturbing the others.
 */
const slideArt = (n: number, name = `home-${n}`) => ({
  mobile: art(name, "mobile"),
  wide: art(name, "wide"),
  preview: asset(`${name}-preview.webp`),
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
    id: "curated-talent",
    label: "Curated Talent",
    headline: "Presence that speaks before a word is said.",
    copy: "Discover a private roster selected for beauty, confidence, character and exceptional company.",
    ...slideArt(2),
    focalDesktop: "50% 50%",
    focalMobile: "50% 45%",
    align: "left",
  },
  {
    id: "private-experiences",
    label: "Private Experiences",
    headline: "An evening shaped entirely around you.",
    copy: "Thoughtfully arranged experiences, guided by discretion, chemistry and personal preference.",
    ...slideArt(3),
    focalDesktop: "50% 50%",
    focalMobile: "50% 45%",
    align: "right",
  },
  {
    id: "nationwide-access",
    label: "Nationwide Access",
    headline: "Wherever you are, Lustra is within reach.",
    copy: "From major cities to private destinations, access a diverse roster of Talent arranged with discretion, care and consistency.",
    ...slideArt(4),
    focalDesktop: "50% 50%",
    focalMobile: "50% 45%",
    align: "left",
  },
  {
    id: "concierge",
    label: "Private Concierge",
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

/**
 * Slide duration (ms) — the SINGLE source of truth for both the autoplay timer
 * and the indicator fill. They are the same value by construction: one rAF loop
 * derives the progress from this constant and advances the slide when it hits
 * 100%, so the animation and the transition cannot drift apart.
 */
export const AUTOPLAY_MS = 5000;
