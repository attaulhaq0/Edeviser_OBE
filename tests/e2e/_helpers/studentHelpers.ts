// tests/e2e/_helpers/studentHelpers.ts
//
// Task 4.7 / Req 1.5, 8.1, 8.7: Student-role Playwright helpers.

import type { Page } from "@playwright/test";

export const openLearningPath = async (page: Page): Promise<void> => {
  await page.goto("/student/learning-path");
  await page.waitForLoadState("networkidle");
};

export const submitAssignment = async (
  page: Page,
  assignmentId = "audit-assign-1"
): Promise<void> => {
  await page.goto(`/student/assignments/${assignmentId}`);
  await page.waitForLoadState("networkidle");
  const submitBtn = page.getByRole("button", { name: /submit/i });
  if (await submitBtn.isVisible()) {
    await submitBtn.click();
    await page.waitForLoadState("networkidle");
  }
};

export const readXpTotal = async (page: Page): Promise<number> => {
  await page.goto("/student/xp");
  await page.waitForLoadState("networkidle");
  const xpText = await page
    .getByTestId("xp-total")
    .textContent()
    .catch(() => null);
  if (!xpText) return 0;
  return parseInt(xpText.replace(/[^0-9]/g, ""), 10) || 0;
};

export const readStreak = async (page: Page): Promise<number> => {
  await page.goto("/student/dashboard");
  await page.waitForLoadState("networkidle");
  const streakText = await page
    .getByTestId("streak-count")
    .textContent()
    .catch(() => null);
  if (!streakText) return 0;
  return parseInt(streakText.replace(/[^0-9]/g, ""), 10) || 0;
};

export const openLeaderboard = async (page: Page): Promise<void> => {
  await page.goto("/student/leaderboard");
  await page.waitForLoadState("networkidle");
};

export const toggleLeaderboardOptOut = async (page: Page): Promise<void> => {
  await page.goto("/student/leaderboard");
  const toggle = page.getByRole("switch", { name: /anonymous|opt.out|hide/i });
  if (await toggle.isVisible()) {
    await toggle.click();
    await page.waitForLoadState("networkidle");
  }
};
