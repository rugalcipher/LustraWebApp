import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import ApplicationContinue from "@/pages/ApplicationContinue";
import { ROUTES } from "@/app/routeRegistry";
import * as service from "@/services/talentApplicationService";
import { APPLICATION_TOKEN_HEADER, APPLICATION_ERROR_CODES } from "@/services/talentApplicationService";
import {
  saveSession, loadSession, clearSession, redactToken, scrubTokenFromUrl,
} from "@/features/talentApplication/session";
import { toDetails, validateAbout, validateProfile, EMPTY_DETAILS, ageFrom } from "@/features/talentApplication/details";
import { finalizedPhotos } from "@/features/talentApplication/PhotographManager";
import { ApiError } from "@/api/problemDetails";

/**
 * The public talent application and the changes-requested continuation.
 *
 * The security assertions here are the point of the suite. The applicant has no
 * account; a single opaque token stands between an application id and a
 * stranger's legal name, date of birth and private photographs. If that token
 * ever reaches a URL, a log or an analytics payload, the protection is gone —
 * so "the token is not in the query string" is asserted, not assumed.
 */

const ROOT = join(__dirname, "../..");
const read = (p: string) => readFileSync(join(ROOT, p), "utf8");
const paths = ROUTES.map((r) => r.path);

// ---- API surface ----------------------------------------------------------

describe("talent application API surface", () => {
  let calls: { url: string; init: RequestInit }[] = [];

  beforeEach(() => {
    calls = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init: RequestInit = {}) => {
        calls.push({ url: String(url), init });
        return new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      })
    );
  });

  afterEach(() => vi.unstubAllGlobals());

  const lastUrl = () => new URL(calls[calls.length - 1].url, "https://example.test");
  const lastHeaders = () => new Headers(calls[calls.length - 1].init.headers);

  it("creates an application at the exact public path", async () => {
    await service.createApplication(toDetails(EMPTY_DETAILS));
    expect(lastUrl().pathname).toMatch(/\/public\/talent-applications$/);
    expect(calls[0].init.method).toBe("POST");
  });

  it("never duplicates the /api/v1 prefix", async () => {
    await service.getApplicationStatus("app-1", "tok");
    expect(lastUrl().pathname).not.toContain("/api/v1/api/v1");
  });

  it("sends the applicant token in X-Application-Token", async () => {
    await service.getApplicationStatus("app-1", "secret-token");
    expect(lastHeaders().get(APPLICATION_TOKEN_HEADER)).toBe("secret-token");
  });

  it("never appends the token to a request URL", async () => {
    await service.getApplicationStatus("app-1", "secret-token");
    await service.submitApplication("app-1", "secret-token");
    await service.reorderMedia("app-1", "secret-token", []);
    for (const call of calls) {
      expect(call.url).not.toContain("secret-token");
      expect(call.url).not.toContain("token=");
    }
  });

  it("creates the application anonymously — no Authorization header", async () => {
    await service.createApplication(toDetails(EMPTY_DETAILS));
    expect(lastHeaders().get("Authorization")).toBeNull();
  });

  it.each([
    ["status", () => service.getApplicationStatus("a", "t"), "/public/talent-applications/a/status"],
    ["request upload", () => service.requestUpload("a", "t", { contentType: "image/jpeg", expectedSizeBytes: 1, fileName: "x.jpg" }), "/public/talent-applications/a/media/request-upload"],
    ["finalize", () => service.finalizeUpload("a", "t", "m"), "/public/talent-applications/a/media/m/finalize"],
    ["reorder", () => service.reorderMedia("a", "t", []), "/public/talent-applications/a/media/reorder"],
    ["submit", () => service.submitApplication("a", "t"), "/public/talent-applications/a/submit"],
    ["withdraw", () => service.withdrawApplication("a", "t"), "/public/talent-applications/a/withdraw"],
  ])("uses the contract path for %s", async (_name, call, expected) => {
    await call();
    expect(lastUrl().pathname.endsWith(expected)).toBe(true);
  });

  it("sends the chosen password in the submit body on a first submission", async () => {
    await service.submitApplication("a", "t", "Secret#Pass1");
    const body = JSON.parse(String(calls[calls.length - 1].init.body));
    expect(body.password).toBe("Secret#Pass1");
  });

  it("omits the password when resubmitting an application whose account already exists", async () => {
    await service.submitApplication("a", "t");
    const body = JSON.parse(String(calls[calls.length - 1].init.body));
    expect(body.password).toBeUndefined();
  });

  it.each([
    ["queue", () => service.listApplications({}), "/management/talent-applications"],
    ["detail", () => service.getApplication("a"), "/management/talent-applications/a"],
    ["media url", () => service.getMediaUrl("a", "m"), "/management/talent-applications/a/media/m/url"],
    ["notes", () => service.addNote("a", "n"), "/management/talent-applications/a/notes"],
    ["under review", () => service.markUnderReview("a"), "/management/talent-applications/a/under-review"],
    ["request changes", () => service.requestChanges("a", "r"), "/management/talent-applications/a/request-changes"],
    ["reject", () => service.rejectApplication("a", "r"), "/management/talent-applications/a/reject"],
  ])("uses the contract path for management %s", async (_name, call, expected) => {
    await call();
    expect(lastUrl().pathname.endsWith(expected)).toBe(true);
  });

  it("sends the queue filters under the names the backend binds", async () => {
    await service.listApplications({
      status: "Submitted",
      search: "ada",
      cityId: "city-1",
      publishOnApproval: true,
      fromUtc: "2026-01-01T00:00:00Z",
      toUtc: "2026-02-01T00:00:00Z",
      page: 2,
      pageSize: 25,
    });
    const q = lastUrl().searchParams;
    expect(q.get("status")).toBe("Submitted");
    expect(q.get("search")).toBe("ada");
    expect(q.get("cityId")).toBe("city-1");
    expect(q.get("publishOnApproval")).toBe("true");
    expect(q.get("fromUtc")).toBe("2026-01-01T00:00:00Z");
    expect(q.get("toUtc")).toBe("2026-02-01T00:00:00Z");
    expect(q.get("page")).toBe("2");
  });

  it("sends an idempotency key with approval so a retry cannot convert twice", async () => {
    await service.approveApplication(
      "a",
      { createLogin: true, sendActivationEmail: true, publishImmediately: false },
      "key-123"
    );
    expect(lastHeaders().get("Idempotency-Key")).toBe("key-123");
  });
});

