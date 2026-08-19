// tests/e2e/teacher/critical-path.spec.ts
//
// Task 5.3.1 / Req 1.4: Teacher critical-path E2E spec.
// @critical-e2e

import { test, expect } from "@playwright/test";
import { criticalRoutes } from "../../../src/lib/criticalRoutes.ts";
import { assertLiveAuthenticatedUser } from "../_helpers/auth.ts";

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:5173";

test.describe("Teacher critical path", () => {
  test("5.3.1 — teacher can navigate dashboard and assignments", async ({
    page,
  }) => {
    await page.goto(`${BASE_URL}${criticalRoutes.teacher.dashboard}`);
    await page.waitForLoadState("networkidle");
    await assertLiveAuthenticatedUser(page, {
      role: "teacher",
      email: "audit+teacher@edeviser.test",
      institutionId: "audit-inst",
    });
    await expect(page).toHaveURL(/\/teacher\/dashboard$/);

    await page.goto(`${BASE_URL}${criticalRoutes.teacher.assignments}`);
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveURL(/\/teacher\/assignments$/);
    await expect(
      page.getByRole("heading", { name: /assignments/i })
    ).toBeVisible();
  });
});
