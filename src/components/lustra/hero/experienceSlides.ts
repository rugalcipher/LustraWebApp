/**
 * Centralized configuration for the Experience Hero carousel.
 *
 * Copy is the approved Lustra wording. Photography uses the project's editorial
 * Unsplash sources (each with an on-error fallback to a confirmed-good image so
 * a failed CDN request never breaks the hero). `focalDesktop`/`focalMobile`
 * give per-slide `object-position` so faces/subjects stay framed and uncovered
 * by the copy across breakpoints.
 */

export type SlideAlign = "center" | "left" | "right";

export interface ExperienceSlide {
  id: string;
  /** Small uppercase experience label. */
  label: string;
  headline: string;
  copy: string;
  /** Unsplash photo id (without the `photo-` prefix handled below). */
  photoId: string;
  /** Fallback photo id (confirmed to load) if the primary errors. */
  fallbackId: string;
  focalDesktop: string;
  focalMobile: string;
  align: SlideAlign;
}

const UNSPLASH = (id: string, w: number) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=${w > 1100 ? 80 : 68}`;

/** Responsive sources for a photo id: mobile (768) + desktop (1920). */
export function slideSrcSet(id: string): { src: string; srcSet: string; sizes: string } {
  return {
    src: UNSPLASH(id, 1920),
    srcSet: `${UNSPLASH(id, 768)} 768w, ${UNSPLASH(id, 1280)} 1280w, ${UNSPLASH(id, 1920)} 1920w`,
    sizes: "100vw",
  };
}

/** Small preview crop. */
export function previewSrc(id: string): string {
  return UNSPLASH(id, 480);
}

export const EXPERIENCE_SLIDES: ExperienceSlide[] = [
  {
    id: "brand",
    label: "The Brand",
    headline: "Desire, Reserved.",
    copy: "A private standard of introductions, curated around you.",
    photoId: "1524504388940-b1c1722653e1",
    fallbackId: "1524504388940-b1c1722653e1",
    focalDesktop: "60% 30%",
    focalMobile: "60% 25%",
    align: "center",
  },
  {
    id: "private-events",
    label: "Private Events",
    headline: "Make every entrance unforgettable.",
    copy: "Curated talent for private celebrations, premieres and distinguished occasions.",
    photoId: "1519741497674-611481863552",
    fallbackId: "1517841905240-472988babdf9",
    focalDesktop: "70% 35%",
    focalMobile: "65% 30%",
    align: "left",
  },
  {
    id: "travel",
    label: "Travel & Experiences",
    headline: "Wherever the occasion takes you.",
    copy: "Tailored social and travel experiences, arranged with care and discretion.",
    photoId: "1566073771259-6a8506099945",
    fallbackId: "1510812431401-41d2bd2722f3",
    focalDesktop: "50% 40%",
    focalMobile: "50% 40%",
    align: "right",
  },
  {
    id: "curated-talent",
    label: "Curated Talent",
    headline: "Exceptional presence. Personally selected.",
    copy: "Explore a private roster chosen for confidence, character and professionalism.",
    photoId: "1509631179647-0177331693ae",
    fallbackId: "1544005313-94ddf0286df2",
    focalDesktop: "50% 25%",
    focalMobile: "50% 20%",
    align: "left",
  },
  {
    id: "concierge",
    label: "Concierge Service",
    headline: "Every detail, handled privately.",
    copy: "From your first inquiry to the final arrangement, Lustra Management remains at your service.",
    photoId: "1551218808-94e220e084d2",
    fallbackId: "1487412720507-e7ab37603c6f",
    focalDesktop: "50% 45%",
    focalMobile: "55% 45%",
    align: "center",
  },
];

/** Autoplay interval (ms) — restrained luxury pacing (6–8s). */
export const AUTOPLAY_MS = 7000;
