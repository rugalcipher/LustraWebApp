import { describe, it, expect, vi, afterEach } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { formatNumber, formatCurrency, formatDate, formatDateTime, EMPTY } from "@/lib/format";
import { formatRate } from "@/domain/talent";
import AuthenticatedErrorBoundary from "@/components/AuthenticatedErrorBoundary";

/**
 * The post-login crash.
 *
 * A single `value.toLocaleString()` on a null blanked the whole authenticated app — React
 * unmounts the tree on a render throw, so the shell, the navigation and every sign that the
 * user was still signed in vanished at once. Two defences: the values format safely, and a
 * boundary catches whatever still slips through so one bad page never takes the shell down.
 */

const ROOT = join(__dirname, "../..");
const read = (p: string) => readFileSync(join(ROOT, p), "utf8");

vi.mock("@/auth/PrincipalContext", () => ({
  usePrincipalOptional: () => ({
    principal: { isAuthenticated: true, roles: ["client"], permissions: [], isLoading: false },
  }),
}));

afterEach(() => vi.restoreAllMocks());

// ---- the helpers ----------------------------------------------------------------

describe("formatNumber", () => {
  it("renders a missing value as the fallback, not zero", () => {
    expect(formatNumber(null)).toBe(EMPTY);
    expect(formatNumber(undefined)).toBe(EMPTY);
    expect(formatNumber(NaN)).toBe(EMPTY);
    expect(formatNumber("")).toBe(EMPTY);
  });

  it("renders zero as zero", () => {
    // The rule that stops a dashboard quietly lying: nought is a figure, not a gap.
    expect(formatNumber(0)).toBe("0");
  });

  it("groups a real number", () => {
    expect(formatNumber(1234567)).toMatch(/1.234.567/);
  });

  it("accepts a numeric string", () => {
    expect(formatNumber("42")).toBe("42");
  });
});

describe("formatCurrency", () => {
  it("returns the fallback for a missing amount", () => {
    expect(formatCurrency(null, "ZAR")).toBe(EMPTY);
  });

  it("formats zero rather than hiding it", () => {
    expect(formatCurrency(0, "ZAR")).toMatch(/0/);
  });

  it("falls back to a default currency rather than throwing on a missing one", () => {
    expect(formatCurrency(1500, null)).toMatch(/1.500/);
  });

  it("never throws on an unrecognised currency code", () => {
    expect(() => formatCurrency(1500, "NOTACODE")).not.toThrow();
    expect(formatCurrency(1500, "NOTACODE")).toMatch(/1.500/);
  });
});

describe("formatDate / formatDateTime", () => {
  it("returns the fallback for null, undefined and an invalid date", () => {
    expect(formatDate(null)).toBe(EMPTY);
    expect(formatDate("not-a-date")).toBe(EMPTY);
    expect(formatDateTime(undefined)).toBe(EMPTY);
    // The exact string a naive `new Date(null).toLocaleString()` would have shown.
    expect(formatDate(null)).not.toMatch(/Invalid Date/);
  });

  it("formats a real date", () => {
    expect(formatDate("2026-07-25")).toMatch(/2026/);
  });
});

describe("formatRate no longer crashes on a null rate", () => {
  it("renders On request rather than throwing", () => {
    expect(() => formatRate(null, null)).not.toThrow();
    expect(formatRate(null, "ZAR")).toBe("On request");
  });

  it("still formats a real rate", () => {
    expect(formatRate(1500, "ZAR")).toMatch(/1.500/);
  });
});

// ---- the immersive slides that crashed ------------------------------------------

describe("the Client discovery surfaces guard the rate", () => {
  it.each([
    "src/components/lustra/immersive/TalentOverlay.jsx",
    "src/pages/TalentDetail.jsx",
    "src/pages/TalentTeaser.jsx",
    "src/components/lustra/immersive/ImmersiveTalentDiscovery.jsx",
  ])("%s formats the rate via formatRate, never a raw toLocaleString", (file) => {
    const source = read(file);
    expect(source).not.toContain("startingRate.toLocaleString()");
    expect(source).toContain("formatRate(");
  });
});

// ---- the boundary ---------------------------------------------------------------

function Boom(): React.ReactElement {
  throw new Error("null.toLocaleString");
}

describe("the authenticated error boundary", () => {
  it("shows a recovery state instead of a blank page when a child throws", () => {
    // React logs the caught error; silence it so the test output is readable.
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    render(
      <MemoryRouter>
        <AuthenticatedErrorBoundary routeKey="/app/discover">
          <Boom />
        </AuthenticatedErrorBoundary>
      </MemoryRouter>
    );

    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByText(/still signed in/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /try again/i })).toBeInTheDocument();
    spy.mockRestore();
  });

  it("renders its children when nothing throws", () => {
    render(
      <MemoryRouter>
        <AuthenticatedErrorBoundary routeKey="/app/discover">
          <p>healthy page</p>
        </AuthenticatedErrorBoundary>
      </MemoryRouter>
    );

    expect(screen.getByText("healthy page")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("offers a way home and never a logout", () => {
    const source = read("src/components/AuthenticatedErrorBoundary.jsx");
    // Recovery must not clear the session — a render bug is not a sign-out.
    for (const forbidden of ["useLogout", "logout(", "endSession", "clearTokens"]) {
      expect(source).not.toContain(forbidden);
    }
    expect(source).toContain("useHomeLink");
  });

  it("is wired into every authenticated shell", () => {
    for (const shell of [
      "src/layouts/AppShell.jsx",
      "src/layouts/TalentShell.jsx",
      "src/layouts/WorkspaceShell.jsx",
    ]) {
      expect(read(shell)).toContain("AuthenticatedErrorBoundary");
    }
  });
});
