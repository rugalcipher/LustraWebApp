import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import React from "react";
import { render } from "@testing-library/react";
import { useWizardStepScroll } from "@/features/talentApplication/useWizardStepScroll";

/**
 * The mobile talent-application wizard.
 *
 * Two fixes are locked here. iOS Safari zooms into any input under 16px and never zooms back,
 * so form controls must compute to at least 16px on a phone — done with a shared rule, not by
 * disabling zoom. And a multi-step wizard must return to the top of the new step when it
 * advances, so an applicant does not land halfway down the next step with fields unseen.
 */

const ROOT = join(__dirname, "../..");
const read = (p: string) => readFileSync(join(ROOT, p), "utf8");

// ---- 16px inputs -----------------------------------------------------------------

describe("mobile input sizing", () => {
  const css = read("src/index.css");

  it("forces text-entry controls to 16px on small screens", () => {
    // The exact iOS zoom threshold. Below it, focus magnifies the page and never restores.
    expect(css).toMatch(/@media\s*\(max-width:\s*767\.98px\)/);
    const mobileBlock = css.slice(css.indexOf("767.98px"));
    expect(mobileBlock).toMatch(/font-size:\s*16px/);
    expect(mobileBlock).toContain("textarea");
    expect(mobileBlock).toContain("select");
  });

  it("never disables browser zoom in the viewport tag", () => {
    // Disabling zoom would 'fix' this at the cost of accessibility. Forbidden.
    const html = read("index.html");
    expect(html).not.toContain("user-scalable=no");
    expect(html).not.toContain("maximum-scale=1");
  });
});

// ---- step scroll -----------------------------------------------------------------

function Harness({ step }: { step: number }) {
  const ref = useWizardStepScroll(step);
  return (
    <h2 ref={ref} tabIndex={-1} data-testid="anchor">
      Step {step}
    </h2>
  );
}

describe("wizard step scrolling", () => {
  let scrollIntoView: ReturnType<typeof vi.fn>;
  let focus: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    scrollIntoView = vi.fn();
    focus = vi.fn();
    // jsdom implements neither; install spies on the prototype.
    (HTMLElement.prototype as unknown as { scrollIntoView: unknown }).scrollIntoView = scrollIntoView;
    (HTMLElement.prototype as unknown as { focus: unknown }).focus = focus;
    vi.stubGlobal("matchMedia", (query: string) => ({
      matches: false,
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
    }));
  });
  afterEach(() => vi.unstubAllGlobals());

  it("does not scroll on the first render", () => {
    render(<Harness step={0} />);
    expect(scrollIntoView).not.toHaveBeenCalled();
  });

  it("scrolls to and focuses the anchor when the step advances", () => {
    const { rerender } = render(<Harness step={0} />);
    rerender(<Harness step={1} />);

    expect(scrollIntoView).toHaveBeenCalledTimes(1);
    expect(scrollIntoView).toHaveBeenCalledWith(expect.objectContaining({ block: "start" }));
    expect(focus).toHaveBeenCalledWith(expect.objectContaining({ preventScroll: true }));
  });

  it("scrolls on back navigation too, revealing the previous step", () => {
    const { rerender } = render(<Harness step={2} />);
    rerender(<Harness step={1} />);
    expect(scrollIntoView).toHaveBeenCalledTimes(1);
  });

  it("does not scroll when the step is unchanged (a failed Continue never advances it)", () => {
    const { rerender } = render(<Harness step={1} />);
    // A validation failure leaves the step where it is; re-rendering with the same step
    // (e.g. an error banner appearing) must not scroll away from the error.
    rerender(<Harness step={1} />);
    expect(scrollIntoView).not.toHaveBeenCalled();
  });

  it("uses instant scrolling when the user prefers reduced motion", () => {
    vi.stubGlobal("matchMedia", (query: string) => ({
      matches: true,
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
    }));
    const { rerender } = render(<Harness step={0} />);
    rerender(<Harness step={1} />);
    expect(scrollIntoView).toHaveBeenCalledWith(expect.objectContaining({ behavior: "auto" }));
  });
});

// ---- wired into the real wizard --------------------------------------------------

describe("the talent application uses the step scroll", () => {
  const source = read("src/pages/TalentApplication.jsx");

  it("drives the scroll from the step state", () => {
    expect(source).toContain("useWizardStepScroll(step)");
  });

  it("puts a focusable anchor with header-clearing scroll margin at the top of the step", () => {
    expect(source).toContain("ref={stepAnchorRef}");
    expect(source).toContain("tabIndex={-1}");
    expect(source).toContain("scroll-mt-24");
  });
});
