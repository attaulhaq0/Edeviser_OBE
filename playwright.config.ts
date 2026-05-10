// Playwright configuration for Edeviser.
//
// Two test trees live side-by-side:
//   1. ./e2e/*.spec.ts          — legacy smoke suite, kept runnable under the
//                                  `legacy-smoke` project (Chromium, Desktop Chrome,
//                                  no storageState, no audit fixtures).
//   2. ./tests/e2e/**/*.spec.ts — Pre-Deployment E2E Audit suite introduced by
//                                  .kiro/specs/pre-deployment-e2e-audit. Organised
//                                  into role sub-folders (admin/, coordinator/,
//                                  teacher/, student/, parent/, cross-role/, rtl/,
//                                  perf/) and exercised by the seven audit projects
//                                  below.
//
// Per design.md §Browser and Viewport Matrix the audit projects cover:
//   - admin, coordinator, teacher, cross-role, rtl-ar → Desktop Chrome @ 1440×900
//   - student                                          → iPhone 13 (Chromium) @ 390×844
//   - parent                                           → iPhone 13 (WebKit)   @ 390×844
//
// Reduced motion is enabled on every audit project so that custom animations
// (shimmer, xp-pulse, badge-pop, float, streak-flame, fade-in-up) are disabled
// during assertions — see requirements.md §9.5.
import { defineConfig, devices } from "@playwright/test";

const desktopViewport = { width: 1440, height: 900 } as const;
const mobileViewport = { width: 390, height: 844 } as const;

const storageStateFor = (role: string) =>
  `./tests/e2e/_fixtures/storage-states/${role}.json`;

export default defineConfig({
  // Top-level testDir is the repo root. Each project scopes its own testMatch
  // so the legacy ./e2e suite and the new ./tests/e2e audit suite coexist.
  testDir: "./",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,

  reporter: [
    ["html", { outputFolder: "playwright-report" }],
    // Machine-readable feed for the audit report aggregator (§16 in design.md).
    ["json", { outputFile: "audit/output/playwright-report.json" }],
  ],

  // Playwright will create these files via tasks 4.1 and 4.2. At config-load
  // time the files are only referenced by path; they are resolved at run time.
  globalSetup: "./tests/e2e/_fixtures/seed.ts",
  globalTeardown: "./tests/e2e/_fixtures/teardown.ts",

  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:5173",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },

  projects: [
    // ─── Legacy smoke suite ────────────────────────────────────────────────
    // Preserves the pre-audit behaviour of `npx playwright test` so existing
    // CI jobs and documentation (docs/operations/TEST-REPORT-APRIL-2026.md)
    // keep working. Does NOT use audit storageState or fixtures.
    {
      name: "legacy-smoke",
      testMatch: "e2e/**/*.spec.ts",
      use: {
        ...devices["Desktop Chrome"],
      },
    },

    // ─── Audit projects ────────────────────────────────────────────────────
    {
      name: "admin",
      testMatch: "tests/e2e/admin/**/*.spec.ts",
      use: {
        ...devices["Desktop Chrome"],
        viewport: desktopViewport,
        locale: "en",
        reducedMotion: "reduce",
        storageState: storageStateFor("admin"),
      },
    },
    {
      name: "coordinator",
      testMatch: "tests/e2e/coordinator/**/*.spec.ts",
      use: {
        ...devices["Desktop Chrome"],
        viewport: desktopViewport,
        locale: "en",
        reducedMotion: "reduce",
        storageState: storageStateFor("coordinator"),
      },
    },
    {
      name: "teacher",
      testMatch: "tests/e2e/teacher/**/*.spec.ts",
      use: {
        ...devices["Desktop Chrome"],
        viewport: desktopViewport,
        locale: "en",
        reducedMotion: "reduce",
        storageState: storageStateFor("teacher"),
      },
    },
    {
      // Student runs on iPhone 13 Chromium at 390×844 so the 44×44 touch
      // target check (requirements.md §9.4) has a realistic mobile viewport.
      // Also picks up the TTI perf spec per design.md §Browser and Viewport Matrix.
      name: "student",
      testMatch: [
        "tests/e2e/student/**/*.spec.ts",
        "tests/e2e/perf/tti.spec.ts",
      ],
      use: {
        ...devices["iPhone 13"],
        viewport: mobileViewport,
        locale: "en",
        reducedMotion: "reduce",
        storageState: storageStateFor("student"),
      },
    },
    {
      // Parent runs on iPhone 13 WebKit (mobile Safari) — the dominant parent
      // browser per product analytics, per design.md §Playwright Runner.
      name: "parent",
      testMatch: "tests/e2e/parent/**/*.spec.ts",
      use: {
        ...devices["iPhone 13"],
        defaultBrowserType: "webkit",
        viewport: mobileViewport,
        locale: "en",
        reducedMotion: "reduce",
        storageState: storageStateFor("parent"),
      },
    },
    {
      // Cross-role specs load per-role storageState inside each test via the
      // loadStorageState helper (task 4.3). No project-level storageState.
      name: "cross-role",
      testMatch: "tests/e2e/cross-role/**/*.spec.ts",
      use: {
        ...devices["Desktop Chrome"],
        viewport: desktopViewport,
        locale: "en",
        reducedMotion: "reduce",
      },
    },
    {
      // Arabic + RTL project for requirements.md §10.4. RTL specs select the
      // role per test, so no storageState is bound at the project level.
      name: "rtl-ar",
      testMatch: "tests/e2e/rtl/**/*.spec.ts",
      use: {
        ...devices["Desktop Chrome"],
        viewport: desktopViewport,
        locale: "ar-QA",
        timezoneId: "Asia/Qatar",
        extraHTTPHeaders: {
          "Accept-Language": "ar-QA",
        },
        reducedMotion: "reduce",
      },
    },
  ],

  webServer: {
    command: "npm run dev",
    url: "http://localhost:5173",
    reuseExistingServer: !process.env.CI,
  },
});
