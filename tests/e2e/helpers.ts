import type { Page } from "@playwright/test";

/**
 * Seed the dev role-preview overlay (localStorage) BEFORE the app boots, so a
 * test can view the app as any role / VIP state. Relies on the dev server
 * (where the dev preview is enabled). No real backend or credentials involved,
 * and only harmless dummy media is ever used for VIP states.
 */
export async function previewAs(
  page: Page,
  role: "client" | "talent" | "management" | "admin" | "superadmin",
  opts: { vip?: boolean } = {}
): Promise<void> {
  const payload = JSON.stringify({ role, membershipTier: opts.vip ? "Vip" : "Standard" });
  await page.addInitScript((value) => {
    window.localStorage.setItem("lustra-dev-preview", value);
  }, payload);
}

/** Ensure no preview is set (guest). */
export async function previewGuest(page: Page): Promise<void> {
  await page.addInitScript(() => {
    window.localStorage.removeItem("lustra-dev-preview");
  });
}
