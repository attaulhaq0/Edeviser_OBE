// Independent real-browser/process regression. Does NOT run the application's
// Playwright config, seed Preview data, or write synthetic evidence into the repo.
// Usage: node --test scripts/audit/axe-browser.regression.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createRequire } from "node:module";
import { spawnSync } from "node:child_process";

const require = createRequire(import.meta.url);
const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const playwrightRoot = dirname(require.resolve("@playwright/test/package.json"));
const testEntry = pathToFileURL(join(playwrightRoot, "index.mjs")).href;
const scanEntry = pathToFileURL(join(root, "tests/e2e/_helpers/axe.ts")).href;
const readJson = (path) => JSON.parse(readFileSync(path, "utf8"));

test("real axe failures persist and merge across isolated Playwright workers", { timeout: 90000 }, () => {
  const workspace = mkdtempSync(join(tmpdir(), "edeviser-axe-browser-"));
  try {
    writeFileSync(join(workspace, "playwright.config.mjs"), `
      import { defineConfig } from ${JSON.stringify(testEntry)};
      export default defineConfig({
        testDir: ${JSON.stringify(workspace)}, testMatch: 'evidence.spec.mjs',
        outputDir: ${JSON.stringify(join(workspace, "test-results"))},
        fullyParallel: true, workers: 2, retries: 0, reporter: 'line',
        preserveOutput: 'always',
        use: { browserName: 'chromium' },
        globalSetup: ${JSON.stringify(join(root, "tests/e2e/_fixtures/axe-setup.ts"))},
        globalTeardown: ${JSON.stringify(join(root, "tests/e2e/_fixtures/teardown.ts"))},
      });
    `);
    writeFileSync(join(workspace, "evidence.spec.mjs"), `
      import { test, expect } from ${JSON.stringify(testEntry)};
      import { scanPage } from ${JSON.stringify(scanEntry)};
      const document = (button) => '<!doctype html><html lang="en"><head><title>Accessibility fixture</title>' +
        '<style>body { color: #000; background: #fff; }</style></head><body><main><h1>Fixture</h1>' +
        button + '</main></body></html>';
      test('clean static fixture', async ({ page }) => {
        await page.setContent(document('<button>Save</button>'));
        await scanPage(page, { role: 'student', label: 'clean-static-fixture' });
      });
      test('negative unlabeled control persists before throwing', async ({ page }) => {
        await page.setContent(document('<button></button>'));
        await expect(scanPage(page, { role: 'student', label: 'negative-static-fixture' }))
          .rejects.toThrow(/Accessibility scan failed/);
      });
    `);
    const execution = spawnSync(process.execPath, [
      require.resolve("@playwright/test/cli"), "test", "--config", join(workspace, "playwright.config.mjs"),
    ], {
      cwd: workspace,
      stdio: "inherit",
      timeout: 80000,
      env: {
        ...process.env,
        CI: "true",
        E2E_FIXTURES_ENABLED: "false",
        SUPABASE_DB_ENV: "ci",
        AUDIT_RUN_ID: "",
        A11Y_RUN_ID: "",
        VITE_SUPABASE_URL: "http://localhost:54321",
        VITE_SUPABASE_ANON_KEY: "fake-browser-regression-key",
      },
    });
    assert.equal(execution.error, undefined);
    assert.equal(execution.status, 0, "Controlled Playwright fixtures must pass, including expected axe rejection");
    const merged = readJson(join(workspace, "audit/output/a11y-findings.json"));
    assert.equal(merged.scanCount, 2);
    assert.equal(merged.coverage, "scanned");
    assert.ok(merged.findings.some((finding) => finding.detail?.axeId === "button-name"));
    assert.ok(merged.findings.some((finding) => ["Major", "Critical"].includes(finding.severity)));
    const evidenceRoot = join(workspace, "test-results/.a11y");
    const runDirectories = readdirSync(evidenceRoot);
    assert.equal(runDirectories.length, 1);
    const runDirectory = join(evidenceRoot, runDirectories[0]);
    const scans = readdirSync(runDirectory).filter((name) => name.endsWith(".json"))
      .map((name) => readJson(join(runDirectory, name)));
    assert.equal(scans.length, 2);
    assert.equal(new Set(scans.map((scan) => scan.workerIndex)).size, 2);
    assert.equal(new Set(scans.map((scan) => scan.scanId)).size, 2);
    assert.ok(scans.every((scan) => scan.runId === merged.runId));
    assert.ok(scans.some((scan) => scan.findings.length === 0));
    assert.ok(scans.some((scan) => scan.findings.length > 0));
    console.log("AXE_BROWSER_REGRESSION_PASS: real clean/negative pages, two workers, preserved evidence, isolated temporary report; no Preview seed.");
  } finally {
    rmSync(workspace, { recursive: true, force: true });
  }
});
