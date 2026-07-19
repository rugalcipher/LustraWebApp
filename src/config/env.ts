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
 *  - The dev role-preview is force-disabled in production builds regardless of
 *    any flag, so it can never be enabled in a production deployment.
 */

const rawSchema = z.object({
  VITE_API_MODE: z.enum(["mock", "api"]).optional(),
  VITE_API_BASE_URL: z.string().trim().optional(),
  VITE_SIGNALR_URL: z.string().trim().url().optional().or(z.literal("").transform(() => undefined)),
  VITE_ENABLE_DEV_ROLE_SWITCHER: z.enum(["true", "false"]).optional(),
});

export interface AppEnv {
  apiMode: "mock" | "api";
  isMock: boolean;
  isApi: boolean;
  apiBaseUrl: string;
  signalrUrl: string | undefined;
  devRolePreviewEnabled: boolean;
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
      `Invalid environment variables: ${parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")}`
    );
  }
  const e = parsed.data;

  const isProd = import.meta.env.PROD === true;
  const isDev = import.meta.env.DEV === true;

  const apiMode = e.VITE_API_MODE ?? "mock";

  // In API mode an explicit base URL is required (no silent default).
  if (apiMode === "api" && !e.VITE_API_BASE_URL) {
    throw new EnvironmentConfigError(
      "VITE_API_MODE=api requires VITE_API_BASE_URL to be set to the .NET API base URL."
    );
  }
  const apiBaseUrl = e.VITE_API_BASE_URL || "/api/v1";

  // Dev role preview: enabled by flag/dev, but NEVER in a production build.
  const flag = e.VITE_ENABLE_DEV_ROLE_SWITCHER;
  const devRolePreviewEnabled = isProd ? false : flag === undefined ? isDev : flag === "true";

  return {
    apiMode,
    isMock: apiMode === "mock",
    isApi: apiMode === "api",
    apiBaseUrl,
    signalrUrl: e.VITE_SIGNALR_URL,
    devRolePreviewEnabled,
    isProd,
    isDev,
  };
}

export const env: AppEnv = buildEnv();
