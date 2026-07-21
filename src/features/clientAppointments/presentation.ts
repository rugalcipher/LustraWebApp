/**
 * Formatting for client-facing appointments.
 *
 * The backend sends a `DateOnly`, two `TimeOnly`s and an IANA time zone rather
 * than one instant, because an appointment is at a wall-clock time in a place —
 * not at a moment in the reader's browser. Converting to the device's zone would
 * move a 19:00 Cape Town appointment to 18:00 for someone travelling, which is
 * wrong in the way that makes people miss things. The zone is therefore shown,
 * never applied.
 */

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** "Saturday 14 February 2026", or null when the date is not yet confirmed. */
export function formatAppointmentDate(isoDate: string | null | undefined): string | null {
  if (!isoDate) return null;
  const [y, m, d] = isoDate.split("-").map(Number);
  if (!y || !m || !d) return null;
  const date = new Date(Date.UTC(y, m - 1, d));
  const weekday = date.toLocaleDateString(undefined, { weekday: "long", timeZone: "UTC" });
  return `${weekday} ${d} ${MONTHS[m - 1]} ${y}`;
}

/** "19:00 – 22:00" from two `TimeOnly` strings, or a single time, or null. */
export function formatAppointmentTime(
  start: string | null | undefined,
  end: string | null | undefined
): string | null {
  const hhmm = (t: string | null | undefined) => (t ? t.slice(0, 5) : null);
  const from = hhmm(start);
  const to = hhmm(end);
  if (from && to) return `${from} – ${to}`;
  return from ?? null;
}

/** "3 hours", "90 minutes", or null when the backend did not supply one. */
export function formatDuration(minutes: number | null | undefined): string | null {
  if (!minutes || minutes <= 0) return null;
  if (minutes % 60 === 0) {
    const hours = minutes / 60;
    return `${hours} ${hours === 1 ? "hour" : "hours"}`;
  }
  return `${minutes} minutes`;
}

/**
 * The place, as much of it as the client is entitled to know.
 *
 * `privateLocationDetails` is the talent's reporting address and is not on the
 * client DTO at all — this composes only the fields that are.
 */
export function formatLocation(appointment: {
  venueName?: string | null;
  generalLocation?: string | null;
  cityName?: string | null;
}): string | null {
  return (
    [appointment.venueName, appointment.generalLocation, appointment.cityName]
      .filter(Boolean)
      .join(" · ") || null
  );
}

/** Reader-facing status wording. The raw enum name is not a sentence. */
export function presentStatus(status: string): string {
  return (status ?? "").replace(/([a-z])([A-Z])/g, "$1 $2");
}

export type StatusTone = "confirmed" | "active" | "closed" | "warning" | "neutral";

export function statusTone(status: string): StatusTone {
  switch ((status ?? "").toLowerCase()) {
    case "confirmed":
      return "confirmed";
    case "inprogress":
      return "active";
    case "completed":
      return "closed";
    case "cancelled":
    case "declined":
    case "noshow":
      return "warning";
    default:
      return "neutral";
  }
}
