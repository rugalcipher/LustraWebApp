import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { EMPTY_DETAILS, toDetails } from "@/features/talentApplication/details";
import { EMPTY_ADDRESS_INPUT } from "@/domain/address";
import * as appointments from "@/services/appointmentService";

/**
 * The additive base-address form contracts: the talent application submits an optional private
 * base address (and omits it when blank), and a booker can list a client's saved addresses.
 */

describe("talent application details", () => {
  it("submits the private base address when one is entered", () => {
    const form = {
      ...EMPTY_DETAILS,
      legalFirstName: "A",
      legalSurname: "B",
      requestedDisplayName: "AB",
      email: "a@b.com",
      cellphoneNumber: "0821234567",
      dateOfBirth: "1990-01-01",
      shortBiography: "A biography that is definitely long enough to pass.",
      baseAddress: { ...EMPTY_ADDRESS_INPUT, city: "Cape Town", latitude: -33.9, longitude: 18.4 },
    };
    const details = toDetails(form);
    expect(details.baseAddress).not.toBeNull();
    expect(details.baseAddress!.city).toBe("Cape Town");
    expect(details.baseAddress!.latitude).toBe(-33.9);
  });

  it("omits the base address when it is blank", () => {
    const form = { ...EMPTY_DETAILS, baseAddress: { ...EMPTY_ADDRESS_INPUT } };
    expect(toDetails(form).baseAddress).toBeNull();
  });
});

describe("management booking address listing", () => {
  let calls: string[] = [];
  beforeEach(() => {
    calls = [];
    vi.stubGlobal("fetch", vi.fn(async (url: string) => {
      calls.push(String(url));
      return new Response(JSON.stringify([]), { status: 200, headers: { "content-type": "application/json" } });
    }));
  });
  afterEach(() => vi.unstubAllGlobals());

  it("reads a client's saved addresses from the management route", async () => {
    await appointments.listClientAddressesForBooking("client-123");
    expect(new URL(calls[0], "https://x.test").pathname).toMatch(
      /\/management\/bookings\/clients\/client-123\/addresses$/
    );
  });

  it("updates an appointment address via the address route", async () => {
    vi.stubGlobal("fetch", vi.fn(async (url: string, init: RequestInit = {}) => {
      calls.push(`${init.method} ${url}`);
      return new Response(null, { status: 204 });
    }));
    await appointments.updateAppointmentAddress("b1", null);
    expect(calls[0]).toMatch(/PUT .*\/management\/bookings\/b1\/address$/);
  });
});
