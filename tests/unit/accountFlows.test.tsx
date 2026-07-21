import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { render as rtlRender, screen, fireEvent, createEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import userEvent from "@testing-library/user-event";
import React from "react";
import { ROUTES } from "@/app/routeRegistry";
import PasswordField from "@/components/auth/PasswordField";
import { rulesFromPolicy, strengthFor } from "@/features/auth/passwordPolicy";
import { CONSERVATIVE_PASSWORD_POLICY } from "@/services/passwordPolicyService";

/**
 * PasswordField now reads its requirements from the API, so every render needs a
 * query client. The tests here use the conservative fallback deliberately: it is
 * what an offline or failing policy request produces, and it must never be
 * weaker than the server's real rules. `talentApplication`-style policy-driven
 * assertions live in passwordPolicy.test.tsx.
 */
const PASSWORD_RULES = rulesFromPolicy(CONSERVATIVE_PASSWORD_POLICY);
const passwordStrength = (value: string) => strengthFor(value, PASSWORD_RULES);

function render(ui: React.ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrap = (node: React.ReactElement) => (
    <QueryClientProvider client={client}>{node}</QueryClientProvider>
  );
  const result = rtlRender(wrap(ui));
  // rerender must re-wrap, or the second render loses the provider.
  return { ...result, rerender: (node: React.ReactElement) => result.rerender(wrap(node)) };
}

/**
 * Account-recovery routing and the shared password control.
 *
 * The routing suite exists because of a real defect: the backend mails links to
 * `/verify-email` and `/talent/activate`, and neither route was registered. Every
 * verification email 404'd, and every talent invitation was swallowed by
 * `/talent/:id` — which rendered a profile page for a talent whose id was the
 * literal string "activate".
 */

const paths = ROUTES.map((r) => r.path);

describe("account email routes", () => {
  it("registers the route the backend's EmailVerificationPath points at", () => {
    expect(paths).toContain("/verify-email");
  });

  it("registers the route the backend's TalentActivationPath points at", () => {
    expect(paths).toContain("/talent/activate");
  });

  it("matches /talent/activate before the /talent/:id wildcard", () => {
    // React Router ranks static segments above dynamic ones, but the registry is
    // also the order App.tsx renders in — keep the intent explicit and asserted.
    expect(paths.indexOf("/talent/activate")).toBeLessThan(paths.indexOf("/talent/:id"));
  });

  it("keeps both routes public — a signed-out invitee must reach them", () => {
    for (const path of ["/verify-email", "/talent/activate"]) {
      expect(ROUTES.find((r) => r.path === path)?.access).toBe("public");
    }
  });
});

describe("password policy", () => {
  it("derives its rules from the policy rather than a frontend constant", () => {
    expect(PASSWORD_RULES.map((r) => r.id)).toEqual(["length", "upper", "lower", "digit", "symbol"]);
  });

  it.each([
    ["", 0],
    ["short", 1],
    ["Password", 2],
    ["Password1", 3],
    ["Password1!Aa", 3],
    ["Password1!LongerStill", 4],
  ])("scores %s", (value, expected) => {
    expect(passwordStrength(value)).toBe(expected);
  });

  it("never reports full strength while a rule is unmet", () => {
    // A long password with no symbol is still incomplete; it must not read "Excellent".
    expect(passwordStrength("abcdefghijklmnopqrst")).toBeLessThan(4);
  });
});

describe("PasswordField", () => {
  it("masks by default and reveals through the toggle", async () => {
    const user = userEvent.setup();
    render(<PasswordField label="Password" value="secret" onChange={() => {}} />);

    const input = screen.getByLabelText("Password");
    expect(input).toHaveAttribute("type", "password");

    const toggle = screen.getByRole("button", { name: "Show password" });
    expect(toggle).toHaveAttribute("aria-pressed", "false");

    await user.click(toggle);
    expect(screen.getByLabelText("Password")).toHaveAttribute("type", "text");
    expect(screen.getByRole("button", { name: "Hide password" })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
  });

  it("renders the live requirement checklist only where requested", () => {
    const { rerender } = render(<PasswordField value="abc" onChange={() => {}} />);
    expect(screen.queryByText("One uppercase letter")).not.toBeInTheDocument();

    rerender(<PasswordField value="abc" onChange={() => {}} showRequirements />);
    for (const rule of PASSWORD_RULES) {
      expect(screen.getByText(rule.label)).toBeInTheDocument();
    }
  });

  it("announces met and unmet requirements for screen readers", () => {
    render(<PasswordField value="Password1!Aa" onChange={() => {}} showRequirements />);
    // Every rule is satisfied by this value.
    expect(screen.getAllByText("— met")).toHaveLength(PASSWORD_RULES.length);
  });

  it("reports confirm-password match state", () => {
    const { rerender } = render(
      <PasswordField label="Confirm" value="abc" matchValue="abc" onChange={() => {}} />
    );
    expect(screen.getByText("Passwords match")).toBeInTheDocument();

    rerender(<PasswordField label="Confirm" value="abd" matchValue="abc" onChange={() => {}} />);
    expect(screen.getByText("Passwords do not match")).toBeInTheDocument();
  });

  it("warns while caps lock is on and clears the warning on blur", () => {
    render(<PasswordField value="A" onChange={() => {}} />);
    const input = screen.getByLabelText("Password");

    const keyDown = createEvent.keyDown(input, { key: "A" });
    // KeyboardEventInit has no getModifierState member, so it must be attached
    // to the constructed native event for React's synthetic event to read it.
    Object.defineProperty(keyDown, "getModifierState", { value: () => true });
    fireEvent(input, keyDown);
    expect(screen.getByText("Caps Lock is on")).toBeInTheDocument();

    fireEvent.blur(input);
    expect(screen.queryByText("Caps Lock is on")).not.toBeInTheDocument();
  });

  it("wires the error to the input for assistive technology", () => {
    render(<PasswordField value="" onChange={() => {}} error="Choose a password" />);
    const input = screen.getByLabelText("Password");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input.getAttribute("aria-describedby")).toContain(`${input.id}-error`);
  });
});

describe("password control adoption", () => {
  const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");

  it.each([
    "src/pages/Register.jsx",
    "src/pages/ResetPassword.jsx",
    "src/pages/AccountSettings.jsx",
    "src/pages/TalentActivate.jsx",
  ])("%s uses the shared PasswordField", (file) => {
    const source = read(file);
    expect(source).toContain("PasswordField");
    // No page may hand-roll a bare password input any more: doing so silently
    // drops the reveal toggle, caps-lock warning and strength feedback.
    expect(source).not.toContain('type="password"');
  });
});
