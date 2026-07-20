/**
 * Single-flight refresh-token coordinator.
 *
 * Guarantees required by the integration brief:
 *  - Only ONE `POST /auth/refresh` is in flight at a time. Concurrent 401s all
 *    await the same promise instead of racing (which, against a rotating
 *    refresh token with reuse detection, would invalidate the whole family).
 *  - Each original request is retried at most ONCE after a successful refresh,
 *    so a persistently-401 endpoint can never produce an infinite loop.
 *  - A failed refresh clears the session exactly once and notifies subscribers,
 *    which routes the user to sign-in while preserving the attempted route.
 *
 * It performs its own bare `fetch` rather than going through the central client,
 * both to avoid a circular import and to guarantee the refresh call itself can
 * never be intercepted by the 401 handler it exists to serve.
 */

import { env } from "@/config/env";
import { ApiError, type ProblemDetails } from "@/api/problemDetails";
import {
  clearSession,
  getRefreshToken,
  hasUsableRefreshToken,
  persistSession,
  type StoredSession,
} from "@/api/tokenStorage";

/** Wire shape of `AuthResultDto.tokens`. */
interface AuthTokensWire {
  accessToken: string;
  accessTokenExpiresAtUtc: string;
  refreshToken: string;
  refreshTokenExpiresAtUtc: string;
  tokenType?: string;
}

interface AuthResultWire {
  user?: unknown;
  tokens: AuthTokensWire;
}

export type SessionEndedReason = "refresh-failed" | "logout" | "revoked";

type SessionEndedListener = (reason: SessionEndedReason) => void;
type SessionStartedListener = (user: unknown) => void;

const sessionEndedListeners = new Set<SessionEndedListener>();
const sessionStartedListeners = new Set<SessionStartedListener>();

export function onSessionEnded(listener: SessionEndedListener): () => void {
  sessionEndedListeners.add(listener);
  return () => sessionEndedListeners.delete(listener);
}

export function onSessionStarted(listener: SessionStartedListener): () => void {
  sessionStartedListeners.add(listener);
  return () => sessionStartedListeners.delete(listener);
}

function emitSessionEnded(reason: SessionEndedReason): void {
  for (const listener of [...sessionEndedListeners]) {
    try {
      listener(reason);
    } catch {
      /* a broken listener must not break session teardown */
    }
  }
}

function emitSessionStarted(user: unknown): void {
  for (const listener of [...sessionStartedListeners]) {
    try {
      listener(user);
    } catch {
      /* ignore */
    }
  }
}

/** Adopt a fresh `AuthResultDto` (login, register, activation, refresh). */
export function adoptAuthResult(result: AuthResultWire): void {
  const t = result.tokens;
  const session: StoredSession = {
    accessToken: t.accessToken,
    accessTokenExpiresAtUtc: t.accessTokenExpiresAtUtc,
    refreshToken: t.refreshToken,
    refreshTokenExpiresAtUtc: t.refreshTokenExpiresAtUtc,
  };
  persistSession(session);
  emitSessionStarted(result.user);
}

/** Drop the local session and notify. Does NOT call the server. */
export function endSession(reason: SessionEndedReason = "logout"): void {
  clearSession();
  emitSessionEnded(reason);
}

// --- Single-flight refresh ---------------------------------------------------

let inFlight: Promise<string | null> | null = null;

async function performRefresh(): Promise<string | null> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;

  let res: Response;
  try {
    res = await fetch(`${env.apiBaseUrl}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ refreshToken }),
    });
  } catch {
    // Network failure: do NOT clear the session — the refresh token may still be
    // valid and the user should not be signed out because the wifi dropped.
    throw ApiError.network();
  }

  if (!res.ok) {
    // The refresh token is rejected/rotated/reused — the session is genuinely over.
    let problem: ProblemDetails | undefined;
    try {
      problem = (await res.json()) as ProblemDetails;
    } catch {
      /* non-JSON error body */
    }
    endSession("refresh-failed");
    throw ApiError.fromProblem(res.status, problem);
  }

  const result = (await res.json()) as AuthResultWire;
  adoptAuthResult(result);
  return result.tokens.accessToken;
}

/**
 * Refresh the access token, coalescing concurrent callers onto one request.
 * Returns the new access token, or `null` when no refresh token is available.
 * Throws the underlying {@link ApiError} when the refresh itself fails.
 */
export function refreshAccessToken(): Promise<string | null> {
  if (inFlight) return inFlight;
  if (!hasUsableRefreshToken()) return Promise.resolve(null);

  inFlight = performRefresh().finally(() => {
    inFlight = null;
  });
  return inFlight;
}

/** Test seam: true while a refresh request is in flight. */
export function isRefreshInFlight(): boolean {
  return inFlight !== null;
}
