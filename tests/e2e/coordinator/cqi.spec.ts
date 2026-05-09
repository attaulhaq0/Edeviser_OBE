// tests/e2e/coordinator/cqi.spec.ts
//
// Task 5.2.4 / Req 1.3: Coordinator CQI action plan spec.

import { test, expect } from "@playwright/test";

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:5173";

test.describe("Coordinator CQI", () => {
  test("5.2.4 — CQI action plan page renders", async ({ page }) => {
    await page.goto(`${BASE_URL}/coordinator/cqi`);
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveURL(/coordinator/);

    const heading = page.getByRole("heading").first();
    await expect(heading).toBeVisible({ timeout: 10_000 });
  });
});
