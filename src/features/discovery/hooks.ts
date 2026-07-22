import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { queryKeys } from "@/api/queryKeys";
import { isApiError } from "@/api/problemDetails";
import * as discoveryService from "@/services/discoveryService";
import * as referenceService from "@/services/referenceService";
import type { DiscoveryPolicyDto, TalentListItemDto } from "@/services/discoveryService";
import { talentFromDetail, talentFromListItem, reviewFromDto, type Talent } from "@/domain/talent";
import {
  useDiscoveryUiStore,
  countActiveFilters,
  type DiscoveryFilters,
  type SelectedLocation,
} from "@/stores/discoveryUiStore";

/**
 * Discovery feature hooks. Pages and components consume these; none of them talks to
 * the API client directly, and none of them sees a raw DTO.
 */

const REFERENCE_STALE_TIME = 30 * 60_000; // Taxonomies and locations change rarely.
const DISCOVERY_STALE_TIME = 60_000;
const PROFILE_STALE_TIME = 5 * 60_000;

// --- Reference data ----------------------------------------------------------

export function useTaxonomy(type: referenceService.TaxonomyType) {
  return useQuery({
    queryKey: queryKeys.reference.taxonomy(type),
    queryFn: ({ signal }) => referenceService.getTaxonomy(type, signal),
    staleTime: REFERENCE_STALE_TIME,
  });
}

export function useCities(regionId?: string | null) {
  return useQuery({
    queryKey: queryKeys.reference.cities(regionId),
    queryFn: ({ signal }) => referenceService.getCities(regionId, signal),
    staleTime: REFERENCE_STALE_TIME,
  });
}

export function useRegions(countryId?: string | null) {
  return useQuery({
    queryKey: queryKeys.reference.regions(countryId),
    queryFn: ({ signal }) => referenceService.getRegions(countryId, signal),
    staleTime: REFERENCE_STALE_TIME,
  });
}

export function useCountries() {
  return useQuery({
    queryKey: queryKeys.reference.countries(),
    queryFn: ({ signal }) => referenceService.getCountries(signal),
    staleTime: REFERENCE_STALE_TIME,
  });
}

/** Everything the filter sheet needs, in one hook. */
export function useDiscoveryFilterOptions() {
  const cities = useCities();
  const engagements = useTaxonomy("engagement-categories");
  const categories = useTaxonomy("talent-categories");
  const languages = useTaxonomy("languages");

  return {
    cities: cities.data ?? [],
    engagementCategories: engagements.data ?? [],
    talentCategories: categories.data ?? [],
    languages: languages.data ?? [],
    isLoading: cities.isPending || engagements.isPending || categories.isPending || languages.isPending,
  };
}

// --- Policy ------------------------------------------------------------------

/**
 * The admin-controlled discovery policy. Advisory for the UI only — the API enforces
 * the same rules, so a stale or tampered policy cannot widen access.
 */
export function useDiscoveryPolicy() {
  return useQuery<DiscoveryPolicyDto>({
    queryKey: queryKeys.discovery.policy(),
    queryFn: ({ signal }) => discoveryService.getDiscoveryPolicy(signal),
    staleTime: REFERENCE_STALE_TIME,
  });
}

/** Backend error codes the discovery UI reacts to specifically. */
export const DISCOVERY_GATE_CODES = {
  guestLimitReached: "discovery.guest_limit_reached",
  publicDisabled: "discovery.public_disabled",
  locationRequired: "discovery.location_required",
} as const;

export type DiscoveryGate = "guest-limit" | "members-only" | "location-required" | null;

/** Classify an error into the gate the UI should present, if any. */
export function toDiscoveryGate(error: unknown): DiscoveryGate {
  if (!isApiError(error)) return null;
  switch (error.code) {
    case DISCOVERY_GATE_CODES.guestLimitReached:
      return "guest-limit";
    case DISCOVERY_GATE_CODES.publicDisabled:
      return "members-only";
    case DISCOVERY_GATE_CODES.locationRequired:
      return "location-required";
    default:
      return null;
  }
}

// --- Search ------------------------------------------------------------------

/** Debounce a fast-changing value (search text) so we don't query on every keystroke. */
function useDebounced<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}

