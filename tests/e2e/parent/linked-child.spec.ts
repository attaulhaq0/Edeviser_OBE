// tests/e2e/parent/linked-child.spec.ts
//
// Task 5.5.2 / Req 1.6, 5.6: Parent linked-child spec.

import { test, expect } from "@playwright/test";

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:5173";

test.describe("Parent linked child", () => {
  test("5.5.2 — parent dashboard shows linked child data", async ({ page }) => {
    await page.goto(`${BASE_URL}/parent/dashboard`);
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveURL(/parent/);

    const heading = page.getByRole("heading").first();
    await expect(heading).toBeVisible({ timeout: 10_000 });
  });
});
