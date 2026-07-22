import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import TalentEditForm from "@/features/talentAdmin/TalentEditForm";

/**
 * The Management Talent-edit form exists inside the record shell and submits the private
 * structured base address (plus the preserved profile fields) through the admin update contract.
 */

function renderForm(talent: Record<string, unknown>) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <TalentEditForm profileId="talent-1" talent={talent} onDone={() => {}} />
    </QueryClientProvider>
  );
}

const BASE_TALENT = {
  displayName: "Aria",
  legalFirstName: "Aria",
  legalSurname: "Vega",
  headline: "Host",
  shortBiography: "Bio",
  fullBiography: "Full bio",
  dateOfBirth: "1995-06-15",
  isAgePublic: true,
  cityId: null,
  regionId: null,
  cellphoneNumber: "0821234567",
  whatsAppNumber: null,
  instagramUrl: null,
  additionalSocialUrl: null,
  availabilityStatus: "Available",
  travelAvailable: true,
  eventAvailable: false,
  baseAddress: {
    googlePlaceId: null,
    formattedAddress: null,
    addressLine1: "10 Main Rd",
    addressLine2: null,
    suburb: "Sea Point",
    city: "Cape Town",
    province: "WC",
    postalCode: "8005",
    countryCode: "ZA",
    latitude: -33.9,
    longitude: 18.4,
    buildingName: null,
    unitNumber: null,
    accessInstructions: "Buzzer 4",
    isGoogleVerified: false,
  },
};

describe("TalentEditForm", () => {
  let calls: { url: string; init: RequestInit }[] = [];
  beforeEach(() => {
    calls = [];
    vi.stubGlobal("fetch", vi.fn(async (url: string, init: RequestInit = {}) => {
      calls.push({ url: String(url), init });
      // Cities GET → empty list; the PUT update → 204.
      if ((init.method ?? "GET") === "GET") {
        return new Response(JSON.stringify([]), { status: 200, headers: { "content-type": "application/json" } });
      }
      return new Response(null, { status: 204 });
    }));
  });
  afterEach(() => vi.unstubAllGlobals());

  it("renders the edit fields, seeded from the record", () => {
    renderForm(BASE_TALENT);
    expect((screen.getByLabelText(/Display name/i) as HTMLInputElement).value).toBe("Aria");
    expect(screen.getByText(/Private base address/i)).toBeInTheDocument();
  });

  it("submits the private base address and preserves scalar fields", async () => {
    const user = userEvent.setup();
    renderForm(BASE_TALENT);

    await user.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() => {
      const put = calls.find((c) => (c.init.method ?? "GET") === "PUT");
      expect(put).toBeTruthy();
    });
    const put = calls.find((c) => (c.init.method ?? "GET") === "PUT")!;
    expect(put.url).toMatch(/\/management\/talents\/talent-1$/);
    const body = JSON.parse(String(put.init.body));
    expect(body.baseAddress).not.toBeNull();
    expect(body.baseAddress.city).toBe("Cape Town");
    expect(body.baseAddress.accessInstructions).toBe("Buzzer 4");
    // Preserved so the update does not clear them.
    expect(body.legalFirstName).toBe("Aria");
    expect(body.displayName).toBe("Aria");
    // Categories and rates are left unchanged.
    expect(body.categoryIds).toBeNull();
    expect(body.rates).toBeNull();
  });

  it("blocks submit when the display name is cleared", async () => {
    const user = userEvent.setup();
    renderForm(BASE_TALENT);
    await user.clear(screen.getByLabelText(/Display name/i));
    fireEvent.submit(screen.getByRole("button", { name: /save changes/i }).closest("form")!);
    await screen.findByText(/display name is required/i);
    expect(calls.some((c) => (c.init.method ?? "GET") === "PUT")).toBe(false);
  });
});
