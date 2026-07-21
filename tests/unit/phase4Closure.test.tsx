import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ROUTES } from "@/app/routeRegistry";
import * as talentAdmin from "@/services/talentAdminService";
import * as applications from "@/services/talentApplicationService";
import { mapAuthUserToPrincipal } from "@/services/dto/authDto";
import { GUEST_PRINCIPAL } from "@/auth/principal";
import {
  PASSWORD_CHANGE_REQUIRED, CHANGE_PASSWORD_PATH, isAllowedWhileRestricted,
} from "@/auth/restrictedSession";
import RestrictedSessionGate from "@/auth/RestrictedSessionGate";

/**
 * Integration of backend closure commit 29b3ae4.
 *
 * Three guarantees the backend made and this suite holds the frontend to:
 *
 *  1. A restricted session reaches nothing but the change-password screen — and
 *     the client does not pretend to BE the enforcement, which is the API's.
 *  2. A changes-requested applicant no longer retypes their own application.
 *  3. Staff can upload a photograph without signing in as the talent, and what
 *     lands is pending and private: uploading is not moderating.
 */

const ROOT = join(__dirname, "../..");
const read = (p: string) => readFileSync(join(ROOT, p), "utf8");

// ---- restricted session ------------------------------------------------------

let principalState: ReturnType<typeof mapAuthUserToPrincipal> | typeof GUEST_PRINCIPAL =
  GUEST_PRINCIPAL;

vi.mock("@/auth/PrincipalContext", () => ({
  usePrincipal: () => ({
    principal: principalState,
    isLoading: principalState.isLoading,
    hasPermission: () => true,
    hasRole: () => true,
    hasAnyRole: () => true,
  }),
}));

vi.mock("@/auth/AuthProvider", () => ({
  useAuth: () => ({ refreshUser: vi.fn(), user: null, isLoadingAuth: false }),
}));

const authUser = (over = {}) => ({
  id: "u-1",
  email: "staff@lustra.test",
  displayName: "Staff",
  emailConfirmed: true,
  accountStatus: "Active",
  roles: ["Management"],
  permissions: [],
  ...over,
});

function renderGate(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <RestrictedSessionGate>
        <Routes>
          <Route path={CHANGE_PASSWORD_PATH} element={<div>CHANGE PASSWORD</div>} />
          <Route path="/admin" element={<div>ADMIN</div>} />
          <Route path="/admin/talent" element={<div>TALENT</div>} />
          <Route path="/for-talent" element={<div>PUBLIC PAGE</div>} />
          <Route path="/login" element={<div>SIGN IN</div>} />
        </Routes>
      </RestrictedSessionGate>
    </MemoryRouter>
  );
}

