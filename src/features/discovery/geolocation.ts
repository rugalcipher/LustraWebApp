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
