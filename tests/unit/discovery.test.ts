import { describe, it, expect, beforeEach, vi } from "vitest";
import { ApiError } from "@/api/problemDetails";
import { toDiscoveryGate } from "@/features/discovery/hooks";
import { talentFromListItem, talentFromDetail, formatRate, availabilityLabel } from "@/domain/talent";
import { resolveMediaUrl } from "@/services/mediaUrl";
import {
  useDiscoveryUiStore,
  countActiveFilters,
  EMPTY_FILTERS,
  NO_LOCATION,
} from "@/stores/discoveryUiStore";
import * as discoveryService from "@/services/discoveryService";
import type { TalentListItemDto, PublicTalentDetailDto } from "@/services/discoveryService";

function listItem(overrides: Partial<TalentListItemDto> = {}): TalentListItemDto {
  return {
    id: "11111111-1111-1111-1111-111111111111",
    slug: "isabelle",
    displayName: "Isabelle",
    headline: "Art Curator",
    cityName: "Cape Town",
    regionName: "Western Cape",
    availabilityStatus: "LimitedAvailability",
    travelAvailable: true,
    eventAvailable: true,
    isVerified: true,
    isFeatured: false,
    averageRating: 4.9,
    reviewCount: 18,
    startingRate: 1200,
    startingRateCurrency: "ZAR",
    coverImage: {
      url: "/api/v1/media/abc?token=xyz",
      srcSet: null,
      width: 1200,
      height: 1600,
      aspectRatio: 0.75,
    },
    categories: ["Event Companions", "Hosts"],
    isNearby: true,
    isPlaced: false,
    ...overrides,
  };
}

describe("talent view model", () => {
  it("maps a search card onto the shape the design renders", () => {
    const talent = talentFromListItem(listItem());

    // The public slug is the identity — internal Guids never reach the frontend.
    expect(talent.id).toBe("isabelle");
    expect(talent.slug).toBe("isabelle");
    expect(talent.name).toBe("Isabelle");
    expect(talent.city).toBe("Cape Town");
    expect(talent.category).toBe("Event Companions");
    expect(talent.availability).toBe("Limited Availability");
    expect(talent.isNearby).toBe(true);
    expect(talent.isSummary).toBe(true);
  });

  it("rebases root-relative media urls onto the API origin", () => {
    const talent = talentFromListItem(listItem());
    expect(talent.cover).toBe("https://api.test/api/v1/media/abc?token=xyz");
  });

  it("leaves absolute CDN urls untouched", () => {
    expect(resolveMediaUrl("https://media.lustra.vip/live/x.webp")).toBe(
      "https://media.lustra.vip/live/x.webp"
    );
  });

  it("orders the gallery so the cover image is first", () => {
    const detail = {
      id: "22222222-2222-2222-2222-222222222222",
      slug: "camille",
      displayName: "Camille",
      headline: null,
      shortBiography: "short",
      fullBiography: "full",
      cityName: "Durban",
      regionName: "KwaZulu-Natal",
      availabilityStatus: "Available",
      travelAvailable: false,
      eventAvailable: true,
      isVerified: false,
      isFeatured: true,
      age: 27,
      averageRating: 5,
      reviewCount: 3,
      categories: [],
      engagementCategories: ["Private Dinner"],
      languages: ["English"],
      skills: [],
      interests: [],
      personalityTags: ["Elegant"],
      media: [
        {
          image: { url: "/api/v1/media/2", srcSet: null, width: 800, height: 1200, aspectRatio: 2 / 3 },
          caption: null,
          mediaType: "Image",
          isCover: false,
        },
        {
          image: { url: "/api/v1/media/1", srcSet: null, width: 900, height: 1200, aspectRatio: 0.75 },
          caption: null,
          mediaType: "Image",
          isCover: true,
        },
      ],
      startingRate: 900,
      startingRateCurrency: "ZAR",
      rates: [{ label: "Evening", unit: "PerEvening", amount: 900, currencyCode: "ZAR", notes: null }],
      ratesDisclaimer: "Estimates only.",
    } satisfies PublicTalentDetailDto;

    const talent = talentFromDetail(detail);
    expect(talent.gallery[0]).toContain("/api/v1/media/1");
    expect(talent.cover).toContain("/api/v1/media/1");
    expect(talent.isSummary).toBe(false);
    expect(talent.rates).toHaveLength(1);
  });

  it("maps every backend availability status to a display label", () => {
    expect(availabilityLabel("Available")).toBe("Available");
    expect(availabilityLabel("TemporarilyUnavailable")).toBe("Temporarily Unavailable");
    expect(availabilityLabel("Travelling")).toBe("Travelling");
    // Unknown/missing degrades to the neutral label rather than rendering a raw enum.
    expect(availabilityLabel(null)).toBe("By Request");
    expect(availabilityLabel("SomethingNew")).toBe("By Request");
  });

  it("never fabricates a price for talent with no published public rate", () => {
    expect(formatRate(null, "ZAR")).toBe("On request");
    expect(formatRate(undefined, null)).toBe("On request");

    // Formatting is locale-dependent (grouping separator, symbol placement), so assert
    // on the digits and currency rather than on one locale's exact output.
    const formatted = formatRate(1200, "ZAR");
    expect(formatted.replace(/[^\d]/g, "")).toBe("1200");
    expect(formatted).toMatch(/R|ZAR/);
    expect(formatted).not.toBe("On request");
  });
});

