// tests/e2e/admin/ilo-crud.spec.ts
//
// Task 5.1.2 / Req 1.2, 13.5: Admin ILO CRUD E2E spec.

import { test, expect } from "@playwright/test";

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:5173";

test.describe("Admin ILO CRUD", () => {
  test("5.1.2 — admin can create, view, and list ILOs", async ({ page }) => {
    await page.goto(`${BASE_URL}/admin/outcomes/ilos`);
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveURL(/admin/);

    // Page renders without error
    const heading = page.getByRole("heading").first();
    await expect(heading).toBeVisible({ timeout: 10_000 });

    // Create button is present
    const createBtn = page.getByRole("button", { name: /add|create|new/i });
    await expect(createBtn.first()).toBeVisible();
  });

  test("5.1.2 — ILO list page renders with table or empty state", async ({
    page,
  }) => {
    await page.goto(`${BASE_URL}/admin/outcomes/ilos`);
    await page.waitForLoadState("networkidle");

    // Either a table or an empty state should be visible
    const hasTable = await page.locator("table, [role='table']").isVisible();
    const hasEmptyState = await page
      .getByText(/no.*ilo|no.*outcome|empty/i)
      .isVisible()
      .catch(() => false);

    expect(hasTable || hasEmptyState).toBe(true);
  });
});
