// tests/e2e/admin/audit-log.spec.ts
//
// Task 5.1.3 / Req 13.5: Admin audit-log viewer E2E spec.

import { test, expect } from "@playwright/test";

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:5173";

test.describe("Admin audit log", () => {
  test("5.1.3 — audit log page renders", async ({ page }) => {
    await page.goto(`${BASE_URL}/admin/audit-log`);
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveURL(/admin/);

    // Page heading visible
    const heading = page.getByRole("heading").first();
    await expect(heading).toBeVisible({ timeout: 10_000 });
  });

  test("5.1.3 — audit log has filter controls", async ({ page }) => {
    await page.goto(`${BASE_URL}/admin/audit-log`);
    await page.waitForLoadState("networkidle");

    await expect(
      page.getByPlaceholder("Search action, type, or ID...")
    ).toBeVisible();
  });
});
