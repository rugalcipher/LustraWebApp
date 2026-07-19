/// <reference types="vite/client" />

/**
 * Typed Vite environment variables. Keep this in sync with src/config/env.ts,
 * which is the single validated source of truth for reading these at runtime.
 */
interface ImportMetaEnv {
  readonly VITE_API_MODE?: string;
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_SIGNALR_URL?: string;
  readonly VITE_ENABLE_DEV_ROLE_SWITCHER?: string;
  readonly VITE_BASE44_APP_ID?: string;
  readonly VITE_BASE44_APP_BASE_URL?: string;
  readonly VITE_BASE44_FUNCTIONS_VERSION?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
