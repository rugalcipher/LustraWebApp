import { usePrincipalOptional } from "@/auth/PrincipalContext";
import { authenticatedHomePath } from "@/domain/roles";

/**
 * Where the Lustra logo should go from wherever the user currently is.
 *
 * Inside an authenticated shell the logo is a **home** affordance, not an exit.
 * Sending a signed-in administrator to the public landing page reads as having
 * been thrown out of the application — the shell disappears, the navigation
 * disappears, and nothing says the session is still perfectly valid. It is.
 *
 * So: signed in → that user's own overview, by the same role precedence that
 * post-login routing uses. Signed out → the public site, which is genuinely
 * their home.
 *
 * Leaving the application on purpose is a separate, labelled action ("Exit to
 * site"). A logo must never do it, and must never log anyone out.
 */
export function useHomeLink(): string {
  // Optional on purpose: the public header renders on marketing pages that need
  // not sit inside the principal provider. No provider means no session, which
  // is the anonymous answer — not a crash on a page that has nothing to do with
  // authentication.
  const context = usePrincipalOptional();
  const principal = context?.principal;

  return principal?.isAuthenticated ? authenticatedHomePath(principal.roles) : "/";
}
