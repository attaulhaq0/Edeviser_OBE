// tests/e2e/coordinator/critical-path.spec.ts
//
// Task 5.2.1 / Req 1.3: Coordinator critical-path E2E spec.
// @critical-e2e

import { test, expect } from "@playwright/test";
import { assertLiveAuthenticatedUser } from "../_helpers/auth.ts";

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:5173";

test.describe("Coordinator critical path", () => {
  test("5.2.1 — coordinator can navigate dashboard, curriculum matrix, CQI", async ({
    page,
  }) => {
    await page.goto(`${BASE_URL}/coordinator/dashboard`);
    await page.waitForLoadState("networkidle");
    await assertLiveAuthenticatedUser(page, {
      role: "coordinator",
      email: "audit+coordinator@edeviser.test",
      institutionId: "a1b2c3d4-e5f6-4a7b-8c9d-000000000001",
    });
    await expect(page).toHaveURL(/\/coordinator\/dashboard$/);

    await page.goto(`${BASE_URL}/coordinator/matrix`);
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveURL(/\/coordinator\/matrix$/);

    await page.goto(`${BASE_URL}/coordinator/cqi`);
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveURL(/\/coordinator\/cqi$/);
  });
});
