import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { authenticatedHomePath, ROLE_HOME } from "@/domain/roles";
import type { Role } from "@/domain/roles";
import { ROUTES } from "@/app/routeRegistry";

/**
 * Where the Lustra logo goes.
 *
 * Inside an authenticated shell the logo is a HOME affordance, not an exit.
 * Sending a signed-in administrator to the public landing page reads as having
 * been thrown out — the shell and navigation vanish and nothing says the session
 * is still valid. It is. Leaving on purpose is a separate, labelled action.
 */

const ROOT = join(__dirname, "../..");
const read = (p: string) => readFileSync(join(ROOT, p), "utf8");

const SHELLS = [
  "src/layouts/WorkspaceShell.jsx",
  "src/layouts/TalentShell.jsx",
  "src/layouts/AppShell.jsx",
  "src/components/lustra/public/PublicHeader.tsx",
];

let roles: Role[] = [];
let authenticated = false;

vi.mock("@/auth/PrincipalContext", () => ({
  usePrincipalOptional: () => ({
    principal: { isAuthenticated: authenticated, roles, permissions: [], isLoading: false },
    hasPermission: () => true,
    hasRole: (r: Role) => roles.includes(r),
    hasAnyRole: () => true,
    isLoading: false,
  }),
}));

async function renderHomeLink() {
  const { useHomeLink } = await import("@/auth/useHomeLink");
  function Probe() {
    return <span data-testid="home">{useHomeLink()}</span>;
  }
  // Unmounted immediately: several tests call this in a loop, and a left-behind
  // probe would make the next lookup ambiguous rather than wrong — which is a
  // far more confusing failure to read.
  const { unmount } = render(
    <MemoryRouter>
      <Probe />
    </MemoryRouter>
  );
  const value = screen.getByTestId("home").textContent;
  unmount();
  return value;
}

beforeEach(() => {
  roles = [];
  authenticated = false;
});
afterEach(() => vi.resetModules());

// ---- the destination per role ---------------------------------------------------

describe("role-aware home", () => {
  it("sends an anonymous visitor to the public site", async () => {
    expect(await renderHomeLink()).toBe("/");
  });

  it.each([
    ["superadmin", "/admin"],
    ["admin", "/admin"],
    ["management", "/management-dashboard"],
    ["talent", "/talent-portal"],
    ["client", "/app/discover"],
  ] as const)("sends %s to %s", async (role, expected) => {
    authenticated = true;
    roles = [role];
    expect(await renderHomeLink()).toBe(expected);
  });

  it("never sends a signed-in user to the public landing page", async () => {
    for (const role of ["client", "talent", "management", "admin", "superadmin"] as Role[]) {
      authenticated = true;
      roles = [role];
      vi.resetModules();
      expect(await renderHomeLink(), `${role} was ejected to the public site`).not.toBe("/");
    }
  });

  it("keeps a signed-in user inside the app even with an unrecognised role", () => {
    // They ARE signed in. Landing them on the public site is exactly the defect
    // this helper exists to prevent.
    expect(authenticatedHomePath([] as Role[])).toBe(ROLE_HOME.client);
    expect(authenticatedHomePath([] as Role[])).not.toBe("/");
  });
});

// ---- multi-role precedence -------------------------------------------------------

describe("multi-role precedence matches post-login routing", () => {
  it.each([
    [["management", "admin"], "/admin"],
    [["client", "talent"], "/talent-portal"],
    [["talent", "management"], "/management-dashboard"],
    [["client", "superadmin"], "/admin"],
    [["client", "talent", "management", "admin", "superadmin"], "/admin"],
  ] as const)("resolves %s to %s", (given, expected) => {
    expect(authenticatedHomePath(given as unknown as Role[])).toBe(expected);
  });

  it("is the one helper post-login routing also uses", () => {
    // Two implementations of "where is home" is how the logo and the login
    // redirect end up disagreeing.
    const hooks = read("src/features/auth/hooks.ts");
    expect(hooks).toContain("authenticatedHomePath");
    expect(hooks).not.toMatch(/roles\.includes\("superadmin"\)/);
  });
});

