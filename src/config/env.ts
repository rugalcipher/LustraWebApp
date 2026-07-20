import { z } from "zod";

/**
 * Central, validated environment configuration.
 *
 * This is the ONLY module that reads `import.meta.env`. Everything else imports
 * the typed `env` object from here. Invalid configuration throws at startup with
 * a clear message rather than failing subtly later.
 *
 * Guarantees:
 *  - `apiMode` is a strict enum; there is no silent fallback from api→mock.
 *  - In `api` mode a non-empty API base URL is REQUIRED, else a clear error.
 *  - A production build may not run in mock mode (see the check below and the
 *    `ModeGuard` in App.tsx) — mock data must never reach production.
 *  - The dev role-preview is force-disabled in production builds regardless of
 *    any flag, so it can never be enabled in a production deployment.
 *
 * `VITE_DATA_MODE` / `VITE_SIGNALR_BASE_URL` are the canonical names;
 * `VITE_API_MODE` / `VITE_SIGNALR_URL` are accepted as aliases so existing
 * developer `.env.local` files keep working.
 */

const optionalUrl = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v ? v : undefined));

const rawSchema = z.object({
  VITE_DATA_MODE: z.enum(["mock", "api"]).optional(),
  VITE_API_MODE: z.enum(["mock", "api"]).optional(),
  VITE_API_BASE_URL: z.string().trim().optional(),
  VITE_SIGNALR_BASE_URL: optionalUrl,
  VITE_SIGNALR_URL: optionalUrl,
  VITE_APP_ENV: z.enum(["development", "uat", "production"]).optional(),
  VITE_ENABLE_DEV_ROLE_SWITCHER: z.enum(["true", "false"]).optional(),
  VITE_ENABLE_QUERY_DEVTOOLS: z.enum(["true", "false"]).optional(),
});

export type AppEnvironment = "development" | "uat" | "production";

export interface AppEnv {
  apiMode: "mock" | "api";
  isMock: boolean;
  isApi: boolean;
  apiBaseUrl: string;
  /** SignalR hub origin; falls back to the API origin when unset. */
  signalrUrl: string | undefined;
  appEnv: AppEnvironment;
  devRolePreviewEnabled: boolean;
  queryDevtoolsEnabled: boolean;
  isProd: boolean;
  isDev: boolean;
}

class EnvironmentConfigError extends Error {
  constructor(message: string) {
    super(`[Lustra config] ${message}`);
    this.name = "EnvironmentConfigError";
  }
}

function buildEnv(): AppEnv {
  const source = import.meta.env as Record<string, string | boolean | undefined>;
  const parsed = rawSchema.safeParse(source);
  if (!parsed.success) {
    throw new EnvironmentConfigError(
      `Invalid environment variables: ${parsed.error.issues
        .map((i) => `${i.path.join(".")}: ${i.message}`)
        .join("; ")}`
    );
  }
  const e = parsed.data;

  const isProd = import.meta.env.PROD === true;
  const isDev = import.meta.env.DEV === true;

  const apiMode = e.VITE_DATA_MODE ?? e.VITE_API_MODE ?? (isProd ? "api" : "mock");

  // In API mode an explicit base URL is required (no silent default).
  if (apiMode === "api" && !e.VITE_API_BASE_URL) {
    throw new EnvironmentConfigError(
      "API mode requires VITE_API_BASE_URL to be set to the .NET API base URL (e.g. https://api.lustra.vip/api/v1)."
    );
  }
  const apiBaseUrl = (e.VITE_API_BASE_URL || "/api/v1").replace(/\/+$/, "");

  // Dev role preview: enabled by flag/dev, but NEVER in a production build.
  const flag = e.VITE_ENABLE_DEV_ROLE_SWITCHER;
  const devRolePreviewEnabled = isProd ? false : flag === undefined ? isDev : flag === "true";

  return {
    apiMode,
    isMock: apiMode === "mock",
    isApi: apiMode === "api",
    apiBaseUrl,
    signalrUrl: e.VITE_SIGNALR_BASE_URL ?? e.VITE_SIGNALR_URL,
    appEnv: e.VITE_APP_ENV ?? (isProd ? "production" : "development"),
    devRolePreviewEnabled,
    queryDevtoolsEnabled: isProd ? false : e.VITE_ENABLE_QUERY_DEVTOOLS === "true",
    isProd,
    isDev,
  };
}

export const env: AppEnv = buildEnv();
