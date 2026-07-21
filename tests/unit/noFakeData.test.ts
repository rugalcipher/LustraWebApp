import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

/**
 * No fabricated business data in deployed paths.
 *
 * The admin dashboard shipped hardcoded KPIs (412 users, 86 talent, "$184k"
 * revenue), five invented people and a permanently "Degraded" Media CDN badge.
 * Fake figures are worse than an empty panel: an operator cannot tell which
 * numbers are real, and a decorative outage indicator teaches people to ignore
 * the real one.
 *
 * Loading, empty and error states are legitimate. Invented business data is not.
 */

const SRC = join(process.cwd(), "src");

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) return sourceFiles(full);
    return /\.(ts|tsx|js|jsx)$/.test(entry) ? [full] : [];
  });
}

/** Deployed application source, excluding the dev-only role preview. */
const files = sourceFiles(SRC).filter((f) => !f.includes("devPreview") && !f.includes("DevRoles"));

describe("admin dashboard renders only real data", () => {
  const dashboard = readFileSync(join(SRC, "pages/AdminDashboard.jsx"), "utf8");

  it("has no hardcoded KPI values", () => {
    for (const literal of ["412", "$184k", "184k", "+24 this month", "+12% MoM"]) {
      expect(dashboard).not.toContain(literal);
    }
  });

  it("has no fabricated people or activity", () => {
    for (const name of ["V. Castellan", "Clara Voss", "T. Bianchi", "Isabelle · Jul 22"]) {
      expect(dashboard).not.toContain(name);
    }
  });

  it("has no fabricated dependency status", () => {
    expect(dashboard).not.toContain("Degraded");
    expect(dashboard).not.toContain("Media CDN");
  });

  it("sources its counters from the real management dashboard endpoint", () => {
    expect(dashboard).toContain("useManagementDashboard");
    expect(dashboard).toContain("useAuditLogs");
  });

  it("keeps loading, error and empty states", () => {
    expect(dashboard).toContain("isLoading");
    expect(dashboard).toContain("isError");
    expect(dashboard).toContain("No recorded activity yet.");
  });
});

describe("no fabricated revenue anywhere in deployed source", () => {
  it("never renders a currency figure that the API does not supply", () => {
    const offenders = files.filter((file) => {
      const source = readFileSync(file, "utf8");
      // A literal like "$184k" or "$12,500" written directly into markup.
      return /"\$\d[\d,.]*k?"/.test(source);
    });
    expect(offenders.map((f) => relative(process.cwd(), f))).toEqual([]);
  });
});

describe("no simulated network calls in deployed source", () => {
  it("never fakes a request with setTimeout", () => {
    const offenders = files.filter((file) => {
      const source = readFileSync(file, "utf8");
      // A submit handler that resolves on a timer is a fake success: it tells the
      // user their data was accepted when nothing left the browser.
      return /setTimeout\([^)]*\b(setSubmitted|setSuccess|setDone|resolve)\b/.test(source);
    });
    expect(offenders.map((f) => relative(process.cwd(), f))).toEqual([]);
  });
});
