import { describe, it, expect } from "vitest";
import { extractStructuredAddress, type RawPlace } from "@/services/googlePlaces";

/**
 * Component-extraction is a pure function, so it is tested exhaustively here with fixture
 * places — no Google contact, no component mounted. The fixtures mirror the shapes Google
 * actually returns for South African and international addresses, including the awkward ones
 * (missing street number, missing postal code, no geometry, a place that is only a suburb).
 */

const comp = (types: string[], longText: string, shortText = longText) => ({ types, longText, shortText });

function place(components: RawPlace["components"], extra: Partial<RawPlace> = {}): RawPlace {
  return {
    placeId: "place-id",
    formattedAddress: "Formatted, Address",
    components,
    location: { lat: -26.1, lng: 28.05 },
    ...extra,
  };
}

describe("extractStructuredAddress", () => {
  it("maps a Sandton / Johannesburg street address", () => {
    const out = extractStructuredAddress(
      place([
        comp(["street_number"], "135"),
        comp(["route"], "West Street"),
        comp(["sublocality_level_1", "sublocality"], "Sandown"),
        comp(["locality"], "Sandton"),
        comp(["administrative_area_level_2"], "City of Johannesburg"),
        comp(["administrative_area_level_1"], "Gauteng", "GP"),
        comp(["country"], "South Africa", "ZA"),
        comp(["postal_code"], "2196"),
      ])
    );
    expect(out.addressLine1).toBe("135 West Street");
    expect(out.suburb).toBe("Sandown");
    expect(out.city).toBe("Sandton");
    expect(out.province).toBe("Gauteng");
    expect(out.postalCode).toBe("2196");
    expect(out.countryCode).toBe("ZA");
    expect(out.latitude).toBe(-26.1);
    expect(out.longitude).toBe(28.05);
    expect(out.googlePlaceId).toBe("place-id");
  });

  it("maps a Cape Town suburb address (neighbourhood → suburb)", () => {
    const out = extractStructuredAddress(
      place([
        comp(["street_number"], "10"),
        comp(["route"], "Main Road"),
        comp(["neighborhood"], "Sea Point"),
        comp(["locality"], "Cape Town"),
        comp(["administrative_area_level_1"], "Western Cape", "WC"),
        comp(["country"], "South Africa", "ZA"),
        comp(["postal_code"], "8005"),
      ])
    );
    expect(out.addressLine1).toBe("10 Main Road");
    expect(out.suburb).toBe("Sea Point");
    expect(out.city).toBe("Cape Town");
    expect(out.province).toBe("Western Cape");
  });

  it("maps an Eastern Cape town / rural address using the district municipality as the city", () => {
    const out = extractStructuredAddress(
      place([
        comp(["route"], "R72"),
        comp(["administrative_area_level_2"], "Sarah Baartman District Municipality"),
        comp(["administrative_area_level_1"], "Eastern Cape", "EC"),
        comp(["country"], "South Africa", "ZA"),
      ])
    );
    expect(out.addressLine1).toBe("R72");
    expect(out.city).toBe("Sarah Baartman District Municipality");
    expect(out.province).toBe("Eastern Cape");
    expect(out.suburb).toBeNull();
    expect(out.postalCode).toBeNull();
  });

  it("maps a unit / subpremise into unitNumber and keeps the street line", () => {
    const out = extractStructuredAddress(
      place([
        comp(["subpremise"], "Unit 12"),
        comp(["premise"], "The Halyard"),
        comp(["street_number"], "5"),
        comp(["route"], "Beach Road"),
        comp(["locality"], "Mouille Point"),
        comp(["administrative_area_level_1"], "Western Cape", "WC"),
        comp(["country"], "South Africa", "ZA"),
      ])
    );
    expect(out.addressLine1).toBe("5 Beach Road");
    expect(out.unitNumber).toBe("Unit 12");
    expect(out.buildingName).toBe("The Halyard");
  });

  it("maps an international address using the short country code", () => {
    const out = extractStructuredAddress(
      place([
        comp(["street_number"], "221B"),
        comp(["route"], "Baker Street"),
        comp(["postal_town"], "London"),
        comp(["administrative_area_level_1"], "England", "England"),
        comp(["country"], "United Kingdom", "GB"),
        comp(["postal_code"], "NW1 6XE"),
      ])
    );
    expect(out.addressLine1).toBe("221B Baker Street");
    expect(out.city).toBe("London"); // postal_town fallback
    expect(out.countryCode).toBe("GB");
    expect(out.postalCode).toBe("NW1 6XE");
  });

  it("handles a missing postal code without fabricating one", () => {
    const out = extractStructuredAddress(
      place([
        comp(["street_number"], "1"),
        comp(["route"], "Long Street"),
        comp(["locality"], "Cape Town"),
        comp(["country"], "South Africa", "ZA"),
      ])
    );
    expect(out.postalCode).toBeNull();
    expect(out.addressLine1).toBe("1 Long Street");
  });

  it("handles a missing street number (route only)", () => {
    const out = extractStructuredAddress(
      place([
        comp(["route"], "Klein Constantia Road"),
        comp(["sublocality"], "Constantia"),
        comp(["locality"], "Cape Town"),
        comp(["country"], "South Africa", "ZA"),
      ])
    );
    expect(out.addressLine1).toBe("Klein Constantia Road");
    expect(out.suburb).toBe("Constantia");
    expect(out.city).toBe("Cape Town");
  });

  it("handles a place that represents only a suburb / city (no street) without duplicating", () => {
    const out = extractStructuredAddress(
      place([
        comp(["locality"], "Stellenbosch"),
        comp(["administrative_area_level_1"], "Western Cape", "WC"),
        comp(["country"], "South Africa", "ZA"),
      ])
    );
    expect(out.addressLine1).toBeNull();
    expect(out.city).toBe("Stellenbosch");
    // The locality is doing duty as the city, so it must not also be echoed as the suburb.
    expect(out.suburb).toBeNull();
  });

  it("handles invalid / missing geometry by leaving coordinates null", () => {
    const out = extractStructuredAddress(
      place(
        [
          comp(["route"], "Somewhere"),
          comp(["country"], "South Africa", "ZA"),
        ],
        { location: null }
      )
    );
    expect(out.latitude).toBeNull();
    expect(out.longitude).toBeNull();
  });
});
