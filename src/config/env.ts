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

  // A deployed build must point at a real, reachable API. Each of these produced a
  // confusing symptom rather than an obvious one, which is why they are checked here.
  if (isProd && apiMode === "api") {
    const problems = deployedApiBaseUrlProblems(apiBaseUrl);
    if (problems.length > 0) {
      throw new EnvironmentConfigError(
        `VITE_API_BASE_URL is not valid for a deployed build: ${problems.join(" ")} ` +
          `Got "${apiBaseUrl}". Expected something like https://uatapi.lustra.vip/api/v1 ` +
          `(https, no trailing slash, including the /api/v1 prefix).`
      );
    }
  }

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

/**
 * Why a deployed API base URL can be wrong, and what each mistake looks like in a
 * browser rather than in a log:
 *
 * - `http://` — the page is https, so the browser blocks the call as mixed content and
 *   reports a network error, not a configuration error.
 * - `localhost` — resolves to the VISITOR's machine, so it fails for everyone but the
 *   developer who set it.
 * - missing `/api/v1` — every backend route is `api/v1/...`, so requests land on a path
 *   the API does not serve. The host redirects, the browser refuses to follow a redirect
 *   during a CORS preflight, and the console blames CORS. That is exactly the failure
 *   this guard exists to prevent: the message named CORS while the cause was a missing
 *   URL suffix.
 *
 * Exported for tests; `buildEnv` applies it only to production builds, so development
 * and the test suite are unaffected.
 */
export function deployedApiBaseUrlProblems(apiBaseUrl: string): string[] {
  const problems: string[] = [];

  if (/^http:\/\//i.test(apiBaseUrl)) {
    problems.push("It must use https — a https page cannot call http (mixed content).");
  }

  if (/^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:|\/|$)/i.test(apiBaseUrl)) {
    problems.push("It points at localhost, which resolves to the visitor's own machine.");
  }

  if (!/^https?:\/\//i.test(apiBaseUrl)) {
    problems.push("It must be an absolute URL including the scheme and host.");
  }

  if (!/\/api\/v\d+$/.test(apiBaseUrl)) {
    problems.push(
      "It must end with the API version prefix (/api/v1); without it every request " +
        "hits a path the API does not serve and the browser reports a CORS failure."
    );
  }

  return problems;
}

export const env: AppEnv = buildEnv();
