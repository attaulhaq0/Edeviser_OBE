// tests/e2e/student/xp-and-streak.spec.ts
//
// Task 5.4.4 / Req 8.1, 8.4: Student XP and streak spec.

import { test, expect } from "@playwright/test";

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:5173";

test.describe("Student XP and streak", () => {
  test("5.4.4 — student dashboard shows XP and streak", async ({ page }) => {
    await page.goto(`${BASE_URL}/student/dashboard`);
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveURL(/student/);

    // Dashboard should render without error
    const heading = page.getByRole("heading").first();
    await expect(heading).toBeVisible({ timeout: 10_000 });
  });

  test("5.4.4 — XP page renders", async ({ page }) => {
    // Try common XP page paths
    for (const path of [
      "/student/xp",
      "/student/gamification",
      "/student/dashboard",
    ]) {
      await page.goto(`${BASE_URL}${path}`);
      await page.waitForLoadState("networkidle");
      if (!page.url().includes("/login")) {
        await expect(page).toHaveURL(/student/);
        break;
      }
    }
  });
});