// ---- direct storage upload ------------------------------------------------

describe("direct upload to signed storage", () => {
  it("carries no Lustra credential and reports progress", async () => {
    const sent: Record<string, string> = {};
    let progress = 0;

    class FakeXhr {
      upload: { onprogress?: (e: { lengthComputable: boolean; loaded: number; total: number }) => void } = {};
      status = 200;
      onload?: () => void;
      onerror?: () => void;
      onabort?: () => void;
      opened: [string, string] = ["", ""];
      open(method: string, url: string) {
        this.opened = [method, url];
      }
      setRequestHeader(k: string, v: string) {
        sent[k] = v;
      }
      send() {
        this.upload.onprogress?.({ lengthComputable: true, loaded: 50, total: 100 });
        this.onload?.();
      }
    }
    vi.stubGlobal("XMLHttpRequest", FakeXhr as unknown as typeof XMLHttpRequest);

    await service.uploadToStorage(
      {
        mediaId: "m",
        uploadUrl: "https://storage.example/signed?sig=abc",
        httpMethod: "PUT",
        storageKey: "k",
        contentType: "image/jpeg",
        expiresAtUtc: "2026-01-01T00:00:00Z",
      },
      new File(["x"], "x.jpg", { type: "image/jpeg" }),
      (f) => {
        progress = f;
      }
    );

    // An Authorization or X-Application-Token header on a presigned PUT breaks
    // the signature, and the object store has no business seeing either.
    expect(Object.keys(sent)).toEqual(["Content-Type"]);
    expect(sent["Content-Type"]).toBe("image/jpeg");
    expect(progress).toBe(0.5);
    vi.unstubAllGlobals();
  });
});

// ---- token custody --------------------------------------------------------

