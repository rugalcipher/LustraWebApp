import { defineConfig, devices } from "@playwright/test";

/**
 * Minimal Playwright smoke foundation for Lustra.
 *
 * Runs against the Vite dev server (so the dev role-preview is enabled, letting
 * tests preview roles/VIP without a real backend). Not a large suite — smoke
 * coverage of public/client/workspace routing, shell separation, and the VIP
 * media access states, plus a screenshot matrix across the required viewports.
 */
export default defineConfig({
  testDir: "./tests/e2e",
  outputDir: "./test-results",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 30_000,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: "http://localhost:5173",
    trace: "off",
    screenshot: "off",
    viewport: { width: 1440, height: 900 },
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:5173",
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
