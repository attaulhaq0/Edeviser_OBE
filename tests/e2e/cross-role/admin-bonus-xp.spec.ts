// tests/e2e/cross-role/admin-bonus-xp.spec.ts
//
// Task 6.4 / Req 3.4, 8.2: Authenticated admin Bonus XP management surface.

import { test, expect, chromium } from "@playwright/test";
import {
  assertLiveAuthenticatedUser,
  loadStorageState,
} from "../_helpers/auth.ts";

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:5173";

test.describe("Admin Bonus XP management authentication", () => {
  test("6.4 — authenticated admin reaches the real Bonus XP manager", async () => {
    const browser = await chromium.launch();
    const adminCtx = await browser.newContext();
    await loadStorageState(adminCtx, "admin");
    const adminPage = await adminCtx.newPage();

    try {
      await adminPage.goto(`${BASE_URL}/admin/bonus-events`);
      await adminPage.waitForLoadState("networkidle");
      await assertLiveAuthenticatedUser(adminPage, {
        role: "admin",
        email: "audit+admin@edeviser.test",
        institutionId: "audit-inst",
      });
      await expect(adminPage).toHaveURL(/\/admin\/bonus-events$/);
      await expect(
        adminPage.getByRole("heading", { name: "Bonus XP Events" })
      ).toBeVisible();
      await expect(
        adminPage.getByRole("button", { name: "Add Event" })
      ).toBeVisible();
    } finally {
      await adminCtx.close();
      await browser.close();
    }
  });
});
