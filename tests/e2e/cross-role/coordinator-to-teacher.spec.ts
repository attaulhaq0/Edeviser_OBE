// tests/e2e/cross-role/coordinator-to-teacher.spec.ts
//
// Task 6.3 / Req 3.3: Coordinator and teacher share the seeded PLO scope.

import { test, expect, chromium } from "@playwright/test";
import {
  assertLiveAuthenticatedUser,
  authenticatedSupabaseGet,
  loadStorageState,
} from "../_helpers/auth.ts";

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:5173";

test.describe("Cross-role: coordinator PLO → teacher visibility", () => {
  test("6.3 — seeded PLO is visible in both authenticated scopes", async () => {
    const browser = await chromium.launch();
    const coordCtx = await browser.newContext();
    await loadStorageState(coordCtx, "coordinator");
    const coordPage = await coordCtx.newPage();

    const teacherCtx = await browser.newContext();
    await loadStorageState(teacherCtx, "teacher");
    const teacherPage = await teacherCtx.newPage();

    try {
      await coordPage.goto(`${BASE_URL}/coordinator/dashboard`);
      await coordPage.waitForLoadState("networkidle");
      await assertLiveAuthenticatedUser(coordPage, {
        role: "coordinator",
        email: "audit+coordinator@edeviser.test",
        institutionId: "audit-inst",
      });

      await teacherPage.goto(`${BASE_URL}/teacher/dashboard`);
      await teacherPage.waitForLoadState("networkidle");
      await assertLiveAuthenticatedUser(teacherPage, {
        role: "teacher",
        email: "audit+teacher@edeviser.test",
        institutionId: "audit-inst",
      });

      const query =
        "/rest/v1/learning_outcomes?select=id,title&type=eq.plo&title=eq.Audit%20PLO%201";
      const coordinatorRows = await authenticatedSupabaseGet(coordPage, query);
      const teacherRows = await authenticatedSupabaseGet(teacherPage, query);
      expect(coordinatorRows).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ title: "Audit PLO 1" }),
        ])
      );
      expect(teacherRows).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ title: "Audit PLO 1" }),
        ])
      );
    } finally {
      await coordCtx.close();
      await teacherCtx.close();
      await browser.close();
    }
  });
});
