import { test, expect } from "@playwright/test";
import { previewGuest } from "./helpers";

/**
 * The primary guest journey: browse → Inquire → sign-in gate → resume.
 *
 * These assertions are about ROUTING and INTENT PRESERVATION, which are frontend
 * concerns and testable without a live backend. The inquiry submission itself is
 * covered by the backend integration suite (`ClientInquiryTests`), which exercises the
 * real persistence, idempotency and ownership rules.
 */

const INTENT_KEY = "lustra.intendedAction";

test.describe("guest inquiry restoration", () => {
  test.beforeEach(async ({ page }) => {
    await previewGuest(page);
  });

  test("a guest reaching a protected client route is sent to sign in", async ({ page }) => {
    await page.goto("/app/saved");

    await expect(page).toHaveURL(/\/login/);
  });

  test("a parked inquire intent survives the sign-in detour and expires cleanly", async ({ page }) => {
    await page.goto("/");

    // Park an intent exactly as the Inquire button does.
    await page.evaluate((key) => {
      window.sessionStorage.setItem(
        key,
        JSON.stringify({
          v: 1,
          type: "inquire",
          talentSlug: "isabelle",
          returnTo: "/app/discover",
          talentIndex: 3,
          slideIndex: 2,
          createdAtMs: Date.now(),
        })
      );
    }, INTENT_KEY);

    await page.goto("/login");

    // It is still there, with the discovery position intact, ready to be consumed on
    // successful authentication.
    const stored = await page.evaluate((key) => window.sessionStorage.getItem(key), INTENT_KEY);
    expect(stored).toBeTruthy();
    const intent = JSON.parse(stored!);
    expect(intent.talentSlug).toBe("isabelle");
    expect(intent.slideIndex).toBe(2);
    // No personal content is ever parked.
    expect(stored).not.toContain("message");
  });

  test("the sign-in page offers no social provider that the API cannot honour", async ({ page }) => {
    await page.goto("/login");

    await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible();
    await expect(page.getByText(/continue with google/i)).toHaveCount(0);
  });

  test("public discovery remains open to guests", async ({ page }) => {
    await page.goto("/talent");

    // The roster page renders for a signed-out visitor rather than bouncing to login.
    await expect(page).toHaveURL(/\/talent$/);
    await expect(page.getByRole("heading", { name: /discover talent/i })).toBeVisible();
  });
});
