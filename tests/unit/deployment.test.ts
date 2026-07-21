import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { deployedApiBaseUrlProblems } from "@/config/env";

/**
 * Deployment-correctness guards.
 *
 * Both UAT failures these cover were invisible on Windows and in development, and both
 * reported a misleading symptom in the browser. They are asserted against the real source
 * tree so a regression fails the build rather than the deployment.
 */

const ROOT = path.resolve(__dirname, "../..");
const SRC = path.join(ROOT, "src");

function sourceFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(full);
    return /\.(ts|tsx|js|jsx|html|json|css)$/.test(entry.name) ? [full] : [];
  });
}

describe("public asset casing", () => {
  // Windows is case-insensitive (git core.ignorecase=true), so a wrong-case reference
  // works locally and 404s on Vercel. The file on disk cannot be trusted here — git's
  // record is what Linux checks out.
  const canonical = "/Logo_x.png";

  it("references the header logo with git's exact casing", () => {
    const brandLogo = fs.readFileSync(
      path.join(SRC, "components/lustra/BrandLogo.tsx"),
      "utf8"
    );
    expect(brandLogo).toContain(`src="${canonical}"`);
  });

  it("has no reference to the lowercase spelling anywhere", () => {
    // Matched only where the path is USED — quoted or in url(). A prose mention inside a
    // comment explaining the bug is not a reference and must not fail the build.
    const offenders = [...sourceFiles(SRC), path.join(ROOT, "index.html")].filter((file) =>
      /["'(]\/?logo_x\.png/.test(fs.readFileSync(file, "utf8"))
    );
    expect(offenders).toEqual([]);
  });

  it("resolves every root-relative asset reference to a real public file", () => {
    // Catches the whole class of bug, not just the logo.
    //
    // The filenames come from GIT, not from the filesystem: this repository is developed
    // on Windows with core.ignorecase=true, so readdirSync reports whatever case the
    // directory entry happens to hold and cannot distinguish Logo_x.png from logo_x.png.
    // Vercel checks out from git on Linux, so git's record is what actually gets served.
    const available = new Set(
      execFileSync("git", ["ls-files", "public/"], { cwd: ROOT, encoding: "utf8" })
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .map((tracked) => tracked.replace(/^public\//, ""))
    );

    const referenced = new Set<string>();
    for (const file of [...sourceFiles(SRC), path.join(ROOT, "index.html")]) {
      const body = fs.readFileSync(file, "utf8");
      for (const match of body.matchAll(/["'(](\/[A-Za-z0-9_.-]+\.(?:png|ico|svg|jpe?g|webp|json))["')]/g)) {
        referenced.add(match[1].slice(1));
      }
    }

    const missing = [...referenced].filter((name) => !available.has(name));
    expect(missing).toEqual([]);
  });
});

describe("API base URL", () => {
  it("hard-codes no API host in shipped code", () => {
    // The base URL is configuration, not a constant: it differs per environment and is
    // inlined by Vite at build time. A literal host in a component or service would
    // silently win over the environment variable in one environment and not another.
    //
    // src/config/env.ts is exempt — it names hosts only inside the error message that
    // tells an operator what a valid value looks like.
    const offenders = [...sourceFiles(SRC), path.join(ROOT, "index.html")]
      .filter((file) => !file.endsWith(path.join("config", "env.ts")))
      .filter((file) => /https:\/\/[a-z0-9.-]*lustra\.vip/i.test(fs.readFileSync(file, "utf8")));

    expect(offenders).toEqual([]);
  });

  it("accepts the correct UAT origin", () => {
    expect(deployedApiBaseUrlProblems("https://uatapi.lustra.vip/api/v1")).toEqual([]);
    expect(deployedApiBaseUrlProblems("https://api.lustra.vip/api/v1")).toEqual([]);
  });

  it("rejects a base URL missing the /api/v1 prefix", () => {
    // THE bug: the browser reported a blocked CORS preflight, because the request landed
    // on a path the API redirects rather than serves.
    const problems = deployedApiBaseUrlProblems("https://uatapi.lustra.vip");
    expect(problems.join(" ")).toContain("/api/v1");
  });

  it("rejects http and localhost", () => {
    expect(deployedApiBaseUrlProblems("http://uatapi.lustra.vip/api/v1").join(" ")).toContain("https");
    expect(deployedApiBaseUrlProblems("https://localhost:7266/api/v1").join(" ")).toContain("localhost");
    expect(deployedApiBaseUrlProblems("http://127.0.0.1:5000").length).toBeGreaterThan(1);
  });

  it("rejects a relative base URL in a deployed build", () => {
    expect(deployedApiBaseUrlProblems("/api/v1").join(" ")).toContain("absolute");
  });
});

describe("URL joining", () => {
  // Mirrors src/config/env.ts and src/api/client.ts: the base is stripped of trailing
  // slashes, and every path starts with one — so the join can never produce "//".
  const normalise = (value: string) => value.replace(/\/+$/, "");

  it("trims trailing slashes so paths never double up", () => {
    for (const raw of [
      "https://uatapi.lustra.vip/api/v1",
      "https://uatapi.lustra.vip/api/v1/",
      "https://uatapi.lustra.vip/api/v1///",
    ]) {
      const base = normalise(raw);
      expect(base).toBe("https://uatapi.lustra.vip/api/v1");
      expect(`${base}/public/talents`).toBe("https://uatapi.lustra.vip/api/v1/public/talents");
      expect(`${base}/public/talents`).not.toContain("//public");
    }
  });

  it("resolves the public talent request against the configured origin", () => {
    // The route the backend actually exposes is api/v1/public/talents
    // (PublicTalentsController: [Route("api/v1/public/talents")]).
    const base = normalise("https://uatapi.lustra.vip/api/v1");
    const url = new URL(`${base}/public/talents`);

    expect(url.origin).toBe("https://uatapi.lustra.vip");
    expect(url.pathname).toBe("/api/v1/public/talents");
  });
});

describe("deployment templates", () => {
  const uat = fs.readFileSync(path.join(ROOT, "docs/deployment/uat.frontend.env.example"), "utf8");

  /** The uncommented `NAME=value` assignments — what an operator copies into Vercel. */
  const assignments = new Map(
    uat
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => /^VITE_[A-Z_]+=/.test(line))
      .map((line) => {
        const separator = line.indexOf("=");
        return [line.slice(0, separator), line.slice(separator + 1)] as const;
      })
  );

  it("assigns the canonical UAT values exactly", () => {
    expect(assignments.get("VITE_DATA_MODE")).toBe("api");
    expect(assignments.get("VITE_API_BASE_URL")).toBe("https://uatapi.lustra.vip/api/v1");
    expect(assignments.get("VITE_SIGNALR_BASE_URL")).toBe("https://uatapi.lustra.vip");
    expect(assignments.get("VITE_APP_ENV")).toBe("uat");
    expect(assignments.get("VITE_ENABLE_DEV_ROLE_SWITCHER")).toBe("false");
  });

  it("uses the hostname without a hyphen", () => {
    // uatapi, not uat-api. The hyphenated spelling was an incorrect assumption and does
    // not resolve; every assignment must use the real host.
    for (const [name, value] of assignments) {
      expect(value, `${name} must not use the hyphenated host`).not.toMatch(/uat-api\.lustra\.vip/i);
    }
  });

  it("gives SignalR the ORIGIN and the API the versioned path", () => {
    // Two different shapes, and mixing them up is easy: the hub is mapped at
    // /hubs/chat on the root, so an origin carrying /api/v1 would negotiate against
    // /api/v1/hubs/chat and 404.
    expect(assignments.get("VITE_SIGNALR_BASE_URL")).not.toMatch(/\/api\/v\d+/);
    expect(assignments.get("VITE_API_BASE_URL")).toMatch(/\/api\/v1$/);
  });

  it("leaves no trailing slash on any URL value", () => {
    for (const [name, value] of assignments) {
      if (/^https?:\/\//.test(value)) {
        expect(value, `${name} must not end with a slash`).not.toMatch(/\/$/);
      }
    }
  });
});
