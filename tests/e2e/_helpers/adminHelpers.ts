// tests/e2e/_helpers/adminHelpers.ts
//
// Task 4.4 / Req 1.2, 3.4, 13.5: Admin-role Playwright helpers.

import type { Page } from "@playwright/test";

const runId = (): string => process.env.AUDIT_RUN_ID ?? "local";
const ns = (name: string): string => `audit-${runId()}-${name}`;

export const openInstitutionDashboard = async (page: Page): Promise<void> => {
  await page.goto("/admin/dashboard");
  await page.waitForLoadState("networkidle");
};

export const createIlo = async (
  page: Page,
  title?: string
): Promise<string> => {
  const iloTitle = title ?? ns("ilo");
  await page.goto("/admin/outcomes/ilos");
  await page
    .getByRole("button", { name: /add|create|new/i })
    .first()
    .click();
  await page.getByLabel(/title|name/i).fill(iloTitle);
  await page.getByRole("button", { name: /save|submit|create/i }).click();
  await page.waitForLoadState("networkidle");
  return iloTitle;
};

export const createUser = async (
  page: Page,
  opts: { email: string; role: string; name: string }
): Promise<void> => {
  await page.goto("/admin/users");
  await page
    .getByRole("button", { name: /add|invite|new user/i })
    .first()
    .click();
  await page.getByLabel(/email/i).fill(opts.email);
  await page.getByLabel(/name/i).fill(opts.name);
  // Select role
  const roleSelect = page.getByLabel(/role/i);
  if (await roleSelect.isVisible()) {
    await roleSelect.selectOption(opts.role);
  }
  await page.getByRole("button", { name: /save|invite|create/i }).click();
  await page.waitForLoadState("networkidle");
};

export const openAuditLog = async (page: Page): Promise<void> => {
  await page.goto("/admin/audit-log");
  await page.waitForLoadState("networkidle");
};

export const createBonusXpEvent = async (
  page: Page,
  opts: { multiplier: number; durationMinutes: number }
): Promise<void> => {
  await page.goto("/admin/gamification/bonus-xp");
  await page
    .getByRole("button", { name: /add|create|new/i })
    .first()
    .click();
  const multiplierInput = page.getByLabel(/multiplier/i);
  if (await multiplierInput.isVisible()) {
    await multiplierInput.fill(String(opts.multiplier));
  }
  await page.getByRole("button", { name: /save|create/i }).click();
  await page.waitForLoadState("networkidle");
};
