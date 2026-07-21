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
  it("carries no reference to the obsolete UAT host in shipped code", () => {
    // Source only. The deployment notes deliberately quote the broken URL as the
    // symptom being explained, and documenting a past failure is not a reference to it.
    const offenders = [...sourceFiles(SRC), path.join(ROOT, "index.html")].filter((file) =>
      /uatapi\.lustra\.vip/i.test(fs.readFileSync(file, "utf8"))
    );
    expect(offenders).toEqual([]);
  });

  it("accepts the correct UAT origin", () => {
    expect(deployedApiBaseUrlProblems("https://uat-api.lustra.vip/api/v1")).toEqual([]);
    expect(deployedApiBaseUrlProblems("https://api.lustra.vip/api/v1")).toEqual([]);
  });

  it("rejects a base URL missing the /api/v1 prefix", () => {
    // THE bug: the browser reported a blocked CORS preflight, because the request landed
    // on a path the API redirects rather than serves.
    const problems = deployedApiBaseUrlProblems("https://uat-api.lustra.vip");
    expect(problems.join(" ")).toContain("/api/v1");
  });

  it("rejects http, localhost and the obsolete host shape", () => {
    expect(deployedApiBaseUrlProblems("http://uat-api.lustra.vip/api/v1").join(" ")).toContain("https");
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
      "https://uat-api.lustra.vip/api/v1",
      "https://uat-api.lustra.vip/api/v1/",
      "https://uat-api.lustra.vip/api/v1///",
    ]) {
      const base = normalise(raw);
      expect(base).toBe("https://uat-api.lustra.vip/api/v1");
      expect(`${base}/public/talents`).toBe("https://uat-api.lustra.vip/api/v1/public/talents");
      expect(`${base}/public/talents`).not.toContain("//public");
    }
  });

  it("resolves the public talent request against the configured origin", () => {
    // The route the backend actually exposes is api/v1/public/talents
    // (PublicTalentsController: [Route("api/v1/public/talents")]).
    const base = normalise("https://uat-api.lustra.vip/api/v1");
    const url = new URL(`${base}/public/talents`);

    expect(url.origin).toBe("https://uat-api.lustra.vip");
    expect(url.pathname).toBe("/api/v1/public/talents");
  });
});

describe("deployment templates", () => {
  const uat = fs.readFileSync(path.join(ROOT, "docs/deployment/uat.frontend.env.example"), "utf8");

  it("documents the correct UAT API base URL with no trailing slash", () => {
    expect(uat).toContain("VITE_API_BASE_URL=https://uat-api.lustra.vip/api/v1");
    expect(uat).not.toMatch(/VITE_API_BASE_URL=\S*\/\s*$/m);
  });

  it("never ASSIGNS the obsolete host to a variable", () => {
    // The template explains the outage, so the broken URL appears in prose. What must
    // never appear is an uncommented VITE_* assignment carrying it — that is the value
    // an operator would copy into Vercel.
    const assignments = uat
      .split(/\r?\n/)
      .filter((line) => /^\s*VITE_[A-Z_]+\s*=/.test(line))
      .filter((line) => /uatapi\.lustra\.vip/i.test(line));

    expect(assignments).toEqual([]);
  });
});
