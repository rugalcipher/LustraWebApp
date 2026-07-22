import { api } from "@/api/client";
import type { DiscoveryFilters, DiscoverySort } from "@/stores/discoveryUiStore";

/**
 * Public discovery — `/api/v1/public/talents`, `/public/discovery-policy` and
 * `/public/location/resolve`.
 *
 * These endpoints are anonymous by design: guests must be able to browse without an
 * account. Requests are sent without a bearer token EXCEPT where being signed in
 * legitimately changes the answer (the guest policy does not apply to members), so the
 * token is attached when present and the server decides what that entitles.
 */

// --- Wire types (mirror the backend records exactly) -------------------------

/** Mirrors `PagedResult<T>`. */
export interface PagedResult<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasPrevious: boolean;
  hasNext: boolean;
}

/**
 * Mirrors `TalentListItemDto`.
 *
 * `id` is the talent PROFILE id, required by the authenticated client endpoints
 * (save, add-to-collection, create-inquiry). `slug` remains the routing identifier.
 */
export interface TalentListItemDto {
  id: string;
  slug: string;
  displayName: string;
  headline: string | null;
  cityName: string | null;
  regionName: string | null;
  availabilityStatus: string;
  travelAvailable: boolean;
  eventAvailable: boolean;
  isVerified: boolean;
  isFeatured: boolean;
  averageRating: number;
  reviewCount: number;
  startingRate: number | null;
  startingRateCurrency: string | null;
  coverImage: PublicImageDto | null;
  categories: string[];
  isNearby: boolean;
  isPlaced: boolean;
}

/**
 * Mirrors `PublicImageDto`.
 *
 * `width`/`height` are the intrinsic pixel dimensions of the original and exist so a card
 * or gallery tile can reserve its space BEFORE the bytes arrive. They are nullable because
 * the server's dimension reader only understands PNG and JPEG headers — an unreadable
 * format yields null rather than a fabricated size.
 *
 * `srcSet` is null whenever CDN resizing is unavailable; that is normal, and the caller
 * simply uses `url`.
 */
export interface PublicImageDto {
  url: string;
  srcSet: string | null;
  width: number | null;
  height: number | null;
  aspectRatio: number | null;
}

/** Mirrors `PublicMediaDto`. */
export interface PublicMediaDto {
  /** The media id — the stable identity a gallery keys and deduplicates by. */
  id: string;
  image: PublicImageDto;
  caption: string | null;
  mediaType: string;
  isCover: boolean;
}

/** Mirrors `PublicRateDto`. */
export interface PublicRateDto {
  label: string;
  unit: string;
  amount: number;
  currencyCode: string;
  notes: string | null;
}

/** Mirrors `PublicTalentDetailDto`. See {@link TalentListItemDto} on `id`. */
export interface PublicTalentDetailDto {
  id: string;
  slug: string;
  displayName: string;
  headline: string | null;
  shortBiography: string | null;
  fullBiography: string | null;
  cityName: string | null;
  regionName: string | null;
  availabilityStatus: string;
  travelAvailable: boolean;
  eventAvailable: boolean;
  isVerified: boolean;
  isFeatured: boolean;
  age: number | null;
  averageRating: number;
  reviewCount: number;
  categories: string[];
  engagementCategories: string[];
  languages: string[];
  skills: string[];
  interests: string[];
  personalityTags: string[];
  media: PublicMediaDto[];
  startingRate: number | null;
  startingRateCurrency: string | null;
  rates: PublicRateDto[];
  ratesDisclaimer: string;
}

/** Mirrors `PublicReviewDto`. */
export interface PublicReviewDto {
  id: string;
  rating: number;
  title: string | null;
  body: string;
  talentResponse: string | null;
  publishedAtUtc: string | null;
}

