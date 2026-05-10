// tests/e2e/_helpers/teacherHelpers.ts
//
// Task 4.6 / Req 1.4, 3.1: Teacher-role Playwright helpers.

import type { Page } from "@playwright/test";

const runId = (): string => process.env.AUDIT_RUN_ID ?? "local";
const ns = (name: string): string => `audit-${runId()}-${name}`;

export const openCourse = async (
  page: Page,
  courseId = "audit-course-1"
): Promise<void> => {
  await page.goto(`/teacher/courses/${courseId}`);
  await page.waitForLoadState("networkidle");
};

export const createCloWithBloom = async (
  page: Page,
  opts: { title?: string; bloomLevel: string }
): Promise<string> => {
  const cloTitle = opts.title ?? ns(`clo-${opts.bloomLevel.toLowerCase()}`);
  await page.goto("/teacher/outcomes/clos");
  await page
    .getByRole("button", { name: /add|create|new/i })
    .first()
    .click();
  await page.getByLabel(/title|name/i).fill(cloTitle);
  const bloomSelect = page.getByLabel(/bloom/i);
  if (await bloomSelect.isVisible()) {
    await bloomSelect.selectOption(opts.bloomLevel);
  }
  await page.getByRole("button", { name: /save|submit|create/i }).click();
  await page.waitForLoadState("networkidle");
  return cloTitle;
};

export const createAssignment = async (
  page: Page,
  opts: { title?: string; cloTitle?: string }
): Promise<string> => {
  const assignTitle = opts.title ?? ns("assignment");
  await page.goto("/teacher/assignments");
  await page
    .getByRole("button", { name: /add|create|new/i })
    .first()
    .click();
  await page.getByLabel(/title|name/i).fill(assignTitle);
  if (opts.cloTitle) {
    const cloSelector = page.getByLabel(/clo|learning outcome/i);
    if (await cloSelector.isVisible()) {
      await cloSelector.selectOption({ label: opts.cloTitle });
    }
  }
  await page.getByRole("button", { name: /save|submit|create/i }).click();
  await page.waitForLoadState("networkidle");
  return assignTitle;
};

export const gradeSubmission = async (
  page: Page,
  opts: { assignmentId?: string; score: number }
): Promise<void> => {
  const assignId = opts.assignmentId ?? "audit-assign-1";
  await page.goto(`/teacher/assignments/${assignId}/grade`);
  await page.waitForLoadState("networkidle");
  const scoreInput = page.getByLabel(/score|grade/i).first();
  if (await scoreInput.isVisible()) {
    await scoreInput.fill(String(opts.score));
  }
  await page.getByRole("button", { name: /save|submit/i }).click();
  await page.waitForLoadState("networkidle");
};

export const releaseGrade = async (
  page: Page,
  assignmentId = "audit-assign-1"
): Promise<void> => {
  await page.goto(`/teacher/assignments/${assignmentId}/grade`);
  const releaseBtn = page.getByRole("button", { name: /release|publish/i });
  if (await releaseBtn.isVisible()) {
    await releaseBtn.click();
    await page.waitForLoadState("networkidle");
  }
};
