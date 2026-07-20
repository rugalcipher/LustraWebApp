/**
 * Idempotency keys for state-changing requests.
 *
 * The backend reads the `Idempotency-Key` HTTP HEADER (never a body field — the
 * frontend must not be asked to supply server-owned values in a payload) on
 * `POST /client/inquiries`, proposal creation and booking confirmation.
 *
 * A key is minted per logical user intent and REUSED across retries of that
 * same intent, so a double-tap or a network retry cannot create two inquiries.
 */

export function newIdempotencyKey(): string {
  try {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  } catch {
    /* fall through */
  }
  return `idem-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

/**
 * A stable key holder for one user intent. Create it when a form opens; the
 * same key is sent for every submit attempt until `reset()` is called after a
 * confirmed success.
 */
export function createIdempotencyScope(): { key: () => string; reset: () => void } {
  let current = newIdempotencyKey();
  return {
    key: () => current,
    reset: () => {
      current = newIdempotencyKey();
    },
  };
}

export const IDEMPOTENCY_HEADER = "Idempotency-Key";
