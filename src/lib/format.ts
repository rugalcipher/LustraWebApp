/**
 * Safe display formatting.
 *
 * A rendered value is not a good place to discover that the backend sent null. A single
 * `value.toLocaleString()` on a nullable field blanks the whole page — React unmounts the
 * tree when a render throws — and the user is signed in, staring at nothing, with no way to
 * tell that their session is fine. These helpers make the boring case (a missing optional)
 * boring: it renders a dash, not a crash.
 *
 * Two rules run through all of them:
 *
 *  - **Null and undefined and NaN and invalid dates → the fallback.** A value the system
 *    does not have is shown as absent, never as "0" or "1 Jan 1970".
 *  - **Zero is a value.** `0` renders as `0`, an empty appointment count as `0`, a free rate
 *    as the formatted zero — never as the fallback. Collapsing zero into "missing" is how a
 *    real figure of nought becomes an em dash and a dashboard quietly lies.
 */

/** The default stand-in for a value the system does not have. */
export const EMPTY = "—";

/** True for the values that must never reach a formatter. Zero is deliberately NOT one of them. */
function isAbsent(value: unknown): boolean {
  return (
    value === null ||
    value === undefined ||
    (typeof value === "string" && value.trim() === "") ||
    (typeof value === "number" && Number.isNaN(value))
  );
}

/** Coerces to a finite number, or null when it cannot be one. Accepts numeric strings. */
function toFiniteNumber(value: unknown): number | null {
  if (isAbsent(value)) return null;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

/**
 * A plain number with locale grouping. `1234` → `1,234`, `0` → `0`, null → the fallback.
 */
export function formatNumber(value: unknown, fallback: string = EMPTY): string {
  const n = toFiniteNumber(value);
  if (n === null) return fallback;
  try {
    return new Intl.NumberFormat().format(n);
  } catch {
    return String(n);
  }
}

/**
 * A currency amount. A missing amount is the fallback; a missing currency falls back to ZAR
 * rather than throwing, because a number with no symbol is more useful than a blank page.
 * Zero renders as the formatted zero.
 */
export function formatCurrency(
  value: unknown,
  currency: string | null | undefined,
  fallback: string = EMPTY
): string {
  const n = toFiniteNumber(value);
  if (n === null) return fallback;

  const code = currency && currency.trim() ? currency.trim() : "ZAR";
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: code,
      maximumFractionDigits: 0,
    }).format(n);
  } catch {
    // An unrecognised currency code must not crash — show the number with the code beside it.
    return `${code} ${formatNumber(n)}`.trim();
  }
}

/** Parses whatever the backend might send into a valid Date, or null. */
function toDate(value: unknown): Date | null {
  if (isAbsent(value)) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  const d = new Date(value as string | number);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * A calendar date. An invalid or missing date is the fallback rather than "Invalid Date",
 * which is what `new Date(null).toLocaleDateString()` renders and no user should ever see.
 */
export function formatDate(
  value: unknown,
  fallback: string = EMPTY,
  options: Intl.DateTimeFormatOptions = { day: "numeric", month: "long", year: "numeric" }
): string {
  const d = toDate(value);
  if (d === null) return fallback;
  try {
    return d.toLocaleDateString(undefined, options);
  } catch {
    return fallback;
  }
}

/** A date with a time. Same absence rules as {@link formatDate}. */
export function formatDateTime(
  value: unknown,
  fallback: string = EMPTY,
  options: Intl.DateTimeFormatOptions = {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }
): string {
  const d = toDate(value);
  if (d === null) return fallback;
  try {
    return d.toLocaleString(undefined, options);
  } catch {
    return fallback;
  }
}
