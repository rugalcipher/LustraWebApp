/**
 * Back-compat re-export. The canonical error model now lives in
 * `@/api/problemDetails` alongside the central API client. Existing imports
 * from `@/services/apiError` keep working; new code should import from
 * `@/api/problemDetails`.
 */
export * from "@/api/problemDetails";
