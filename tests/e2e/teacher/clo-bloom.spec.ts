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
    await page.goto(`${BASE_URL}/teacher/clos/new`);
    await page.waitForLoadState("networkidle");

    const bloomSelect = page.getByRole("combobox", { name: /bloom/i });
    await expect(bloomSelect).toBeVisible();
    await bloomSelect.click();
    for (const level of BLOOM_LEVELS) {
      await expect(page.getByRole("option", { name: level })).toBeVisible();
    }
  });
});
