// tests/e2e/teacher/a11y-dashboard.spec.ts
//
// Task 5.3.5 / Req 11.1-11.4: Teacher a11y spec.

import { test, expect } from "@playwright/test";
import { scanPage } from "../_helpers/axe.ts";

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:5173";

test.describe("Teacher a11y", () => {
  test("5.3.5 — teacher dashboard passes axe-core scan", async ({ page }) => {
    await page.goto(`${BASE_URL}/teacher/dashboard`);
    await page.waitForLoadState("networkidle");
    await scanPage(page, { role: "teacher", label: "dashboard" });
    await expect(page).toHaveURL(/teacher/);
  });

  test("5.3.5 — teacher assignments page passes axe-core scan", async ({
    page,
  }) => {
    await page.goto(`${BASE_URL}/teacher/assignments`);
    await page.waitForLoadState("networkidle");
    await scanPage(page, { role: "teacher", label: "assignments" });
    await expect(page).toHaveURL(/teacher/);
  });
});
