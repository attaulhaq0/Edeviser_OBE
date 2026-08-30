// tests/e2e/parent/unlinked-denied.spec.ts
//
// Task 5.5.3 / Req 3.2, 5.6: Parent unlinked-denied spec.
// Verifies that an unlinked parent cannot access child data.

import { test, expect } from "@playwright/test";
import {
  assertLiveAuthenticatedUser,
  authenticatedSupabaseGet,
  loadStorageState,
} from "../_helpers/auth.ts";

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:5173";

test.describe("Parent unlinked access denial", () => {
  test("5.5.3 — unlinked parent cannot access seed student data", async ({
    context,
  }) => {
    await loadStorageState(context, "parent", "unlinked");
    const page = await context.newPage();
    await page.goto(`${BASE_URL}/parent/dashboard`);
    await page.waitForLoadState("networkidle");
    await assertLiveAuthenticatedUser(page, {
      role: "parent",
      email: "audit+parent-unlinked@edeviser.test",
      institutionId: "a1b2c3d4-e5f6-4a7b-8c9d-000000000001",
    });
    const rows = await authenticatedSupabaseGet(
      page,
      "/rest/v1/parent_student_links?select=student_id"
    );
    expect(rows).toEqual([]);
  });
});
