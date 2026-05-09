// tests/e2e/coordinator/plo-mapping.spec.ts
//
// Task 5.2.2 / Req 7.1: Coordinator PLO mapping spec.

import { test, expect } from "@playwright/test";

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:5173";

test.describe("Coordinator PLO mapping", () => {
  test("5.2.2 — PLO list page renders", async ({ page }) => {
    await page.goto(`${BASE_URL}/coordinator/outcomes/plos`);
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveURL(/coordinator/);

    const heading = page.getByRole("heading").first();
    await expect(heading).toBeVisible({ timeout: 10_000 });
  });

  test("5.2.2 — PLO mapping dialog is accessible", async ({ page }) => {
    await page.goto(`${BASE_URL}/coordinator/outcomes/plos`);
    await page.waitForLoadState("networkidle");

    // Create button should be present
    const createBtn = page.getByRole("button", { name: /add|create|new/i });
    await expect(createBtn.first()).toBeVisible({ timeout: 10_000 });
  });
});