// ---- every destination is a real route -------------------------------------------

describe("no dead destinations", () => {
  it("routes every role home to a registered path", () => {
    const paths = new Set(ROUTES.map((r) => r.path));
    for (const role of ["client", "talent", "management", "admin", "superadmin"] as Role[]) {
      expect(paths, `${role} home is not a real route`).toContain(authenticatedHomePath([role]));
    }
  });
});

// ---- the shells ------------------------------------------------------------------

describe("every shell logo uses the role-aware route", () => {
  it.each(SHELLS)("%s links its logo to the home helper", (shell) => {
    const source = read(shell);

    expect(source).toContain("useHomeLink");
    expect(source).toContain('<Link to={homeLink} aria-label="Lustra home"');
    // The hardcoded public route was the defect.
    expect(source).not.toContain('<Link to="/" aria-label="Lustra home"');
  });

  it("applies to the mobile header as well as the desktop sidebar", () => {
    // TalentShell renders the logo twice — a desktop sidebar and a mobile header.
    // A fix applied to only one is a fix that looks done and is not.
    const source = read("src/layouts/TalentShell.jsx");
    const occurrences = source.split('aria-label="Lustra home"').length - 1;

    expect(occurrences).toBe(2);
    expect(source.split("to={homeLink}").length - 1).toBe(2);
  });
});

// ---- the logo is not a logout, and not an exit -------------------------------------

describe("the logo never leaves the session", () => {
  it.each(SHELLS)("%s does not log out from the logo", (shell) => {
    const source = read(shell);
    for (const forbidden of ["useLogout", "logout(", "endSession", "clearTokens", "signOut"]) {
      expect(source, `${shell} must not ${forbidden} from navigation`).not.toContain(forbidden);
    }
  });

  it("does not touch the token store from any shell", () => {
    for (const shell of SHELLS) {
      const source = read(shell);
      expect(source).not.toContain("authTokenCoordinator");
      expect(source).not.toContain("useAuthStore");
    }
  });

  it("keeps Exit to site as the deliberate, separate way out", () => {
    // Both internal shells keep an explicitly labelled exit. That is the action
    // that goes to the public site; the logo is not.
    const workspace = read("src/layouts/WorkspaceShell.jsx");
    const talent = read("src/layouts/TalentShell.jsx");

    expect(workspace).toContain("Exit to site");
    expect(workspace).toContain('navigate("/")');

    expect(talent).toContain("Exit to site");
    expect(talent).toMatch(/to="\/"[\s\S]{0,200}Exit to site/);
  });
});

// ---- the public header, when the visitor is signed in --------------------------------

describe("the public header follows the same rule", () => {
  it("survives rendering outside the principal provider", async () => {
    // Marketing pages render the public header without any auth context. A
    // header that throws there would take down a page that has nothing to do
    // with authentication.
    vi.resetModules();
    vi.doUnmock("@/auth/PrincipalContext");
    const { useHomeLink } = await import("@/auth/useHomeLink");
    function Probe() {
      return <span data-testid="bare">{useHomeLink()}</span>;
    }
    const { unmount } = render(
      <MemoryRouter>
        <Probe />
      </MemoryRouter>
    );
    expect(screen.getByTestId("bare").textContent).toBe("/");
    unmount();
    vi.doMock("@/auth/PrincipalContext", () => ({
      usePrincipalOptional: () => ({
        principal: { isAuthenticated: authenticated, roles, permissions: [], isLoading: false },
      }),
    }));
  });

  it("points a signed-in visitor back into the app", async () => {
    authenticated = true;
    roles = ["admin"];
    expect(await renderHomeLink()).toBe("/admin");
  });

  it("still points an anonymous visitor at the public site", async () => {
    expect(await renderHomeLink()).toBe("/");
  });
});
