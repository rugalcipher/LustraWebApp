import { env } from "@/config/env";
import { ApiError, type ProblemDetails } from "@/api/problemDetails";
import { IDEMPOTENCY_HEADER } from "@/api/idempotency";
import { getAccessToken, isAccessTokenExpired, hasUsableRefreshToken } from "@/api/tokenStorage";
import { refreshAccessToken } from "@/api/authTokenCoordinator";

/**
 * The central HTTP client — the ONE place the app talks to the .NET API.
 *
 * Responsibilities: base URL, bearer-token attachment, proactive and reactive
 * token refresh (single-flight, retry-once), correlation IDs, JSON and
 * multipart bodies, binary responses, cancellation, timeouts, RFC 7807
 * ProblemDetails → {@link ApiError}, idempotency headers, dev-only logging.
 *
 * There is NO silent fallback from api→mock and no fabricated success: every
 * failure surfaces as a typed ApiError.
 */

export const API_BASE_URL = env.apiBaseUrl;
export const API_MODE = env.apiMode;
export const isMockMode = env.isMock;
export const isApiMode = env.isApi;

const DEFAULT_TIMEOUT_MS = 30_000;

type ForbiddenHandler = (error: ApiError) => void;
let onForbidden: ForbiddenHandler | null = null;

/** Register the app-level 403 observer (used for telemetry/UX, not for auth). */
export function registerForbiddenHandler(fn: ForbiddenHandler | null): void {
  onForbidden = fn;
}

export interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  /** JSON body. Ignored when `form` is supplied. */
  body?: unknown;
  /** Multipart body (media upload, message attachments). */
  form?: FormData;
  /** Query-string parameters; `undefined`/`null` entries are dropped. */
  query?: Record<string, string | number | boolean | null | undefined>;
  headers?: Record<string, string>;
  signal?: AbortSignal;
  /** Idempotency key sent as the `Idempotency-Key` header. */
  idempotencyKey?: string;
  /** Skip bearer-token attachment (public endpoints called while signed in). */
  anonymous?: boolean;
  /** Per-request timeout; defaults to 30s. */
  timeoutMs?: number;
  /** Internal: set once a request has already been retried after a refresh. */
  _retried?: boolean;
}

function newCorrelationId(): string {
  try {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  } catch {
    /* fall through */
  }
  return `cid-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e9).toString(36)}`;
}

function buildUrl(path: string, query: RequestOptions["query"]): string {
  const base = `${API_BASE_URL}${path}`;
  if (!query) return base;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === "") continue;
    params.append(key, String(value));
  }
  const qs = params.toString();
  return qs ? `${base}${base.includes("?") ? "&" : "?"}${qs}` : base;
}

async function parseProblem(res: Response): Promise<ProblemDetails | undefined> {
  const contentType = res.headers.get("content-type") ?? "";
  if (!contentType.includes("json")) return undefined;
  try {
    return (await res.json()) as ProblemDetails;
  } catch {
    return undefined;
  }
}

/**
 * Combine the caller's abort signal with a timeout. Returns the signal to use
 * and a cleanup function, plus a flag telling us which one fired.
 */
function withTimeout(signal: AbortSignal | undefined, timeoutMs: number) {
  const controller = new AbortController();
  const state = { timedOut: false };
  const timer = setTimeout(() => {
    state.timedOut = true;
    controller.abort();
  }, timeoutMs);

  const onAbort = () => controller.abort();
  if (signal) {
    if (signal.aborted) controller.abort();
    else signal.addEventListener("abort", onAbort);
  }

  return {
    signal: controller.signal,
    state,
    cleanup: () => {
      clearTimeout(timer);
      signal?.removeEventListener("abort", onAbort);
    },
  };
}

function devLog(method: string, url: string, status: number | string, correlationId: string): void {
  if (!env.isDev) return;
  // Never logs bodies or tokens — method, URL, status and correlation only.
  console.debug(`[api] ${method} ${url} → ${status} (cid ${correlationId})`);
}

