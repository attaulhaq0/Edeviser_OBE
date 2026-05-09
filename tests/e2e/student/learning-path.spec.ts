// tests/e2e/student/learning-path.spec.ts
//
// Task 5.4.2 / Req 1.5, 7.5: Student learning path spec.

import { test, expect } from "@playwright/test";

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:5173";

test.describe("Student learning path", () => {
  test("5.4.2 — learning path page renders", async ({ page }) => {
    await page.goto(`${BASE_URL}/student/learning-path`);
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveURL(/student/);

    const heading = page.getByRole("heading").first();
    await expect(heading).toBeVisible({ timeout: 10_000 });
  });

  test("5.4.2 — learning path shows assignments or empty state", async ({
    page,
  }) => {
    await page.goto(`${BASE_URL}/student/learning-path`);
    await page.waitForLoadState("networkidle");

    const hasAssignments =
      (await page
        .locator('[data-testid*="assignment"], .assignment-card')
        .count()) > 0;
    const hasEmptyState = await page
      .getByText(/no.*assignment|nothing.*here|empty/i)
      .isVisible()
      .catch(() => false);

    expect(hasAssignments || hasEmptyState).toBe(true);
  });
});
