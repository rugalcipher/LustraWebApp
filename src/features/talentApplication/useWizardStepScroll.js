import { useEffect, useRef } from "react";

/**
 * Scrolls a multi-step wizard back to the top when the step changes, and moves focus to the
 * new step's heading.
 *
 * On a phone the wizard is taller than the screen. Pressing Continue near the bottom advances
 * the step but leaves the viewport scrolled down, so the applicant lands halfway through the
 * next step with the fields above them unseen — and a keyboard user has no idea focus moved at
 * all. This puts them at the top of the new step and moves focus there.
 *
 * It fires only when the step actually changes. Validation gates the step transition upstream,
 * so a failed Continue never changes the step and therefore never scrolls — the applicant
 * stays on the error they need to fix. It skips the very first render so arriving on the
 * wizard does not yank the page. Back navigation changes the step too, so it reveals the top
 * of the previous step, which is what a person expects.
 *
 * The returned ref goes on a focusable heading element (`tabIndex={-1}`) at the top of the
 * step region. Give that element `scroll-margin-top` (e.g. Tailwind `scroll-mt-24`) so the
 * fixed header and the safe-area inset do not cover it.
 *
 * @param {number|string} step the current step; changing it triggers the scroll
 */
export function useWizardStepScroll(step) {
  const anchorRef = useRef(null);
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    const anchor = anchorRef.current;
    if (!anchor) return;

    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    anchor.scrollIntoView({
      block: "start",
      behavior: prefersReduced ? "auto" : "smooth",
    });

    // Move focus for screen-reader and keyboard users. preventScroll stops the browser
    // double-scrolling and fighting the smooth scroll above.
    anchor.focus?.({ preventScroll: true });
  }, [step]);

  return anchorRef;
}
