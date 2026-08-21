// tests/e2e/cross-role/teacher-to-student.spec.ts
//
// Task 6.1 / Req 3.1: Teacher grades → Student XP propagation spec.
// Teacher releases a grade → Student polls XP page up to 60s → assert XP increased.

import { test, expect, chromium } from "@playwright/test";
import { assertRoleClaim, loadStorageState } from "../_helpers/auth.ts";
import { waitForGradePropagation } from "../_helpers/crossRoleHelpers.ts";

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:5173";
const AUDIT_SUBMISSION_ID = "a0000000-0000-4000-8000-000000000009";

test.describe("Cross-role: teacher grade → student XP", () => {
  test("6.1 — grade release propagates to student XP within 60s", async () => {
    const browser = await chromium.launch();

    // Teacher context
    const teacherCtx = await browser.newContext();
    await loadStorageState(teacherCtx, "teacher");
    const teacherPage = await teacherCtx.newPage();

    // Student context
    const studentCtx = await browser.newContext();
    await loadStorageState(studentCtx, "student");
    const studentPage = await studentCtx.newPage();

    try {
      // Read student baseline XP
      await studentPage.goto(`${BASE_URL}/student/dashboard`);
      await studentPage.waitForLoadState("networkidle");
      await assertRoleClaim(studentPage, "student");
      const baselineXpText = await studentPage
        .getByTestId("xp-total")
        .textContent();
      expect(
        baselineXpText,
        "Student dashboard must expose the XP total"
      ).not.toBeNull();
      const baselineXp = parseInt(
        (baselineXpText ?? "0").replace(/[^0-9]/g, ""),
        10
      );
      expect(
        Number.isNaN(baselineXp),
        "Student baseline XP must be numeric"
      ).toBe(false);

      // Teacher submits the grade. Grade creation is the release boundary in
      // the current application and triggers attainment + canonical grade XP.
      await teacherPage.goto(
        `${BASE_URL}/teacher/grading/${AUDIT_SUBMISSION_ID}`
      );
      await teacherPage.waitForLoadState("networkidle");
      await assertRoleClaim(teacherPage, "teacher");
      await expect(
        teacherPage.getByRole("heading", { name: "Grade Submission" })
      ).toBeVisible();
      await teacherPage.getByRole("button", { name: "Excellent" }).click();
      await teacherPage
        .getByLabel("Overall Feedback")
        .fill("Closed-loop audit grade");
      await teacherPage.getByRole("button", { name: "Submit Grade" }).click();
      await expect(teacherPage).toHaveURL(/\/teacher\/grading$/);

      // Poll for XP update (up to 60s)
      const newXp = await waitForGradePropagation(studentPage, baselineXp);
      expect(newXp).toBeGreaterThan(baselineXp);
    } finally {
      await teacherCtx.close();
      await studentCtx.close();
      await browser.close();
    }
  });
});