describe("application session", () => {
  beforeEach(() => window.sessionStorage.clear());

  it("stores the token in sessionStorage, never localStorage", () => {
    saveSession({ applicationId: "a", token: "tok", scope: "full", reference: "R" });
    expect(window.sessionStorage.getItem("lustra.talentApplication")).toContain("tok");
    expect(JSON.stringify(window.localStorage)).not.toContain("tok");
  });

  it("survives a reload in the same tab", () => {
    saveSession({ applicationId: "a", token: "tok", scope: "full", reference: "R" });
    expect(loadSession()?.applicationId).toBe("a");
  });

  it("discards an expired token rather than presenting it", () => {
    saveSession({
      applicationId: "a",
      token: "tok",
      scope: "full",
      reference: "R",
      expiresAtUtc: "2000-01-01T00:00:00Z",
    });
    expect(loadSession()).toBeNull();
  });

  it("clears on request", () => {
    saveSession({ applicationId: "a", token: "tok", scope: "full", reference: "R" });
    clearSession();
    expect(loadSession()).toBeNull();
  });

  it("redacts a token so it cannot reach a screenshot or a support ticket", () => {
    expect(redactToken("abcdefghijklmno")).toBe("abcd••••••••");
    expect(redactToken("abcdefghijklmno")).not.toContain("efghij");
    expect(redactToken(null)).toBe("");
  });

  it("removes both sensitive parameters from the address bar", () => {
    window.history.replaceState({}, "", "/apply/continue?application=app-1&token=secret&x=1");
    scrubTokenFromUrl();
    expect(window.location.search).not.toContain("secret");
    expect(window.location.search).not.toContain("application=");
    expect(window.location.search).toContain("x=1");
  });

  it("uses replaceState so Back cannot restore the token URL", () => {
    // pushState would leave the token-bearing entry in session history where the
    // Back button — and the browser's own history UI — could reach it.
    const source = read("src/features/talentApplication/session.ts");
    expect(source).toContain("window.history.replaceState(");
    expect(source).not.toContain("window.history.pushState(");
  });
});

// ---- detail record --------------------------------------------------------

describe("application details", () => {
  const complete = {
    ...EMPTY_DETAILS,
    legalFirstName: "Ada",
    legalSurname: "Lovelace",
    requestedDisplayName: "Ada",
    email: "ada@example.com",
    cellphoneNumber: "+27 82 000 0000",
    dateOfBirth: "1990-01-01",
    isAdultDeclared: true,
    consentToContact: true,
    shortBiography: "A".repeat(60),
  };

  it("sends blank optional strings as null, not empty strings", () => {
    const body = toDetails(complete);
    expect(body.legalMiddleNames).toBeNull();
    expect(body.whatsAppNumber).toBeNull();
    expect(body.instagram).toBeNull();
  });

  it("omits the currency when no rate was given", () => {
    expect(toDetails(complete).currencyCode).toBeNull();
    expect(toDetails({ ...complete, requestedHourlyRate: "500" }).currencyCode).toBe("ZAR");
  });

  it("refuses an applicant under 18", () => {
    const year = new Date().getFullYear() - 16;
    expect(validateAbout({ ...complete, dateOfBirth: `${year}-01-01` }).dateOfBirth).toBeTruthy();
  });

  it("requires both declarations", () => {
    expect(validateAbout({ ...complete, isAdultDeclared: false }).isAdultDeclared).toBeTruthy();
    expect(validateAbout({ ...complete, consentToContact: false }).consentToContact).toBeTruthy();
  });

  it("accepts a complete record", () => {
    expect(validateAbout(complete)).toEqual({});
    expect(validateProfile(complete)).toEqual({});
  });

  it("accepts a blank short biography (optional) and sends it as null", () => {
    expect(validateProfile({ ...complete, shortBiography: "" }).shortBiography).toBeUndefined();
    expect(validateProfile({ ...complete, shortBiography: "   " }).shortBiography).toBeUndefined();
    expect(toDetails({ ...complete, shortBiography: "" }).shortBiography).toBeNull();
    expect(toDetails({ ...complete, shortBiography: "  " }).shortBiography).toBeNull();
  });

  it("still keeps a light floor on a short biography that IS provided", () => {
    expect(validateProfile({ ...complete, shortBiography: "too short" }).shortBiography).toBeTruthy();
  });

  it("computes age from a date of birth", () => {
    expect(ageFrom("1990-06-15")).toBeGreaterThan(30);
    expect(ageFrom("")).toBeNull();
  });
});

