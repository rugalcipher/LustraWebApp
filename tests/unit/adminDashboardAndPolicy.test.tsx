import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import * as adminService from "@/services/adminService";
import * as policyService from "@/services/passwordPolicyService";
import { CONSERVATIVE_PASSWORD_POLICY } from "@/services/passwordPolicyService";
import { rulesFromPolicy } from "@/features/auth/passwordPolicy";
import PasswordField from "@/components/auth/PasswordField";
import AdminDashboard from "@/pages/AdminDashboard";

/**
 * The administrative dashboard and the password policy.
 *
 * Both suites guard the same principle from opposite directions: the frontend
 * must not assert a fact it did not get from the server. The dashboard once
 * showed 412 users and $184k of revenue that existed nowhere; the password
 * checklist once restated a policy that the server was free to change without
 * it. In each case the invented version was more reassuring than the real one,
 * which is exactly why it was dangerous.
 */

const ROOT = join(__dirname, "../..");
const read = (p: string) => readFileSync(join(ROOT, p), "utf8");

let permissions: string[] = [];

vi.mock("@/auth/PrincipalContext", () => ({
  usePrincipal: () => ({
    principal: { isAuthenticated: true, permissions, roles: ["superadmin"], isLoading: false },
    hasPermission: (p: string) => permissions.includes(p),
    isLoading: false,
  }),
}));

function wrap(ui: React.ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>
  );
}

const dashboard = (over = {}) => ({
  totalClients: 0,
  totalTalent: 0,
  publishedTalent: 0,
  approvedUnpublishedTalent: 0,
  activeManagementStaff: 0,
  suspendedAccounts: 0,
  pendingTalentApplications: 0,
  pendingProfileReviews: 0,
  pendingMediaReviews: 0,
  openInquiries: 0,
  unreadConversations: 0,
  unassignedConversations: 0,
  pendingReviewModeration: 0,
  openSafetyCases: 0,
  upcomingAppointments: 0,
  appointmentsToday: 0,
  cancelledAppointmentsInPeriod: 0,
  registrationTrend: [],
  applicationTrend: [],
  appointmentTrend: [],
  recordedAppointmentValue: [],
  fromUtc: "2025-07-21T00:00:00Z",
  toUtc: "2026-07-21T00:00:00Z",
  generatedAtUtc: "2026-07-21T12:00:00Z",
  ...over,
});

// ---- endpoints -------------------------------------------------------------

describe("admin dashboard endpoints", () => {
  let calls: string[] = [];

  beforeEach(() => {
    calls = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        calls.push(String(url));
        return new Response(JSON.stringify({}), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      })
    );
  });
  afterEach(() => vi.unstubAllGlobals());

  const path = () => new URL(calls[calls.length - 1], "https://example.test").pathname;

  it("reads the dashboard from /admin/dashboard", async () => {
    await adminService.getAdminDashboard();
    expect(path().endsWith("/admin/dashboard")).toBe(true);
  });

  it("reads activity from /admin/dashboard/activity", async () => {
    await adminService.getAdminDashboardActivity(20);
    expect(path().endsWith("/admin/dashboard/activity")).toBe(true);
    expect(new URL(calls[0], "https://x.test").searchParams.get("take")).toBe("20");
  });

  it("reads system status from /admin/dashboard/system-status", async () => {
    await adminService.getSystemStatus();
    expect(path().endsWith("/admin/dashboard/system-status")).toBe(true);
  });

  it("passes the window through", async () => {
    await adminService.getAdminDashboard({ fromUtc: "2026-01-01T00:00:00Z", toUtc: "2026-02-01T00:00:00Z" });
    const query = new URL(calls[0], "https://x.test").searchParams;
    expect(query.get("fromUtc")).toBe("2026-01-01T00:00:00Z");
    expect(query.get("toUtc")).toBe("2026-02-01T00:00:00Z");
  });

  it("never duplicates the /api/v1 prefix", async () => {
    await adminService.getAdminDashboard();
    expect(path()).not.toContain("/api/v1/api/v1");
  });
});

// ---- the page --------------------------------------------------------------

