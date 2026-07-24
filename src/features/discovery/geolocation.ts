/**
 * Browser geolocation, wrapped so a caller never has to touch the callback API or the error
 * codes. It is invoked ONLY from a deliberate user action — never on load — so a visitor is
 * never prompted for their location without asking for it first.
 *
 * The promise never rejects: every outcome, including a denied permission or a timeout, is a
 * value the UI can present calmly. Coordinates are returned to the caller to use once (a nearby
 * search); nothing here stores them.
 */

export type GeolocationOutcome =
  | { status: "granted"; latitude: number; longitude: number }
  | { status: "denied" }
  | { status: "unavailable" }
  | { status: "timeout" }
  | { status: "unsupported" };

/**
 * Requests the device's current position once. Uses low-accuracy, a bounded timeout and a short
 * cache so it resolves quickly rather than blocking on a precise fix the visitor did not ask for.
 */
export function requestCurrentPosition(options?: PositionOptions): Promise<GeolocationOutcome> {
  return new Promise((resolve) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      resolve({ status: "unsupported" });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) =>
        resolve({
          status: "granted",
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        }),
      (error) => {
        if (error.code === error.PERMISSION_DENIED) resolve({ status: "denied" });
        else if (error.code === error.TIMEOUT) resolve({ status: "timeout" });
        else resolve({ status: "unavailable" });
      },
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 300_000, ...options }
    );
  });
}

/** A calm, non-technical message for each non-granted outcome. Null when granted. */
export function geolocationMessage(status: GeolocationOutcome["status"]): string | null {
  switch (status) {
    case "denied":
      return "Location permission was declined — search for a place instead.";
    case "timeout":
      return "That took too long — try again, or search for a place instead.";
    case "unavailable":
      return "We couldn't determine your location — search for a place instead.";
    case "unsupported":
      return "This browser can't share a location — search for a place instead.";
    default:
      return null;
  }
}

/** The browser's stored decision, or "unknown" when the Permissions API is unavailable. */
export type GeolocationPermission = "granted" | "prompt" | "denied" | "unknown";

/**
 * Reads the stored geolocation permission WITHOUT prompting, via the Permissions API.
 *
 * This is what lets us avoid the confusing "instantly declined" experience: when the browser has
 * already stored a block, calling getCurrentPosition again shows no prompt and fails immediately,
 * so we must NOT call it — we query the state first and, when it is "denied", show recovery
 * guidance instead. Returns "unknown" where the Permissions API is missing (e.g. older Safari),
 * so the caller falls back to attempting getCurrentPosition and interpreting its error.
 */
export async function queryGeolocationPermission(): Promise<GeolocationPermission> {
  try {
    if (typeof navigator === "undefined" || !navigator.permissions?.query) return "unknown";
    const status = await navigator.permissions.query({ name: "geolocation" as PermissionName });
    return (status.state as GeolocationPermission) ?? "unknown";
  } catch {
    // Some browsers throw for an unsupported permission name — treat as unknown.
    return "unknown";
  }
}

/** True only when we can be SURE the page is not a secure context (geolocation needs HTTPS). */
export function isInsecureContext(): boolean {
  return typeof window !== "undefined" && window.isSecureContext === false;
}

/**
 * Platform-aware, honest guidance for re-enabling a blocked location permission. We CANNOT open a
 * browser's permission settings for the user, so this only tells them where to look. Detection is
 * best-effort from the user agent; the steps are safe to show even if the guess is slightly off.
 */
export function platformLocationGuidance(userAgent?: string): { platform: string; steps: string[] } {
  const ua = (userAgent ?? (typeof navigator !== "undefined" ? navigator.userAgent : "")).toLowerCase();
  const isIOS = /iphone|ipad|ipod/.test(ua) || (/macintosh/.test(ua) && typeof navigator !== "undefined" && (navigator as unknown as { maxTouchPoints?: number }).maxTouchPoints! > 1);
  const isAndroid = /android/.test(ua);

  if (isIOS) {
    return {
      platform: "iPhone / iPad (Safari)",
      steps: [
        "Open the iPhone Settings app",
        "Go to Privacy & Security → Location Services",
        "Scroll to Safari Websites and set it to “While Using”",
        "Also check Settings → Safari → Location for this website, then return and try again",
      ],
    };
  }
  if (isAndroid) {
    return {
      platform: "Android (Chrome)",
      steps: [
        "Open the browser menu (⋮)",
        "Tap the site information / lock icon in the address bar",
        "Open Permissions → Location and set it to Allow",
        "Reload Lustra, then try again",
      ],
    };
  }
  return {
    platform: "Chrome / Edge (desktop)",
    steps: [
      "Click the site-controls icon beside the address bar (a lock or tune icon)",
      "Open Site settings",
      "Set Location to Allow",
      "Reload Lustra, then try again",
    ],
  };
}
