import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { ROUTES } from "@/app/routeRegistry";
import {
  toAddressInput, validateAddress, isAddressEmpty, formatAddressLine, formatPublicLocation,
  EMPTY_ADDRESS_INPUT,
} from "@/domain/address";
import * as clientAddresses from "@/services/clientAddressService";

describe("structured address domain", () => {
  it("normalises input: trims, empties to null, uppercases country", () => {
    const out = toAddressInput({ addressLine1: "  10 Main  ", city: "   ", countryCode: "za" });
    expect(out.addressLine1).toBe("10 Main");
    expect(out.city).toBeNull();
    expect(out.countryCode).toBe("ZA");
  });

  it("treats a truly blank form as empty (but a default country alone still needs a locator)", () => {
    expect(isAddressEmpty({})).toBe(true);
    expect(isAddressEmpty({ city: "Cape Town" })).toBe(false);
    // A country-only form is not empty, but is not a usable address either.
    expect(validateAddress(EMPTY_ADDRESS_INPUT, { required: true }).address).toBeTruthy();
  });

  it("validates coordinates and country like the server", () => {
    expect(validateAddress({ city: "Cape Town", latitude: -33.9, longitude: 18.4 })).toEqual({});
    expect(validateAddress({ latitude: 200, longitude: 18 }).latitude).toBeTruthy();
    expect(validateAddress({ latitude: 10 }).coordinates).toBeTruthy(); // half pair
    expect(validateAddress({ city: "X", countryCode: "ZAF" }).countryCode).toBeTruthy();
    expect(validateAddress({}, { required: true }).address).toBeTruthy();
  });

  it("formats a one-line address and a privacy-safe public location", () => {
    const full = {
      googlePlaceId: "p", formattedAddress: null, addressLine1: "10 Main Rd", addressLine2: null,
      suburb: "Sea Point", city: "Cape Town", province: "WC", postalCode: "8005", countryCode: "ZA",
      latitude: -33.9, longitude: 18.4, buildingName: null, unitNumber: null, accessInstructions: null,
      isGoogleVerified: true,
    };
    expect(formatAddressLine(full)).toContain("10 Main Rd");
    expect(formatPublicLocation({ suburb: "Sea Point", city: "Cape Town", province: "WC", countryCode: "ZA" }))
      .toBe("Sea Point, Cape Town, WC");
  });
});

describe("client address service", () => {
  let calls: { url: string; init: RequestInit }[] = [];
  beforeEach(() => {
    calls = [];
    vi.stubGlobal("fetch", vi.fn(async (url: string, init: RequestInit = {}) => {
      calls.push({ url: String(url), init });
      return new Response(JSON.stringify([]), { status: 200, headers: { "content-type": "application/json" } });
    }));
  });
  afterEach(() => vi.unstubAllGlobals());
  const last = () => new URL(calls[calls.length - 1].url, "https://example.test").pathname;

  it("hits the exact client address routes", async () => {
    await clientAddresses.listClientAddresses();
    expect(last()).toMatch(/\/client\/addresses$/);
    await clientAddresses.createClientAddress({ label: "Home", isDefault: true, address: { city: "Cape Town" } });
    expect(calls[calls.length - 1].init.method).toBe("POST");
    await clientAddresses.updateClientAddress("a1", { label: "Home", isDefault: false, address: {} });
    expect(last()).toMatch(/\/client\/addresses\/a1$/);
    await clientAddresses.deleteClientAddress("a1");
    expect(calls[calls.length - 1].init.method).toBe("DELETE");
    await clientAddresses.setDefaultClientAddress("a1");
    expect(last()).toMatch(/\/client\/addresses\/a1\/set-default$/);
  });
});

describe("client addresses route", () => {
  it("is registered, protected, and off the bottom bar", () => {
    const route = ROUTES.find((r) => r.path === "/app/addresses");
    expect(route?.access).toBe("protected");
    expect(route?.shell).toBe("client");
    expect(route?.nav).toBeUndefined();
  });
});
