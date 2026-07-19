import { test, expect, type Page } from "@playwright/test";
import { previewAs } from "./helpers";

/**
 * Screenshot evidence across the required viewports. Output: ./screenshots.
 * Uses only harmless dummy media for VIP states.
 */
const VIEWPORTS = [
  { w: 390, h: 844 },
  { w: 768, h: 1024 },
  { w: 1366, h: 768 },
  { w: 1440, h: 900 },
  { w: 1920, h: 1080 },
];

async function shoot(page: Page, name: string) {
  for (const v of VIEWPORTS) {
    await page.setViewportSize({ width: v.w, height: v.h });
    await page.waitForTimeout(300);
    await page.screenshot({ path: `screenshots/${name}-${v.w}x${v.h}.png`, fullPage: false });
  }
}

async function gotoGallery(page: Page) {
  await page.goto("/app/discover");
  const next = page.getByLabel("Next slide");
  await expect(next).toBeVisible();
  await next.click();
  await next.click();
  await expect(page.getByText("Gallery").first()).toBeVisible();
}

test("shot: client immersive Discover", async ({ page }) => {
  await previewAs(page, "client");
  await page.goto("/app/discover");
  await expect(page.getByLabel("Send an inquiry")).toBeVisible();
  await shoot(page, "client-discover");
});

test("shot: standard client VIP locked state", async ({ page }) => {
  await previewAs(page, "client", { vip: false });
  await gotoGallery(page);
  await page.getByLabel("VIP-only photograph (locked)").first().click();
  await expect(page.getByText("Reserved for Lustra VIP members")).toBeVisible();
  await shoot(page, "vip-locked");
});

test("shot: VIP client media state", async ({ page }) => {
  await previewAs(page, "client", { vip: true });
  await gotoGallery(page);
  await page.getByLabel(/^Photograph \d+$/).last().click();
  await shoot(page, "vip-eligible");
});

test("shot: Management Dashboard", async ({ page }) => {
  await previewAs(page, "management");
  await page.goto("/management-dashboard");
  await expect(page.getByText("Today's Operations")).toBeVisible();
  await shoot(page, "management-dashboard");
});

test("shot: Management operational page (Client Directory split-pane)", async ({ page }) => {
  await previewAs(page, "management");
  await page.goto("/management-clients");
  await expect(page.getByText("Client Directory").first()).toBeVisible();
  // Select a row so the detail split-pane is shown (verifies 1366px behaviour).
  await page.getByText("A. Laurent").first().click();
  await shoot(page, "management-clients");
});

test("shot: Admin Dashboard", async ({ page }) => {
  await previewAs(page, "admin");
  await page.goto("/admin");
  await expect(page.getByText("Executive Overview")).toBeVisible();
  await shoot(page, "admin-dashboard");
});

test("shot: Admin operational page (Users)", async ({ page }) => {
  await previewAs(page, "admin");
  await page.goto("/admin/users");
  await expect(page.getByText("Users").first()).toBeVisible();
  await shoot(page, "admin-users");
});
