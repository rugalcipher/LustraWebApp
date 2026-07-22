import { env } from "@/config/env";
import type { StructuredAddressInput } from "@/domain/address";

/**
 * The single loader for the Google Maps JavaScript API (Places library).
 *
 * One script, ever. Concurrent consumers share one in-flight promise, so ten address fields
 * mounting at once inject one `<script>`, not ten. A missing key rejects with a distinct,
 * catchable error (never a thrown-away console line, and the key is never logged). A script or
 * API failure rejects and clears the cache so a later attempt can retry.
 *
 * The key is public by nature — it ships in the bundle — so it is restricted in Google Cloud
 * by HTTP referrer, not hidden here. Country restriction is applied by the consumer
 * (AddressAutocomplete) using {@link googlePlacesCountries}.
 *
 * Everything here is testable without contacting Google: the URL builder is pure, and the
 * loader injects a script element the test can drive.
 */

/** The Google Places is not configured (no API key). */
export class GoogleMapsNotConfiguredError extends Error {
  constructor() {
    super("Google Places is not configured. Set VITE_GOOGLE_MAPS_API_KEY.");
    this.name = "GoogleMapsNotConfiguredError";
  }
}

/** The Maps script failed to load or did not expose the Places library. */
export class GoogleMapsLoadError extends Error {
  constructor() {
    super("The Google Maps script could not be loaded.");
    this.name = "GoogleMapsLoadError";
  }
}

/** True when an API key is configured. Address inputs fall back to manual entry when false. */
export function isGoogleMapsConfigured(): boolean {
  return env.googleMapsApiKey.length > 0;
}

/** The ISO country codes the autocomplete is restricted to (e.g. ["za"]). */
export function googlePlacesCountries(): string[] {
  return env.googlePlacesCountries;
}

/**
 * Builds the Maps JS API URL. Pure and exported for tests — it must carry the Places library
 * and the async loading flag, and it must URL-encode the key.
 */
export function buildMapsScriptUrl(apiKey: string): string {
  const params = new URLSearchParams({
    key: apiKey,
    libraries: "places",
    loading: "async",
    v: "weekly",
  });
  return `https://maps.googleapis.com/maps/api/js?${params.toString()}`;
}

const SCRIPT_ID = "lustra-google-maps";

interface MapsGlobal {
  maps?: { places?: unknown };
}

let loaderPromise: Promise<MapsGlobal> | null = null;

/**
 * Loads the Maps JS API (Places) exactly once. Resolves with `window.google`. Rejects with
 * {@link GoogleMapsNotConfiguredError} when no key is set, or {@link GoogleMapsLoadError} on a
 * script/API failure (and clears the cache so a retry is possible).
 */
export function loadGoogleMaps(): Promise<MapsGlobal> {
  if (loaderPromise) return loaderPromise;

  loaderPromise = new Promise<MapsGlobal>((resolve, reject) => {
    if (!isGoogleMapsConfigured()) {
      reject(new GoogleMapsNotConfiguredError());
      return;
    }

    const w = window as unknown as { google?: MapsGlobal };
    if (w.google?.maps?.places) {
      resolve(w.google);
      return;
    }

    const existing = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
    const script = existing ?? document.createElement("script");

    const onLoad = () => {
      if (w.google?.maps?.places) resolve(w.google);
      else fail();
    };
    const fail = () => {
      loaderPromise = null; // allow a later retry
      reject(new GoogleMapsLoadError());
    };

    script.addEventListener("load", onLoad, { once: true });
    script.addEventListener("error", fail, { once: true });

    if (!existing) {
      script.id = SCRIPT_ID;
      script.async = true;
      script.defer = true;
      // The key travels in the URL (as Google requires) but is never logged.
      script.src = buildMapsScriptUrl(env.googleMapsApiKey);
      document.head.appendChild(script);
    }
  });

  return loaderPromise;
}

/** Test-only: forget the cached loader so each test starts clean. */
export function __resetGoogleMapsLoaderForTests(): void {
  loaderPromise = null;
  document.getElementById(SCRIPT_ID)?.remove();
}

// ---------------------------------------------------------------------------
// Places data layer — one integration for autocomplete + place details.
//
// This is the single place the app talks to Google's Places data. It uses the
// current supported surface (`AutocompleteSuggestion` + `Place`) rather than
// the legacy `AutocompleteService`/`PlacesService`, which are closed to new
// projects. A session token ties keystrokes to a selection so Google bills one
// session, not one request per keystroke.
//
// Everything Google-shaped is normalised into small plain objects at the edge
// (`PlaceSuggestion`, `RawPlace`) so the rest of the app — and every test —
// works with data, not Google SDK objects. A test provider can be injected via
// `__setPlacesProviderForTests`, so no unit test ever contacts Google.
// ---------------------------------------------------------------------------

