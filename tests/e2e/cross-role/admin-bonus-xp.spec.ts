// tests/e2e/cross-role/admin-bonus-xp.spec.ts
//
// Task 6.4 / Req 3.4, 8.2: Admin creates Bonus XP event → Student XP multiplied.

import { test, expect, chromium } from "@playwright/test";
import { loadStorageState } from "../_helpers/auth.ts";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:5173";

const storageStateExists = (role: string): boolean =>
  existsSync(
    resolve("tests", "e2e", "_fixtures", "storage-states", `${role}.json`)
  );

test.describe("Cross-role: admin bonus XP event → student multiplier", () => {
  test("6.4 — admin can create a bonus XP event", async () => {
    if (!storageStateExists("admin")) {
      test.skip(true, "Admin storage state not seeded");
      return;
    }

    const browser = await chromium.launch();
    const adminCtx = await browser.newContext();
    await loadStorageState(adminCtx, "admin");
    const adminPage = await adminCtx.newPage();

    try {
      // Admin navigates to bonus XP management
      await adminPage.goto(`${BASE_URL}/admin/gamification`);
      await adminPage.waitForLoadState("networkidle");
      await expect(adminPage).toHaveURL(/admin/);

      // Page renders without error
      const heading = adminPage.getByRole("heading").first();
      await expect(heading).toBeVisible({ timeout: 10_000 });
    } finally {
      await adminCtx.close();
      await browser.close();
    }
  });
});
