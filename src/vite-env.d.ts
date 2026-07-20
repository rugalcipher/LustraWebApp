/// <reference types="vite/client" />

/**
 * Typed Vite environment variables. Keep this in sync with src/config/env.ts,
 * which is the single validated source of truth for reading these at runtime.
 *
 * Everything here is compiled into the PUBLIC browser bundle — never add
 * secrets, signing keys, bucket credentials or connection strings.
 */
interface ImportMetaEnv {
  /** Canonical names. */
  readonly VITE_DATA_MODE?: "mock" | "api";
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_SIGNALR_BASE_URL?: string;
  readonly VITE_APP_ENV?: "development" | "uat" | "production";
  readonly VITE_ENABLE_DEV_ROLE_SWITCHER?: string;
  readonly VITE_ENABLE_QUERY_DEVTOOLS?: string;
  /** Legacy aliases, still accepted by src/config/env.ts. */
  readonly VITE_API_MODE?: "mock" | "api";
  readonly VITE_SIGNALR_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