describe("admin dashboard page", () => {
  beforeEach(() => {
    permissions = ["Analytics.View", "AuditLogs.View"];
    vi.spyOn(adminService, "getAdminDashboardActivity").mockResolvedValue([] as never);
    vi.spyOn(adminService, "getSystemStatus").mockResolvedValue({
      status: "Healthy", components: [], checkedAtUtc: "2026-07-21T12:00:00Z",
    } as never);
  });
  afterEach(() => vi.restoreAllMocks());

  const show = (over = {}) =>
    vi.spyOn(adminService, "getAdminDashboard").mockResolvedValue(dashboard(over) as never);

  it("does NOT call the management dashboard", async () => {
    const admin = show();
    const management = vi.spyOn(adminService, "getAdminDashboard");
    wrap(<AdminDashboard />);
    await waitFor(() => expect(admin).toHaveBeenCalled());
    expect(management).toHaveBeenCalled();
    // The page names the management dashboard in prose to record WHY it moved
    // off it; what matters is that it no longer reads from it.
    const source = read("src/pages/AdminDashboard.jsx");
    expect(source).not.toContain("useManagementDashboard");
    expect(source).not.toContain("features/management/hooks");
  });

  it("renders real zeroes for a genuinely empty platform", async () => {
    show();
    wrap(<AdminDashboard />);
    await screen.findByText("Clients");
    // A zero is the truth about an empty platform and is shown as one.
    expect(screen.getAllByText("0").length).toBeGreaterThan(5);
  });

  it("renders the counts the API actually returned", async () => {
    show({ totalClients: 7, publishedTalent: 3, pendingTalentApplications: 2 });
    wrap(<AdminDashboard />);
    await screen.findByText("Clients");
    expect(screen.getByText("7")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("labels recorded appointment value accurately and never as revenue", async () => {
    show({ recordedAppointmentValue: [{ currencyCode: "ZAR", amount: 12500, appointmentCount: 3 }] });
    wrap(<AdminDashboard />);
    expect(await screen.findByText("Recorded Appointment Value")).toBeInTheDocument();
    // The thousands separator is the runtime's, so match the digits not the glyph.
    expect(await screen.findByText(/12.?500/)).toBeInTheDocument();
    expect(await screen.findByText(/ZAR · 3 appointments/)).toBeInTheDocument();

    const body = document.body.textContent ?? "";
    for (const forbidden of ["Revenue", "Income", "Earnings", "Turnover"]) {
      expect(body).not.toContain(forbidden);
    }
  });

  it("says so when no amounts were recorded", async () => {
    show();
    wrap(<AdminDashboard />);
    expect(await screen.findByText(/No amounts recorded in this period/i)).toBeInTheDocument();
  });

  it("shows a real empty state for activity rather than invented people", async () => {
    show();
    wrap(<AdminDashboard />);
    expect(await screen.findByText("No recorded activity")).toBeInTheDocument();
  });

  it("shows a real empty state for unmeasured system status", async () => {
    show();
    wrap(<AdminDashboard />);
    expect(await screen.findByText("Nothing measured")).toBeInTheDocument();
  });

  it("renders only measured components", async () => {
    show();
    vi.spyOn(adminService, "getSystemStatus").mockResolvedValue({
      status: "Degraded",
      components: [{ name: "Database", status: "Healthy", detail: null, latencyMs: 12.4 }],
      checkedAtUtc: "2026-07-21T12:00:00Z",
    } as never);
    wrap(<AdminDashboard />);
    expect(await screen.findByText("Database")).toBeInTheDocument();
    expect(screen.getByText("12 ms")).toBeInTheDocument();
    // Nothing that was not checked appears.
    expect(screen.queryByText("Media CDN")).toBeNull();
  });

  it("offers the Talent Applications quick action, pointing at the real queue", async () => {
    show();
    wrap(<AdminDashboard />);
    const link = await screen.findByRole("link", { name: /^Talent Applications$/ });
    expect(link).toHaveAttribute("href", "/admin/talent-applications");
  });

  it("offers the other real quick actions", async () => {
    show();
    wrap(<AdminDashboard />);
    await screen.findByText("Clients");
    for (const [name, href] of [
      [/^Appointments$/, "/admin/appointments"],
      [/^Calendar$/, "/admin/calendar"],
      [/^Conversations$/, "/management-conversations"],
      [/^Moderation$/, "/moderation"],
    ] as const) {
      expect(screen.getByRole("link", { name })).toHaveAttribute("href", href);
    }
  });

  it("hardcodes no KPI, person, status or activity entry", () => {
    const source = read("src/pages/AdminDashboard.jsx");
    // Field NAMES are declarative config; VALUES would be the fabrication.
    expect(source).not.toMatch(/value:\s*\d+/);
    expect(source).not.toMatch(/count:\s*\d+/);
    expect(source).not.toContain("$184k");
    expect(source).not.toContain("Degraded\"");
    for (const field of ["totalClients", "pendingTalentApplications", "recordedAppointmentValue"]) {
      expect(source).toContain(field);
    }
  });

  it("fires no request without Analytics.View", async () => {
    permissions = [];
    const spy = show();
    wrap(<AdminDashboard />);
    await new Promise((r) => setTimeout(r, 30));
    expect(spy).not.toHaveBeenCalled();
  });

  it("gates activity on AuditLogs.View, separately from the rest", async () => {
    permissions = ["Analytics.View"];
    show();
    const activity = vi.spyOn(adminService, "getAdminDashboardActivity");
    wrap(<AdminDashboard />);
    await screen.findByText("Clients");
    // Activity names individual staff and what they did — a stricter read.
    expect(activity).not.toHaveBeenCalled();
  });
});

// ---- password policy -------------------------------------------------------

describe("password policy", () => {
  beforeEach(() => {
    permissions = [];
  });
  afterEach(() => vi.restoreAllMocks());

  const policy = (over: Partial<policyService.PasswordPolicyDto> = {}) =>
    vi.spyOn(policyService, "getPasswordPolicy").mockResolvedValue({
      minimumLength: 8,
      requireUppercase: true,
      requireLowercase: true,
      requireDigit: true,
      requireNonAlphanumeric: true,
      requiredUniqueChars: 1,
      ...over,
    } as never);

  it("fetches from /public/password-policy, anonymously", async () => {
    const calls: { url: string; init: RequestInit }[] = [];
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
    await policyService.getPasswordPolicy();
    expect(new URL(calls[0].url, "https://x.test").pathname.endsWith("/public/password-policy")).toBe(true);
    expect(new Headers(calls[0].init.headers).get("Authorization")).toBeNull();
    vi.unstubAllGlobals();
  });

  it("is fetched once and shared between fields", async () => {
    const spy = policy();
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={client}>
        <PasswordField label="Password" value="" onChange={() => {}} showRequirements />
        <PasswordField label="Confirm" value="" onChange={() => {}} showRequirements />
      </QueryClientProvider>
    );
    await waitFor(() => expect(spy).toHaveBeenCalled());
    // Two fields, one request — and typing cannot trigger another, because the
    // query key has no input in it.
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("follows the returned minimum length without editing a frontend constant", async () => {
    policy({ minimumLength: 16 });
    wrap(<PasswordField value="" onChange={() => {}} showRequirements />);
    expect(await screen.findByText("At least 16 characters")).toBeInTheDocument();
    expect(screen.queryByText("At least 8 characters")).toBeNull();
  });

  it.each([
    ["requireUppercase", "One uppercase letter"],
    ["requireLowercase", "One lowercase letter"],
    ["requireDigit", "One number"],
    ["requireNonAlphanumeric", "One symbol"],
  ] as const)("drops the %s rule when the server does not require it", async (flag, label) => {
    policy({ [flag]: false });
    wrap(<PasswordField value="" onChange={() => {}} showRequirements />);
    await screen.findByText("At least 8 characters");
    expect(screen.queryByText(label)).toBeNull();
  });

  it.each([
    ["requireUppercase", "One uppercase letter"],
    ["requireDigit", "One number"],
    ["requireNonAlphanumeric", "One symbol"],
  ] as const)("shows the %s rule when the server requires it", async (flag, label) => {
    policy({ [flag]: true });
    wrap(<PasswordField value="" onChange={() => {}} showRequirements />);
    expect(await screen.findByText(label)).toBeInTheDocument();
  });

  it("surfaces a distinct-character requirement when there is one", async () => {
    policy({ requiredUniqueChars: 4 });
    wrap(<PasswordField value="" onChange={() => {}} showRequirements />);
    expect(await screen.findByText("At least 4 different characters")).toBeInTheDocument();
  });

  it("does not silently weaken validation when the request fails", async () => {
    vi.spyOn(policyService, "getPasswordPolicy").mockRejectedValue(new Error("offline"));
    wrap(<PasswordField value="" onChange={() => {}} showRequirements />);

    // The fallback is the STRICTEST plausible policy, not the loosest, and the
    // person is told the requirements are unconfirmed rather than shown weaker ones.
    // `usePasswordPolicy` retries once before giving up, so allow for that.
    expect(
      await screen.findByText(/could not confirm the current requirements/i, undefined, { timeout: 4000 })
    ).toBeInTheDocument();
    expect(
      screen.getByText(`At least ${CONSERVATIVE_PASSWORD_POLICY.minimumLength} characters`)
    ).toBeInTheDocument();
    expect(CONSERVATIVE_PASSWORD_POLICY.minimumLength).toBeGreaterThanOrEqual(8);
    for (const rule of rulesFromPolicy(CONSERVATIVE_PASSWORD_POLICY)) {
      expect(screen.getByText(rule.label)).toBeInTheDocument();
    }
  });

  it("keeps no composition rules in the zod schemas", () => {
    // A duplicated policy is one that eventually disagrees with the one that
    // actually rejects the password, and the user is who finds out.
    const schemas = read("src/features/auth/schemas.ts");
    expect(schemas).not.toContain(".min(8,");
    expect(schemas).not.toContain("Include at least one uppercase");
    expect(schemas).not.toContain("/[A-Z]/");
  });

  it("keeps no hardcoded policy anywhere in deployed source", () => {
    const files: string[] = [];
    const walk = (dir: string) => {
      for (const entry of readdirSync(dir)) {
        const full = join(dir, entry);
        if (statSync(full).isDirectory()) walk(full);
        else if (/\.(jsx?|tsx?)$/.test(entry)) files.push(full);
      }
    };
    walk(join(ROOT, "src"));

    const offenders = files.filter((file) => {
      if (/passwordPolicy(Service)?\.ts$/.test(file)) return false; // the fallback lives here, documented
      return /At least 8 characters|PASSWORD_RULES\s*=/.test(readFileSync(file, "utf8"));
    });
    expect(offenders.map((f) => relative(ROOT, f))).toEqual([]);
  });

  it("preserves reveal, caps-lock and confirm-match behaviour", () => {
    const source = read("src/components/auth/PasswordField.jsx");
    expect(source).toContain("aria-pressed");
    expect(source).toContain("Caps Lock is on");
    expect(source).toContain("Passwords do not match");
    expect(source).toContain("usePasswordPolicy");
  });
});
