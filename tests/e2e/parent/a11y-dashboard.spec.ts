// tests/e2e/parent/a11y-dashboard.spec.ts
//
// Task 5.5.4 / Req 11.1-11.4: Parent a11y spec (WebKit mobile).

import { test, expect } from "@playwright/test";
import { scanPage } from "../_helpers/axe.ts";

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:5173";

test.describe("Parent a11y (WebKit mobile)", () => {
  test("5.5.4 — parent dashboard passes axe-core scan", async ({ page }) => {
    await page.goto(`${BASE_URL}/parent/dashboard`);
    await page.waitForLoadState("networkidle");
    await scanPage(page, { role: "parent", label: "dashboard" });
    await expect(page).toHaveURL(/parent/);
  });
});
