/**
 * Lustra frontend domain contract — single source of truth for roles,
 * membership entitlements, and talent-media approval/visibility. Shaped to
 * align with the future .NET API; ratified at the API boundary by each module's
 * adapters (`normalizeRole`, `normalizeMembership`, `normalizeMedia`) and the
 * DTO mappers in src/services/dto. See src/auth/principal.ts for composition.
 */
export * from "./roles";
export * from "./account";
export * from "./entitlements";
export * from "./media";
