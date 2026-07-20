/**
 * Centralized image configuration for the public marketing pages.
 *
 * All artwork is the approved Lustra photography. Masters live in
 * `assets/other/` (about · how-it-works · safety · talent); the optimised
 * responsive derivatives live in `src/assets/marketing/` and are imported
 * through Vite's module graph, so production filenames are CONTENT-HASHED
 * (`about-1600.<hash>.webp`). That is deliberate: replacing an image while
 * keeping a stable `/public` filename can leave browsers and CDNs serving the
 * old bytes. Never keep a second copy of these files under `public/`.
 *
 * ── HOW TO SWAP IN A NEW IMAGE ───────────────────────────────────────────────
 *   1. Drop the master in `assets/other/<name>.webp`.
 *   2. Regenerate the derivatives into `src/assets/marketing/` keeping the
 *      `<name>-<width>.webp` + `<name>.jpg` naming (see scripts/gen-marketing-images.py).
 *   3. Point the entry at it with `marketing("<name>", { … })`.
 *   4. Tune the per-breakpoint framing WITHOUT touching the layout:
 *        posDesktop / posTablet / posMobile  → CSS object-position (keep the
 *          subject in the visible LEFT band; smaller X pushes the subject left)
 *        widthDesktop / widthMobile          → how wide the image layer is
 *   5. Update `alt`.
 * Every page reads its image + framing from here — the layout never changes.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export interface PublicImage {
  src: string;
  srcSet?: string;
  sizes?: string;
  alt: string;
  /** Fallback used by the <img> onError (and by browsers without WebP). */
  fallbackSrc?: string;
  /** object-position per breakpoint. */
  posDesktop: string;
  posTablet: string;
  posMobile: string;
  /**
   * Clamped focal point for ≤560px. With `object-fit: cover` a percentage is
   * relative to the OVERFLOW, so as a phone gets narrower the visible window
   * shrinks and a fixed percentage walks its left edge to the right —
   * progressively pushing the subject off the left of the screen. Below 560px
   * we stop following the viewport and pin a focal point that keeps the subject
   * in frame. Falls back to `posMobile` when unset.
   */
  posNarrow?: string;
  /**
   * The strongest form of the clamp: an object-position expressed as a LENGTH in
   * `svh` instead of a percentage, used <=560px on portrait-ish viewports.
   *
   * The panel is `100svh` tall and these masters are landscape, so `cover`
   * always scales by height and the displayed image is exactly
   * `aspect x 100svh` wide. A length therefore anchors one fixed SOURCE point to
   * the left edge of the screen - independent of viewport width, so the subject
   * cannot drift off-screen no matter how narrow the phone is.
   * Value = -(sourceX x aspect x 100)svh.
   */
  anchorNarrow?: string;
  /**
   * Portrait (9:16) phone artwork, served below 560px via <picture>. Present
   * only when a `<name>-mobile.webp` master exists in assets/other — detected
   * automatically, never invented. The browser downloads exactly one of the two
   * sets, so the landscape file is not fetched on a phone.
   */
  mobileSrcSet?: string;
  mobileFallbackSrc?: string;
  /** Width of the absolute image layer per breakpoint (overlaps the content). */
  widthDesktop: string;
  widthMobile: string;
  /**
   * Optional per-page overrides for how far the content column is inset from the
   * left (i.e. how much horizontal room the copy/form gets). Omit to use the
   * shared defaults in index.css (42% / 43% / 45%). Form-heavy pages set these
   * so the fields get real width on small screens.
   */
  contentLeftNarrow?: string;
  contentLeftMobile?: string;
  contentLeftSmall?: string;
  contentLeftDesktop?: string;
  /**
   * Below `lg`, let the photograph run full-bleed BEHIND the content instead of
   * ending in noir. The overlapping part is covered by a strong (but never
   * opaque) rose-noir scrim + slight backdrop blur, so the image stays faintly
   * present under the form while the copy remains legible. Desktop unaffected.
   */
  mobileOverlap?: boolean;
}

/** Widths generated for each landscape master. */
const WIDTHS = [768, 1200, 1600, 2200];
/** Widths generated for each portrait (9:16) phone master. */
const MOBILE_WIDTHS = [480, 720, 1080];

/**
 * Every derivative, resolved to its hashed production URL by Vite. Keyed by
 * bare filename (e.g. "about-1600.webp"). Missing keys throw at module load,
 * so a forgotten regeneration fails loudly instead of rendering a stale image.
 */
