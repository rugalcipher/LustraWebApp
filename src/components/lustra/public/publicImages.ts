/**
 * Centralized image configuration for the public marketing pages.
 *
 * ── HOW TO SWAP IN FINAL IMAGES ──────────────────────────────────────────────
 * Each entry is one `PublicImage`. To replace a placeholder with your own image:
 *   1. Drop the file in `public/` (e.g. `public/marketing/about.jpg`).
 *   2. Set `src: "/marketing/about.jpg"` and delete its `srcSet` (or supply your
 *      own responsive `srcSet`).
 *   3. Tune the per-breakpoint framing WITHOUT touching the layout:
 *        posDesktop / posTablet / posMobile  → CSS object-position (keep the
 *          subject in the visible LEFT band; smaller X pushes the subject left)
 *        widthDesktop / widthMobile          → how wide the image layer is
 *   4. Update `alt`.
 * Every page reads its image + framing from here — the layout never changes.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export interface PublicImage {
  src: string;
  srcSet?: string;
  sizes?: string;
  alt: string;
  /** Fallback used only by the placeholder <img> onError. */
  fallbackSrc?: string;
  /** object-position per breakpoint. */
  posDesktop: string;
  posTablet: string;
  posMobile: string;
  /** Width of the absolute image layer per breakpoint (overlaps the content). */
  widthDesktop: string;
  widthMobile: string;
}

const u = (id: string, w: number) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=${w > 1100 ? 80 : 68}`;

interface Framing {
  alt: string;
  posDesktop: string;
  posTablet: string;
  posMobile: string;
  widthDesktop?: string;
  widthMobile?: string;
  fallbackId?: string;
}

function placeholder(id: string, f: Framing): PublicImage {
  return {
    src: u(id, 1600),
    srcSet: `${u(id, 768)} 768w, ${u(id, 1200)} 1200w, ${u(id, 1600)} 1600w`,
    sizes: "(min-width: 1024px) 60vw, 60vw",
    alt: f.alt,
    fallbackSrc: u(f.fallbackId ?? "1517841905240-472988babdf9", 1600),
    posDesktop: f.posDesktop,
    posTablet: f.posTablet,
    posMobile: f.posMobile,
    widthDesktop: f.widthDesktop ?? "58%",
    widthMobile: f.widthMobile ?? "56%",
  };
}

export type PublicImageKey = "about" | "howItWorks" | "standards" | "membership" | "privacy" | "terms";

export const PUBLIC_IMAGES: Record<PublicImageKey, PublicImage> = {
  about: placeholder("1517841905240-472988babdf9", {
    alt: "An editorial portrait evoking the Lustra house",
    posDesktop: "32% 28%",
    posTablet: "38% 28%",
    posMobile: "44% 26%",
  }),
  howItWorks: placeholder("1502823403499-6ccfcf4fb453", {
    alt: "A poised figure in an elegant setting",
    posDesktop: "34% 30%",
    posTablet: "40% 30%",
    posMobile: "46% 30%",
    fallbackId: "1494790108377-be9c29b29330",
  }),
  standards: placeholder("1500648767791-00dcc994a43e", {
    alt: "A refined, discreet interior portrait",
    posDesktop: "34% 26%",
    posTablet: "