// ---- photograph rules -----------------------------------------------------

describe("photograph constraints", () => {
  const photo = (id: string, uploadStatus: string) => ({
    id,
    originalFileName: `${id}.jpg`,
    mimeType: "image/jpeg",
    sizeBytes: 1,
    width: null,
    height: null,
    sortOrder: 0,
    isCover: false,
    uploadStatus,
    createdAtUtc: "2026-01-01T00:00:00Z",
  });

  it("does not count an unfinished upload as a photograph", () => {
    // A reservation has no verified object behind it. Counting it would let an
    // applicant submit with fewer real photographs than the minimum.
    //
    // This previously used "Ready" and "Pending", which the server has never
    // sent — so it passed while proving nothing, and a failed upload really was
    // counted in UAT. The statuses below are the actual enum names, and
    // `isUploaded` is the server's own verdict.
    const media = [
      { ...photo("a", "PendingReview"), isUploaded: true },
      { ...photo("b", "Uploading"), isUploaded: false },
      { ...photo("c", "PendingReview"), isUploaded: true },
    ];
    expect(finalizedPhotos(media).map((m: { id: string }) => m.id)).toEqual(["a", "c"]);
  });

  it("finalizes only after the storage PUT resolves", () => {
    const source = read("src/features/talentApplication/PhotographManager.jsx");
    const put = source.indexOf("uploadToStorage");
    const finalize = source.indexOf("finalizeUpload", put);
    expect(put).toBeGreaterThan(-1);
    expect(finalize).toBeGreaterThan(put);
    expect(source.slice(put, finalize)).toContain("await");
  });

  it("takes its limits from the server rather than hardcoding 3 and 8", () => {
    const page = read("src/pages/TalentApplication.jsx");
    expect(page).toContain("minimumPhotographs");
    expect(page).toContain("maximumPhotographs");
    expect(page).toContain("limits.min");
    expect(page).toContain("limits.max");
  });

  it("never base64-encodes an image into the application API", () => {
    for (const file of [
      "src/features/talentApplication/PhotographManager.jsx",
      "src/services/talentApplicationService.ts",
    ]) {
      const source = read(file);
      expect(source).not.toContain("readAsDataURL");
      expect(source).not.toContain("toDataURL");
      expect(source).not.toContain("base64");
    }
  });
});

// ---- the public page ------------------------------------------------------

