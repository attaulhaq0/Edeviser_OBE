// tests/e2e/_helpers/crossRoleHelpers.ts
//
// Task 4.9 / Req 3.1, 3.2, 3.3, 3.4: Cross-role propagation helpers.
// Uses pollUntil for the 60s grade→XP bound and 2s realtime bound.

import type { Page } from "@playwright/test";
import { pollUntil } from "./propagation.ts";

/**
 * Wait for a grade to propagate to the student's XP total.
 * Polls the student's XP page every 5s for up to 60s.
 * Returns the new XP total once it exceeds the baseline.
 */
export const waitForGradePropagation = async (
  studentPage: Page,
  baselineXp: number
): Promise<number> => {
  return pollUntil(
    async () => {
      await studentPage.goto("/student/xp");
      await studentPage.waitForLoadState("networkidle");
      const xpText = await studentPage
        .getByTestId("xp-total")
        .textContent()
        .catch(() => null);
      if (!xpText) return false;
      const xp = parseInt(xpText.replace(/[^0-9]/g, ""), 10) || 0;
      return xp > baselineXp ? xp : false;
    },
    { intervalMs: 5_000, timeoutMs: 60_000, label: "grade→XP propagation" }
  );
};

/**
 * Wait for a student's XP to update (realtime delivery).
 * Polls every 500ms for up to 2s.
 */
export const waitForXpUpdate = async (
  page: Page,
  baselineXp: number
): Promise<number> => {
  return pollUntil(
    async () => {
      const xpText = await page
        .getByTestId("xp-total")
        .textContent()
        .catch(() => null);
      if (!xpText) return false;
      const xp = parseInt(xpText.replace(/[^0-9]/g, ""), 10) || 0;
      return xp > baselineXp ? xp : false;
    },
    { intervalMs: 500, timeoutMs: 2_000, label: "XP realtime update" }
  );
};

/**
 * Wait for a new PLO to appear in the teacher's CLO mapping target list.
 * Polls every 2s for up to 30s.
 */
export const waitForPloAvailable = async (
  teacherPage: Page,
  ploTitle: string
): Promise<boolean> => {
  return pollUntil(
    async () => {
      await teacherPage.goto("/teacher/outcomes/clos");
      await teacherPage.waitForLoadState("networkidle");
      const visible = await teacherPage
        .getByText(ploTitle)
        .isVisible()
        .catch(() => false);
      return visible;
    },
    {
      intervalMs: 2_000,
      timeoutMs: 30_000,
      label: `PLO "${ploTitle}" available`,
    }
  );
};

/**
 * Wait for a bonus XP window to be active.
 * Polls every 1s for up to 10s.
 */
export const waitForBonusXpWindow = async (page: Page): Promise<boolean> => {
  return pollUntil(
    async () => {
      const indicator = page.getByTestId("bonus-xp-active");
      return indicator.isVisible().catch(() => false);
    },
    { intervalMs: 1_000, timeoutMs: 10_000, label: "bonus XP window active" }
  );
};
