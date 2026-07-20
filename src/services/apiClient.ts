/**
 * Back-compat re-export. The central client now lives in `@/api/client`.
 * Existing imports from `@/services/apiClient` keep working; new code should
 * import `api` / `apiRequest` from `@/api/client`.
 */
export * from "@/api/client";
