// Tasks 11.3–11.7 / Req 10.4: Per-role RTL visual verification.
// The selected application surfaces must actually render Arabic with dir=rtl.
// Existing snapshots are resolved through Playwright's own matcher path, with
// 0.3% tolerance. Verification never creates or refreshes missing baselines;
// capture and human visual review are separate prerequisites, not a first-run pass.

import { test, expect } from "@playwright/test";
import { existsSync } from "node:fs";
import { loadStorageState, type AuditRole } from "../_helpers/auth.ts";

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:5173";
const MAX_DIFF_PERCENT = 0.3;

// These are direct routes in AppRouter, not dashboard aliases. Keep the matrix
// and learning-path surfaces named accurately without changing their coverage.
const RTL_ROLES: Array<{
  role: AuditRole;
  path: string;
  surface: string;
  taskId: string;
}> = [
  { role: "admin", path: "/admin/dashboard", surface: "dashboard", taskId: "11.3" },
  { role: "coordinator", path: "/coordinator/matrix", surface: "curriculum matrix", taskId: "11.4" },
  { role: "teacher", path: "/teacher/dashboard", surface: "dashboard", taskId: "11.5" },
  { role: "student", path: "/student/learning-path", surface: "learning path", taskId: "11.6" },
  { role: "parent", path: "/parent/dashboard", surface: "dashboard", taskId: "11.7" },
];

for (const { role, path, surface, taskId } of RTL_ROLES) {
  test.describe(`RTL layout — ${role} (Task ${taskId})`, () => {
    test(`${taskId} — ${role} ${surface} renders correctly in RTL Arabic locale`, async ({ page }, testInfo) => {
      // Check the resolved policy too: CLI or programmatic overrides must not
      // turn a verification expectation into an update or an ignored assertion.
      if (testInfo.config.updateSnapshots !== "none" || testInfo.project.ignoreSnapshots) {
        throw new Error("RTL verification requires updateSnapshots=none and ignoreSnapshots=false.");
      }
      const snapshotName = `rtl-${role}.png`;
      const baselinePath = testInfo.snapshotPath(snapshotName);
      if (!existsSync(baselinePath)) {
        throw new Error(
          `Missing RTL baseline: ${baselinePath}. Verification does not create baselines; capture and human visual review are required separately.`
        );
      }

      await loadStorageState(page.context(), role);
      await page.goto(`${BASE_URL}${path}`);
      await page.waitForLoadState("networkidle");
      await expect.poll(() => new URL(page.url()).pathname).toBe(path);

      // Read the actual provider-owned state. Browser locale alone is not proof
      // of Arabic, and neither locale nor direction may stand in for the other.
      await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
      await expect(page.locator("html")).toHaveAttribute("lang", /^ar(?:-|$)/i);

      const screenshot = await page.screenshot({ fullPage: true });
      expect(screenshot).toMatchSnapshot(snapshotName, {
        maxDiffPixelRatio: MAX_DIFF_PERCENT / 100,
        threshold: 0.2,
      });
    });
  });
}
