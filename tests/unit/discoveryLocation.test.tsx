import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SA_PROVINCES, allLocalities, provinceForLocality } from "@/features/discovery/saGeography";
import { useDiscoveryUiStore, NO_LOCATION, EMPTY_FILTERS } from "@/stores/discoveryUiStore";
import DiscoveryLocation from "@/features/discovery/DiscoveryLocation";

// Google not configured in the test env → the control shows the province/locality fallback.
vi.mock("@/services/googlePlaces", () => ({
  isGoogleMapsConfigured: () => false,
  createPlacesSessionToken: () => null,
  fetchAddressSuggestions: vi.fn(),
  fetchPlaceDetails: vi.fn(),
}));

describe("SA geography fallback", () => {
  it("covers all nine provinces and the named operating localities", () => {
    expect(SA_PROVINCES).toHaveLength(9);
    const localities = allLocalities().map((l) => l.locality);
    for (const named of ["Soweto", "Randburg", "Pretoria Central", "Braamfontein", "Sandton", "Midrand"]) {
      expect(localities).toContain(named);
    }
  });

  it("maps a locality back to its province", () => {
    expect(provinceForLocality("Soweto")).toBe("Gauteng");
    expect(provinceForLocality("Cape Town")).toBe("Western Cape");
    expect(provinceForLocality("nowhere")).toBeNull();
  });
});

describe("DiscoveryLocation control", () => {
  beforeEach(() => {
    useDiscoveryUiStore.setState({
      appliedFilters: { ...EMPTY_FILTERS },
      draftFilters: { ...EMPTY_FILTERS },
      location: { ...NO_LOCATION },
    });
  });

  it("shows a single compact trigger, not a wall of city pills", () => {
    render(<DiscoveryLocation />);
    expect(screen.getByRole("button", { name: /choose location/i })).toBeInTheDocument();
    // The province grid is behind the sheet, not on the page.
    expect(screen.queryByText("Gauteng")).not.toBeInTheDocument();
  });

  it("opens the sheet and sets a soft area label from the province → locality fallback", async () => {
    const user = userEvent.setup();
    render(<DiscoveryLocation />);

    await user.click(screen.getByRole("button", { name: /choose location/i }));
    await user.click(screen.getByRole("button", { name: /Gauteng/i }));
    await user.click(screen.getByRole("button", { name: "Soweto" }));

    const location = useDiscoveryUiStore.getState().location;
    expect(location.cityName).toBe("Soweto");
    // A fallback locality carries no coordinates — it is an area label, not a live position.
    expect(useDiscoveryUiStore.getState().appliedFilters.latitude).toBeNull();
  });
});

