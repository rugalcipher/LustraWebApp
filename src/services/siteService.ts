import { api } from "@/api/client";

/**
 * Public site content — `/api/v1/public/site/home`, `/public/announcements`.
 *
 * ## Why this is read-only and unwired
 *
 * The hero carousel (`components/lustra/hero/*`) is approved, art-directed campaign work
 * owned by another contributor and under active edit. This module makes the CMS data
 * available in exactly the shape those components already consume, but deliberately does
 * NOT replace `experienceSlides.ts`. Swapping the hero's data source is a visual change on
 * the site's most important view and belongs to whoever owns that design.
 *
 * `toExperienceSlides` below is the whole handoff: when the hero is ready to adopt the
 * CMS, it maps a server response onto the existing `ExperienceSlide` shape, and
 * `EXPERIENCE_SLIDES` becomes the fallback for an empty response rather than the source.
 */

/** Mirrors the backend `HeroArtDto`. */
export interface HeroArtDto {
  srcSet: string;
  fallbackUrl: string;
}

/** Mirrors the backend `HeroSlideDto`. */
export interface HeroSlideDto {
  key: string;
  label: string;
  headline: string;
  copy: string;
  mobile: HeroArtDto;
  wide: HeroArtDto;
  previewUrl: string;
  focalDesktop: string;
  focalMobile: string;
  align: string;
}

/** Mirrors the backend `PublicAnnouncementDto`. */
export interface PublicAnnouncementDto {
  id: string;
  title: string;
  body: string;
  endsAtUtc: string | null;
}

/** Mirrors the backend `HomePageDto`. */
export interface HomePageDto {
  heroSlides: HeroSlideDto[];
  announcements: PublicAnnouncementDto[];
}

/**
 * The landing page payload. Anonymous — this is the first request a visitor makes and
 * must never require a token.
 */
export function getHomePage(signal?: AbortSignal): Promise<HomePageDto> {
  return api.get<HomePageDto>("/public/site/home", { anonymous: true, signal });
}

export function getAnnouncements(signal?: AbortSignal): Promise<PublicAnnouncementDto[]> {
  return api.get<PublicAnnouncementDto[]>("/public/announcements", { anonymous: true, signal });
}

/** The `align` values the hero understands, lowercased from the server's PascalCase. */
export type SlideAlign = "center" | "left" | "right";

function toAlign(value: string): SlideAlign {
  const lowered = value?.toLowerCase();
  return lowered === "left" || lowered === "right" ? lowered : "center";
}

/**
 * Map CMS slides onto the shape `components/lustra/hero` already renders.
 *
 * Returns an empty array for an empty response — NOT a fabricated slide. The caller is
 * expected to fall back to the shipped `EXPERIENCE_SLIDES`, so an empty or unreachable CMS
 * degrades to the approved design rather than to a blank hero.
 */
export function toExperienceSlides(slides: readonly HeroSlideDto[] | undefined | null) {
  if (!slides?.length) return [];

  return slides.map((slide) => ({
    id: slide.key,
    label: slide.label,
    headline: slide.headline,
    copy: slide.copy,
    mobile: { srcSet: slide.mobile.srcSet, fallback: slide.mobile.fallbackUrl },
    wide: { srcSet: slide.wide.srcSet, fallback: slide.wide.fallbackUrl },
    preview: slide.previewUrl,
    // The server defaults these, but a slide authored before the columns existed could
    // still arrive blank — fall back to centre framing rather than emitting invalid CSS.
    focalDesktop: slide.focalDesktop || "50% 50%",
    focalMobile: slide.focalMobile || "50% 50%",
    align: toAlign(slide.align),
  }));
}
