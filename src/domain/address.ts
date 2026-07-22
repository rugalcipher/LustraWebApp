/**
 * The shared structured-address model — the single frontend representation of an address, mirroring
 * the backend `StructuredAddress` / DTOs. Every address form and read surface uses these types
 * rather than a one-off shape per page. The next pass swaps the manual entry fields for Google
 * Places selection; these contracts do not change when it does.
 */

/** Mirrors the backend `StructuredAddressDto` (full — authorised callers only). */
export interface StructuredAddress {
  googlePlaceId: string | null;
  formattedAddress: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  suburb: string | null;
  city: string | null;
  province: string | null;
  postalCode: string | null;
  countryCode: string | null;
  latitude: number | null;
  longitude: number | null;
  buildingName: string | null;
  unitNumber: string | null;
  accessInstructions: string | null;
  /** True when confirmed through Google Places. Legacy/manual entries are false. */
  isGoogleVerified: boolean;
}

/** Mirrors the backend `StructuredAddressInput` — what a form submits. */
export interface StructuredAddressInput {
  googlePlaceId?: string | null;
  formattedAddress?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  suburb?: string | null;
  city?: string | null;
  province?: string | null;
  postalCode?: string | null;
  countryCode?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  buildingName?: string | null;
  unitNumber?: string | null;
  accessInstructions?: string | null;
}

/** Mirrors the backend `PublicLocationDto` — the only address projection safe to show publicly. */
export interface PublicLocation {
  suburb: string | null;
  city: string | null;
  province: string | null;
  countryCode: string | null;
}

/** An empty input, for initialising a new address form. */
export const EMPTY_ADDRESS_INPUT: StructuredAddressInput = {
  googlePlaceId: null,
  formattedAddress: null,
  addressLine1: null,
  addressLine2: null,
  suburb: null,
  city: null,
  province: null,
  postalCode: null,
  countryCode: "ZA",
  latitude: null,
  longitude: null,
  buildingName: null,
  unitNumber: null,
  accessInstructions: null,
};

const trimToNull = (value: string | null | undefined): string | null => {
  const trimmed = (value ?? "").trim();
  return trimmed.length > 0 ? trimmed : null;
};

/** Normalises a form's address input to the wire shape (trim, empty→null, upper country). */
export function toAddressInput(input: StructuredAddressInput): StructuredAddressInput {
  return {
    googlePlaceId: trimToNull(input.googlePlaceId),
    formattedAddress: trimToNull(input.formattedAddress),
    addressLine1: trimToNull(input.addressLine1),
    addressLine2: trimToNull(input.addressLine2),
    suburb: trimToNull(input.suburb),
    city: trimToNull(input.city),
    province: trimToNull(input.province),
    postalCode: trimToNull(input.postalCode),
    countryCode: trimToNull(input.countryCode)?.toUpperCase() ?? null,
    latitude: input.latitude ?? null,
    longitude: input.longitude ?? null,
    buildingName: trimToNull(input.buildingName),
    unitNumber: trimToNull(input.unitNumber),
    accessInstructions: trimToNull(input.accessInstructions),
  };
}

/**
 * True when the input carries a real locator — more than just a default country code. Use this
 * for OPTIONAL address fields, so an untouched form (which defaults `countryCode` to "ZA") is
 * treated as "not provided" and submitted as null rather than a country-only address.
 */
export function isAddressProvided(input: StructuredAddressInput): boolean {
  const a = toAddressInput(input);
  return Boolean(
    a.googlePlaceId || a.formattedAddress || a.addressLine1 || a.suburb || a.city || a.province ||
    a.postalCode || a.latitude != null || a.longitude != null || a.buildingName || a.unitNumber ||
    a.accessInstructions
  );
}

/** True when the input carries nothing at all. */
export function isAddressEmpty(input: StructuredAddressInput): boolean {
  const a = toAddressInput(input);
  return (
    !a.googlePlaceId && !a.formattedAddress && !a.addressLine1 && !a.suburb && !a.city &&
    !a.province && !a.postalCode && !a.countryCode && a.latitude == null && a.longitude == null &&
    !a.buildingName && !a.unitNumber && !a.accessInstructions
  );
}

/**
 * Client-side validation mirroring the server's rules, so a form can flag problems before a
 * round-trip. Returns a map of field→message; empty means valid. The server revalidates.
 */
export function validateAddress(
  input: StructuredAddressInput,
  { required = false }: { required?: boolean } = {}
): Record<string, string> {
  const a = toAddressInput(input);
  const errors: Record<string, string> = {};

  if (isAddressEmpty(a)) {
    if (required) errors.address = "An address is required";
    return errors;
  }

  // A country code alone is not an address — require something that actually locates it.
  if (required && !a.addressLine1 && !a.city && !a.formattedAddress) {
    errors.address = "Enter at least a street or city";
  }

  const hasLat = a.latitude != null;
  const hasLng = a.longitude != null;
  if (hasLat !== hasLng) {
    errors.coordinates = "Latitude and longitude must be provided together";
  }
  if (hasLat && (a.latitude! < -90 || a.latitude! > 90)) {
    errors.latitude = "Latitude must be between -90 and 90";
  }
  if (hasLng && (a.longitude! < -180 || a.longitude! > 180)) {
    errors.longitude = "Longitude must be between -180 and 180";
  }
  if (a.countryCode && !/^[A-Za-z]{2}$/.test(a.countryCode)) {
    errors.countryCode = "Use a two-letter country code";
  }
  return errors;
}

/** A one-line label for a saved/known address. Falls back through the structured fields. */
export function formatAddressLine(address: StructuredAddress | null | undefined): string {
  if (!address) return "";
  if (address.formattedAddress) return address.formattedAddress;
  return [address.addressLine1, address.suburb, address.city, address.province]
    .filter(Boolean)
    .join(", ");
}

/** The privacy-safe public location line (suburb/city/province/country only). */
export function formatPublicLocation(location: PublicLocation | null | undefined): string {
  if (!location) return "";
  return [location.suburb, location.city, location.province].filter(Boolean).join(", ");
}