async function execute(path: string, opts: RequestOptions): Promise<Response> {
  const {
    method = "GET",
    body,
    form,
    query,
    headers = {},
    signal,
    idempotencyKey,
    anonymous = false,
    timeoutMs = DEFAULT_TIMEOUT_MS,
  } = opts;

  const url = buildUrl(path, query);
  const correlationId = newCorrelationId();

  // Proactive refresh: if the access token is already expired but a refresh
  // token is available, refresh BEFORE spending a request on a certain 401.
  if (!anonymous && isAccessTokenExpired() && hasUsableRefreshToken()) {
    try {
      await refreshAccessToken();
    } catch {
      // Fall through and let the request 401 → the reactive path handles it.
    }
  }

  const token = anonymous ? null : getAccessToken();
  const requestHeaders: Record<string, string> = {
    Accept: "application/json",
    "X-Correlation-Id": correlationId,
    ...(form ? {} : { "Content-Type": "application/json" }),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(idempotencyKey ? { [IDEMPOTENCY_HEADER]: idempotencyKey } : {}),
    ...headers,
  };

  const timeout = withTimeout(signal, timeoutMs);
  let res: Response;
  try {
    res = await fetch(url, {
      method,
      signal: timeout.signal,
      headers: requestHeaders,
      body: form ?? (body !== undefined ? JSON.stringify(body) : undefined),
    });
  } catch (e) {
    if (timeout.state.timedOut) {
      devLog(method, url, "timeout", correlationId);
      throw new ApiError({ status: null, kind: "network", detail: "The request timed out.", correlationId });
    }
    if (signal?.aborted || (e instanceof DOMException && e.name === "AbortError")) {
      throw ApiError.canceled();
    }
    devLog(method, url, "network-error", correlationId);
    throw ApiError.network(e);
  } finally {
    timeout.cleanup();
  }

  devLog(method, url, res.status, correlationId);

  if (res.ok) return res;

  // Reactive refresh: one attempt, one retry, never a loop.
  if (res.status === 401 && !anonymous && !opts._retried && hasUsableRefreshToken()) {
    let refreshed: string | null = null;
    try {
      refreshed = await refreshAccessToken();
    } catch {
      refreshed = null; // coordinator already ended the session and notified.
    }
    if (refreshed) {
      return execute(path, { ...opts, _retried: true });
    }
  }

  const problem = await parseProblem(res);
  const error = ApiError.fromProblem(res.status, problem, correlationId);
  if (error.kind === "forbidden") onForbidden?.(error);
  throw error;
}

/** Typed JSON request. Returns parsed JSON as `T`, or `null` for `204`. */
export async function apiRequest<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const res = await execute(path, opts);
  if (res.status === 204 || res.headers.get("content-length") === "0") return null as T;
  try {
    return (await res.json()) as T;
  } catch (e) {
    throw ApiError.unexpected(e);
  }
}

/** Binary request (CSV export, media stream). Returns the raw `Blob`. */
export async function apiBlob(path: string, opts: RequestOptions = {}): Promise<Blob> {
  const res = await execute(path, opts);
  try {
    return await res.blob();
  } catch (e) {
    throw ApiError.unexpected(e);
  }
}

export const api = {
  get: <T>(path: string, opts?: Omit<RequestOptions, "method" | "body" | "form">) =>
    apiRequest<T>(path, { ...opts, method: "GET" }),
  post: <T>(path: string, body?: unknown, opts?: Omit<RequestOptions, "method" | "body">) =>
    apiRequest<T>(path, { ...opts, method: "POST", body }),
  put: <T>(path: string, body?: unknown, opts?: Omit<RequestOptions, "method" | "body">) =>
    apiRequest<T>(path, { ...opts, method: "PUT", body }),
  patch: <T>(path: string, body?: unknown, opts?: Omit<RequestOptions, "method" | "body">) =>
    apiRequest<T>(path, { ...opts, method: "PATCH", body }),
  delete: <T>(path: string, opts?: Omit<RequestOptions, "method" | "body" | "form">) =>
    apiRequest<T>(path, { ...opts, method: "DELETE" }),
  postForm: <T>(path: string, form: FormData, opts?: Omit<RequestOptions, "method" | "body" | "form">) =>
    apiRequest<T>(path, { ...opts, method: "POST", form }),
  blob: apiBlob,
};
