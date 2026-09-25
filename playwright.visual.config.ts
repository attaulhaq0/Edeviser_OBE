// Historical prototype comparison config — ISOLATED from playwright.config.ts.
// Neither its old references nor candidate captures are approved app baselines.
// See visual/README.md and the frontend remediation ledger.
//
// Runs only the ./visual suite. The root playwright.config.ts scopes its
// projects to e2e/** and tests/e2e/**, so `visual/` is never picked up there and
// these two configs do not collide.
import { defineConfig, devices } from "@playwright/test";

// Keep verification snapshot policy fixed, even when invoked with CLI flags.
// This does not change the separate, explicit prototype capture workflow.
if (process.argv.slice(2).some((argument) =>
  /^--(?:update|ignore)-snapshots(?:=|$)/.test(argument) || /^-[^-]*u/.test(argument)
)) {
  throw new Error("Snapshot update/ignore CLI overrides are disabled for verification.");
}

const APP_URL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:5173";
const PROTO_PORT = process.env.PROTOTYPE_PORT ?? "4180";
const PROTO_URL = process.env.PROTOTYPE_URL ?? `http://localhost:${PROTO_PORT}`;
const CAPTURE_ONLY = process.env.VISUAL_CAPTURE === "1";
// Set PLAYWRIGHT_CHANNEL=chrome to use an installed Chrome browser when the
// Playwright-managed Chromium binary is unavailable on a developer machine.
// CI keeps its managed browser because this remains opt-in.
const BROWSER_CHANNEL = process.env.PLAYWRIGHT_CHANNEL;

const prototypeServer = {
  command: "node scripts/serve-prototype.mjs",
  url: PROTO_URL,
  reuseExistingServer: !process.env.CI,
  timeout: 30_000,
  env: { PROTOTYPE_PORT: PROTO_PORT },
};

const appServer = {
  command: "npm run dev",
  url: APP_URL,
  reuseExistingServer: !process.env.CI,
  timeout: 120_000,
};

export default defineConfig({
  testDir: "./visual",
  fullyParallel: true,
  updateSnapshots: "none",
  ignoreSnapshots: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: [
    ["html", { outputFolder: "playwright-report/visual", open: "never" }],
  ],
  use: {
    baseURL: APP_URL,
    trace: "on-first-retry",
    contextOptions: { reducedMotion: "reduce" },
  },
  projects: [
    {
      name: "visual-chromium",
      use: {
        ...devices["Desktop Chrome"],
        ...(BROWSER_CHANNEL ? { channel: BROWSER_CHANNEL } : {}),
      },
    },
  ],
  // Capture (VISUAL_CAPTURE=1) only needs the prototype server; parity needs both.
  webServer: CAPTURE_ONLY ? [prototypeServer] : [appServer, prototypeServer],
});
