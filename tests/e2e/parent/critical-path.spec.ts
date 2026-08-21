// tests/e2e/parent/critical-path.spec.ts
//
// Task 5.5.1 / Req 1.6: Parent critical-path E2E spec.
// @critical-e2e

import { test, expect } from "@playwright/test";
import { assertLiveAuthenticatedUser } from "../_helpers/auth.ts";

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:5173";

test.describe("Parent critical path", () => {
  test("5.5.1 — parent can navigate dashboard and notifications", async ({
    page,
  }) => {
    await page.goto(`${BASE_URL}/parent/dashboard`);
    await page.waitForLoadState("networkidle");
    await assertLiveAuthenticatedUser(page, {
      role: "parent",
      email: "audit+parent-linked@edeviser.test",
      institutionId: "audit-inst",
    });
    await expect(page).toHaveURL(/\/parent\/dashboard$/);

    // Notifications
    await page.goto(`${BASE_URL}/parent/notifications`);
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveURL(/\/parent\/notifications$/);
  });
});
