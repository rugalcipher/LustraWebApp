import { test, expect } from "@playwright/test";
import { previewAs, previewGuest } from "./helpers";

test.describe("Public", () => {
  test("Landing page loads with brand logo", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("img", { name: /lustra/i }).first()).toBeVisible();
  });

  test("Login page loads", async ({ page }) => {
    await page.goto("/login");
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test("Public talent browsing route loads", async ({ page }) => {
    await page.goto("/talent");
    await expect(page.getByText("Isabelle", { exact: false }).first()).toBeVisible();
  });
});

test.describe("Client", () => {
  test("Immersive Discover loads with INQUIRE action and client shell", async ({ page }) => {
    await previewAs(page, "client");
    await page.goto("/app/discover");
    // INQUIRE is the persistent primary action of the immersive experience.
    await expect(page.getByLabel("Send an inquiry")).toBeVisible();
    // Client bottom navigation present.
    await expect(page.getByRole("link", { name: "Profile" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Discover" })).toBeVisible();
  });

  // Advance to the gallery slide (intro -> about -> gallery) via the visible
  // "Next slide" control.
  async function gotoGallery(page: import("@playwright/test").Page) {
    await page.goto("/app/discover");
    const next = page.getByLabel("Next slide");
    await expect(next).toBeVisible();
    await next.click();
    await next.click();
    await expect(page.getByText("Gallery").first()).toBeVisible();
  }

  test("Standard client sees a VIP locked state", async ({ page }) => {
    await previewAs(page, "client", { vip: false });
    await gotoGallery(page);
    const lockedDot = page.getByLabel("VIP-only photograph (locked)").first();
    await expect(lockedDot).toBeVisible();
    await lockedDot.click();
    await expect(page.getByText("Reserved for Lustra VIP members")).toBeVisible();
  });

  test("VIP client sees eligible VIP media (no locked state)", async ({ page }) => {
    await previewAs(page, "client", { vip: true });
    await gotoGallery(page);
    // A VIP viewer never sees a locked slide — the item resolves as visible.
    await expect(page.getByLabel("VIP-only photograph (locked)")).toHaveCount(0);
  });

  test("Standard client Profile shows Private Member", async ({ page }) => {
    await previewAs(page, "client", { vip: false });
    await page.goto("/app/profile");
    await expect(page.getByText("Private Member").first()).toBeVisible();
  });

  test("VIP client Profile shows VIP Member", async ({ page }) => {
    await previewAs(page, "client", { vip: true });
    await page.goto("/app/profile");
    await expect(page.getByText("VIP Member").first()).toBeVisible();
  });

  test("Guest cannot reach the client app (no VIP content)", async ({ page }) => {
    await previewGuest(page);
    await page.goto("/app/discover");
    await expect(page).toHaveURL(/\/unauthorized/);
    await expect(page.getByText("Access Restricted")).toBeVisible();
  });
});

test.describe("Internal workspaces", () => {
  test("Management Dashboard uses the Management shell (no client bottom nav)", async ({ page }) => {
    await previewAs(page, "management");
    await page.goto("/management-dashboard");
    await expect(page.getByText("Concierge Console").first()).toBeVisible();
    await expect(page.getByText("Today's Operations")).toBeVisible();
    // Client bottom-nav must NOT appear in Management.
    await expect(page.getByRole("link", { name: "Saved" })).toHaveCount(0);
  });

  test("Admin Dashboard uses the Admin shell", async ({ page }) => {
    await previewAs(page, "admin");
    await page.goto("/admin");
    await expect(page.getByText("Administration").first()).toBeVisible();
    await expect(page.getByText("Executive Overview")).toBeVisible();
    await expect(page.getByRole("link", { name: "Saved" })).toHaveCount(0);
  });

  test("Talent Portal uses the Talent shell", async ({ page }) => {
    await previewAs(page, "talent");
    await page.goto("/talent-portal");
    await expect(page.getByText("Talent Portal").first()).toBeVisible();
  });

  test("Direct unauthorized navigation resolves to /unauthorized", async ({ page }) => {
    await previewAs(page, "client");
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/unauthorized/);
    await expect(page.getByText("Access Restricted")).toBeVisible();
  });
});
