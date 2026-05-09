// tests/e2e/coordinator/a11y-dashboard.spec.ts
//
// Task 5.2.5 / Req 11.1-11.4: Coordinator a11y spec.

import { test, expect } from "@playwright/test";
import { scanPage } from "../_helpers/axe.ts";

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:5173";

test.describe("Coordinator a11y", () => {
  test("5.2.5 — coordinator dashboard passes axe-core scan", async ({
    page,
  }) => {
    await page.goto(`${BASE_URL}/coordinator/dashboard`);
    await page.waitForLoadState("networkidle");
    await scanPage(page, { role: "coordinator", label: "dashboard" });
    await expect(page).toHaveURL(/coordinator/);
  });

  test("5.2.5 — curriculum matrix passes axe-core scan", async ({ page }) => {
    await page.goto(`${BASE_URL}/coordinator/curriculum-matrix`);
    await page.waitForLoadState("networkidle");
    await scanPage(page, { role: "coordinator", label: "curriculum-matrix" });
    await expect(page).toHaveURL(/coordinator/);
  });
});
