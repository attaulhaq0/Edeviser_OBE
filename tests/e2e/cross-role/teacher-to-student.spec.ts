// tests/e2e/cross-role/teacher-to-student.spec.ts
//
// Task 6.1 / Req 3.1: Teacher grades → Student XP propagation spec.
// Teacher releases a grade → Student polls XP page up to 60s → assert XP increased.
// @critical-e2e
// @critical-control Submit Grade

import { test, expect, chromium } from "@playwright/test";
import { criticalRoutes } from "../../../src/lib/criticalRoutes.ts";
import {
  assertLiveAuthenticatedUser,
  loadStorageState,
} from "../_helpers/auth.ts";
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
      // Read the same canonical XP total that the propagation poll observes.
      await studentPage.goto(`${BASE_URL}${criticalRoutes.student.xpHistory}`);
      await studentPage.waitForLoadState("networkidle");
      await assertLiveAuthenticatedUser(studentPage, {
        role: "student",
        email: "audit+student@edeviser.test",
        institutionId: "a1b2c3d4-e5f6-4a7b-8c9d-000000000001",
      });
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

      // Grade creation is the current application action that starts the
      // attainment/XP chain. The deterministic ungraded submission is supplied
      // by Boundary 2's Preview fixture.
      await teacherPage.goto(
        `${BASE_URL}${criticalRoutes.teacher.gradingSubmission(
          AUDIT_SUBMISSION_ID
        )}`
      );
      await teacherPage.waitForLoadState("networkidle");
      await assertLiveAuthenticatedUser(teacherPage, {
        role: "teacher",
        email: "audit+teacher@edeviser.test",
        institutionId: "a1b2c3d4-e5f6-4a7b-8c9d-000000000001",
      });
      await expect(
        teacherPage.getByRole("heading", { name: "Grade Submission" })
      ).toBeVisible();
      await teacherPage
        .getByRole("button", { name: /Overall Performance: Excellent/i })
        .click();
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
