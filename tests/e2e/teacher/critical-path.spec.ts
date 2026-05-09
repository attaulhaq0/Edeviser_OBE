// tests/e2e/teacher/critical-path.spec.ts
//
// Task 5.3.1 / Req 1.4: Teacher critical-path E2E spec.

import { test, expect } from "@playwright/test";
import { assertRoleClaim } from "../_helpers/auth.ts";

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:5173";

test.describe("Teacher critical path", () => {
  test("5.3.1 — teacher can navigate dashboard and courses", async ({
    page,
  }) => {
    await page.goto(`${BASE_URL}/teacher/dashboard`);
    await page.waitForLoadState("networkidle");
    await assertRoleClaim(page, "teacher");
    await expect(page).toHaveURL(/teacher/);

    // Navigate to courses
    await page.goto(`${BASE_URL}/teacher/courses`);
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveURL(/teacher/);
  });
});
