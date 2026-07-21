/**
 * Custody of the applicant's access token.
 *
 * The token is the only thing standing between an application id and a
 * stranger's legal name, date of birth, phone number and private photographs.
 * It is therefore treated as a credential:
 *
 *  - **sessionStorage, not localStorage.** The applicant needs continuity across
 *    a reload and across the four form sections, which rules out memory-only.
 *    They do not need it to outlive the tab: the backend emails a continuation
 *    link if anything further is required, so a token surviving indefinitely on
 *    a shared machine buys nothing and risks everything. The contract requires
 *    no persistent store.
 *  - **Never in a URL.** A query-string token reaches access logs, proxy logs,
 *    browser history and the `Referer` header sent to third parties. It travels
 *    only in the `X-Application-Token` request header.
 *  - **Never logged.** Nothing here writes the token to the console, to
 *    telemetry, or into an error payload — see `redactToken`.
 *
 * The stored record is scoped to one application id. A token belongs to exactly
 * one application server-side, and keeping the pair together means a stale token
 * can never be presented against a different application.
 */

const KEY = "lustra.talentApplication";

export type ApplicationTokenScope = "full" | "statusOnly";

export interface ApplicationSession {
  applicationId: string;
  token: string;
  /** `full` may edit; `statusOnly` (issued at submit) may only read status. */
  scope: ApplicationTokenScope;
  reference: string;
  /** ISO instant after which the server will refuse the token. */
  expiresAtUtc?: string;
}

function storage(): Storage | null {
  try {
    return typeof sessionStorage === "undefined" ? null : sessionStorage;
  } catch {
    // Private-mode or a blocked third-party context. The form still works; the
    // applicant simply cannot resume after a reload.
    return null;
  }
}

export function saveSession(session: ApplicationSession): void {
  try {
    storage()?.setItem(KEY, JSON.stringify(session));
  } catch {
    /* Quota or disabled storage — non-fatal, the in-memory flow continues. */
  }
}

export function loadSession(): ApplicationSession | null {
  try {
    const raw = storage()?.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ApplicationSession;
    if (!parsed?.applicationId || !parsed?.token) return null;
    if (parsed.expiresAtUtc && Date.parse(parsed.expiresAtUtc) <= Date.now()) {
      clearSession();
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function clearSession(): void {
  try {
    storage()?.removeItem(KEY);
  } catch {
    /* nothing to do */
  }
}

/**
 * Strips a token from anything about to be displayed or reported.
 *
 * Used on the review screen and in error surfaces so a token cannot reach a
 * screenshot, a support ticket or an error report.
 */
export function redactToken(value: string | null | undefined): string {
  if (!value) return "";
  return value.length <= 8 ? "••••" : `${value.slice(0, 4)}••••••••`;
}

/**
 * Removes the application/token parameters from the address bar after they have
 * been captured from a continuation link.
 *
 * `history.replaceState` rather than `pushState`: the entry carrying the token
 * must not remain reachable with the Back button, and it must not be written
 * into session history where it would survive in the browser's UI.
 */
export function scrubTokenFromUrl(): void {
  if (typeof window === "undefined" || !window.history?.replaceState) return;
  const url = new URL(window.location.href);
  if (!url.searchParams.has("token") && !url.searchParams.has("application")) return;
  url.searchParams.delete("token");
  url.searchParams.delete("application");
  window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
}
