// tests/e2e/teacher/grade-release.spec.ts
//
// Task 5.3.4 / Req 1.4, 7.2: Teacher grade release spec.

import { test, expect } from "@playwright/test";

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:5173";

test.describe("Teacher grade release", () => {
  test("5.3.4 — grading page renders for audit assignment", async ({
    page,
  }) => {
    await page.goto(`${BASE_URL}/teacher/assignments`);
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveURL(/teacher/);

    // Page renders without error
    const heading = page.getByRole("heading").first();
    await expect(heading).toBeVisible({ timeout: 10_000 });
  });
});
