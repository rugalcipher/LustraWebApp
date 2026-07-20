/**
 * Token persistence boundary.
 *
 * The .NET API returns tokens in the response body (`AuthResultDto.tokens`),
 * not as httpOnly cookies, so the browser must hold them:
 *
 *  - ACCESS token: memory only. It is short-lived (15 min) and is never written
 *    to any storage, so it cannot be read back after a tab is closed.
 *  - REFRESH token: `localStorage`, because a full page reload must be able to
 *    restore the session. The backend rotates it on every use and performs
 *    reuse detection, so a stolen-and-replayed token invalidates the family.
 *
 * This is the ONLY module that touches token storage. If the backend later
 * moves to httpOnly refresh cookies, only this file changes.
 */

const REFRESH_TOKEN_KEY = "lustra.refreshToken";
const REFRESH_EXPIRY_KEY = "lustra.refreshTokenExpiresAtUtc";

export interface StoredSession {
  accessToken: string;
  accessTokenExpiresAtUtc: string;
  refreshToken: string;
  refreshTokenExpiresAtUtc: string;
}

let accessToken: string | null = null;
let accessTokenExpiresAtUtc: string | null = null;

function safeLocalStorage(): Storage | null {
  try {
    if (typeof window === "undefined") return null;
    return window.localStorage;
  } catch {
    return null;
  }
}

export function getAccessToken(): string | null {
  return accessToken;
}

export function getAccessTokenExpiry(): Date | null {
  if (!accessTokenExpiresAtUtc) return null;
  const d = new Date(accessTokenExpiresAtUtc);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** True when there is no access token, or it expires within `skewMs`. */
export function isAccessTokenExpired(skewMs = 30_000, now: Date = new Date()): boolean {
  if (!accessToken) return true;
  const expiry = getAccessTokenExpiry();
  if (!expiry) return false;
  return expiry.getTime() - skewMs <= now.getTime();
}

export function getRefreshToken(): string | null {
  return safeLocalStorage()?.getItem(REFRESH_TOKEN_KEY) ?? null;
}

export function getRefreshTokenExpiry(): Date | null {
  const raw = safeLocalStorage()?.getItem(REFRESH_EXPIRY_KEY);
  if (!raw) return null;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** True when a refresh token exists and has not passed its stored expiry. */
export function hasUsableRefreshToken(now: Date = new Date()): boolean {
  if (!getRefreshToken()) return false;
  const expiry = getRefreshTokenExpiry();
  return !expiry || expiry.getTime() > now.getTime();
}

export function persistSession(session: StoredSession): void {
  accessToken = session.accessToken;
  accessTokenExpiresAtUtc = session.accessTokenExpiresAtUtc;
  const store = safeLocalStorage();
  try {
    store?.setItem(REFRESH_TOKEN_KEY, session.refreshToken);
    store?.setItem(REFRESH_EXPIRY_KEY, session.refreshTokenExpiresAtUtc);
  } catch {
    /* storage may be full or blocked — the in-memory access token still works */
  }
}

export function clearSession(): void {
  accessToken = null;
  accessTokenExpiresAtUtc = null;
  const store = safeLocalStorage();
  try {
    store?.removeItem(REFRESH_TOKEN_KEY);
    store?.removeItem(REFRESH_EXPIRY_KEY);
  } catch {
    /* ignore */
  }
}