/** Mirrors `DiscoveryPolicyDto`. */
export interface DiscoveryPolicyDto {
  publicDiscoveryEnabled: boolean;
  guestDiscoveryMode: "AllPublic" | "LocationMatched" | "CuratedByLocation" | "FeaturedOnly" | "Limited";
  guestProfileLimit: number;
  guestCanViewFullProfile: boolean;
  guestCanViewPublicGallery: boolean;
  guestCanViewRates: boolean;
  guestCanViewReviews: boolean;
  guestCanUseFilters: boolean;
  requireSignInToInquire: boolean;
  requireSignInToSave: boolean;
  locationMatchingEnabled: boolean;
  locationFallbackMode: "Global" | "Featured" | "RequireSelection";
}

/** Mirrors `LocationResolutionDto`. */
export interface LocationResolutionDto {
  cityId: string;
  cityName: string;
  citySlug: string;
  regionId: string;
  regionName: string;
  countryId: string;
  countryName: string;
  approximateDistanceKm: number;
}

// --- Requests ----------------------------------------------------------------

/** Backend `TalentSortOption` names. */
const SORT_MAP: Record<DiscoverySort, string> = {
  Featured: "Featured",
  Newest: "Newest",
  RateAsc: "RateLowToHigh",
  RateDesc: "RateHighToLow",
  Rating: "HighestRated",
};

export interface SearchParams {
  filters: DiscoveryFilters;
  sort: DiscoverySort;
  page?: number;
  pageSize?: number;
  /** The visitor's location, used to RANK results (not to filter them). */
  near?: { cityId?: string | null; regionId?: string | null; countryId?: string | null };
}

/**
 * Build the query string for a search. Empty values are omitted so the query key and
 * the request URL stay stable — a filter the user cleared must not linger as `&cityId=`.
 */
function toQuery(params: SearchParams): Record<string, string | number | boolean | undefined> {
  const { filters, sort, page = 1, pageSize = 24, near } = params;
  return {
    searchText: filters.query?.trim() || undefined,
    cityId: filters.cityId ?? undefined,
    regionId: filters.regionId ?? undefined,
    talentCategoryId: filters.talentCategoryId ?? undefined,
    engagementCategoryId: filters.engagementCategoryId ?? undefined,
    languageId: filters.languageId ?? undefined,
    travelAvailable: filters.travelOnly ? true : undefined,
    minRate: filters.minRate ?? undefined,
    maxRate: filters.maxRate ?? undefined,
    nearCityId: near?.cityId ?? undefined,
    nearRegionId: near?.regionId ?? undefined,
    nearCountryId: near?.countryId ?? undefined,
    sort: SORT_MAP[sort] ?? SORT_MAP.Featured,
    page,
    pageSize,
  };
}

export function searchTalent(
  params: SearchParams,
  signal?: AbortSignal
): Promise<PagedResult<TalentListItemDto>> {
  return api.get<PagedResult<TalentListItemDto>>("/public/talents", {
    query: toQuery(params),
    signal,
  });
}

export function getTalentBySlug(slug: string, signal?: AbortSignal): Promise<PublicTalentDetailDto> {
  return api.get<PublicTalentDetailDto>(`/public/talents/${encodeURIComponent(slug)}`, { signal });
}

export function getTalentReviews(slug: string, signal?: AbortSignal): Promise<PublicReviewDto[]> {
  return api.get<PublicReviewDto[]>(`/public/talents/${encodeURIComponent(slug)}/reviews`, {
    anonymous: true,
    signal,
  });
}

export function getDiscoveryPolicy(signal?: AbortSignal): Promise<DiscoveryPolicyDto> {
  return api.get<DiscoveryPolicyDto>("/public/discovery-policy", { anonymous: true, signal });
}

/**
 * Resolve browser coordinates to the nearest supported city.
 *
 * The coordinates are sent once and are not stored by the server, nor persisted
 * client-side: only the resolved city is kept (see `discoveryUiStore`).
 */
export function resolveLocation(
  coords: { latitude: number; longitude: number },
  signal?: AbortSignal
): Promise<LocationResolutionDto> {
  return api.post<LocationResolutionDto>("/public/location/resolve", coords, {
    anonymous: true,
    signal,
  });
}
