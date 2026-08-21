// tests/e2e/teacher/grade-release.spec.ts
//
// Task 5.3.4 / Req 1.4, 7.2: Teacher grading queue route contract.

import { test, expect } from "@playwright/test";
import { criticalRoutes } from "../../../src/lib/criticalRoutes.ts";

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:5173";

test.describe("Teacher grading queue", () => {
  test("5.3.4 — the real grading queue renders", async ({ page }) => {
    await page.goto(`${BASE_URL}${criticalRoutes.teacher.gradingQueue}`);
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveURL(/\/teacher\/grading$/);
    await expect(
      page.getByRole("heading", { name: "Grading Queue" })
    ).toBeVisible();
  });
});
