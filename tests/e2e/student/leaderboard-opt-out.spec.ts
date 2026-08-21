// tests/e2e/student/leaderboard-opt-out.spec.ts
//
// Task 5.4.5 / Req 8.7: Student leaderboard opt-out spec.

import { test, expect } from "@playwright/test";

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:5173";

test.describe("Student leaderboard opt-out", () => {
  test("5.4.5 — leaderboard page renders", async ({ page }) => {
    await page.goto(`${BASE_URL}/student/leaderboard`);
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveURL(/student/);

    const heading = page.getByRole("heading").first();
    await expect(heading).toBeVisible({ timeout: 10_000 });
  });

  test("5.4.5 — leaderboard has opt-out control or privacy toggle", async ({
    page,
  }) => {
    await page.goto(`${BASE_URL}/student/leaderboard`);
    await page.waitForLoadState("networkidle");

    const toggle = page
      .getByRole("switch", { name: /anonymous|opt.out|hide/i })
      .or(page.getByRole("checkbox", { name: /anonymous|opt.out|hide/i }));
    await expect(toggle.first()).toBeVisible();
  });
});
