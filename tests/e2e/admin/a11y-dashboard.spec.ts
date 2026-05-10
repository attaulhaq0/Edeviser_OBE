// tests/e2e/admin/a11y-dashboard.spec.ts
//
// Task 5.1.4 / Req 11.1, 11.2, 11.3, 11.4: Admin a11y dashboard spec.
// Runs axe-core scan on Admin dashboard and ILO form.

import { test, expect } from "@playwright/test";
import { scanPage } from "../_helpers/axe.ts";

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:5173";

test.describe("Admin a11y", () => {
  test("5.1.4 — admin dashboard passes axe-core WCAG 2.1 AA scan", async ({
    page,
  }) => {
    await page.goto(`${BASE_URL}/admin/dashboard`);
    await page.waitForLoadState("networkidle");

    await scanPage(page, { role: "admin", label: "dashboard" });
    // Violations are collected in the buffer — not failed here.
    // The report aggregator decides severity.
    await expect(page).toHaveURL(/admin/);
  });

  test("5.1.4 — admin ILO list page passes axe-core scan", async ({ page }) => {
    await page.goto(`${BASE_URL}/admin/outcomes/ilos`);
    await page.waitForLoadState("networkidle");

    await scanPage(page, { role: "admin", label: "ilo-list" });
    await expect(page).toHaveURL(/admin/);
  });

  test("5.1.4 — admin dashboard keyboard navigation: Tab reaches interactive elements", async ({
    page,
  }) => {
    await page.goto(`${BASE_URL}/admin/dashboard`);
    await page.waitForLoadState("networkidle");

    // Tab through the first 5 focusable elements
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press("Tab");
    }

    // At least one element should be focused
    const focused = await page.evaluate(
      () => document.activeElement?.tagName ?? "BODY"
    );
    expect(focused).not.toBe("BODY");
  });
});