describe("must-change-password enforcement", () => {
  afterEach(() => {
    principalState = GUEST_PRINCIPAL;
  });

  it("carries mustChangePassword from the API onto the principal", () => {
    expect(mapAuthUserToPrincipal(authUser({ mustChangePassword: true })).mustChangePassword).toBe(
      true
    );
    expect(mapAuthUserToPrincipal(authUser()).mustChangePassword).toBe(false);
  });

  it("defaults to unrestricted when the field is absent", () => {
    // An older API that omits it must not accidentally lock everyone out; the
    // server enforces the restriction regardless of what the client believes.
    expect(mapAuthUserToPrincipal(authUser({ mustChangePassword: undefined })).mustChangePassword)
      .toBe(false);
  });

  it("registers the change-password route", () => {
    expect(ROUTES.map((r) => r.path)).toContain(CHANGE_PASSWORD_PATH);
  });

  it("uses the backend's own errorCode", () => {
    expect(PASSWORD_CHANGE_REQUIRED).toBe("auth.password_change_required");
  });

  it("lets an unrestricted session through untouched", () => {
    principalState = mapAuthUserToPrincipal(authUser());
    renderGate("/admin/talent");
    expect(screen.getByText("TALENT")).toBeInTheDocument();
  });

  it.each(["/admin", "/admin/talent"])("blocks %s for a restricted session", (path) => {
    principalState = mapAuthUserToPrincipal(authUser({ mustChangePassword: true }));
    renderGate(path);
    expect(screen.getByText("CHANGE PASSWORD")).toBeInTheDocument();
    expect(screen.queryByText("ADMIN")).toBeNull();
    expect(screen.queryByText("TALENT")).toBeNull();
  });

  it("keeps the change-password route itself reachable", () => {
    principalState = mapAuthUserToPrincipal(authUser({ mustChangePassword: true }));
    renderGate(CHANGE_PASSWORD_PATH);
    expect(screen.getByText("CHANGE PASSWORD")).toBeInTheDocument();
  });

  it("leaves anonymous pages alone, matching the middleware", () => {
    principalState = mapAuthUserToPrincipal(authUser({ mustChangePassword: true }));
    renderGate("/for-talent");
    expect(screen.getByText("PUBLIC PAGE")).toBeInTheDocument();
  });

  it("allows sign-in and sign-out routes so a shared machine can be left", () => {
    expect(isAllowedWhileRestricted("/login", false)).toBe(true);
    expect(isAllowedWhileRestricted(CHANGE_PASSWORD_PATH, false)).toBe(true);
  });

  it("treats an unknown path as protected", () => {
    // Deny-by-default, mirroring the middleware: a route nobody opted in is
    // covered rather than quietly exempt.
    expect(isAllowedWhileRestricted("/something/new", true)).toBe(false);
  });

  it("persists the restriction across a reload", () => {
    // It is re-read from the principal on every render rather than held in
    // component state, so a refresh cannot shake it off.
    principalState = mapAuthUserToPrincipal(authUser({ mustChangePassword: true }));
    const first = renderGate("/admin");
    expect(screen.getByText("CHANGE PASSWORD")).toBeInTheDocument();
    first.unmount();
    renderGate("/admin");
    expect(screen.getByText("CHANGE PASSWORD")).toBeInTheDocument();
  });

  it("offers no way to dismiss the screen except changing or signing out", () => {
    const source = read("src/pages/ChangePasswordRequired.jsx");
    expect(source).toContain("Sign out instead");
    for (const escape of ["Skip", "Dismiss", "Later", "Remind me", "Continue anyway"]) {
      expect(source).not.toContain(escape);
    }
  });

  it("re-reads the session when the API reports the restriction mid-session", () => {
    const source = read("src/auth/RestrictedSessionGate.tsx");
    expect(source).toContain("registerForbiddenHandler");
    expect(source).toContain("PASSWORD_CHANGE_REQUIRED");
    // Only that code — an ordinary permission denial must not cost a round trip.
    expect(source).toContain("error.code === PASSWORD_CHANGE_REQUIRED");
  });

  it("uses the shared PasswordField and the live policy, not a private copy", () => {
    const source = read("src/pages/ChangePasswordRequired.jsx");
    expect(source).toContain("PasswordField");
    expect(source).toContain("usePasswordPolicy");
    expect(source).not.toContain('type="password"');
  });

  it("re-reads the session after a successful change before navigating", () => {
    // The restriction lives on the token. Navigating without refreshing would
    // bounce straight back to this screen.
    const source = read("src/pages/ChangePasswordRequired.jsx");
    const change = source.indexOf("await changePassword");
    const refresh = source.indexOf("refreshUser", change);
    const navigate = source.indexOf("navigate(", refresh);
    expect(change).toBeGreaterThan(-1);
    expect(refresh).toBeGreaterThan(change);
    expect(navigate).toBeGreaterThan(refresh);
  });

  it("does not claim to be the enforcement", () => {
    const source = read("src/auth/restrictedSession.ts");
    expect(source).toContain("Not the enforcement");
  });
});

// ---- applicant continuation prefill -------------------------------------------

