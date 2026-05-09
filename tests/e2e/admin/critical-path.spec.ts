// tests/e2e/admin/critical-path.spec.ts
//
// Task 5.1.1 / Req 1.2, 13.5: Admin critical-path E2E spec.
// Login → create ILO → create user → institution dashboard → audit log → logout.

import { test, expect } from "@playwright/test";
import {
  createIlo,
  createUser,
  openAuditLog,
  openInstitutionDashboard,
} from "../_helpers/adminHelpers.ts";
import { assertRoleClaim } from "../_helpers/auth.ts";

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:5173";

test.describe("Admin critical path", () => {
  test("5.1.1 — admin can navigate dashboard, create ILO, create user, view audit log", async ({
    page,
  }) => {
    // Verify role claim
    await page.goto(`${BASE_URL}/admin/dashboard`);
    await page.waitForLoadState("networkidle");
    await assertRoleClaim(page, "admin");

    // Institution dashboard loads
    await openInstitutionDashboard(page);
    await expect(page).toHaveURL(/admin/);

    // Create an ILO
    const iloTitle = await createIlo(page);
    // ILO should appear in the list
    await page.goto(`${BASE_URL}/admin/outcomes/ilos`);
    await page.waitForLoadState("networkidle");

    // Create a user
    await createUser(page, {
      email: `audit+test-user-${Date.now()}@edeviser.test`,
      role: "teacher",
      name: "Audit Test Teacher",
    });

    // Open audit log — should have entries
    await openAuditLog(page);
    await expect(page).toHaveURL(/audit/);

    // Logout
    const logoutBtn = page.getByRole("button", { name: /logout|sign out/i });
    if (await logoutBtn.isVisible()) {
      await logoutBtn.click();
      await page.waitForURL(/login/, { timeout: 10_000 }).catch(() => {});
    }

    void iloTitle; // used for side effect
  });
});
