// tests/e2e/admin/critical-path.spec.ts
//
// Task 5.1.1 / Req 1.2, 13.5: Admin critical-path E2E spec.
// Authenticated navigation through the core admin governance surfaces.
// @critical-e2e

import { test, expect } from "@playwright/test";
import { assertLiveAuthenticatedUser } from "../_helpers/auth.ts";

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:5173";

test.describe("Admin critical path", () => {
  test("5.1.1 — authenticated admin can navigate governance surfaces", async ({
    page,
  }) => {
    await page.goto(`${BASE_URL}/admin/dashboard`);
    await page.waitForLoadState("networkidle");
    await assertLiveAuthenticatedUser(page, {
      role: "admin",
      email: "audit+admin@edeviser.test",
      institutionId: "audit-inst",
    });
    await expect(page).toHaveURL(/\/admin\/dashboard$/);

    await page.goto(`${BASE_URL}/admin/outcomes`);
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveURL(/\/admin\/outcomes$/);

    await page.goto(`${BASE_URL}/admin/users`);
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveURL(/\/admin\/users$/);

    await page.goto(`${BASE_URL}/admin/audit-log`);
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveURL(/\/admin\/audit-log$/);
    await expect(
      page.getByRole("heading", { name: "Audit Log" })
    ).toBeVisible();
  });
});
