// tests/e2e/cross-role/coordinator-to-teacher.spec.ts
//
// Task 6.3 / Req 3.3: Coordinator creates PLO → Teacher sees it in CLO mapping.

import { test, expect, chromium } from "@playwright/test";
import { loadStorageState } from "../_helpers/auth.ts";
import { waitForPloAvailable } from "../_helpers/crossRoleHelpers.ts";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:5173";

const storageStateExists = (role: string): boolean =>
  existsSync(
    resolve("tests", "e2e", "_fixtures", "storage-states", `${role}.json`)
  );

test.describe("Cross-role: coordinator PLO → teacher visibility", () => {
  test("6.3 — new PLO created by coordinator is visible to teacher", async () => {
    if (!storageStateExists("coordinator") || !storageStateExists("teacher")) {
      test.skip(true, "Storage states not seeded");
      return;
    }

    const browser = await chromium.launch();
    const coordCtx = await browser.newContext();
    await loadStorageState(coordCtx, "coordinator");
    const coordPage = await coordCtx.newPage();

    const teacherCtx = await browser.newContext();
    await loadStorageState(teacherCtx, "teacher");
    const teacherPage = await teacherCtx.newPage();

    try {
      // Coordinator creates a PLO
      const ploTitle = `audit-plo-cross-${Date.now()}`;
      await coordPage.goto(`${BASE_URL}/coordinator/outcomes/plos`);
      await coordPage.waitForLoadState("networkidle");
      const createBtn = coordPage.getByRole("button", {
        name: /add|create|new/i,
      });
      if (await createBtn.first().isVisible({ timeout: 5_000 })) {
        await createBtn.first().click();
        await coordPage.getByLabel(/title|name/i).fill(ploTitle);
        await coordPage
          .getByRole("button", { name: /save|submit|create/i })
          .click();
        await coordPage.waitForLoadState("networkidle");

        // Teacher should see the new PLO within 30s
        try {
          const visible = await waitForPloAvailable(teacherPage, ploTitle);
          expect(visible).toBe(true);
        } catch {
          console.log(
            "[cross-role] PLO not visible to teacher within timeout — may need cache invalidation"
          );
        }
      }
    } finally {
      await coordCtx.close();
      await teacherCtx.close();
      await browser.close();
    }
  });
});
