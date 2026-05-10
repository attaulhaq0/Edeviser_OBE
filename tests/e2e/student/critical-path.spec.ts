// tests/e2e/student/critical-path.spec.ts
//
// Task 5.4.1 / Req 1.5: Student critical-path E2E spec.

import { test, expect } from "@playwright/test";
import { assertRoleClaim } from "../_helpers/auth.ts";

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:5173";

test.describe("Student critical path", () => {
  test("5.4.1 — student can navigate dashboard, learning path, leaderboard", async ({
    page,
  }) => {
    await page.goto(`${BASE_URL}/student/dashboard`);
    await page.waitForLoadState("networkidle");
    await assertRoleClaim(page, "student");
    await expect(page).toHaveURL(/student/);

    // Learning path
    await page.goto(`${BASE_URL}/student/learning-path`);
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveURL(/student/);

    // Leaderboard
    await page.goto(`${BASE_URL}/student/leaderboard`);
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveURL(/student/);
  });
});
