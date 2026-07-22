import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// The component checks `isGoogleMapsConfigured()`, which reads the env key. Mock the env so the
// autocomplete is "configured" without any real key, and never contacts Google.
vi.mock("@/config/env", () => ({
  env: { googleMapsApiKey: "test-key", googlePlacesCountries: ["za"], apiBaseUrl: "/api/v1", isApi: false, isMock: true },
}));

import React, { useState } from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AddressAutocomplete, { isAddressVerified } from "@/components/address/AddressAutocomplete";
import { __setPlacesProviderForTests, type RawPlace, type PlaceSuggestion } from "@/services/googlePlaces";
import { env } from "@/config/env";
import { EMPTY_ADDRESS_INPUT, type StructuredAddressInput } from "@/domain/address";

const SUGGESTIONS: PlaceSuggestion[] = [
  { placeId: "p1", primaryText: "10 Main Road", secondaryText: "Sea Point, Cape Town", description: "10 Main Road, Sea Point, Cape Town" },
];

const PLACE: RawPlace = {
  placeId: "p1",
  formattedAddress: "10 Main Road, Sea Point, Cape Town, 8005, South Africa",
  location: { lat: -33.91, lng: 18.38 },
  components: [
    { types: ["street_number"], longText: "10", shortText: "10" },
    { types: ["route"], longText: "Main Road", shortText: "Main Road" },
    { types: ["neighborhood"], longText: "Sea Point", shortText: "Sea Point" },
    { types: ["locality"], longText: "Cape Town", shortText: "Cape Town" },
    { types: ["administrative_area_level_1"], longText: "Western Cape", shortText: "WC" },
    { types: ["country"], longText: "South Africa", shortText: "ZA" },
    { types: ["postal_code"], longText: "8005", shortText: "8005" },
  ],
};

function makeProvider(overrides: Partial<Parameters<typeof __setPlacesProviderForTests>[0] & object> = {}) {
  return {
    createSessionToken: () => ({ token: 1 }),
    fetchSuggestions: vi.fn(async () => SUGGESTIONS),
    fetchDetails: vi.fn(async () => PLACE),
    ...overrides,
  } as NonNullable<Parameters<typeof __setPlacesProviderForTests>[0]>;
}

/** A tiny controlled host so the component's onChange drives real re-renders. */
function Host({
  initial = { ...EMPTY_ADDRESS_INPUT },
  onValue,
}: {
  initial?: StructuredAddressInput;
  onValue?: (v: StructuredAddressInput) => void;
}) {
  const [value, setValue] = useState<StructuredAddressInput>(initial);
  return (
    <AddressAutocomplete
      value={value}
      onChange={(next: StructuredAddressInput) => {
        setValue(next);
        onValue?.(next);
      }}
    />
  );
}

describe("AddressAutocomplete", () => {
  beforeEach(() => {
    (env as unknown as { googleMapsApiKey: string }).googleMapsApiKey = "test-key";
    __setPlacesProviderForTests(makeProvider());
  });
  afterEach(() => {
    __setPlacesProviderForTests(null);
    vi.restoreAllMocks();
  });

  it("shows a Google search box (not the manual fallback) when configured", () => {
    render(<Host />);
    expect(screen.getByRole("combobox")).toBeInTheDocument();
  });

  it("uses a ≥16px input token on the search field (no shrinking text class)", () => {
    render(<Host />);
    const input = screen.getByRole("combobox");
    expect(input.className).toContain("text-body");
    expect(input.className).not.toMatch(/text-(xs|sm)\b/);
  });

  it("selects a suggestion, extracts the structured address and marks it verified", async () => {
    const user = userEvent.setup();
    const seen: StructuredAddressInput[] = [];
    render(<Host onValue={(v) => seen.push(v)} />);

    await user.type(screen.getByRole("combobox"), "10 Main");
    const option = await screen.findByRole("option");
    await user.click(option);

    await waitFor(() => expect(screen.getByText(/Verified address/i)).toBeInTheDocument());
    const latest = seen[seen.length - 1];
    expect(isAddressVerified(latest)).toBe(true);
    expect(latest.googlePlaceId).toBe("p1");
    expect(latest.city).toBe("Cape Town");
    expect(latest.suburb).toBe("Sea Point");
    expect(latest.latitude).toBe(-33.91);
    expect(latest.countryCode).toBe("ZA");
  });

  it("invalidates the verified selection when the search text is edited", async () => {
    const user = userEvent.setup();
    const seen: StructuredAddressInput[] = [];
    render(<Host onValue={(v) => seen.push(v)} />);

    await user.type(screen.getByRole("combobox"), "10 Main");
    await user.click(await screen.findByRole("option"));
    await waitFor(() => expect(screen.getByText(/Verified address/i)).toBeInTheDocument());

    await user.type(screen.getByRole("combobox"), "x");
    const latest = seen[seen.length - 1];
    expect(latest.googlePlaceId).toBeNull();
    expect(latest.latitude).toBeNull();
    expect(latest.longitude).toBeNull();
    expect(screen.queryByText(/Verified address/i)).not.toBeInTheDocument();
  });

  it("preserves manual unit / building / access-instruction fields across a selection", async () => {
    const user = userEvent.setup();
    let latest: StructuredAddressInput = { ...EMPTY_ADDRESS_INPUT };
    render(
      <Host
        initial={{ ...EMPTY_ADDRESS_INPUT, unitNumber: "5B", buildingName: "The Halyard", accessInstructions: "Gate code 1234" }}
        onValue={(v) => (latest = v)}
      />
    );

    await user.type(screen.getByRole("combobox"), "10 Main");
    await user.click(await screen.findByRole("option"));
    await waitFor(() => expect(screen.getByText(/Verified address/i)).toBeInTheDocument());

    expect(latest.unitNumber).toBe("5B");
    expect(latest.buildingName).toBe("The Halyard");
    expect(latest.accessInstructions).toBe("Gate code 1234");
    expect(latest.city).toBe("Cape Town"); // located fields still filled from Google
  });

  it("clears everything on reset", async () => {
    const user = userEvent.setup();
    let latest: StructuredAddressInput = { ...EMPTY_ADDRESS_INPUT };
    render(<Host onValue={(v) => (latest = v)} />);

    await user.type(screen.getByRole("combobox"), "10 Main");
    await user.click(await screen.findByRole("option"));
    await waitFor(() => expect(screen.getByText(/Verified address/i)).toBeInTheDocument());

    await user.click(screen.getByLabelText(/clear address/i));
    expect(latest.googlePlaceId).toBeNull();
    expect(latest.city).toBeNull();
    expect((screen.getByRole("combobox") as HTMLInputElement).value).toBe("");
  });

  it("falls back to manual entry when the Places API fails", async () => {
    const user = userEvent.setup();
    __setPlacesProviderForTests(
      makeProvider({ fetchSuggestions: vi.fn(async () => Promise.reject(new Error("API failure"))) })
    );
    render(<Host />);

    await user.type(screen.getByRole("combobox"), "10 Main");
    await waitFor(() => expect(screen.getByText(/search is unavailable/i)).toBeInTheDocument());
    // The full manual form is revealed so the user can still enter an address.
    expect(screen.getByLabelText(/Address line 1/i)).toBeInTheDocument();
  });

  it("renders the manual fallback with no search box when there is no API key", () => {
    (env as unknown as { googleMapsApiKey: string }).googleMapsApiKey = "";
    render(<Host />);
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
    expect(screen.getByLabelText(/Address line 1/i)).toBeInTheDocument();
  });
});
