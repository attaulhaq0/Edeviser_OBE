// tests/e2e/_helpers/coordinatorHelpers.ts
//
// Task 4.5 / Req 1.3, 3.3: Coordinator-role Playwright helpers.

import type { Page } from "@playwright/test";

const runId = (): string => process.env.AUDIT_RUN_ID ?? "local";
const ns = (name: string): string => `audit-${runId()}-${name}`;

export const createPlo = async (
  page: Page,
  title?: string
): Promise<string> => {
  const ploTitle = title ?? ns("plo");
  await page.goto("/coordinator/outcomes/plos");
  await page
    .getByRole("button", { name: /add|create|new/i })
    .first()
    .click();
  await page.getByLabel(/title|name/i).fill(ploTitle);
  await page.getByRole("button", { name: /save|submit|create/i }).click();
  await page.waitForLoadState("networkidle");
  return ploTitle;
};

export const mapPloToIlo = async (
  page: Page,
  ploTitle: string,
  weight = 100
): Promise<void> => {
  await page.goto("/coordinator/outcomes/plos");
  await page.getByText(ploTitle).click();
  const mapBtn = page.getByRole("button", { name: /map|link|ilo/i });
  if (await mapBtn.isVisible()) {
    await mapBtn.click();
    const weightInput = page.getByLabel(/weight/i);
    if (await weightInput.isVisible()) {
      await weightInput.fill(String(weight));
    }
    await page.getByRole("button", { name: /save|confirm/i }).click();
    await page.waitForLoadState("networkidle");
  }
};

export const openCurriculumMatrix = async (page: Page): Promise<void> => {
  await page.goto("/coordinator/curriculum-matrix");
  await page.waitForLoadState("networkidle");
};

export const openCqiActionPlan = async (page: Page): Promise<void> => {
  await page.goto("/coordinator/cqi");
  await page.waitForLoadState("networkidle");
};
