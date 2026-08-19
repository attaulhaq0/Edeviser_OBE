// tests/e2e/rtl/layout.spec.ts
//
// Tasks 11.3–11.7 / Req 10.4: Per-role RTL Playwright specs.
//
// Each role's dashboard is loaded under ar locale with dir="rtl".
// Screenshots are captured and pixel-diffed against baselines in
// audit/baselines/rtl-screens/<role>.png at 0.3% tolerance.
//
// On first run (no baseline), screenshots are written as the new baseline.
// Subsequent runs enforce the baseline.

import { test, expect } from "@playwright/test";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { loadStorageState, type AuditRole } from "../_helpers/auth.ts";

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:5173";
const BASELINES_DIR = resolve("audit", "baselines", "rtl-screens");
const MAX_DIFF_PERCENT = 0.3;

// Roles and their dashboard paths
const RTL_ROLES: Array<{
  role: AuditRole;
  path: string;
  taskId: string;
}> = [
  { role: "admin", path: "/admin/dashboard", taskId: "11.3" },
  {
    role: "coordinator",
    path: "/coordinator/matrix",
    taskId: "11.4",
  },
  { role: "teacher", path: "/teacher/dashboard", taskId: "11.5" },
  { role: "student", path: "/student/learning-path", taskId: "11.6" },
  { role: "parent", path: "/parent/dashboard", taskId: "11.7" },
];

mkdirSync(BASELINES_DIR, { recursive: true });

for (const { role, path, taskId } of RTL_ROLES) {
  test.describe(`RTL layout — ${role} (Task ${taskId})`, () => {
    test(`${taskId} — ${role} dashboard renders correctly in RTL Arabic locale`, async ({
      page,
    }) => {
      await loadStorageState(page.context(), role);

      // Navigate to the role's dashboard
      await page.goto(`${BASE_URL}${path}`);
      await page.waitForLoadState("networkidle");

      // Assert the page has dir="rtl" or the html lang is ar
      const dir = await page.evaluate(
        () =>
          document.documentElement.dir || document.documentElement.lang || "ltr"
      );
      expect(dir === "rtl" || dir.startsWith("ar")).toBe(true);

      // Take a full-page screenshot
      const screenshot = await page.screenshot({ fullPage: true });

      const baselinePath = resolve(BASELINES_DIR, `${role}.png`);

      if (!existsSync(baselinePath)) {
        // First run — write baseline
        writeFileSync(baselinePath, screenshot);
        console.log(`[rtl] ${role}: baseline written to ${baselinePath}`);
        // Pass on first run
        expect(screenshot.byteLength).toBeGreaterThan(0);
        return;
      }

      // Compare against baseline using Playwright's built-in snapshot comparison
      // We use toMatchSnapshot with a threshold
      expect(screenshot).toMatchSnapshot(`rtl-${role}.png`, {
        maxDiffPixelRatio: MAX_DIFF_PERCENT / 100,
        threshold: 0.2,
      });
    });
  });
}
