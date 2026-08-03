import { defineConfig, devices } from "@playwright/test";

// Load .env so specs can reach the AS (AS_BASE_URL) for the opt-in
// select_account integration test. No-op if the file is absent.
try {
  process.loadEnvFile(".env");
} catch {
  /* .env optional — AS-dependent specs self-skip when unset */
}

/**
 * E2E config for the auth-ui interaction app. Drives the real Next.js dev
 * server against the local SQLite store — no AS required (these flows are
 * auth-ui-only: sign-in/up, multi-session, sign-out, native redirectTo).
 *
 * The webServer migrates the DB then starts `next dev` on :3001; locally it
 * reuses an already-running dev server. Run with `npm run test:e2e`.
 */

const PORT = Number(process.env.PORT ?? 3001);
const baseURL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "list" : [["list"]],
  timeout: 60_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npm run migrate && npm run dev",
    url: baseURL,
    reuseExistingServer: true,
    timeout: 120_000,
    stdout: "ignore",
    stderr: "pipe",
  },
});