const ASSETS = Object.fromEntries(
  Object.entries(
    import.meta.glob("../../../assets/marketing/*.{webp,jpg}", {
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
      `[Lustra] Missing marketing image "src/assets/marketing/${file}". Regenerate the derivatives from assets/other/.`
    );
  }
  return url;
}

/** Public URL of one approved marketing image (largest WebP). */
export function marketingAsset(name: string, width = 1600): string {
  return asset(`${name}-${width}.webp`);
}

/**
 * Aspect ratio (width / height) of each master. Needed to convert a "pin this
 * source point to the left edge" instruction into a CSS length.
 */
const MASTER_ASPECT: Record<string, number> = {
  about: 5504 / 3040,
  "how-it-works": 5504 / 3040,
  safety: 2848 / 1600,
  talent: 5504 / 3040,
};

/**
 * SHARED CLAMPED-FOCAL STRATEGY (the fix for "the subject slides off-screen").
 *
 * Below 560px every public marketing page pins a chosen SOURCE point to the left
 * edge of the screen instead of following the viewport. The panel is `100svh`
 * tall and every master is landscape, so `object-fit: cover` always scales by
 * height and the displayed image is exactly `aspect x 100svh` wide — which makes
 * the required offset a pure function of the source point:
 *
 *     object-position-x = -(sourceX * aspect * 100) svh
 *
 * Because the value never references the viewport WIDTH, the crop window's left
 * edge is identical at 560px and at 320px: the subject freezes. Each page only
 * configures `anchorNarrowAt` — the source x (0..1) it wants pinned — so there
 * is no per-page CSS arithmetic anywhere.
 */
function anchorLength(name: string, sourceX: number): string {
  const aspect = MASTER_ASPECT[name] ?? 16 / 9;
  return `${(-(sourceX * aspect * 100)).toFixed(1)}svh center`;
}

interface Framing {
  alt: string;
  posDesktop: string;
  posTablet: string;
  posMobile: string;
  posNarrow?: string;
  /** Source x (0..1) pinned to the left edge of the screen below 560px. */
  anchorNarrowAt?: number;
  widthDesktop?: string;
  widthMobile?: string;
  contentLeftNarrow?: string;
  contentLeftMobile?: string;
  contentLeftSmall?: string;
  contentLeftDesktop?: string;
  mobileOverlap?: boolean;
}

/** Build a PublicImage from an approved asset in `src/assets/marketing/`. */
function marketing(name: string, f: Framing): PublicImage {
  // Only wire a portrait variant that actually exists in the module graph.
  const hasMobile = MOBILE_WIDTHS.every((w) => `${name}-mobile-${w}.webp` in ASSETS);
  return {
    src: asset(`${name}-1600.webp`),
    srcSet: WIDTHS.map((w) => `${asset(`${name}-${w}.webp`)} ${w}w`).join(", "),
    // The layer is ~72vw wide but FULL height, and these masters are landscape —
    // `object-fit: cover` therefore scales by height, so the source width the
    // browser actually needs is far larger than the layer's CSS width. These
    // `sizes` hints account for that (otherwise a tall phone panel picks the
    // 768w file and renders visibly soft).
    sizes: "(max-width: 767px) 400vw, 120vw",
    alt: f.alt,
    fallbackSrc: asset(`${name}.jpg`),
    posDesktop: f.posDesktop,
    posTablet: f.posTablet,
    posMobile: f.posMobile,
    posNarrow: f.posNarrow,
    // The svh anchor exists to stop a LANDSCAPE master drifting off a narrow
    // screen. When a portrait phone master is supplied there is almost no
    // horizontal crop left to drift, and the landscape aspect in the formula
    // would be wrong — so the anchor is deliberately dropped in that case and
    // the fixed `posNarrow` focal point takes over. Delete the portrait master
    // and the anchor comes back automatically.
    anchorNarrow:
      hasMobile || f.anchorNarrowAt === undefined ? undefined : anchorLength(name, f.anchorNarrowAt),
    mobileSrcSet: hasMobile
      ? MOBILE_WIDTHS.map((w) => `${asset(`${name}-mobile-${w}.webp`)} ${w}w`).join(", ")
      : undefined,
    mobileFallbackSrc: hasMobile ? asset(`${name}-mobile.jpg`) : undefined,
    widthDesktop: f.widthDesktop ?? "54%",
    widthMobile: f.widthMobile ?? "53%",
    contentLeftNarrow: f.contentLeftNarrow,
    contentLeftMobile: f.contentLeftMobile,
    contentLeftSmall: f.contentLeftSmall,
    contentLeftDesktop: f.contentLeftDesktop,
    mobileOverlap: f.mobileOverlap,
  };
}

export type PublicImageKey =
  | "about"
  | "howItWorks"
  | "standards"
  | "membership"
  | "forTalent"
  | "privacy"
  | "terms";

export const PUBLIC_IMAGES: Record<PublicImageKey, PublicImage> = {
  /** /about */
  about: marketing("about", {
    alt: "An evening portrait in a private hotel lounge",
    // Subject: face x 0.58-0.66, torso 0.50-0.72 (she reclines to the left).
    posDesktop: "76% 40%",
    posTablet: "92% 40%",
    posMobile: "89% 40%",
    // Portrait master: subject slightly right of centre -> pull her left.
    posNarrow: "60% 45%",
    // Landscape-only fallback (ignored while the portrait master exists).
    anchorNarrowAt: 0.582,
    widthMobile: "26%",
    contentLeftNarrow: "30%",
    contentLeftMobile: "33%",
    contentLeftSmall: "36%",
    mobileOverlap: true,
  }),
  /** /how-it-works */
  howItWorks: marketing("how-it-works", {
    alt: "A poised figure in a low-lit private suite",
    // Subject: face x 0.19-0.28 (well left of centre), body 0.05-0.85.
    posDesktop: "10% 42%",
    posTablet: "26% 42%",
    posMobile: "30% 42%",
    // Portrait master: subject centred.
    posNarrow: "50% 45%",
    anchorNarrowAt: 0.197,
    widthMobile: "26%",
    contentLeftNarrow: "30%",
    contentLeftMobile: "33%",
    contentLeftSmall: "36%",
    mobileOverlap: true,
  }),
  /** /safety — the Community Standards / Safety page */
  standards: marketing("safety", {
    alt: "A calm, direct portrait in a private setting",
    // Subject: face x 0.40-0.58, centred and close to camera.
    posDesktop: "46% 36%",
    posTablet: "66% 35%",
    posMobile: "65% 35%",
    // Portrait master: subject stands right of centre.
    posNarrow: "50% 45%",
    // A close-up: her face alone spans ~70% of the crop, so pin its left side.
    anchorNarrowAt: 0.42,
    widthMobile: "26%",
    contentLeftNarrow: "30%",
    contentLeftMobile: "33%",
    contentLeftSmall: "36%",
    mobileOverlap: true,
  }),
  /**
   * /for-talent — the public Talent application.
   *
   * This page is a FORM. Below `lg` the photograph runs full-bleed behind the
   * whole composition (`mobileOverlap`): the left ~16–20% stays clear, then a
   * progressive scrim darkens it to ~0.93 beneath the form, which takes the
   * remaining ~80%. The image is never removed — only dimmed. On very narrow
   * phones (≤380px) the clear band narrows further so the fields stay usable.
   * The desktop composition is unchanged.
   */
  forTalent: marketing("talent", {
    alt: "An editorial full-length talent portrait at night",
    posDesktop: "52% 44%",
    // Full-bleed below `lg` crops a narrow window out of a landscape master, so
    // the focal X is pushed right to bring the subject into the CLEAR left band
    // rather than hiding her under the form.
    posTablet: "80% 42%",
    posMobile: "66% 42%",
    // ≤560px: CLAMPED. She occupies x 0.44–0.61 of the master (face 0.50–0.58).
    // `anchorNarrow` pins source x = 0.49 to the left edge of the screen at every
    // width: -(0.49 × 1.8105 × 100) = -88.7svh. Her face therefore always lands
    // at the edge of the clear strip and the rest of her fills the dimmed area —
    // no background is wasted and nothing drifts. `posNarrow` is the percentage
    // fallback used on short/landscape viewports where cover scales by width.
    anchorNarrowAt: 0.49,
    // Portrait master: she stands right of centre -> pull her left.
    posNarrow: "50% 45%",
    widthMobile: "16%",
    contentLeftNarrow: "17%",
    contentLeftMobile: "20%",
    contentLeftSmall: "25%",
    mobileOverlap: true,
  }),
  /** /request-access — the client access request (shares the house `about` artwork) */
  membership: marketing("about", {
    alt: "An evening portrait in a private hotel lounge",
    posDesktop: "76% 40%",
    posTablet: "92% 40%",
    posMobile: "89% 40%",
    // Portrait master: subject slightly right of centre -> pull her left.
    posNarrow: "60% 45%",
    anchorNarrowAt: 0.582,
    widthMobile: "26%",
    contentLeftNarrow: "30%",
    contentLeftMobile: "33%",
    contentLeftSmall: "36%",
    mobileOverlap: true,
  }),
  /** /privacy + /terms — the quieter legal pages (share the `safety` artwork) */
  privacy: marketing("safety", {
    alt: "A quiet, low-lit private interior",
    posDesktop: "46% 38%",
    posTablet: "66% 35%",
    posMobile: "65% 35%",
    posNarrow: "50% 45%",
    anchorNarrowAt: 0.42,
    widthMobile: "26%",
    contentLeftNarrow: "30%",
    contentLeftMobile: "33%",
    contentLeftSmall: "36%",
    mobileOverlap: true,
  }),
  terms: marketing("safety", {
    alt: "A quiet, low-lit private interior",
    posDesktop: "46% 38%",
    posTablet: "66% 35%",
    posMobile: "65% 35%",
    posNarrow: "50% 45%",
    anchorNarrowAt: 0.42,
    widthMobile: "26%",
    contentLeftNarrow: "30%",
    contentLeftMobile: "33%",
    contentLeftSmall: "36%",
    mobileOverlap: true,
  }),
};
