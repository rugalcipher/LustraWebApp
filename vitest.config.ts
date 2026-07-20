import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
  test: {
    environment: "jsdom",
    globals: true,
    // Threads, not the default forked processes.
    //
    // With enough jsdom suites, forked workers began dying on Windows part-way through a
    // run — and vitest still reported "Test Files 6 passed (10)" with a zero exit code,
    // so several files were silently skipped while CI looked green. Threads run the whole
    // suite deterministically and faster.
    pool: "threads",
    setupFiles: ["./tests/unit/setup.ts"],
    // Playwright specs live under tests/e2e and are run by `npm run test:e2e`.
    include: ["tests/unit/**/*.test.{ts,tsx}"],
    restoreMocks: true,
    // Tests run in "api" mode against a fake origin, so the central client
    // builds real URLs while `fetch` is always mocked — no server is contacted.
    env: {
      VITE_DATA_MODE: "api",
      VITE_API_BASE_URL: "https://api.test/api/v1",
      VITE_ENABLE_DEV_ROLE_SWITCHER: "false",
    },
  },
  define: {
    __BUILD_ID__: JSON.stringify("test"),
  },
});
