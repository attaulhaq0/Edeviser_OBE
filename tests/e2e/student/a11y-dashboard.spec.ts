// tests/e2e/student/a11y-dashboard.spec.ts
//
// Task 5.4.6 / Req 9.4, 11.1-11.4: Student a11y spec (mobile viewport).

import { test, expect } from "@playwright/test";
import { scanPage } from "../_helpers/axe.ts";
import { assertTouchTargets, scanTouchTargets } from "../_helpers/touch-targets.mjs";

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:5173";

test.describe("Student a11y (mobile)", () => {
  test("5.4.6 — student dashboard passes axe-core scan", async ({ page }) => {
    await page.goto(`${BASE_URL}/student/dashboard`);
    await page.waitForLoadState("networkidle");
    await scanPage(page, { role: "student", label: "dashboard" });
    await expect(page).toHaveURL(/student/);
  });

  test("5.4.6 — student leaderboard passes axe-core scan", async ({ page }) => {
    await page.goto(`${BASE_URL}/student/leaderboard`);
    await page.waitForLoadState("networkidle");
    await scanPage(page, { role: "student", label: "leaderboard" });
    await expect(page).toHaveURL(/student/);
  });

  test("5.4.6 — touch targets on student dashboard are at least 44×44px", async ({
    page,
  }) => {
    await page.goto(`${BASE_URL}/student/dashboard`);
    await page.waitForLoadState("networkidle");

    await expect(page).toHaveURL(/\/student\/dashboard(?:[/?#]|$)/);
    await expect(page.locator("#main-content")).toBeVisible();

    // Enforce the 44 CSS-pixel policy. Only disabled/inert, nonrendered and
    // fully clipped keyboard-only controls are excluded, with reasons retained.
    // Links, icon buttons and merely offscreen controls have no blanket waiver.
    const report = await scanTouchTargets(page);
    await test.info().attach("student-dashboard-touch-targets", {
      body: JSON.stringify(report, null, 2),
      contentType: "application/json",
    });
    assertTouchTargets(report);
  });
});
