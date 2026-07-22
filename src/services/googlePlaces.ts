import { env } from "@/config/env";

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
