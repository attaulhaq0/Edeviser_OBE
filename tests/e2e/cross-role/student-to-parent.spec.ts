// tests/e2e/cross-role/student-to-parent.spec.ts
//
// Task 6.2 / Req 3.2, 5.6: Linked versus unlinked parent RLS scope.

import { test, expect, chromium } from "@playwright/test";
import {
  assertLiveAuthenticatedUser,
  authenticatedSupabaseGet,
  loadStorageState,
} from "../_helpers/auth.ts";

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:5173";

test.describe("Parent linkage isolation", () => {
  test("6.2 — linked parent sees one link and unlinked parent sees none", async () => {
    const browser = await chromium.launch();
    const parentCtx = await browser.newContext();
    await loadStorageState(parentCtx, "parent");
    const parentPage = await parentCtx.newPage();

    try {
      // Linked parent can access dashboard
      await parentPage.goto(`${BASE_URL}/parent/dashboard`);
      await parentPage.waitForLoadState("networkidle");
      await assertLiveAuthenticatedUser(parentPage, {
        role: "parent",
        email: "audit+parent-linked@edeviser.test",
        institutionId: "audit-inst",
      });

      const unlinkedCtx = await browser.newContext();
      try {
        await loadStorageState(unlinkedCtx, "parent", "unlinked");
        const unlinkedPage = await unlinkedCtx.newPage();
        await unlinkedPage.goto(`${BASE_URL}/parent/dashboard`);
        await unlinkedPage.waitForLoadState("networkidle");
        await assertLiveAuthenticatedUser(unlinkedPage, {
          role: "parent",
          email: "audit+parent-unlinked@edeviser.test",
          institutionId: "audit-inst",
        });

        const query = "/rest/v1/parent_student_links?select=student_id";
        const linkedRows = await authenticatedSupabaseGet(parentPage, query);
        const unlinkedRows = await authenticatedSupabaseGet(
          unlinkedPage,
          query
        );
        expect(linkedRows).toEqual([
          expect.objectContaining({ student_id: expect.any(String) }),
        ]);
        expect(unlinkedRows).toEqual([]);
      } finally {
        await unlinkedCtx.close();
      }
    } finally {
      await parentCtx.close();
      await browser.close();
    }
  });
});
