/**
 * The restricted session.
 *
 * When an administrator issues a temporary password or forces a reset, the
 * backend mints an `mcp` claim on the token and refuses **every** authenticated
 * route with `auth.password_change_required` until the password is changed.
 * `PasswordChangeRequiredMiddleware` is deny-by-default: a route added later is
 * protected because nobody opted it in.
 *
 * This module is the client's mirror of that rule. Two things it is careful not
 * to be:
 *
 *  - **Not the enforcement.** The server refuses the request whatever the UI
 *    does. Routing the user to the change screen is a kindness that turns an
 *    unexplained wall of 403s into an actionable instruction; it is not the
 *    control, and it must never be written as though it were.
 *  - **Not dismissible.** The flag comes from `/auth/me` and from a signed
 *    claim. Clearing it locally would hide the screen while leaving every
 *    request refused, which is a worse experience than the lockout.
 *
 * The restriction survives a refresh because it is re-read from the session on
 * every load, not held in component state.
 */

/** The refusal the API returns for a restricted session. */
export const PASSWORD_CHANGE_REQUIRED = "auth.password_change_required";

/** Where a restricted session is sent, and the only app route it may use. */
export const CHANGE_PASSWORD_PATH = "/change-password";

/**
 * Routes a restricted session may still reach.
 *
 * Mirrors the backend allow-list — `GET /auth/me`, `POST /auth/change-password`,
 * `POST /auth/logout`, `POST /auth/logout-all`, plus anonymous routes. In UI
 * terms that means: the change-password screen itself, and the public site.
 *
 * Signing out is deliberately permitted. Someone handed a temporary password on
 * a shared machine must be able to leave without first setting a new one.
 */
const ALLOWED_PREFIXES = [
  CHANGE_PASSWORD_PATH,
  "/login",
  "/logout",
  "/unauthorized",
];

/**
 * Whether a restricted session may open this path.
 *
 * Public marketing routes are allowed too: they are anonymous server-side, so
 * blocking them would restrict more than the backend does for no benefit.
 */
export function isAllowedWhileRestricted(pathname: string, isProtectedRoute: boolean): boolean {
  if (ALLOWED_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))) {
    return true;
  }
  // Anything the app does not guard is anonymous, and the middleware lets those through.
  return !isProtectedRoute;
}