describe("applicant continuation prefill", () => {
  let calls: { url: string; init: RequestInit }[] = [];

  beforeEach(() => {
    calls = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init: RequestInit = {}) => {
        calls.push({ url: String(url), init });
        return new Response(JSON.stringify({}), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      })
    );
  });
  afterEach(() => vi.unstubAllGlobals());

  it("reads the exact details route", async () => {
    await applications.getApplicationDetails("app-1", "tok");
    expect(
      new URL(calls[0].url, "https://x.test").pathname.endsWith(
        "/public/talent-applications/app-1/details"
      )
    ).toBe(true);
  });

  it("still sends the token in the header and never in the URL", async () => {
    await applications.getApplicationDetails("app-1", "secret-token");
    expect(new Headers(calls[0].init.headers).get("X-Application-Token")).toBe("secret-token");
    expect(calls[0].url).not.toContain("secret-token");
    expect(calls[0].url).not.toContain("token=");
  });

  it("prefills from the details response instead of asking for a retype", () => {
    const source = read("src/pages/ApplicationContinue.jsx");
    expect(source).toContain("getApplicationDetails");
    // Every field the applicant supplied is repopulated.
    for (const field of [
      "legalFirstName", "legalSurname", "email", "cellphoneNumber", "dateOfBirth",
      "shortBiography", "requestedHourlyRate", "publishOnApproval",
    ]) {
      expect(source).toContain(`result.${field}`);
    }
  });

  it("drops the old re-enter-everything limitation", () => {
    const source = read("src/pages/ApplicationContinue.jsx");
    expect(source).not.toContain("completing the whole form again");
    expect(source).not.toContain("editingDetails");
    expect(source).not.toContain("I also need to change my written details");
  });

  it("still never requests or renders management internal notes", () => {
    const source = read("src/pages/ApplicationContinue.jsx");
    expect(source).not.toMatch(/\.notes\b/);
    expect(source).not.toContain("addNote");
    expect(source).not.toContain("management");
  });

  it("keeps the query-string scrub", () => {
    const source = read("src/pages/ApplicationContinue.jsx");
    expect(source).toContain("scrubTokenFromUrl");
  });
});

// ---- staff media upload ---------------------------------------------------------

