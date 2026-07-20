import { env } from "@/config/env";

/**
 * Resolve a media URL returned by the API.
 *
 * The backend emits ROOT-RELATIVE urls (`/api/v1/media/{id}?token=…`) or, once R2 is
 * configured, absolute CDN urls on the public media host. When the frontend is served
 * from a different origin than the API, the relative form must be rebased onto the API
 * origin or the browser would request it from the web host and 404.
 *
 * Absolute urls (CDN, data:, blob:) are returned untouched.
 */

/** The API origin derived from the configured base URL, or null for same-origin. */
const apiOrigin: string | null = (() => {
  try {
    // A relative base ("/api/v1") means same-origin; nothing to rebase.
    if (!/^https?:\/\//i.test(env.apiBaseUrl)) return null;
    return new URL(env.apiBaseUrl).origin;
  } catch {
    return null;
  }
})();

export function resolveMediaUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (/^(https?:|data:|blob:)/i.test(url)) return url;
  if (!url.startsWith("/")) return url;
  return apiOrigin ? `${apiOrigin}${url}` : url;
}

/** Resolve a list of media urls, dropping any that are empty. */
export function resolveMediaUrls(urls: readonly (string | null | undefined)[]): string[] {
  return urls.map(resolveMediaUrl).filter((u): u is string => Boolean(u));
}
