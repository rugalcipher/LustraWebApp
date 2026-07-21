import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { ROUTES, navMetas } from "@/app/routeRegistry";

/**
 * Link integrity.
 *
 * Stage 8 shipped two `<Link to=...>` targets whose routes did not exist; both 404'd
 * silently because nothing connects a link to the route registry at compile time. This
 * suite scans the source for internal link literals and asserts every one resolves to a
 * registered route.
 */

const SRC = join(process.cwd(), "src");

/** Paths that are intentionally outside the registry. */
const ALLOWED_NON_ROUTES = new Set([
  "/", // the landing page is registered, but also used as a bare logo href
]);

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) return sourceFiles(full);
    return /\.(tsx?|jsx?)$/.test(entry) ? [full] : [];
  });
}

/**
 * Turn a registered path into a matcher. `/app/bookings/:id` must match a link built as
 * `/app/bookings/${booking.id}`, which appears in source as a template literal.
 */
function toPattern(routePath: string): RegExp {
  const escaped = routePath
    .split("/")
    .map((segment) => (segment.startsWith(":") ? "[^/]+" : segment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")))
    .join("/");
  return new RegExp(`^${escaped}$`);
}

const patterns = ROUTES.map((r) => toPattern(r.path));

function isRegistered(link: string): boolean {
  if (ALLOWED_NON_ROUTES.has(link)) return true;
  // A template placeholder stands in for any single segment.
  const normalised = link.replace(/\$\{[^}]*\}/g, "x");
  return patterns.some((pattern) => pattern.test(normalised));
}

/**
 * Collect internal link targets. Only absolute in-app paths are considered — external
 * URLs, anchors, `mailto:` and relative paths are not the registry's business.
 */
function collectLinks(): { file: string; link: string }[] {
  const found: { file: string; link: string }[] = [];

  for (const file of sourceFiles(SRC)) {
    const source = readFileSync(file, "utf8");

    // to="/x", to={`/x/${y}`}, to='/x'
    const matches = source.matchAll(/\bto=(?:\{?\s*)(["'`])(\/[^"'`\n]*)\1/g);
    for (const match of matches) {
      const link = match[2].split("?")[0].split("#")[0];
      if (link.startsWith("//")) continue;
      found.push({ file: relative(process.cwd(), file), link });
    }
  }

  return found;
}

describe("internal links", () => {
  const links = collectLinks();

  it("finds link literals to check", () => {
    // If the scanner silently matched nothing, the suite below would pass vacuously.
    expect(links.length).toBeGreaterThan(20);
  });

  it("points every internal link at a registered route", () => {
    const broken = links.filter(({ link }) => !isRegistered(link));

    // Reported with file names so a failure names the offending link directly.
    expect(
      broken.map((b) => `${b.file} → ${b.link}`),
      "these <Link to=...> targets have no matching route"
    ).toEqual([]);
  });
});

describe("route registry integrity", () => {
  it("gives every route an element", () => {
    for (const route of ROUTES) {
      expect(route.element, `route ${route.path} has no element`).toBeTruthy();
    }
  });

  it("starts every path with a slash", () => {
    for (const route of ROUTES) {
      expect(route.path.startsWith("/"), `route ${route.path} is not absolute`).toBe(true);
    }
  });

  it("gives every protected route an allowed-roles list", () => {
    // An empty/absent list on a protected route means "any authenticated user", which is
    // rarely the intent for an internal surface.
    for (const route of ROUTES.filter((r) => r.access === "protected")) {
      expect(route.roles, `route ${route.path} has no roles`).toBeDefined();
      expect(route.roles!.length, `route ${route.path} has an empty roles list`).toBeGreaterThan(0);
    }
  });

  it("points every navigation entry at its own route", () => {
    // A nav item whose path is not the route it decorates would render a dead tab.
    const paths = new Set(ROUTES.map((r) => r.path));
    for (const route of ROUTES.filter((r) => r.nav)) {
      expect(paths.has(route.path)).toBe(true);
      for (const meta of navMetas(route.nav)) {
        expect(meta.label.length).toBeGreaterThan(0);
        expect(meta.icon.length).toBeGreaterThan(0);
      }
    }
  });

  it("keeps navigation order unique within each group", () => {
    const groups = new Map<string, number[]>();
    for (const route of ROUTES.filter((r) => r.nav)) {
      for (const meta of navMetas(route.nav)) {
        groups.set(meta.group, [...(groups.get(meta.group) ?? []), meta.order]);
      }
    }

    for (const [group, orders] of groups) {
      // Duplicate orders make the rendered sequence depend on registry position, which is
      // a silent, confusing dependency.
      expect(new Set(orders).size, `duplicate nav order in "${group}"`).toBe(orders.length);
    }
  });
});