describe("staff talent-media upload", () => {
  let calls: { url: string; init: RequestInit }[] = [];

  beforeEach(() => {
    calls = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init: RequestInit = {}) => {
        calls.push({ url: String(url), init });
        return new Response(JSON.stringify({}), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      })
    );
  });
  afterEach(() => vi.unstubAllGlobals());

  const path = () => new URL(calls[calls.length - 1].url, "https://x.test").pathname;

  it.each([
    ["request upload", () => talentAdmin.requestTalentMediaUpload("tp-1", { contentType: "image/jpeg", expectedSizeBytes: 1, fileName: "a.jpg" }, "k"), "/management/talents/tp-1/media/request-upload"],
    ["finalize", () => talentAdmin.finalizeTalentMediaUpload("tp-1", "m-1"), "/management/talents/tp-1/media/m-1/finalize"],
    ["cancel", () => talentAdmin.cancelTalentMediaUpload("tp-1", "m-1"), "/management/talents/tp-1/media/m-1/upload"],
    ["archive impact", () => talentAdmin.getTalentArchiveImpact("tp-1"), "/management/talents/tp-1/archive-impact"],
  ])("uses the contract path for %s", async (_n, call, expected) => {
    await call();
    expect(path().endsWith(expected)).toBe(true);
  });

  it("sends an idempotency key so a retry cannot create a second row", async () => {
    await talentAdmin.requestTalentMediaUpload(
      "tp-1",
      { contentType: "image/jpeg", expectedSizeBytes: 1, fileName: "a.jpg" },
      "key-1"
    );
    expect(new Headers(calls[0].init.headers).get("Idempotency-Key")).toBe("key-1");
  });

  it("never sends a storage key — the server generates it in the talent's namespace", async () => {
    await talentAdmin.requestTalentMediaUpload(
      "tp-1",
      { contentType: "image/jpeg", expectedSizeBytes: 1, fileName: "a.jpg" },
      "key-1"
    );
    const body = JSON.parse(String(calls[0].init.body));
    // Nothing to aim at another talent's folder, because there is no key to aim.
    expect(body).not.toHaveProperty("storageKey");
    expect(body).not.toHaveProperty("key");
    expect(body.fileName).toBe("a.jpg");
  });

  it("cancels the DELETE to the upload sub-route, not the media itself", async () => {
    await talentAdmin.cancelTalentMediaUpload("tp-1", "m-1");
    expect(calls[0].init.method).toBe("DELETE");
    // Ending in /upload matters: DELETE on the media would be a different act.
    expect(path().endsWith("/upload")).toBe(true);
  });

  it("puts the bytes straight to storage with no Lustra credential", async () => {
    const sent: Record<string, string> = {};
    class FakeXhr {
      upload: { onprogress?: (e: { lengthComputable: boolean; loaded: number; total: number }) => void } = {};
      status = 200;
      onload?: () => void;
      onerror?: () => void;
      onabort?: () => void;
      open() {}
      setRequestHeader(k: string, v: string) {
        sent[k] = v;
      }
      send() {
        this.onload?.();
      }
    }
    vi.stubGlobal("XMLHttpRequest", FakeXhr as unknown as typeof XMLHttpRequest);

    await talentAdmin.uploadTalentMediaToStorage(
      {
        mediaId: "m",
        uploadUrl: "https://storage.test/signed?sig=abc",
        httpMethod: "PUT",
        storageKey: "k",
        contentType: "image/jpeg",
        expiresAtUtc: "2026-01-01T00:00:00Z",
      },
      new File(["x"], "x.jpg", { type: "image/jpeg" })
    );
    expect(Object.keys(sent)).toEqual(["Content-Type"]);
  });

  it("finalizes only after the PUT resolves, and releases the slot if it fails", () => {
    const source = read("src/features/talentAdmin/hooks.ts");
    const put = source.indexOf("uploadTalentMediaToStorage");
    const finalize = source.indexOf("finalizeTalentMediaUpload", put);
    const cancel = source.indexOf("cancelTalentMediaUpload", put);
    expect(put).toBeGreaterThan(-1);
    expect(finalize).toBeGreaterThan(put);
    // The catch releases the slot rather than leaving an orphan row.
    expect(cancel).toBeGreaterThan(put);
    expect(cancel).toBeLessThan(finalize);
  });

  it("says uploaded photographs arrive pending and private", () => {
    const source = read("src/features/talentAdmin/MediaManager.jsx");
    expect(source).toContain("pending review and private");
    expect(source).toContain("uploading is not");
  });

  it("never base64-encodes an image through the API", () => {
    for (const file of [
      "src/services/talentAdminService.ts",
      "src/features/talentAdmin/MediaManager.jsx",
    ]) {
      const source = read(file);
      expect(source).not.toContain("readAsDataURL");
      expect(source).not.toContain("base64");
    }
  });
});

// ---- archive impact ---------------------------------------------------------------

describe("archive impact", () => {
  it("states that archiving cancels nothing", () => {
    const service = read("src/services/talentAdminService.ts");
    expect(service).toContain("withdrawal, not deletion");
    expect(service).toContain("cancels nothing");
  });

  it("reports the future appointments left behind", () => {
    const page = read("src/pages/TalentRecord.jsx");
    expect(page).toContain("futureAppointmentCount");
    expect(page).toContain("NOT cancelled");
    expect(page).toContain("nextAppointmentDate");
  });

  it("fetches the preflight only when the dialog is open", () => {
    const page = read("src/pages/TalentRecord.jsx");
    expect(page).toContain('useTalentArchiveImpact(id, dialog === "archive")');
  });

  it("says archiving unpublishes and unfeatures", () => {
    const page = read("src/pages/TalentRecord.jsx");
    expect(page).toContain("unpublished, unfeatured");
  });
});
