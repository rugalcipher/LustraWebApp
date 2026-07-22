import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { postMessageOnBehalf, postMessage } from "@/services/managementService";

/**
 * The management proxy-send path.
 *
 * Sending "on behalf of" the talent is a distinct endpoint from an ordinary management
 * reply — the server records the manager as the real sender and the talent as represented.
 * The client must call the right one.
 */
describe("management proxy send", () => {
  let calls: { url: string; init: RequestInit }[] = [];

  beforeEach(() => {
    calls = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init: RequestInit = {}) => {
        calls.push({ url: String(url), init });
        return new Response(JSON.stringify({ id: "m" }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      })
    );
  });
  afterEach(() => vi.unstubAllGlobals());

  const lastPath = () => new URL(calls[calls.length - 1].url, "https://example.test").pathname;

  it("posts an ordinary reply to the messages endpoint", async () => {
    await postMessage("c1", { body: "as management" });
    expect(lastPath()).toMatch(/\/management\/conversations\/c1\/messages$/);
  });

  it("posts a proxy reply to the on-behalf endpoint", async () => {
    await postMessageOnBehalf("c1", { body: "as the talent" });
    expect(lastPath()).toMatch(/\/management\/conversations\/c1\/messages\/on-behalf$/);
    expect(calls[calls.length - 1].init.method).toBe("POST");
  });
});
