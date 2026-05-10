// tests/e2e/coordinator/curriculum-matrix.spec.ts
//
// Task 5.2.3 / Req 1.3: Coordinator curriculum matrix spec.

import { test, expect } from "@playwright/test";

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:5173";

test.describe("Coordinator curriculum matrix", () => {
  test("5.2.3 — curriculum matrix page renders", async ({ page }) => {
    await page.goto(`${BASE_URL}/coordinator/curriculum-matrix`);
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveURL(/coordinator/);

    const heading = page.getByRole("heading").first();
    await expect(heading).toBeVisible({ timeout: 10_000 });
  });

  test("5.2.3 — curriculum matrix has a grid or table structure", async ({
    page,
  }) => {
    await page.goto(`${BASE_URL}/coordinator/curriculum-matrix`);
    await page.waitForLoadState("networkidle");

    const hasGrid =
      (await page
        .locator("table, [role='grid'], [role='table'], .matrix")
        .count()) > 0;
    const hasEmptyState = await page
      .getByText(/no.*course|no.*program|empty/i)
      .isVisible()
      .catch(() => false);

    expect(hasGrid || hasEmptyState).toBe(true);
  });
});
