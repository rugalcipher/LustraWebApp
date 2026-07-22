import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { useDiscoveryUiStore, EMPTY_FILTERS, DEFAULT_RADIUS_KM } from "@/stores/discoveryUiStore";
import { requestCurrentPosition } from "@/features/discovery/geolocation";
import { formatDistanceBand } from "@/features/discovery/NearbyLocation";

/**
 * The nearby-discovery client contract: the store's nearby actions, the geolocation wrapper's
 * outcomes, the query the service builds, and the privacy-safe distance band. No real Google or
 * geolocation is contacted; the visitor's own coordinates may live in the query state, a talent's
 * never do.
 */

function resetStore() {
  useDiscoveryUiStore.setState({
    appliedFilters: { ...EMPTY_FILTERS },
    draftFilters: { ...EMPTY_FILTERS },
    sort: "Featured",
    currentIndex: 3,
    slideIndex: 2,
  });
}

describe("discovery store — nearby actions", () => {
  beforeEach(resetStore);

  it("setNearbyPoint stores the point, defaults the radius, switches to distance sort and resets paging", () => {
    useDiscoveryUiStore.getState().setNearbyPoint({ latitude: -33.9, longitude: 18.4, cityName: "Sea Point" });
    const s = useDiscoveryUiStore.getState();
    expect(s.appliedFilters.latitude).toBe(-33.9);
    expect(s.appliedFilters.longitude).toBe(18.4);
    expect(s.appliedFilters.radiusKm).toBe(DEFAULT_RADIUS_KM);
    expect(s.sort).toBe("Distance");
    expect(s.currentIndex).toBe(0);
    expect(s.slideIndex).toBe(0);
  });

  it("setRadiusKm changes the radius and resets paging, but only while a nearby search is active", () => {
    // No point yet: a radius change is a no-op.
    useDiscoveryUiStore.getState().setRadiusKm(100);
    expect(useDiscoveryUiStore.getState().appliedFilters.radiusKm).toBeNull();

    useDiscoveryUiStore.getState().setNearbyPoint({ latitude: -33.9, longitude: 18.4 });
    useDiscoveryUiStore.setState({ currentIndex: 5 });
    useDiscoveryUiStore.getState().setRadiusKm(100);
    expect(useDiscoveryUiStore.getState().appliedFilters.radiusKm).toBe(100);
    expect(useDiscoveryUiStore.getState().currentIndex).toBe(0);
  });

  it("clearNearby removes the point and restores the default sort", () => {
    useDiscoveryUiStore.getState().setNearbyPoint({ latitude: -33.9, longitude: 18.4 });
    useDiscoveryUiStore.getState().clearNearby();
    const s = useDiscoveryUiStore.getState();
    expect(s.appliedFilters.latitude).toBeNull();
    expect(s.appliedFilters.longitude).toBeNull();
    expect(s.appliedFilters.radiusKm).toBeNull();
    expect(s.sort).toBe("Featured");
  });
});

describe("geolocation wrapper", () => {
  afterEach(() => vi.unstubAllGlobals());

  function stubGeolocation(impl: (ok: PositionCallback, err: PositionErrorCallback) => void) {
    vi.stubGlobal("navigator", { geolocation: { getCurrentPosition: impl } });
  }

  it("resolves granted coordinates", async () => {
    stubGeolocation((ok) => ok({ coords: { latitude: -33.9, longitude: 18.4 } } as GeolocationPosition));
    await expect(requestCurrentPosition()).resolves.toEqual({ status: "granted", latitude: -33.9, longitude: 18.4 });
  });

  it("maps a denied permission", async () => {
    stubGeolocation((_ok, err) => err({ code: 1, PERMISSION_DENIED: 1, TIMEOUT: 3 } as GeolocationPositionError));
    await expect(requestCurrentPosition()).resolves.toEqual({ status: "denied" });
  });

  it("maps a timeout", async () => {
    stubGeolocation((_ok, err) => err({ code: 3, PERMISSION_DENIED: 1, TIMEOUT: 3 } as GeolocationPositionError));
    await expect(requestCurrentPosition()).resolves.toEqual({ status: "timeout" });
  });

  it("maps an unavailable position", async () => {
    stubGeolocation((_ok, err) => err({ code: 2, PERMISSION_DENIED: 1, TIMEOUT: 3 } as GeolocationPositionError));
    await expect(requestCurrentPosition()).resolves.toEqual({ status: "unavailable" });
  });

  it("reports unsupported when the API is absent", async () => {
    vi.stubGlobal("navigator", {});
    await expect(requestCurrentPosition()).resolves.toEqual({ status: "unsupported" });
  });
});

describe("nearby query building", () => {
  beforeEach(() => {
    resetStore();
    vi.resetModules();
  });
  afterEach(() => vi.unstubAllGlobals());

  it("sends latitude/longitude/radiusKm and sort=Distance, and omits them when absent", async () => {
    const calls: string[] = [];
    vi.stubGlobal("fetch", vi.fn(async (url: string) => {
      calls.push(String(url));
      return new Response(JSON.stringify({ items: [], page: 1, pageSize: 24, totalCount: 0, totalPages: 0, hasPrevious: false, hasNext: false }),
        { status: 200, headers: { "content-type": "application/json" } });
    }));
    const svc = await import("@/services/discoveryService");

    await svc.searchTalent({
      filters: { ...EMPTY_FILTERS, latitude: -33.9, longitude: 18.4, radiusKm: 25 },
      sort: "Distance",
    });
    const nearbyUrl = new URL(calls[calls.length - 1], "https://x.test");
    expect(nearbyUrl.searchParams.get("latitude")).toBe("-33.9");
    expect(nearbyUrl.searchParams.get("longitude")).toBe("18.4");
    expect(nearbyUrl.searchParams.get("radiusKm")).toBe("25");
    expect(nearbyUrl.searchParams.get("sort")).toBe("Distance");

    await svc.searchTalent({ filters: { ...EMPTY_FILTERS }, sort: "Featured" });
    const plainUrl = new URL(calls[calls.length - 1], "https://x.test");
    expect(plainUrl.searchParams.has("latitude")).toBe(false);
    expect(plainUrl.searchParams.has("radiusKm")).toBe(false);
  });
});

describe("distance band (privacy-safe)", () => {
  it("bands the distance and never exposes a precise coordinate", () => {
    expect(formatDistanceBand(null)).toBeNull();
    expect(formatDistanceBand(0.4)).toBe("Under 1 km away");
    expect(formatDistanceBand(3.2)).toBe("3 km away");
    expect(formatDistanceBand(42)).toBe("40 km away");
    // The band is a rounded distance FROM the visitor — it is not a coordinate.
    expect(formatDistanceBand(42)).not.toMatch(/-?\d+\.\d{3,}/);
  });
});
