import { describe, it, expect, beforeEach, vi } from "vitest";
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