export interface DiscoverySearchResult {
  talent: Talent[];
  totalCount: number;
  hasNext: boolean;
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  error: unknown;
  gate: DiscoveryGate;
  refetch: () => void;
}

/**
 * Search the roster with the store's applied filters, sort and location.
 *
 * The query key includes every input, so changing a filter is a cache lookup rather
 * than a refetch of the same data, and React Query cancels the in-flight request when
 * the key changes mid-typing.
 */
export function useDiscoverySearch(options?: { pageSize?: number; page?: number }): DiscoverySearchResult {
  const appliedFilters = useDiscoveryUiStore((s) => s.appliedFilters);
  const sort = useDiscoveryUiStore((s) => s.sort);
  const location = useDiscoveryUiStore((s) => s.location);

  const debouncedQuery = useDebounced(appliedFilters.query, 300);
  const filters: DiscoveryFilters = useMemo(
    () => ({ ...appliedFilters, query: debouncedQuery }),
    [appliedFilters, debouncedQuery]
  );

  const near = useMemo(
    () => ({ cityId: location.cityId, regionId: location.regionId, countryId: location.countryId }),
    [location.cityId, location.regionId, location.countryId]
  );

  const page = options?.page ?? 1;
  const pageSize = options?.pageSize ?? 24;

  const query = useQuery({
    queryKey: queryKeys.discovery.search({ filters, sort, near, page, pageSize }),
    queryFn: ({ signal }) =>
      discoveryService.searchTalent({ filters, sort, page, pageSize, near }, signal),
    staleTime: DISCOVERY_STALE_TIME,
    placeholderData: keepPreviousData,
    // A gate (403) is a legitimate answer, not a transient failure.
    retry: (count, error) => toDiscoveryGate(error) === null && count < 1,
  });

  const talent = useMemo(
    () => (query.data?.items ?? []).map((item: TalentListItemDto) => talentFromListItem(item)),
    [query.data]
  );

  return {
    talent,
    totalCount: query.data?.totalCount ?? 0,
    hasNext: query.data?.hasNext ?? false,
    isLoading: query.isPending,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error,
    gate: toDiscoveryGate(query.error),
    refetch: query.refetch,
  };
}

/**
 * The landing page's curated strip: the roster ordered featured-first, capped at
 * `limit`. Deliberately NOT filtered to `featured=true` — a roster with nothing
 * flagged would render an empty section rather than the agency's best profiles.
 */
export function useFeaturedTalent(limit = 6) {
  const query = useQuery({
    queryKey: queryKeys.discovery.search({ scope: "landing-curated", limit }),
    queryFn: ({ signal }) =>
      discoveryService.searchTalent(
        {
          filters: {
            cityId: null,
            regionId: null,
            engagementCategoryId: null,
            talentCategoryId: null,
            languageId: null,
            travelOnly: false,
            minRate: null,
            maxRate: null,
            query: "",
            latitude: null,
            longitude: null,
            radiusKm: null,
          },
          sort: "Featured",
          page: 1,
          pageSize: limit,
        },
        signal
      ),
    staleTime: DISCOVERY_STALE_TIME,
    retry: (count, error) => toDiscoveryGate(error) === null && count < 1,
  });

  return {
    talent: (query.data?.items ?? []).map(talentFromListItem),
    isLoading: query.isPending,
    isError: query.isError,
    gate: toDiscoveryGate(query.error),
  };
}

// --- Profile detail ----------------------------------------------------------

export function useTalentProfile(slug: string | undefined) {
  const query = useQuery({
    queryKey: queryKeys.talent.public(slug ?? ""),
    queryFn: ({ signal }) => discoveryService.getTalentBySlug(slug!, signal),
    enabled: Boolean(slug),
    staleTime: PROFILE_STALE_TIME,
    retry: (count, error) => toDiscoveryGate(error) === null && count < 1,
  });

  return {
    talent: query.data ? talentFromDetail(query.data) : null,
    isLoading: query.isPending,
    isError: query.isError,
    error: query.error,
    gate: toDiscoveryGate(query.error),
    /** True when the profile genuinely does not exist (as opposed to being gated). */
    notFound: isApiError(query.error) && query.error.kind === "not_found",
  };
}

