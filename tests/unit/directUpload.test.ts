import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { putToStorage, uploadHeaders, DirectUploadError } from "@/services/directUpload";
import * as talentAdmin from "@/services/talentAdminService";
import * as applications from "@/services/talentApplicationService";

/**
 * The direct-to-storage upload.
 *
 * A presigned PUT is signed over `content-type;host`. Everything asserted here
 * follows from that: the URL must be used verbatim, exactly one header may be
 * sent, it must be the value the SERVER signed, and no Lustra credential may
 * ride along. Each of those failing produces the same browser message — a CORS
 * error — which is why they are pinned here rather than discovered in UAT.
 */

const ROOT = join(__dirname, "../..");
const read = (p: string) => readFileSync(join(ROOT, p), "utf8");

interface Recorded {
  method: string;
  url: string;
  headers: Record<string, string>;
  body: unknown;
  withCredentials: boolean;
}

let recorded: Recorded;
let status = 200;

class FakeXhr {
  status = 0;
  withCredentials = false;
  upload = { onprogress: null as ((e: unknown) => void) | null };
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  onabort: (() => void) | null = null;
  private headers: Record<string, string> = {};
  private method = "";
  private url = "";

  open(method: string, url: string) {
    this.method = method;
    this.url = url;
  }

  setRequestHeader(name: string, value: string) {
    this.headers[name] = value;
  }

  send(body: unknown) {
    recorded = {
      method: this.method,
      url: this.url,
      headers: this.headers,
      body,
      withCredentials: this.withCredentials,
    };
    this.status = status;
    queueMicrotask(() => (status === 0 ? this.onerror?.() : this.onload?.()));
  }
}

const ticket = (over: Record<string, unknown> = {}) => ({
  mediaId: "m-1",
  uploadUrl:
    "https://acct.r2.cloudflarestorage.com/lustra-uat-private-bucket/uat/gallery/a/b.jpg"
    + "?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-SignedHeaders=content-type%3Bhost&X-Amz-Signature=deadbeef",
  httpMethod: "PUT",
  storageKey: "uat/gallery/a/b.jpg",
  contentType: "image/jpeg",
  requiredHeaders: { "Content-Type": "image/jpeg" },
  expiresAtUtc: "2099-01-01T00:00:00Z",
  ...over,
});

beforeEach(() => {
  status = 200;
  vi.stubGlobal("XMLHttpRequest", FakeXhr);
});
afterEach(() => vi.unstubAllGlobals());

describe("the direct PUT request", () => {
  it("uses the presigned URL byte for byte", async () => {
    const t = ticket();
    await putToStorage(t, new Blob(["x"]) as File);

    // Not parsed, not normalised, not rebuilt — any of which invalidates the signature.
    expect(recorded.url).toBe(t.uploadUrl);
    expect(recorded.method).toBe("PUT");
  });

  it("sends the server's signed content type, not the file's own", async () => {
    // A browser that guesses "image/png" for a file the server signed as
    // "image/jpeg" produces a signature mismatch, which surfaces as a CORS error.
    const file = new Blob(["x"], { type: "image/png" }) as File;
    await putToStorage(ticket({ contentType: "image/jpeg" }), file);

    expect(recorded.headers["Content-Type"]).toBe("image/jpeg");
  });

  it("sends exactly one header and nothing else", async () => {
    await putToStorage(ticket(), new Blob(["x"]) as File);
    expect(Object.keys(recorded.headers)).toEqual(["Content-Type"]);
  });

  it("carries no Lustra credential of any kind", async () => {
    await putToStorage(ticket(), new Blob(["x"]) as File);

    const names = Object.keys(recorded.headers).map((h) => h.toLowerCase());
    for (const forbidden of [
      "authorization",
      "x-application-token",
      "x-requested-with",
      "idempotency-key",
      "x-correlation-id",
    ]) {
      expect(names, `${forbidden} must never reach the object store`).not.toContain(forbidden);
    }
  });

  it("omits credentials, so no cookie is attached", async () => {
    await putToStorage(ticket(), new Blob(["x"]) as File);
    expect(recorded.withCredentials).toBe(false);
  });

  it("sends the raw file, untransformed", async () => {
    const file = new Blob(["bytes"]) as File;
    await putToStorage(ticket(), file);

    expect(recorded.body).toBe(file);
    expect(recorded.body).not.toBeInstanceOf(FormData);
  });

  it("honours the server's required headers when it sends them", () => {
    expect(uploadHeaders(ticket({ requiredHeaders: { "Content-Type": "image/webp" } })))
      .toEqual({ "Content-Type": "image/webp" });
  });

  it("falls back to the signed content type when the server sent no header map", () => {
    expect(uploadHeaders(ticket({ requiredHeaders: null, contentType: "image/webp" })))
      .toEqual({ "Content-Type": "image/webp" });
  });

  it("rejects with the status when the store refuses", async () => {
    status = 403;
    await expect(putToStorage(ticket(), new Blob(["x"]) as File)).rejects.toMatchObject({
      status: 403,
    });
  });

  it("explains a blocked preflight rather than reporting a status of zero", async () => {
    status = 0;
    const error = await putToStorage(ticket(), new Blob(["x"]) as File).catch((e) => e);

    expect(error).toBeInstanceOf(DirectUploadError);
    // The browser withholds the status for a blocked preflight. Saying "storage
    // configuration" points at the real place to look.
    expect(String(error.message)).toMatch(/storage/i);
  });
});

describe("every upload surface uses the one helper", () => {
  it("routes both services through putToStorage", () => {
    for (const file of [
      "src/services/talentAdminService.ts",
      "src/services/talentApplicationService.ts",
    ]) {
      const source = read(file);
      expect(source).toContain("putToStorage");
      // A second hand-rolled XHR would look correct and diverge silently.
      expect(source).not.toContain("new XMLHttpRequest()");
    }
  });

  it("never routes an upload through the authenticated API client", () => {
    const helper = read("src/services/directUpload.ts");
    expect(helper).not.toMatch(/^import .*\bapi\b.*from "@\/api\/client"/m);
    expect(helper).not.toContain("apiRequest");
  });

  it("exposes both helpers as thin delegations", () => {
    expect(typeof talentAdmin.uploadTalentMediaToStorage).toBe("function");
    expect(typeof applications.uploadToStorage).toBe("function");
  });

  it("declares requiredHeaders on both ticket shapes", () => {
    for (const file of [
      "src/services/talentAdminService.ts",
      "src/services/talentApplicationService.ts",
    ]) {
      expect(read(file)).toContain("requiredHeaders");
    }
  });
});

describe("a failed PUT never finalizes", () => {
  it("finalizes only after a successful upload in the applicant flow", () => {
    const source = read("src/features/talentApplication/PhotographManager.jsx");
    const put = source.indexOf("uploadToStorage");
    const finalize = source.indexOf("finalizeUpload");

    // Sequential awaits in one try: a throw from the PUT skips the finalize.
    expect(put).toBeGreaterThan(-1);
    expect(finalize).toBeGreaterThan(put);
  });

  it("cancels the slot instead of finalizing when the management upload fails", () => {
    const hooks = read("src/features/talentAdmin/hooks.ts");
    const catchBlock = hooks.slice(hooks.indexOf("uploadTalentMediaToStorage"));

    expect(catchBlock).toContain("cancelTalentMediaUpload");
    // Finalizing an upload whose bytes never landed creates a row pointing at nothing.
    expect(catchBlock.indexOf("throw error")).toBeLessThan(
      catchBlock.indexOf("finalizeTalentMediaUpload")
    );
  });
});
