// tests/e2e/teacher/assignment-create.spec.ts
//
// Task 5.3.3 / Req 1.4: Teacher assignment creation spec.

import { test, expect } from "@playwright/test";

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:5173";

test.describe("Teacher assignment creation", () => {
  test("5.3.3 — assignment list page renders", async ({ page }) => {
    await page.goto(`${BASE_URL}/teacher/assignments`);
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveURL(/teacher/);

    const heading = page.getByRole("heading").first();
    await expect(heading).toBeVisible({ timeout: 10_000 });
  });

  test("5.3.3 — assignment create form is accessible", async ({ page }) => {
    await page.goto(`${BASE_URL}/teacher/assignments`);
    await page.waitForLoadState("networkidle");

    const createBtn = page.getByRole("button", { name: /add|create|new/i });
    await expect(createBtn.first()).toBeVisible({ timeout: 10_000 });
  });
});