describe("For Talent page", () => {
  const page = read("src/pages/TalentApplication.jsx");

  it("no longer presents the roster as invitation-only", () => {
    for (const phrase of ["invitation only", "invitation-only", "by invitation", "invite only"]) {
      expect(page.toLowerCase()).not.toContain(phrase);
    }
  });

  it("presents the four contract sections", () => {
    expect(page).toContain('"About you"');
    expect(page).toContain('"Public profile"');
    expect(page).toContain('"Photos"');
    expect(page).toContain('"Review and submit"');
  });

  it("shows only the reference the backend returned", () => {
    expect(page).toContain("submitted.reference");
    // Nothing constructs a reference locally.
    expect(page).not.toMatch(/reference\s*[:=]\s*`?(LUS|APP|REF)-/i);
  });

  it("never reports success without a server response", () => {
    // `submitted` is only ever set from the awaited result of submitApplication.
    expect(page).toContain("const result = await applications.submitApplication");
    expect(page).toContain("setSubmitted(result)");
    expect(page).not.toContain("setSubmitted(true)");
  });

  it("states that publication remains Management's decision", () => {
    expect(page).toContain("Lustra Management");
    expect(page.toLowerCase()).toContain("preference");
  });

  it("keeps the approved cinematic imagery", () => {
    expect(page).toContain("PUBLIC_IMAGES.forTalent");
  });

  it("branches on the machine-readable errorCode, not on message text", () => {
    expect(page).toContain("APPLICATION_ERROR_CODES");
    expect(page).toContain("error.code");
  });

  it("collects a password through the shared control and sends it on submission", () => {
    // The account is created at submission, so the applicant chooses a password here.
    expect(page).toContain("PasswordField");
    expect(page).toContain('autoComplete="new-password"');
    expect(page).toContain("applications.submitApplication(");
    // Anonymous applicants send the chosen password; a signed-in (linked) applicant sends none.
    expect(page).toContain("linkedApplicant ? undefined : password");
  });

  it("links a signed-in client instead of asking them for a new password", () => {
    expect(page).toContain("usePrincipal");
    expect(page).toContain("const linkedApplicant =");
    // The draft-create call sends the token so the server links the existing account.
    expect(page).toContain("{ authenticated: linkedApplicant }");
  });

  it("holds the password apart from the application details, never in the wire body", () => {
    // A credential must never travel with toDetails to the draft.
    expect(page).toContain("const [password, setPassword]");
    const details = read("src/features/talentApplication/details.js");
    expect(details.toLowerCase()).not.toContain("password");
  });
});

// ---- continuation route ---------------------------------------------------

describe("/apply/continue", () => {
  it("is registered and public", () => {
    expect(paths).toContain("/apply/continue");
    expect(ROUTES.find((r) => r.path === "/apply/continue")?.access).toBe("public");
  });

  it("is matched before the /apply alias that would redirect it away", () => {
    expect(paths.indexOf("/apply/continue")).toBeLessThan(paths.indexOf("/apply"));
  });

  it("is not swallowed by the dynamic talent profile route", () => {
    // "/talent/:id" cannot match a two-segment /apply path, but assert the
    // separation explicitly: this class of bug already shipped once.
    expect(paths).toContain("/talent/:id");
    expect("/apply/continue".startsWith("/talent")).toBe(false);
  });
});

describe("continuation page behaviour", () => {
  beforeEach(() => window.sessionStorage.clear());
  afterEach(() => vi.restoreAllMocks());

  /**
   * The applicant-safe DETAILS projection. Everything they typed comes back, so
   * the form is repopulated rather than demanding a retype — and it still
   * carries no internal note, reviewer identity or review timestamp.
   */
  const status = {
    applicationId: "app-1",
    reference: "LA-2026-0001",
    status: "ChangesRequested",
    isEditable: true,
    legalFirstName: "Ada",
    legalMiddleNames: null,
    legalSurname: "Lovelace",
    requestedDisplayName: "Ada",
    email: "ada@example.com",
    cellphoneNumber: "+27820000000",
    whatsAppNumber: null,
    instagramUrl: null,
    additionalSocialUrl: null,
    cityId: null,
    cityFreeText: "Cape Town",
    dateOfBirth: "1996-12-10",
    shortBiography: "A".repeat(60),
    requestedHourlyRate: 1500,
    currencyCode: "ZAR",
    publishOnApproval: true,
    decisionReason: "Please add two brighter photographs.",
    minimumPhotographs: 3,
    maximumPhotographs: 8,
    media: [],
    createdAtUtc: "2026-01-01T00:00:00Z",
    submittedAtUtc: "2026-01-02T00:00:00Z",
  };

  function renderContinue(url: string, impl: () => Promise<unknown>) {
    const spy = vi.spyOn(service, "getApplicationDetails").mockImplementation(impl as never);
    window.history.replaceState({}, "", url);
    render(
      <MemoryRouter initialEntries={[url]}>
        <ApplicationContinue />
      </MemoryRouter>
    );
    return spy;
  }

  it("captures both parameters and sends the token in the header, not the URL", async () => {
    const spy = renderContinue("/apply/continue?application=app-1&token=secret", async () => status);
    await waitFor(() => expect(spy).toHaveBeenCalled());
    expect(spy).toHaveBeenCalledWith("app-1", "secret");
  });

  it("scrubs the token from the address bar immediately", async () => {
    renderContinue("/apply/continue?application=app-1&token=secret", async () => status);
    await waitFor(() => expect(window.location.search).not.toContain("secret"));
    expect(window.location.search).not.toContain("application=");
  });

  it("keeps the token out of localStorage entirely", async () => {
    renderContinue("/apply/continue?application=app-1&token=secret", async () => status);
    await waitFor(() => expect(window.sessionStorage.getItem("lustra.talentApplication")).toBeTruthy());
    expect(JSON.stringify(window.localStorage)).not.toContain("secret");
  });

  it("shows the applicant-safe requested changes", async () => {
    renderContinue("/apply/continue?application=app-1&token=secret", async () => status);
    expect(await screen.findByText(/Please add two brighter photographs/)).toBeInTheDocument();
    expect(screen.getByText(/Changes requested/i)).toBeInTheDocument();
  });

  it("never requests or renders Management internal notes", async () => {
    renderContinue("/apply/continue?application=app-1&token=secret", async () => status);
    await screen.findByText(/Please add two brighter photographs/);
    expect(screen.queryByText(/internal note/i)).toBeNull();
    // The page reads only the applicant-safe status projection. It never touches
    // a note collection and never calls a management endpoint.
    const source = read("src/pages/ApplicationContinue.jsx");
    expect(source).not.toMatch(/\.notes\b/);
    expect(source).not.toContain("addNote");
    expect(source).not.toContain("getApplication(");
    expect(source).not.toContain("management");
  });

  it("continues from sessionStorage after the URL has been cleaned", async () => {
    saveSession({ applicationId: "app-1", token: "secret", scope: "full", reference: "LA-1" });
    const spy = renderContinue("/apply/continue", async () => status);
    await waitFor(() => expect(spy).toHaveBeenCalledWith("app-1", "secret"));
  });

  it("shows a safe recovery state when opened with no token at all", async () => {
    const spy = renderContinue("/apply/continue", async () => status);
    expect(await screen.findByText(/missing its secure details/i)).toBeInTheDocument();
    expect(spy).not.toHaveBeenCalled();
    // No application data may be revealed without the token.
    expect(screen.queryByText("LA-2026-0001")).toBeNull();
  });

  it.each([
    ["expired", 404],
    ["revoked", 404],
    ["already used", 404],
    ["invalid", 401],
  ])("handles an %s token without exposing application data", async (_label, statusCode) => {
    renderContinue("/apply/continue?application=app-1&token=bad", async () => {
      throw ApiError.fromProblem(statusCode, { title: "Not found" });
    });
    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(screen.queryByText("LA-2026-0001")).toBeNull();
    expect(screen.getByText(/Start a new application/i)).toBeInTheDocument();
  });

  it("discards the token after a refusal so a reload cannot retry it", async () => {
    saveSession({ applicationId: "app-1", token: "bad", scope: "full", reference: "" });
    renderContinue("/apply/continue", async () => {
      throw ApiError.fromProblem(404, { title: "Not found" });
    });
    await screen.findByRole("alert");
    expect(loadSession()).toBeNull();
  });

  it("does not open the editor when the server says the application is not editable", async () => {
    renderContinue("/apply/continue?application=app-1&token=secret", async () => ({
      ...status,
      status: "UnderReview",
      isEditable: false,
    }));
    expect(await screen.findByText(/not open for changes/i)).toBeInTheDocument();
  });

  it("resubmits through the real endpoint", () => {
    const source = read("src/pages/ApplicationContinue.jsx");
    expect(source).toContain("applications.submitApplication");
    expect(source).not.toContain("setPhase(\"resubmitted\")\n      // ");
  });
});

// ---- refusal codes --------------------------------------------------------

describe("refusal codes", () => {
  it("exports the exact backend errorCode strings", () => {
    expect(APPLICATION_ERROR_CODES.tooFewPhotographs).toBe("talent_application.too_few_photographs");
    expect(APPLICATION_ERROR_CODES.underAge).toBe("talent_application.under_age");
    expect(APPLICATION_ERROR_CODES.duplicateActive).toBe("talent_application.duplicate_active");
    expect(APPLICATION_ERROR_CODES.notPublishable).toBe("talent_application.not_publishable");
  });

  it("carries the API's errorCode through to ApiError.code", () => {
    // The API sends `errorCode`; the parser read `code` and so every ApiError.code
    // in the application was undefined. Callers could not branch on a refusal.
    const error = ApiError.fromProblem(422, {
      title: "Too few",
      errorCode: APPLICATION_ERROR_CODES.tooFewPhotographs,
    });
    expect(error.code).toBe(APPLICATION_ERROR_CODES.tooFewPhotographs);
  });

  it("still accepts the legacy `code` field", () => {
    expect(ApiError.fromProblem(400, { code: "legacy.reason" }).code).toBe("legacy.reason");
  });

  it("prefers errorCode when a response carries both", () => {
    const error = ApiError.fromProblem(400, { errorCode: "current", code: "legacy" });
    expect(error.code).toBe("current");
  });
});
