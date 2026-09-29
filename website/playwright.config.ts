import { defineConfig } from "@playwright/test";

/**
 * End-to-end suite. Runs against the already-running stack (no webServer):
 *   website  http://localhost:3100  (NEXT_PUBLIC_DATA_SOURCE=api)
 *   API      http://localhost:4000  (seeded; MAIL_TRANSPORT=log → ../backend/.mail-outbox)
 * Override with E2E_BASE_URL / E2E_API_URL / E2E_OUTBOX_DIR / E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD.
 *
 * Rate limits: the API limits credential requests (login, register, verify, reset) to
 * 30 per 15 min per client IP, with separate budgets for session refresh and one-time
 * codes. Chrome is pointed at 127.0.0.1 (as is the setup client in helpers.ts) so the
 * suite doesn't share a budget with other local traffic. A full run uses ~12 credential
 * requests, so two back-to-back runs fit in one window.
 */
export default defineConfig({
  testDir: "./e2e",
  // Deletes the users/reviews the suite creates and restores demo ratings.
  globalTeardown: "./e2e/global-teardown.ts",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 90_000,
  expect: { timeout: 15_000 },
  forbidOnly: Boolean(process.env.CI),
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3100",
    channel: "chrome",
    viewport: { width: 1440, height: 900 },
    actionTimeout: 15_000,
    // Dev-mode pages compile on first hit.
    navigationTimeout: 60_000,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    launchOptions: { args: ["--host-resolver-rules=MAP localhost 127.0.0.1"] },
  },
});