/** One autocomplete suggestion, normalised away from the Google SDK shape. */
export interface PlaceSuggestion {
  placeId: string;
  /** The bold first line (e.g. "10 Main Road"). */
  primaryText: string;
  /** The context line (e.g. "Sea Point, Cape Town"). */
  secondaryText: string;
  /** The whole suggestion as one line, for accessibility/labels. */
  description: string;
}

/** One address component, normalised across the legacy and current SDK shapes. */
export interface RawAddressComponent {
  types: string[];
  longText: string;
  shortText: string;
}

/** A resolved place, normalised. `location` is null when Google has no geometry. */
export interface RawPlace {
  placeId: string | null;
  formattedAddress: string | null;
  components: RawAddressComponent[];
  location: { lat: number; lng: number } | null;
}

/** An opaque session token — grouping keystrokes + the selection into one billed session. */
export type PlacesSessionToken = unknown;

/** The seam the component talks to. The real one wraps Google; tests inject a fake. */
export interface PlacesProvider {
  createSessionToken(): PlacesSessionToken;
  fetchSuggestions(
    input: string,
    opts: { countries: string[]; sessionToken?: PlacesSessionToken; signal?: AbortSignal }
  ): Promise<PlaceSuggestion[]>;
  fetchDetails(placeId: string, opts: { sessionToken?: PlacesSessionToken }): Promise<RawPlace>;
}

interface GooglePlacesNamespace {
  AutocompleteSessionToken: new () => PlacesSessionToken;
  AutocompleteSuggestion: {
    fetchAutocompleteSuggestions(request: Record<string, unknown>): Promise<{ suggestions: unknown[] }>;
  };
  Place: new (options: { id: string }) => {
    fetchFields(request: { fields: string[] }): Promise<{ place: unknown }>;
    id?: string | null;
    formattedAddress?: string | null;
    addressComponents?: Array<{ types: string[]; longText?: string; shortText?: string }> | null;
    location?: { lat(): number; lng(): number } | null;
  };
}

function text(node: unknown): string {
  if (!node) return "";
  if (typeof node === "string") return node;
  const t = (node as { text?: unknown }).text;
  return typeof t === "string" ? t : "";
}

/** The production provider: resolves the loaded Google Places namespace lazily. */
const googleProvider: PlacesProvider = {
  createSessionToken() {
    const g = (window as unknown as { google?: { maps?: { places?: GooglePlacesNamespace } } }).google;
    const places = g?.maps?.places;
    return places ? new places.AutocompleteSessionToken() : undefined;
  },

  async fetchSuggestions(input, { countries, sessionToken }) {
    const google = await loadGoogleMaps();
    const places = (google as { maps?: { places?: GooglePlacesNamespace } }).maps?.places;
    if (!places?.AutocompleteSuggestion) throw new GoogleMapsLoadError();

    const request: Record<string, unknown> = { input, sessionToken };
    if (countries.length > 0) request.includedRegionCodes = countries;

    const { suggestions } = await places.AutocompleteSuggestion.fetchAutocompleteSuggestions(request);
    return (suggestions ?? [])
      .map((s) => (s as { placePrediction?: unknown }).placePrediction)
      .filter((p): p is Record<string, unknown> => Boolean(p && (p as { placeId?: string }).placeId))
      .map((p) => ({
        placeId: String((p as { placeId: string }).placeId),
        primaryText: text((p as { mainText?: unknown }).mainText) || text((p as { text?: unknown }).text),
        secondaryText: text((p as { secondaryText?: unknown }).secondaryText),
        description: text((p as { text?: unknown }).text),
      }));
  },

  async fetchDetails(placeId, { sessionToken }) {
    const google = await loadGoogleMaps();
    const places = (google as { maps?: { places?: GooglePlacesNamespace } }).maps?.places;
    if (!places?.Place) throw new GoogleMapsLoadError();

    const place = new places.Place({ id: placeId });
    await place.fetchFields({
      fields: ["id", "formattedAddress", "addressComponents", "location"],
      ...(sessionToken ? { sessionToken } : {}),
    } as { fields: string[] });

    const loc = place.location;
    return {
      placeId: place.id ?? placeId,
      formattedAddress: place.formattedAddress ?? null,
      components: (place.addressComponents ?? []).map((c) => ({
        types: c.types ?? [],
        longText: c.longText ?? "",
        shortText: c.shortText ?? "",
      })),
      location:
        loc && typeof loc.lat === "function" && typeof loc.lng === "function"
          ? { lat: loc.lat(), lng: loc.lng() }
          : null,
    };
  },
};

