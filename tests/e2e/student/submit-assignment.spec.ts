// tests/e2e/student/submit-assignment.spec.ts
//
// Task 5.4.3 / Req 7.5: Student assignment submission spec.

import { test, expect } from "@playwright/test";
import { criticalRoutes } from "../../../src/lib/criticalRoutes.ts";

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:5173";

test.describe("Student assignment submission", () => {
  test("5.4.3 — assignment detail page renders", async ({ page }) => {
    await page.goto(`${BASE_URL}${criticalRoutes.student.assignments}`);
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveURL(/student/);

    const heading = page.getByRole("heading").first();
    await expect(heading).toBeVisible({ timeout: 10_000 });
  });

  test("5.4.3 — audit assignment page is accessible", async ({ page }) => {
    await page.goto(
      `${BASE_URL}${criticalRoutes.student.assignmentDetail(
        "a0000000-0000-4000-8000-000000000008"
      )}`
    );
    await page.waitForLoadState("networkidle");
    await expect(
      page.getByRole("heading", { name: "Audit Assignment 1" })
    ).toBeVisible();
  });
});
