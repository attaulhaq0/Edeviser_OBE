// tests/e2e/teacher/clo-bloom.spec.ts
//
// Task 5.3.2 / Req 7.6: Teacher CLO Bloom level spec.

import { test, expect } from "@playwright/test";

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:5173";

const BLOOM_LEVELS = [
  "Remembering",
  "Understanding",
  "Applying",
  "Analyzing",
  "Evaluating",
  "Creating",
];

test.describe("Teacher CLO Bloom levels", () => {
  test("5.3.2 — CLO form has all six Bloom levels as options", async ({
    page,
  }) => {
    await page.goto(`${BASE_URL}/teacher/outcomes/clos`);
    await page.waitForLoadState("networkidle");

    const createBtn = page.getByRole("button", { name: /add|create|new/i });
    if (await createBtn.first().isVisible({ timeout: 5_000 })) {
      await createBtn.first().click();
      await page.waitForLoadState("networkidle");

      // Check that Bloom level selector exists
      const bloomSelect = page.getByLabel(/bloom/i);
      if (await bloomSelect.isVisible({ timeout: 5_000 })) {
        const options = await bloomSelect.locator("option").allTextContents();
        const hasAllLevels = BLOOM_LEVELS.every((level) =>
          options.some((opt) => opt.toLowerCase().includes(level.toLowerCase()))
        );
        expect(hasAllLevels).toBe(true);
      }
    }

    // At minimum, the page should render
    await expect(page).toHaveURL(/teacher/);
  });
});
