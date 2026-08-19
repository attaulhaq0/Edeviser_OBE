// tests/e2e/coordinator/plo-mapping.spec.ts
//
// Task 5.2.2 / Req 7.1: Coordinator PLO list/create controls spec.

import { test, expect } from "@playwright/test";

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:5173";

test.describe("Coordinator PLO controls", () => {
  test("5.2.2 — PLO list page renders", async ({ page }) => {
    await page.goto(`${BASE_URL}/coordinator/plos`);
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveURL(/\/coordinator\/plos$/);

    const heading = page.getByRole("heading").first();
    await expect(heading).toBeVisible({ timeout: 10_000 });
  });

  test("5.2.2 — PLO create control is accessible", async ({ page }) => {
    await page.goto(`${BASE_URL}/coordinator/plos`);
    await page.waitForLoadState("networkidle");

    // Create button should be present
    const createBtn = page.getByRole("button", { name: /add|create|new/i });
    await expect(createBtn.first()).toBeVisible({ timeout: 10_000 });
  });
});
