/**
 * Canonical frontend API error model.
 *
 * Normalizes every failure (RFC 7807 ProblemDetails from the .NET API, network
 * failures, aborts, unexpected errors) into one typed shape so UI code never
 * branches on raw responses and never shows raw backend exception text.
 *
 * Status mapping mirrors the backend `ErrorHttpMapping`:
 *   Validation → 400 · Unauthorized → 401 · Forbidden → 403 · NotFound → 404
 *   Conflict/Duplicate → 409 · InvalidState → 422 · RateLimited → 429
 *   Internal → 500
 */

export type ApiErrorKind =
  | "unauthorized"
  | "forbidden"
  | "not_found"
  | "conflict"
  | "validation"
  | "invalid_state"
  | "rate_limited"
  | "server"
  | "network"
  | "canceled"
  | "unexpected";

export interface FieldError {
  field: string;
  messages: string[];
}

/** RFC 7807 ProblemDetails, plus the extensions the Lustra API adds. */
export interface ProblemDetails {
  type?: string;
  title?: string;
  status?: number;
  detail?: string;
  instance?: string;
  /** Machine-readable refusal code. The API sends `errorCode`; `code` is legacy. */
  errorCode?: string;
  code?: string;
  traceId?: string;
  correlationId?: string;
  errors?: Record<string, string[]>;
}

export function kindFromStatus(status: number): ApiErrorKind {
  switch (status) {
    case 400:
      return "validation";
    case 401:
      return "unauthorized";
    case 403:
      return "forbidden";
    case 404:
      return "not_found";
    case 409:
      return "conflict";
    case 422:
      return "invalid_state";
    case 429:
      return "rate_limited";
    default:
      if (status >= 500) return "server";
      return "unexpected";
  }
}

const SAFE_MESSAGES: Record<ApiErrorKind, string> = {
  unauthorized: "Your session has expired. Please sign in again.",
  forbidden: "You don't have permission to do that.",
  not_found: "We couldn't find what you were looking for.",
  conflict: "That action conflicts with the current state. Please refresh and try again.",
  validation: "Please check the highlighted fields and try again.",
  invalid_state: "That action isn't available right now.",
  rate_limited: "Too many requests. Please wait a moment and try again.",
  server: "Something went wrong on our side. Please try again shortly.",
  network: "We couldn't reach the server. Check your connection and try again.",
  canceled: "The request was canceled.",
  unexpected: "Something unexpected happened. Please try again.",
};

export class ApiError extends Error {
  readonly status: number | null;
  readonly kind: ApiErrorKind;
  readonly title?: string;
  readonly detail?: string;
  readonly code?: string;
  readonly fieldErrors: FieldError[];
  readonly correlationId?: string;
  readonly raw?: unknown;

  constructor(init: {
    status: number | null;
    kind: ApiErrorKind;
    title?: string;
    detail?: string;
    code?: string;
    fieldErrors?: FieldError[];
    correlationId?: string;
    raw?: unknown;
  }) {
    super(init.detail || init.title || SAFE_MESSAGES[init.kind]);
    this.name = "ApiError";
    this.status = init.status;
    this.kind = init.kind;
    this.title = init.title;
    this.detail = init.detail;
    this.code = init.code;
    this.fieldErrors = init.fieldErrors ?? [];
    this.correlationId = init.correlationId;
    this.raw = init.raw;
  }

  /**
   * A message safe to show to end users. Prefers the server's ProblemDetails
   * `detail`/`title` (the Lustra API emits curated, non-leaking messages) and
   * falls back to a generic message per kind — never raw exception text.
   */
  get userMessage(): string {
    if (this.kind === "server" || this.kind === "unexpected") return SAFE_MESSAGES[this.kind];
    return this.detail || this.title || SAFE_MESSAGES[this.kind];
  }

  static fromProblem(status: number, problem: ProblemDetails | undefined, correlationId?: string): ApiError {
    const kind = kindFromStatus(status);
    const fieldErrors: FieldError[] = problem?.errors
      ? Object.entries(problem.errors).map(([field, messages]) => ({ field, messages }))
      : [];
    return new ApiError({
      status,
      kind,
      title: problem?.title,
      detail: problem?.detail,
      // The API emits the machine-readable code as `errorCode` (see the backend's
      // GlobalExceptionHandler). Reading only `code` silently dropped every one of
      // them, so `ApiError.code` was always undefined and no caller could branch on
      // a refusal reason. `code` stays as a fallback for any older payload.
      code: problem?.errorCode ?? problem?.code,
      fieldErrors,
      correlationId: problem?.correlationId ?? problem?.traceId ?? correlationId,
      raw: problem,
    });
  }

  static network(raw?: unknown): ApiError {
    return new ApiError({ status: null, kind: "network", raw });
  }

  static canceled(): ApiError {
    return new ApiError({ status: null, kind: "canceled" });
  }

  static unexpected(raw?: unknown): ApiError {
    return new ApiError({ status: null, kind: "unexpected", raw });
  }
}

export function isApiError(e: unknown): e is ApiError {
  return e instanceof ApiError;
}

export function isUnauthorized(e: unknown): boolean {
  return isApiError(e) && e.kind === "unauthorized";
}

export function isForbidden(e: unknown): boolean {
  return isApiError(e) && e.kind === "forbidden";
}

export function isCanceled(e: unknown): boolean {
  return isApiError(e) && e.kind === "canceled";
}

/**
 * Map an error's field errors to a `{ field: message }` object for forms.
 * ASP.NET emits PascalCase member names (`Email`); react-hook-form fields are
 * camelCase, so both spellings are provided.
 */
export function toFormErrors(e: unknown): Record<string, string> {
  if (!isApiError(e)) return {};
  const out: Record<string, string> = {};
  for (const fe of e.fieldErrors) {
    const message = fe.messages[0] ?? "Invalid value";
    out[fe.field] = message;
    const camel = fe.field.charAt(0).toLowerCase() + fe.field.slice(1);
    if (!(camel in out)) out[camel] = message;
  }
  return out;
}

/** A safe, user-facing message for any error (query/mutation/unknown). */
export function toUserMessage(e: unknown): string {
  if (isApiError(e)) return e.userMessage;
  return SAFE_MESSAGES.unexpected;
}
