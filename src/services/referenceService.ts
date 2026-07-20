import { api } from "@/api/client";

/**
 * Public reference data — `/api/v1/public/*`.
 *
 * Everything here is anonymous, cacheable and non-personalized, so requests are sent
 * without a bearer token and React Query holds them with a long stale time.
 */

/** Mirrors the backend `LookupDto`. */
export interface LookupDto {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  sortOrder: number;
  isActive: boolean;
  code: string | null;
}

/** Mirrors the backend `CountryDto`. */
export interface CountryDto {
  id: string;
  name: string;
  isoCode: string;
  sortOrder: number;
  isActive: boolean;
}

/** Mirrors the backend `RegionDto`. */
export interface RegionDto {
  id: string;
  name: string;
  code: string | null;
  countryId: string;
  sortOrder: number;
  isActive: boolean;
}

/** Mirrors the backend `CityDto`. */
export interface CityDto {
  id: string;
  name: string;
  slug: string;
  regionId: string;
  regionName: string;
  sortOrder: number;
  isActive: boolean;
}

/** Mirrors the backend `CmsPageDto`. */
export interface CmsPageDto {
  id: string;
  slug: string;
  title: string;
  content: string;
  status: string;
  publishedAtUtc: string | null;
}

/** Mirrors the backend `FaqItemDto`. */
export interface FaqItemDto {
  id: string;
  question: string;
  answer: string;
  category: string | null;
  sortOrder: number;
  isPublished: boolean;
}

/** Mirrors the backend `PlatformSettingDto` (public subset only). */
export interface PlatformSettingDto {
  id: string;
  key: string;
  value: string;
  description: string | null;
  dataType: string;
  isPublic: boolean;
}

const anonymous = { anonymous: true } as const;

export type TaxonomyType = "talent-categories" | "engagement-categories" | "languages" | "venue-types";

export function getTaxonomy(type: TaxonomyType, signal?: AbortSignal): Promise<LookupDto[]> {
  return api.get<LookupDto[]>(`/public/${type}`, { ...anonymous, signal });
}

export function getCountries(signal?: AbortSignal): Promise<CountryDto[]> {
  return api.get<CountryDto[]>("/public/locations/countries", { ...anonymous, signal });
}

export function getRegions(countryId?: string | null, signal?: AbortSignal): Promise<RegionDto[]> {
  return api.get<RegionDto[]>("/public/locations/regions", {
    ...anonymous,
    signal,
    query: { countryId: countryId ?? undefined },
  });
}

export function getCities(regionId?: string | null, signal?: AbortSignal): Promise<CityDto[]> {
  return api.get<CityDto[]>("/public/locations/cities", {
    ...anonymous,
    signal,
    query: { regionId: regionId ?? undefined },
  });
}

export function getCmsPage(slug: string, signal?: AbortSignal): Promise<CmsPageDto> {
  return api.get<CmsPageDto>(`/public/cms/${slug}`, { ...anonymous, signal });
}

export function getFaqs(signal?: AbortSignal): Promise<FaqItemDto[]> {
  return api.get<FaqItemDto[]>("/public/faqs", { ...anonymous, signal });
}

export function getPublicSettings(signal?: AbortSignal): Promise<PlatformSettingDto[]> {
  return api.get<PlatformSettingDto[]>("/public/settings", { ...anonymous, signal });
}

/** Reduce the public settings list to a plain key→value map. */
export function toSettingsMap(settings: readonly PlatformSettingDto[]): Record<string, string> {
  return Object.fromEntries(settings.map((s) => [s.key, s.value]));
}
