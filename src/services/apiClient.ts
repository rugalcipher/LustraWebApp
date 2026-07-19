import { env } from "@/config/env";
import { ApiError, type ProblemDetails } from "@/services/apiError";

/**
 * Central API client boundary.
 *
 * The whole app talks to the backend through this module and the typed services
 * beside it — never via fetch/axios in components. Mode is chosen by validated
 * `env` (mock | api); there is NO silent fallback from api→mock.
 *
 * Provides: base URL, bearer token injection, JSON, RFC 7807 ProblemDetails
 * parsing → ApiError, 401/403 handler hooks, per-request correlation IDs,
 * cancellation (AbortSignal), typed responses. It never fabricates success.
 *
 * REFRESH-TOKEN BOUNDARY: refresh-token rotation is intentionally NOT
 * implemented here. The .NET backend owns rotating/revocable refresh tokens
 * (`POST /api/v1/auth/refresh`, reuse detection). When wired, a single 401
 * handler should attempt one refresh via the auth layer and retry; see
 * `registerUnauthorizedHandler`. Until the contract exists, a 401 simply
 * surfaces as an ApiError and triggers the registered handler.
 */

export const API_MODE = env.apiMode;
export const isMockMode = env.isMock;
export const isApiMode = env.isApi;
export const API_BASE_URL = env.apiBaseUrl;

/** Thrown when API mode is active but the endpoint/service is not yet wired. */
export class NotImplementedInApiModeError extends Error {
  constructor(what: string) {
    super(
      `API mode is enabled but "${what}" is not implemented yet. ` +
        `Wire the .NET endpoint or run in mock mode (VITE_API_MODE=mock).`
    );
    this.name = "NotImplementedInApiModeError";
  }
}

// --- Pluggable integration hooks (wired by the app, not by services) ---------

type TokenProvider = () => string | null | undefined;
type UnauthorizedHandler = (error: ApiError) => void;
type ForbiddenHandler = (error: ApiError) => void;

let tokenProvider: TokenProvider = () => null;
let onUnauthorized: UnauthorizedHandler | null = null;
let onForbidden: ForbiddenHandler | null = null;

export function registerTokenProvider(fn: TokenProvider): void {
  tokenProvider = fn;
}
export function registerUnauthorizedHandler(fn: UnauthorizedHandler): void {
  onUnauthorized = fn;
}
export function registerForbiddenHandler(fn: ForbiddenHandler): void {
  onForbidden = fn;
}

// --- Request -----------------------------------------------------------------

export interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  /** Extra headers (merged after defaults). */
  headers?: Record<string, string>;
  /** Cancellation signal. */
  signal?: AbortSignal;
  /** Override token for this request (else the registered provider is used). */
  token?: string | null;
}

function newCorrelationId(): string {
  try {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  } catch {
    /* fall through */
  }
  return `cid-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e9).toString(36)}`;
}

async function parseProblem(res: Response): Promise<ProblemDetails | undefined> {
  const ct = res.headers.get("content-type") || "";
  if (!ct.includes("json")) return undefined;
  try {
    return (await res.json()) as ProblemDetails;
  } catch {
    return undefined;
  }
}

/**
 * Typed JSON request against the .NET API. Returns parsed JSON as `T`
 * (or `null` for 204). Throws a normalized {@link ApiError} on any failure.
 */
export async function apiRequest<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, headers = {}, signal } = opts;
  const correlationId = newCorrelationId();
  const token = opts.token !== undefined ? opts.token : tokenProvider();

  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      method,
      signal,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "X-Correlation-Id": correlationId,
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") throw ApiError.canceled();
    throw ApiError.network(e);
  }

  if (!res.ok) {
    const problem = await parseProblem(res);
    const error = ApiError.fromProblem(res.status, problem, correlationId);
    if (error.kind === "unauthorized") onUnauthorized?.(error);
    if (error.kind === "forbidden") onForbidden?.(error);
    throw error;
  }

  if (res.status === 204) return null as T;
  try {
    return (await res.json()) as T;
  } catch (e) {
    throw ApiError.unexpected(e);
  }
}
