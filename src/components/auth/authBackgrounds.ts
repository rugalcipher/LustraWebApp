/**
 * Background mood imagery for the authentication pages (login · register ·
 * forgot · reset).
 *
 * ── SWAPPING IN THE FINAL ARTWORK ────────────────────────────────────────────
 * The image is NOT referenced by URL anywhere. Replace the two masters and
 * regenerate — nothing in this file or in any component needs to change:
 *
 *   1. Save the landscape artwork as  assets/other/login.webp        (~16:9)
 *   2. Save the portrait artwork as   assets/other/login-mobile.webp (~9:16)
 *   3. Run  `npm run images`
 *
 * The generator hashes the masters, rebuilds only what changed, deletes the
 * previous crops, and Vite emits content-hashed filenames — so a replaced image
 * can never be served from a stale browser or CDN cache. `npm run build` fails
 * if a master was replaced without regenerating.
 *
 * ── PER-PAGE ARTWORK (later, if wanted) ──────────────────────────────────────
 * Login, register, forgot- and reset-password deliberately share one image. To
 * give a page its own look, add `login-register.webp` + `-mobile` masters, add the
 * name to AUTH_NAMES in scripts/gen-marketing-images.py, add an entry below, and
 * pass `background="register"` from that page. The layout needs no changes.
 */

export interface AuthBackground {
  /** Landscape WebP srcset — used from 561px up. */
  srcSet: string;
  src: string;
  /** Portrait WebP srcset — used at 560px and below. */
  mobileSrcSet?: string;
  /** JPEG fallbacks for browsers without WebP. */
  fallbackSrc: string;
  mobileFallbackSrc?: string;
  /** object-position per breakpoint: keeps the figure clear of the auth card. */
  posDesktop: string;
  posTablet: string;
  posMobile: string;
  /** 0–1. How present the photograph is before the scrim is applied. */
  intensityDesktop: number;
  intensityMobile: number;
  /** Decorative background — the alt text is empty by design. */
  alt: string;
}

const WIDTHS = [1200, 1800, 2560];
const MOBILE_WIDTHS = [480, 720, 1080];

/** Resolved, content-hashed URLs for everything in src/assets/auth. */
const ASSETS = Object.fromEntries(
  Object.entries(
    import.meta.glob("../../assets/auth/*.{webp,jpg}", {
      eager: true,
      query: "?url",
      import: "default",
    }) as Record<string, string>
  ).map(([path, url]) => [path.split("/").pop() as string, url])
);

const has = (file: string) => file in ASSETS;

function build(name: string): AuthBackground | null {
  // No master yet → the page renders its gradient-only mood layer instead of a
  // broken image. This is what makes the system safe to ship before the art.
  if (!WIDTHS.every((w) => has(`${name}-${w}.webp`))) return null;

  const hasMobile = MOBILE_WIDTHS.every((w) => has(`${name}-mobile-${w}.webp`));
  return {
    src: ASSETS[`${name}-1800.webp`],
    srcSet: WIDTHS.map((w) => `${ASSETS[`${name}-${w}.webp`]} ${w}w`).join(", "),
    mobileSrcSet: hasMobile
      ? MOBILE_WIDTHS.map((w) => `${ASSETS[`${name}-mobile-${w}.webp`]} ${w}w`).join(", ")
      : undefined,
    fallbackSrc: ASSETS[`${name}.jpg`],
    mobileFallbackSrc: hasMobile ? ASSETS[`${name}-mobile.jpg`] : undefined,
    // She sits centre-left in the landscape master, so on wide screens the crop
    // is pulled left and the card moves to the right half — figure and form each
    // get their own side. On phones the portrait master is near-fully visible and
    // simply dimmed, so she reads as mood behind the centred card.
    posDesktop: "100% 42%",
    posTablet: "80% 42%",
    posMobile: "50% 38%",
    intensityDesktop: 0.92,
    intensityMobile: 0.72,
    alt: "",
  };
}

export type AuthBackgroundKey = "default";

export const AUTH_BACKGROUNDS: Record<AuthBackgroundKey, AuthBackground | null> = {
  default: build("login"),
};