// ---- Part 4: geolocation permission recovery --------------------------------
describe("DiscoveryLocation geolocation permission handling", () => {
  let getCurrentPosition: ReturnType<typeof vi.fn>;
  let permissionState: string;
  let queryFn: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    useDiscoveryUiStore.setState({
      appliedFilters: { ...EMPTY_FILTERS },
      draftFilters: { ...EMPTY_FILTERS },
      location: { ...NO_LOCATION },
    });
    getCurrentPosition = vi.fn();
    permissionState = "prompt";
    queryFn = vi.fn(async () => ({ state: permissionState }));
    vi.stubGlobal("navigator", {
      ...navigator,
      geolocation: { getCurrentPosition },
      permissions: { query: queryFn },
      userAgent: "Mozilla/5.0 (Windows NT 10.0) Chrome/120",
    });
    // A secure context (https) — geolocation is allowed.
    vi.stubGlobal("isSecureContext", true);
  });

  afterEach(() => vi.unstubAllGlobals());

  const openSheet = async (user: ReturnType<typeof userEvent.setup>) => {
    render(<DiscoveryLocation />);
    await user.click(screen.getByRole("button", { name: /choose location/i }));
  };

  it("granted → requests the position and sets the nearby point", async () => {
    permissionState = "granted";
    getCurrentPosition.mockImplementation((ok: PositionCallback) =>
      ok({ coords: { latitude: -26.2, longitude: 28.0 } } as GeolocationPosition)
    );
    const user = userEvent.setup();
    await openSheet(user);
    await user.click(screen.getByRole("button", { name: /Use my current location/i }));

    expect(getCurrentPosition).toHaveBeenCalledTimes(1);
    const f = useDiscoveryUiStore.getState().appliedFilters;
    expect(f.latitude).toBe(-26.2);
    expect(f.longitude).toBe(28.0);
  });

  it("prompt → calls getCurrentPosition so the browser shows its native prompt", async () => {
    permissionState = "prompt";
    getCurrentPosition.mockImplementation(() => {}); // pending prompt
    const user = userEvent.setup();
    await openSheet(user);
    await user.click(screen.getByRole("button", { name: /Use my current location/i }));
    expect(getCurrentPosition).toHaveBeenCalledTimes(1);
  });

  it("denied → shows the recovery sheet and does NOT call getCurrentPosition again", async () => {
    permissionState = "denied";
    const user = userEvent.setup();
    await openSheet(user);
    await user.click(screen.getByRole("button", { name: /Use my current location/i }));

    expect(await screen.findByText(/Allow location access/i)).toBeInTheDocument();
    expect(screen.getByText(/currently blocked for Lustra/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Try again/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Not now/i })).toBeInTheDocument();
    // The whole point: we never re-call getCurrentPosition on a stored block (no phantom prompt).
    expect(getCurrentPosition).not.toHaveBeenCalled();
  });

  it("Try again re-reads the permission; a denied→granted change then succeeds", async () => {
    permissionState = "denied";
    const user = userEvent.setup();
    await openSheet(user);
    await user.click(screen.getByRole("button", { name: /Use my current location/i }));
    await screen.findByText(/Allow location access/i);

    // The user enables it in settings; Try again re-queries and now succeeds.
    permissionState = "granted";
    getCurrentPosition.mockImplementation((ok: PositionCallback) =>
      ok({ coords: { latitude: -33.9, longitude: 18.4 } } as GeolocationPosition)
    );
    await user.click(screen.getByRole("button", { name: /Try again/i }));

    expect(queryFn).toHaveBeenCalledTimes(2);
    expect(getCurrentPosition).toHaveBeenCalledTimes(1);
    expect(useDiscoveryUiStore.getState().appliedFilters.latitude).toBe(-33.9);
  });

  it("Permissions API unavailable → attempts getCurrentPosition and interprets a denial", async () => {
    vi.stubGlobal("navigator", {
      ...navigator,
      geolocation: { getCurrentPosition },
      // no `permissions` object
      userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Safari",
    });
    getCurrentPosition.mockImplementation((_ok: PositionCallback, err: PositionErrorCallback) =>
      err({ code: 1, PERMISSION_DENIED: 1, POSITION_UNAVAILABLE: 2, TIMEOUT: 3 } as GeolocationPositionError)
    );
    const user = userEvent.setup();
    await openSheet(user);
    await user.click(screen.getByRole("button", { name: /Use my current location/i }));

    // With no Permissions API we DO call getCurrentPosition, then show the same recovery guidance.
    expect(getCurrentPosition).toHaveBeenCalledTimes(1);
    expect(await screen.findByText(/Allow location access/i)).toBeInTheDocument();
    // iOS-specific guidance.
    expect(screen.getByText(/Location Services/i)).toBeInTheDocument();
  });

  it("still offers the area fallback (province → locality) when location is unavailable", async () => {
    permissionState = "denied";
    const user = userEvent.setup();
    await openSheet(user);
    await user.click(screen.getByRole("button", { name: /Use my current location/i }));
    await screen.findByText(/Allow location access/i);
    // The province picker remains available as "choose an area instead".
    await user.click(screen.getByRole("button", { name: /Gauteng/i }));
    await user.click(screen.getByRole("button", { name: "Soweto" }));
    expect(useDiscoveryUiStore.getState().location.cityName).toBe("Soweto");
  });
});
