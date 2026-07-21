import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { ROUTES } from "@/app/routeRegistry";

/**
 * SPA deep-link routing, environment templates and the desktop typography scale.
 *
 * Every assertion here protects something that only breaks in a deployed
 * environment: a rewrite that swallows a static asset, an environment file that
 * silently points a UAT build at the live API, or a page that hardcodes a size
 * so small it is unreadable on a 1440px console.
 */

const ROOT = path.resolve(__dirname, "../..");
const read = (p: string) => fs.readFileSync(path.join(ROOT, p), "utf8");
const vercel = JSON.parse(read("vercel.json"));

describe("Vercel SPA fallback", () => {
  it("builds with the project's own commands into dist", () => {
    expect(vercel.framework).toBe("vite");
    expect(vercel.buildCommand).toBe("npm run build");
    expect(vercel.outputDirectory).toBe("dist");
  });

  it("rewrites unmatched paths to the app root, not to /index.html", () => {
    // With `cleanUrls: true` Vercel redirects /index.html -> /, so naming the
    // file as the rewrite destination invites a redirect loop. "/" is the
    // documented-compatible target.
    expect(vercel.cleanUrls).toBe(true);
    expect(vercel.rewrites).toEqual([{ source: "/(.*)", destination: "/" }]);
  });

  it("keeps hashed assets immutable and the shell revalidated", () => {
    const sources = vercel.headers.map((h: { source: string }) => h.source);
    expect(sources).toContain("/assets/(.*)");
    expect(sources).toContain("/");

    const assets = vercel.headers.find((h: { source: string }) => h.source === "/assets/(.*)");
    expect(assets.headers[0].value).toContain("immutable");
  });

  it("keeps the security headers", () => {
    const all = JSON.stringify(vercel.headers);
    for (const header of [
      "X-Content-Type-Options",
      "Referrer-Policy",
      "X-Frame-Options",
      "Permissions-Policy",
    ]) {
      expect(all).toContain(header);
    }
  });

  it("registers every deep route that must survive a direct visit or refresh", () => {
    const paths = ROUTES.map((r) => r.path);
    for (const required of [
      "/login",
      "/register",
      "/forgot-password",
      "/reset-password",
      "/verify-email",
      "/talent/activate",
      "/for-talent",
      "/admin",
    ]) {
      expect(paths).toContain(required);
    }
  });
});

describe("environment templates", () => {
  const parse = (file: string) =>
    Object.fromEntries(
      read(file)
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line && !line.startsWith("#"))
        .map((line) => {
          const at = line.indexOf("=");
          return [line.slice(0, at), line.slice(at + 1)];
        })
    );

  const uat = parse(".env.uat");
  const production = parse(".env.production");

  it("points UAT at the UAT API over https", () => {
    expect(uat.VITE_DATA_MODE).toBe("api");
    expect(uat.VITE_API_BASE_URL).toBe("https://uatapi.lustra.vip/api/v1");
    expect(uat.VITE_SIGNALR_BASE_URL).toBe("https://uatapi.lustra.vip");
    expect(uat.VITE_APP_ENV).toBe("uat");
  });

  it("points production at the live API over https", () => {
    expect(production.VITE_DATA_MODE).toBe("api");
    expect(production.VITE_API_BASE_URL).toBe("https://api.lustra.vip/api/v1");
    expect(production.VITE_SIGNALR_BASE_URL).toBe("https://api.lustra.vip");
    expect(production.VITE_APP_ENV).toBe("production");
  });

  it("never enables the dev role switcher in a deployed build", () => {
    expect(uat.VITE_ENABLE_DEV_ROLE_SWITCHER).toBe("false");
    expect(production.VITE_ENABLE_DEV_ROLE_SWITCHER).toBe("false");
  });

  it("cannot fall back to mock data or to localhost", () => {
    for (const env of [uat, production]) {
      expect(env.VITE_DATA_MODE).not.toBe("mock");
      expect(env.VITE_API_BASE_URL).not.toContain("localhost");
      expect(env.VITE_API_BASE_URL.startsWith("https://")).toBe(true);
    }
  });

  it("keeps .env.local out of version control", () => {
    expect(read(".gitignore")).toMatch(/\*\.local|\.env\.local/);
  });

  it("exposes per-mode build scripts", () => {
    const { scripts } = JSON.parse(read("package.json"));
    expect(scripts["build:uat"]).toBe("vite build --mode uat");
    expect(scripts["build:production"]).toBe("vite build --mode production");
    expect(scripts["dev:uat"]).toBe("vite --mode uat");
  });
});

describe("desktop typography scale", () => {
  const tailwind = read("tailwind.config.js");

  it("defines responsive tokens rather than per-page overrides", () => {
    for (const token of ["body:", "helper:", "nav:", "meta:"]) {
      expect(tailwind).toContain(token);
    }
    expect(tailwind).toContain("clamp(");
  });

  it("never lets a token fall below a readable floor on desktop", () => {
    // Each token's clamp() upper bound, in rem. 0.78rem ≈ 12.5px is the floor
    // for metadata a person is expected to read on a wide screen.
    const uppers = [...tailwind.matchAll(/clamp\([^)]*?,\s*([\d.]+)rem\)/g)].map((m) =>
      Number(m[1])
    );
    expect(uppers.length).toBeGreaterThanOrEqual(4);
    for (const rem of uppers) {
      expect(rem).toBeGreaterThanOrEqual(0.78);
    }
  });

  it("uses the tokens in the desktop shells instead of hardcoded sizes", () => {
    for (const shell of ["src/layouts/WorkspaceShell.jsx", "src/layouts/TalentShell.jsx"]) {
      const source = read(shell);
      expect(source).toMatch(/text-(nav|body|helper|meta)/);
      expect(source).not.toContain("text-[0.6rem]");
      expect(source).not.toContain("text-[0.65rem]");
    }
  });
});
