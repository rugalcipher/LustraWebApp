import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { api } from "@/api/client";
import { adoptAuthResult, endSession, onSessionEnded } from "@/api/authTokenCoordinator";
import { getAccessToken, getRefreshToken } from "@/api/tokenStorage";
import { isUnauthorized } from "@/api/problemDetails";

/**
 * The refresh contract is the highest-risk part of the integration: against a
 * ROTATING refresh token with server-side reuse detection, two concurrent
 * refreshes would invalidate the whole token family and sign the user out.
 */

function authResult(suffix: string) {
  const future = new Date(Date.now() + 60 * 60 * 1000).toISOString();
  return {
    user: { id: "u1", email: "a@b.c", displayName: "A", roles: ["Client"], permissions: [] },
    tokens: {
      accessToken: `access-${suffix}`,
      accessTokenExpiresAtUtc: future,
      refreshToken: `refresh-${suffix}`,
      refreshTokenExpiresAtUtc: future,
      tokenType: "Bearer",
    },
  };
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
  adoptAuthResult(authResult("v1"));
});

afterEach(() => {
  endSession("logout");
  vi.unstubAllGlobals();
});

describe("single-flight refresh coordinator", () => {
  it("issues exactly ONE refresh when several requests 401 together", async () => {
    const calls: string[] = [];

    fetchMock.mockImplementation(async (url: string, init: RequestInit) => {
      calls.push(`${init?.method ?? "GET"} ${url}`);
      if (url.endsWith("/auth/refresh")) {
        // Give the other in-flight callers a chance to race onto this promise.
        await new Promise((r) => setTimeout(r, 10));
        return jsonResponse(authResult("v2"));
      }
      const auth = (init?.headers as Record<string, string>)?.Authorization;
      if (auth === "Bearer access-v1") return jsonResponse({ title: "Unauthorized" }, 401);
      return jsonResponse({ ok: true });
    });

    const results = await Promise.all([
      api.get("/client/inquiries"),
      api.get("/client/bookings"),
      api.get("/notifications"),
    ]);

    expect(results).toEqual([{ ok: true }, { ok: true }, { ok: true }]);
    const refreshCalls = calls.filter((c) => c.includes("/auth/refresh"));
    expect(refreshCalls).toHaveLength(1);
    expect(getAccessToken()).toBe("access-v2");
    expect(getRefreshToken()).toBe("refresh-v2");
  });

  it("retries the original request exactly once and never loops", async () => {
    let inquiryCalls = 0;
    fetchMock.mockImplementation(async (url: string) => {
      if (url.endsWith("/auth/refresh")) return jsonResponse(authResult("v2"));
      inquiryCalls += 1;
      // Persistently 401 even with a fresh token.
      return jsonResponse({ title: "Unauthorized" }, 401);
    });

    await expect(api.get("/client/inquiries")).rejects.toSatisfy(isUnauthorized);
    // Original attempt + exactly one retry after the refresh. No loop.
    expect(inquiryCalls).toBe(2);
  });

  it("ends the session and notifies once when the refresh token is rejected", async () => {
    const ended = vi.fn();
    const unsubscribe = onSessionEnded(ended);

    fetchMock.mockImplementation(async (url: string) => {
      if (url.endsWith("/auth/refresh")) {
        return jsonResponse({ title: "Unauthorized", detail: "Token reuse detected." }, 401);
      }
      return jsonResponse({ title: "Unauthorized" }, 401);
    });

    await expect(api.get("/client/inquiries")).rejects.toThrow();
    expect(ended).toHaveBeenCalledTimes(1);
    expect(ended).toHaveBeenCalledWith("refresh-failed");
    expect(getAccessToken()).toBeNull();
    expect(getRefreshToken()).toBeNull();
    unsubscribe();
  });

  it("does not sign the user out when the refresh call fails with a network error", async () => {
    const ended = vi.fn();
    const unsubscribe = onSessionEnded(ended);

    fetchMock.mockImplementation(async (url: string) => {
      if (url.endsWith("/auth/refresh")) throw new TypeError("Failed to fetch");
      return jsonResponse({ title: "Unauthorized" }, 401);
    });

    await expect(api.get("/client/inquiries")).rejects.toThrow();
    expect(ended).not.toHaveBeenCalled();
    // The refresh token survives so the session can recover once back online.
    expect(getRefreshToken()).toBe("refresh-v1");
    unsubscribe();
  });

  it("never attaches a bearer token to anonymous (public) requests", async () => {
    fetchMock.mockImplementation(async () => jsonResponse({ items: [] }));
    await api.get("/public/talents", { anonymous: true });
    const headers = fetchMock.mock.calls[0][1].headers as Record<string, string>;
    expect(headers.Authorization).toBeUndefined();
  });

  it("sends the idempotency key as a header, never in the body", async () => {
    fetchMock.mockImplementation(async () => jsonResponse({ inquiryId: "i1" }));
    await api.post("/client/inquiries", { message: "hello" }, { idempotencyKey: "key-1" });

    const [, init] = fetchMock.mock.calls[0];
    expect((init.headers as Record<string, string>)["Idempotency-Key"]).toBe("key-1");
    expect(JSON.parse(init.body as string)).toEqual({ message: "hello" });
  });

  it("attaches a correlation id to every request", async () => {
    fetchMock.mockImplementation(async () => jsonResponse({}));
    await api.get("/notifications/unread-count");
    const headers = fetchMock.mock.calls[0][1].headers as Record<string, string>;
    expect(headers["X-Correlation-Id"]).toBeTruthy();
  });

  it("surfaces aborts as canceled rather than as real failures", async () => {
    const controller = new AbortController();
    fetchMock.mockImplementation(async (_url: string, init: RequestInit) => {
      controller.abort();
      throw new DOMException("Aborted", "AbortError");
    });
    await expect(api.get("/public/talents", { signal: controller.signal })).rejects.toMatchObject({
      kind: "canceled",
    });
  });
});