describe("discovery gates", () => {
  it("classifies the server's gate codes", () => {
    const limit = ApiError.fromProblem(403, { code: "discovery.guest_limit_reached" });
    const disabled = ApiError.fromProblem(403, { code: "discovery.public_disabled" });
    const location = ApiError.fromProblem(400, { code: "discovery.location_required" });

    expect(toDiscoveryGate(limit)).toBe("guest-limit");
    expect(toDiscoveryGate(disabled)).toBe("members-only");
    expect(toDiscoveryGate(location)).toBe("location-required");
  });

  it("does not treat an ordinary failure as a gate", () => {
    expect(toDiscoveryGate(ApiError.fromProblem(500, {}))).toBeNull();
    expect(toDiscoveryGate(ApiError.network())).toBeNull();
    expect(toDiscoveryGate(new Error("boom"))).toBeNull();
  });
});

describe("discovery UI store", () => {
  beforeEach(() => {
    useDiscoveryUiStore.setState({
      draftFilters: { ...EMPTY_FILTERS },
      appliedFilters: { ...EMPTY_FILTERS },
      location: { ...NO_LOCATION },
      sort: "Featured",
      currentIndex: 3,
      slideIndex: 2,
      skippedIds: [],
      recentlyViewedIds: [],
    });
  });

  it("does not apply draft filters until they are committed", () => {
    const store = useDiscoveryUiStore.getState();
    store.setDraftFilters({ cityId: "city-1" });

    expect(useDiscoveryUiStore.getState().draftFilters.cityId).toBe("city-1");
    expect(useDiscoveryUiStore.getState().appliedFilters.cityId).toBeNull();

    useDiscoveryUiStore.getState().applyFilters();
    expect(useDiscoveryUiStore.getState().appliedFilters.cityId).toBe("city-1");
    // Committing a filter resets the immersive cursor.
    expect(useDiscoveryUiStore.getState().currentIndex).toBe(0);
  });

  it("stores only the resolved city, never coordinates", () => {
    useDiscoveryUiStore.getState().setLocation({
      cityId: "c1",
      cityName: "Cape Town",
      regionId: "r1",
      countryId: "co1",
      source: "resolved",
    });

    const location = useDiscoveryUiStore.getState().location;
    expect(location.cityName).toBe("Cape Town");
    expect(Object.keys(location)).not.toContain("latitude");
    expect(Object.keys(location)).not.toContain("longitude");
    expect(JSON.stringify(location)).not.toMatch(/lat|lon/i);
  });

  it("caps and de-duplicates the recently-viewed list", () => {
    const { markViewed } = useDiscoveryUiStore.getState();
    for (let i = 0; i < 14; i++) markViewed(`t${i}`);
    markViewed("t3");

    const recent = useDiscoveryUiStore.getState().recentlyViewedIds;
    expect(recent.length).toBeLessThanOrEqual(10);
    expect(recent[0]).toBe("t3");
    expect(new Set(recent).size).toBe(recent.length);
  });

  it("counts active filters for the refine badge", () => {
    expect(countActiveFilters(EMPTY_FILTERS)).toBe(0);
    expect(
      countActiveFilters({ ...EMPTY_FILTERS, cityId: "c", travelOnly: true, minRate: 500 })
    ).toBe(3);
    // A free-text query is not a "filter" chip.
    expect(countActiveFilters({ ...EMPTY_FILTERS, query: "isabelle" })).toBe(0);
  });
});

describe("discovery service requests", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ items: [], totalCount: 0 }), {
        status: 200,
        headers: { "content-type": "application/json" },
      })
    );
    vi.stubGlobal("fetch", fetchMock);
  });

  it("omits cleared filters from the query string entirely", async () => {
    await discoveryService.searchTalent({
      filters: { ...EMPTY_FILTERS, query: "  " },
      sort: "Featured",
    });

    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).not.toContain("cityId=");
    expect(url).not.toContain("searchText=");
    expect(url).toContain("sort=Featured");
  });

  it("maps frontend sort tokens onto the backend TalentSortOption names", async () => {
    await discoveryService.searchTalent({ filters: EMPTY_FILTERS, sort: "RateAsc" });
    expect(fetchMock.mock.calls[0][0]).toContain("sort=RateLowToHigh");

    await discoveryService.searchTalent({ filters: EMPTY_FILTERS, sort: "Rating" });
    expect(fetchMock.mock.calls[1][0]).toContain("sort=HighestRated");
  });

  it("sends the visitor's location as a ranking hint, not as a hard filter", async () => {
    await discoveryService.searchTalent({
      filters: EMPTY_FILTERS,
      sort: "Featured",
      near: { cityId: "city-9" },
    });

    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toContain("nearCityId=city-9");
    // cityId would exclude everyone outside that city — the visitor's position must not do that.
    expect(url).not.toContain("cityId=city-9&");
    expect(url).not.toMatch(/[?&]cityId=/);
  });

  it("posts coordinates to resolve and sends them nowhere else", async () => {
    await discoveryService.resolveLocation({ latitude: -33.92, longitude: 18.42 });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toContain("/public/location/resolve");
    expect(JSON.parse(init.body as string)).toEqual({ latitude: -33.92, longitude: 18.42 });
    // The resolve call is anonymous — no bearer token is attached.
    expect((init.headers as Record<string, string>).Authorization).toBeUndefined();
  });
});
