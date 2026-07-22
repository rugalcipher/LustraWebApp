import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Internal sidebar typography and the Talent Applications attention pill.
 *
 * The clickable navigation items were forced all-caps with luxe tracking, which made the
 * internal console shout. They must read in title/sentence case; small group headings may stay
 * a restrained uppercase, but not with extreme tracking.
 */
const ROOT = join(__dirname, "../..");
const read = (p: string) => readFileSync(join(ROOT, p), "utf8");

describe("internal sidebar typography", () => {
  const shell = read("src/layouts/WorkspaceShell.jsx");

  it("does not force uppercase or luxe tracking on the clickable nav label", () => {
    // The label span renders the route label as-is (already title case) with no shout classes.
    expect(shell).toContain('<span className="flex-1 truncate">{label}</span>');
    expect(shell).not.toContain('tracking-wide-luxe text-nav uppercase');
  });

  it("keeps the group heading a restrained, non-extreme uppercase", () => {
    // Section headings may stay uppercase but must drop the extreme tracking-luxe.
    const heading = shell.slice(shell.indexOf("{section.title && ("));
    expect(heading).toMatch(/tracking-wide uppercase/);
    expect(heading.slice(0, 200)).not.toContain("tracking-luxe");
  });
});

describe("talent applications attention pill", () => {
  const shell = read("src/layouts/WorkspaceShell.jsx");

  it("drives the count from the backend hook, never a hardcoded number", () => {
    expect(shell).toContain("useTalentApplicationAttentionCount");
    // No literal count is rendered.
    expect(shell).not.toMatch(/badge.*[:=]\s*\d+/i);
  });

  it("hides at zero and caps the display at 99+", () => {
    expect(shell).toContain("!applicationsAwaiting) return null");
    expect(shell).toContain('applicationsAwaiting > 99 ? "99+"');
  });

  it("attaches to the Talent Applications route shared by admin and management", () => {
    expect(shell).toContain('const TALENT_APPLICATIONS_PATH = "/admin/talent-applications"');
  });

  it("refreshes with the review mutations (shares their invalidated prefix)", () => {
    const hooks = read("src/features/talentApplication/hooks.ts");
    expect(hooks).toContain('["management", "talent-applications", "attention-count"]');
    // The review mutations invalidate the ["management","talent-applications"] prefix.
    expect(hooks).toContain('["management", "talent-applications"]');
  });
});
