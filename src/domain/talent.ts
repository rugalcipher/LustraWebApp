import { resolveMediaUrl } from "@/services/mediaUrl";
import type {
  PublicTalentDetailDto,
  TalentListItemDto,
  PublicRateDto,
  PublicReviewDto,
  PublicImageDto,
} from "@/services/discoveryService";

/**
 * The canonical TALENT VIEW MODEL.
 *
 * Visual components must never bind to raw API DTOs: the wire shape belongs to the
 * backend and will change. Everything the UI renders goes through this adapter, so a
 * DTO change is absorbed in one file instead of rippling through twenty components.
 *
 * The shape intentionally matches what the Lustra design already renders, so the
 * approved immersive Discover experience keeps working against real data.
 *
 * IDENTITY: `id` is the backend SLUG. It is the public, stable, URL-safe identifier —
 * the frontend never sees or routes on internal profile Guids.
 */

export type AvailabilityLabel =
  | "Available"
  | "Limited Availability"
  | "By Request"
  | "Travelling"
  | "Temporarily Unavailable";

export interface TalentRate {
  label: string;
  unit: string;
  amount: number;
  currency: string;
  notes: string | null;
}

export interface TalentReview {
  id: string;
  rating: number;
  title: string | null;
  body: string;
  response: string | null;
  publishedAtUtc: string | null;
}

export interface Talent {
  /** The public slug — used for routing and as the React key. */
  id: string;
  slug: string;
  /**
   * The talent PROFILE id. Required by the authenticated client endpoints that
   * reference a talent (save, add-to-collection, create-inquiry). Distinct from `id`,
   * which is the slug the router uses.
   */
  talentProfileId: string;
  name: string;
  age: number | null;
  headline: string;
  city: string;
  region: string;
  /** Primary category, for the compact card. */
  category: string;
  categories: string[];
  engagements: string[];
  startingRate: number | null;
  startingRateCurrency: string | null;
  travel: boolean;
  eventAvailable: boolean;
  featured: boolean;
  verified: boolean;
  availability: AvailabilityLabel;
  rating: number;
  reviews: number;
  languages: string[];
  interests: string[];
  skills: string[];
  tags: string[];
  bio: string;
  fullBio: string;
  /** The cover URL. Kept as a plain string so existing components render unchanged. */
  cover: string | null;
  /** Gallery URLs, same reasoning as `cover`. */
  gallery: string[];
  /**
   * The same images with their intrinsic dimensions and responsive candidates.
   *
   * Added ALONGSIDE `cover`/`gallery` rather than replacing them: the approved design
   * renders plain URLs, and changing that shape would mean touching every visual
   * component. A surface that wants to avoid layout shift opts in here.
   */
  coverImage: TalentImage | null;
  galleryImages: TalentImage[];
  rates: TalentRate[];
  ratesDisclaimer: string;
  /** Serves the visitor's resolved city. */
  isNearby: boolean;
  /** Lifted by an admin placement for the visitor's market. */
  isPlaced: boolean;
  /**
   * True when this record came from a search card rather than a full profile fetch,
   * so a component can tell "not loaded yet" from "genuinely empty".
   */
  isSummary: boolean;
}

/**
 * An image with everything needed to reserve its space before it loads.
 * `aspectRatio` is null when the server could not read the dimensions, in which case the
 * UI should fall back to its own fixed ratio rather than guessing.
 */
export interface TalentImage {
  /**
   * The media id, when this image came from a full profile. A gallery keys and deduplicates
   * by it: two photographs with the same filename are distinct, the same photograph twice is
   * one. Null for a search card's cover, which has no per-item id and never needs one.
   */
  id: string | null;
  url: string;
  srcSet: string | null;
  width: number | null;
  height: number | null;
  aspectRatio: number | null;
}

/**
 * Map a server image to the view model, rebasing the URL onto the API origin.
 * Returns null for a missing image so a caller renders its own placeholder rather than a
 * broken `<img>`.
 */
export function toTalentImage(
  dto: PublicImageDto | null | undefined,
  id: string | null = null
): TalentImage | null {
  if (!dto) return null;
  const url = resolveMediaUrl(dto.url);
  if (!url) return null;
  return {
    id,
    url,
    // The srcset candidates are absolute CDN URLs already; only the primary URL can be
    // relative, so the srcset is passed through untouched.
    srcSet: dto.srcSet ?? null,
    width: dto.width ?? null,
    height: dto.height ?? null,
    aspectRatio: dto.aspectRatio ?? null,
  };
}

/** Backend `AvailabilityStatus` (PascalCase) → the display label the design uses. */
const AVAILABILITY_LABELS: Record<string, AvailabilityLabel> = {
  Available: "Available",
  LimitedAvailability: "Limited Availability",
  ByRequest: "By Request",
  Travelling: "Travelling",
  TemporarilyUnavailable: "Temporarily Unavailable",
};

export function availabilityLabel(status: string | null | undefined): AvailabilityLabel {
  if (!status) return "By Request";
  return AVAILABILITY_LABELS[status] ?? "By Request";
}

