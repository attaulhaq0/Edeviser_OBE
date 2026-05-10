// tests/e2e/coordinator/critical-path.spec.ts
//
// Task 5.2.1 / Req 1.3: Coordinator critical-path E2E spec.

import { test, expect } from "@playwright/test";
import {
  openCurriculumMatrix,
  openCqiActionPlan,
} from "../_helpers/coordinatorHelpers.ts";
import { assertRoleClaim } from "../_helpers/auth.ts";

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:5173";

test.describe("Coordinator critical path", () => {
  test("5.2.1 — coordinator can navigate dashboard, curriculum matrix, CQI", async ({
    page,
  }) => {
    await page.goto(`${BASE_URL}/coordinator/dashboard`);
    await page.waitForLoadState("networkidle");
    await assertRoleClaim(page, "coordinator");

    await expect(page).toHaveURL(/coordinator/);

    // Curriculum matrix
    await openCurriculumMatrix(page);
    await expect(page).toHaveURL(/coordinator/);

    // CQI action plan
    await openCqiActionPlan(page);
    await expect(page).toHaveURL(/coordinator/);
  });
});
