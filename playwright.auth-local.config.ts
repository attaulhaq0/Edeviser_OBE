// Explicit, hermetic auth-expiry project. Never imports the Preview seeder,
// teardown, app webServer or role storage states from playwright.config.ts.
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e/auth",
  testMatch: "token-expired.spec.ts",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: "list",
  use: {
    ...devices["Desktop Chrome"],
    storageState: { cookies: [], origins: [] },
    serviceWorkers: "block",
    trace: "off",
    screenshot: "off",
  },
});
