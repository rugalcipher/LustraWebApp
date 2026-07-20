/**
 * Back-compat re-export.
 *
 * The Base44 auth provider that used to live here has been replaced by the real
 * API-backed provider in `@/auth/AuthProvider`. Existing `@/lib/AuthContext`
 * imports keep working; new code should import from `@/auth/AuthProvider`.
 */
export { AuthProvider, useAuth } from "@/auth/AuthProvider";