let provider: PlacesProvider = googleProvider;

/** Test-only: swap the Google-backed provider for a fake (pass null to restore). */
export function __setPlacesProviderForTests(fake: PlacesProvider | null): void {
  provider = fake ?? googleProvider;
}

/** Starts a new autocomplete billing session. Reuse the token across keystrokes + the pick. */
export function createPlacesSessionToken(): PlacesSessionToken {
  return provider.createSessionToken();
}

/** Fetches autocomplete suggestions for a query, restricted to the configured countries. */
export function fetchAddressSuggestions(
  input: string,
  opts: { sessionToken?: PlacesSessionToken; countries?: string[]; signal?: AbortSignal } = {}
): Promise<PlaceSuggestion[]> {
  const query = input.trim();
  if (query.length === 0) return Promise.resolve([]);
  return provider.fetchSuggestions(query, {
    countries: opts.countries ?? googlePlacesCountries(),
    sessionToken: opts.sessionToken,
    signal: opts.signal,
  });
}

/** Resolves a chosen suggestion to a full, normalised place (components + geometry). */
export function fetchPlaceDetails(
  placeId: string,
  opts: { sessionToken?: PlacesSessionToken } = {}
): Promise<RawPlace> {
  return provider.fetchDetails(placeId, { sessionToken: opts.sessionToken });
}

/**
 * Reads the first component whose `types` intersect `wanted`, honouring the order of `wanted`
 * as a preference list. Returns the requested variant (long or short), or null.
 */
function pick(
  components: RawAddressComponent[],
  wanted: string[],
  variant: "long" | "short" = "long"
): string | null {
  for (const type of wanted) {
    const hit = components.find((c) => c.types.includes(type));
    if (hit) {
      const value = variant === "short" ? hit.shortText : hit.longText;
      const trimmed = (value || "").trim();
      if (trimmed) return trimmed;
    }
  }
  return null;
}

/**
 * Maps a resolved Google place onto the app's structured-address model.
 *
 * Robust across countries: a suburb may arrive as `sublocality`, `neighborhood` or `locality`;
 * a city as `locality`, `postal_town` or an administrative level; a province as
 * `administrative_area_level_1`. Nothing is fabricated — a missing component yields null rather
 * than a guess, and a suburb is never duplicated into the city field. Manual detail fields
 * (`addressLine2`, `accessInstructions`) are the caller's, not Google's, so they are left unset.
 */
export function extractStructuredAddress(place: RawPlace): StructuredAddressInput {
  const c = place.components;

  const streetNumber = pick(c, ["street_number"]);
  const route = pick(c, ["route"]);
  const premise = pick(c, ["premise"]);
  const subpremise = pick(c, ["subpremise"]);

  // The primary line: street number + route, else a named premise, else nothing (never faked).
  const streetLine = [streetNumber, route].filter(Boolean).join(" ").trim();
  const addressLine1 = streetLine || premise || null;

  // City: a real locality first, then a postal town, then the district municipality.
  const city = pick(c, ["locality", "postal_town", "administrative_area_level_2"]);

  // Suburb: the finest-grained area below the city — but never the same value as the city.
  let suburb = pick(c, ["sublocality_level_1", "sublocality", "neighborhood"]);
  if (!suburb) {
    const locality = pick(c, ["locality"]);
    // A place that is only a suburb often reports it as `locality`; surface it as the suburb
    // only when it is not already doing duty as the city.
    if (locality && locality !== city) suburb = locality;
  }
  if (suburb && suburb === city) suburb = null;

  const province = pick(c, ["administrative_area_level_1"]);
  const postalCode = pick(c, ["postal_code"]);
  const countryCode = pick(c, ["country"], "short");

  return {
    googlePlaceId: place.placeId,
    formattedAddress: place.formattedAddress,
    addressLine1,
    // Line 2 is a manual field — Google never fills it.
    addressLine2: null,
    suburb,
    city,
    province,
    postalCode,
    countryCode: countryCode ? countryCode.toUpperCase() : null,
    latitude: place.location?.lat ?? null,
    longitude: place.location?.lng ?? null,
    // A named building maps to buildingName; a sub-unit to unitNumber. Both stay editable.
    buildingName: premise && premise !== addressLine1 ? premise : null,
    unitNumber: subpremise,
    accessInstructions: null,
  };
}
