// tests/e2e/student/critical-path.spec.ts
//
// Task 5.4.1 / Req 1.5: Student critical-path E2E spec.
// @critical-e2e

import { test, expect } from "@playwright/test";
import { criticalRoutes } from "../../../src/lib/criticalRoutes.ts";
import { assertLiveAuthenticatedUser } from "../_helpers/auth.ts";

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:5173";

test.describe("Student critical path", () => {
  test("5.4.1 — student can navigate dashboard, assignments, and XP history", async ({
    page,
  }) => {
    await page.goto(`${BASE_URL}${criticalRoutes.student.dashboard}`);
    await page.waitForLoadState("networkidle");
    await assertLiveAuthenticatedUser(page, {
      role: "student",
      email: "audit+student@edeviser.test",
      institutionId: "audit-inst",
    });
    await expect(page).toHaveURL(/\/student\/dashboard$/);

    await page.goto(`${BASE_URL}${criticalRoutes.student.assignments}`);
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveURL(/\/student\/assignments$/);

    await page.goto(`${BASE_URL}${criticalRoutes.student.xpHistory}`);
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveURL(/\/student\/xp-history$/);
    await expect(
      page.getByRole("heading", { name: "XP History" })
    ).toBeVisible();
  });
});