export function useTalentReviews(slug: string | undefined, enabled = true) {
  const query = useQuery({
    queryKey: queryKeys.talent.reviews(slug ?? ""),
    queryFn: ({ signal }) => discoveryService.getTalentReviews(slug!, signal),
    enabled: Boolean(slug) && enabled,
    staleTime: PROFILE_STALE_TIME,
  });

  return {
    reviews: (query.data ?? []).map(reviewFromDto),
    isLoading: query.isPending,
  };
}

/**
 * Prefetch the next talent's profile so advancing in the immersive experience feels
 * instantaneous. Only the profile METADATA is prefetched — image bytes are handled by
 * the browser and the service worker, never held in the query cache.
 */
export function usePrefetchTalent(): (slug: string | undefined) => void {
  const queryClient = useQueryClient();
  return useCallback(
    (slug) => {
      if (!slug) return;
      queryClient.prefetchQuery({
        queryKey: queryKeys.talent.public(slug),
        queryFn: ({ signal }) => discoveryService.getTalentBySlug(slug, signal),
        staleTime: PROFILE_STALE_TIME,
      });
    },
    [queryClient]
  );
}

// --- Location ----------------------------------------------------------------

export type LocationRequestState = "idle" | "requesting" | "denied" | "unsupported" | "failed";

/**
 * "Use my location" — a DELIBERATE action, never invoked on page load.
 *
 * On success only the RESOLVED CITY is stored. The raw coordinates are sent once to
 * the resolve endpoint and then discarded: they are never written to the store, to
 * storage, or to the user's profile. If permission is denied, discovery continues
 * normally with a manual city picker.
 */
export function useResolveMyLocation() {
  const setLocation = useDiscoveryUiStore((s) => s.setLocation);
  const [state, setState] = useState<LocationRequestState>("idle");

  const mutation = useMutation({
    mutationFn: (coords: { latitude: number; longitude: number }) =>
      discoveryService.resolveLocation(coords),
    onSuccess: (resolved) => {
      const next: SelectedLocation = {
        cityId: resolved.cityId,
        cityName: resolved.cityName,
        regionId: resolved.regionId,
        countryId: resolved.countryId,
        source: "resolved",
      };
      setLocation(next);
      setState("idle");
    },
    onError: () => setState("failed"),
  });

  const request = useCallback(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setState("unsupported");
      return;
    }

    setState("requesting");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        mutation.mutate({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      (error) => {
        // Denied is a normal outcome, not an error state to shout about.
        setState(error.code === error.PERMISSION_DENIED ? "denied" : "failed");
      },
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 5 * 60_000 }
    );
  }, [mutation]);

  return {
    request,
    state,
    isResolving: state === "requesting" || mutation.isPending,
    reset: () => setState("idle"),
  };
}

/** Set the visitor's city explicitly from the picker. */
export function useSelectCity(): (city: { id: string; name: string; regionId: string } | null) => void {
  const setLocation = useDiscoveryUiStore((s) => s.setLocation);
  const clearLocation = useDiscoveryUiStore((s) => s.clearLocation);

  return useCallback(
    (city) => {
      if (!city) {
        clearLocation();
        return;
      }
      setLocation({
        cityId: city.id,
        cityName: city.name,
        regionId: city.regionId,
        countryId: null,
        source: "explicit",
      });
    },
    [setLocation, clearLocation]
  );
}

// --- Convenience -------------------------------------------------------------

/** The filter-sheet state plus the active-filter count for the badge. */
export function useDiscoveryFilters() {
  const draftFilters = useDiscoveryUiStore((s) => s.draftFilters);
  const appliedFilters = useDiscoveryUiStore((s) => s.appliedFilters);
  const setDraftFilters = useDiscoveryUiStore((s) => s.setDraftFilters);
  const applyFilters = useDiscoveryUiStore((s) => s.applyFilters);
  const resetFilters = useDiscoveryUiStore((s) => s.resetFilters);

  return {
    draftFilters,
    appliedFilters,
    setDraftFilters,
    applyFilters,
    resetFilters,
    activeFilterCount: countActiveFilters(appliedFilters),
  };
}