/** A search-result card → the view model (partial: no bio, gallery or rates). */
export function talentFromListItem(dto: TalentListItemDto): Talent {
  const coverImage = toTalentImage(dto.coverImage);
  const cover = coverImage?.url ?? null;
  return {
    id: dto.slug,
    slug: dto.slug,
    talentProfileId: dto.id,
    name: dto.displayName,
    age: null,
    headline: dto.headline ?? "",
    city: dto.cityName ?? "",
    region: dto.regionName ?? "",
    category: dto.categories[0] ?? "",
    categories: dto.categories ?? [],
    engagements: [],
    startingRate: dto.startingRate,
    startingRateCurrency: dto.startingRateCurrency,
    travel: dto.travelAvailable,
    eventAvailable: dto.eventAvailable,
    featured: dto.isFeatured,
    verified: dto.isVerified,
    availability: availabilityLabel(dto.availabilityStatus),
    rating: dto.averageRating ?? 0,
    reviews: dto.reviewCount ?? 0,
    languages: [],
    interests: [],
    skills: [],
    tags: [],
    bio: "",
    fullBio: "",
    cover,
    gallery: cover ? [cover] : [],
    coverImage,
    galleryImages: coverImage ? [coverImage] : [],
    rates: [],
    ratesDisclaimer: "",
    isNearby: dto.isNearby ?? false,
    isPlaced: dto.isPlaced ?? false,
    isSummary: true,
  };
}

/** The full public profile → the view model. */
export function talentFromDetail(dto: PublicTalentDetailDto): Talent {
  // Cover first, then the rest, so slide 1 is always the intended image. Each item keeps its
  // own media id and its own URL, and is deduplicated by id — so seven distinct photographs
  // render as seven distinct images, never one repeated, and an accidental duplicate row
  // collapses to a single slide rather than a phantom extra.
  const seenMediaIds = new Set<string>();
  const galleryImages = [...dto.media]
    .sort((a, b) => Number(b.isCover) - Number(a.isCover))
    .map((m) => toTalentImage(m.image, m.id))
    .filter((image): image is TalentImage => image !== null)
    .filter((image) => {
      if (image.id === null) return true;
      if (seenMediaIds.has(image.id)) return false;
      seenMediaIds.add(image.id);
      return true;
    });
  const gallery = galleryImages.map((image) => image.url);

  return {
    id: dto.slug,
    slug: dto.slug,
    talentProfileId: dto.id,
    name: dto.displayName,
    age: dto.age,
    headline: dto.headline ?? "",
    city: dto.cityName ?? "",
    region: dto.regionName ?? "",
    category: dto.categories[0] ?? "",
    categories: dto.categories ?? [],
    engagements: dto.engagementCategories ?? [],
    startingRate: dto.startingRate,
    startingRateCurrency: dto.startingRateCurrency,
    travel: dto.travelAvailable,
    eventAvailable: dto.eventAvailable,
    featured: dto.isFeatured,
    verified: dto.isVerified,
    availability: availabilityLabel(dto.availabilityStatus),
    rating: dto.averageRating ?? 0,
    reviews: dto.reviewCount ?? 0,
    languages: dto.languages ?? [],
    interests: dto.interests ?? [],
    skills: dto.skills ?? [],
    tags: dto.personalityTags ?? [],
    bio: dto.shortBiography ?? "",
    fullBio: dto.fullBiography ?? dto.shortBiography ?? "",
    cover: gallery[0] ?? null,
    gallery,
    coverImage: galleryImages[0] ?? null,
    galleryImages,
    rates: (dto.rates ?? []).map(rateFromDto),
    ratesDisclaimer: dto.ratesDisclaimer ?? "",
    isNearby: false,
    isPlaced: false,
    isSummary: false,
  };
}

function rateFromDto(dto: PublicRateDto): TalentRate {
  return {
    label: dto.label,
    unit: dto.unit,
    amount: dto.amount,
    currency: dto.currencyCode,
    notes: dto.notes,
  };
}

export function reviewFromDto(dto: PublicReviewDto): TalentReview {
  return {
    id: dto.id,
    rating: dto.rating,
    title: dto.title,
    body: dto.body,
    response: dto.talentResponse,
    publishedAtUtc: dto.publishedAtUtc,
  };
}

/**
 * Format a rate for display. Currency comes from the backend per rate — never assume a
 * symbol, and never render a fabricated "from" price when the talent has published no
 * public rate.
 */
export function formatRate(amount: number | null | undefined, currency: string | null | undefined): string {
  if (amount === null || amount === undefined) return "On request";
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: currency || "ZAR",
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${currency ?? ""} ${Math.round(amount).toLocaleString()}`.trim();
  }
}

/** Human label for a rate unit (`PerEvening` → "per evening"). */
export function formatRateUnit(unit: string): string {
  switch (unit) {
    case "Hourly":
      return "per hour";
    case "PerEvent":
      return "per event";
    case "PerDay":
      return "per day";
    case "PerEvening":
      return "per evening";
    default:
      return "";
  }
}
