// tests/e2e/_helpers/parentHelpers.ts
//
// Task 4.8 / Req 1.6, 5.6: Parent-role Playwright helpers.

import type { Page } from "@playwright/test";

export const selectLinkedChild = async (
  page: Page,
  childName?: string
): Promise<void> => {
  await page.goto("/parent/dashboard");
  await page.waitForLoadState("networkidle");
  if (childName) {
    const childLink = page.getByText(childName);
    if (await childLink.isVisible()) {
      await childLink.click();
      await page.waitForLoadState("networkidle");
    }
  }
};

export const readChildProgress = async (
  page: Page,
  studentId?: string
): Promise<void> => {
  const path = studentId
    ? `/parent/students/${studentId}`
    : "/parent/dashboard";
  await page.goto(path);
  await page.waitForLoadState("networkidle");
};

export const readXpAndAttainmentSummary = async (
  page: Page
): Promise<{ xp: number | null; attainment: number | null }> => {
  await page.goto("/parent/dashboard");
  await page.waitForLoadState("networkidle");

  const xpText = await page
    .getByTestId("child-xp")
    .textContent()
    .catch(() => null);
  const attainmentText = await page
    .getByTestId("child-attainment")
    .textContent()
    .catch(() => null);

  return {
    xp: xpText ? parseInt(xpText.replace(/[^0-9]/g, ""), 10) || null : null,
    attainment: attainmentText
      ? parseFloat(attainmentText.replace(/[^0-9.]/g, "")) || null
      : null,
  };
};

export const readNotificationFeed = async (page: Page): Promise<void> => {
  await page.goto("/parent/notifications");
  await page.waitForLoadState("networkidle");
};
