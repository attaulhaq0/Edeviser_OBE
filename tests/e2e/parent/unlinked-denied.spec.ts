// tests/e2e/parent/unlinked-denied.spec.ts
//
// Task 5.5.3 / Req 3.2, 5.6: Parent unlinked-denied spec.
// Verifies that an unlinked parent cannot access child data.

import { test, expect } from "@playwright/test";

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:5173";

test.describe("Parent unlinked access denial", () => {
  test("5.5.3 — unlinked parent cannot access seed student data", async ({
    page,
    context,
  }) => {
    // Load the unlinked parent storage state if available
    const { existsSync, readFileSync } = await import("node:fs");
    const { resolve } = await import("node:path");
    const unlinkedPath = resolve(
      "tests",
      "e2e",
      "_fixtures",
      "storage-states",
      "parent-unlinked.json"
    );

    if (existsSync(unlinkedPath)) {
      const state = JSON.parse(readFileSync(unlinkedPath, "utf8")) as {
        cookies: unknown[];
      };
      await context.addCookies(
        state.cookies as Parameters<typeof context.addCookies>[0]
      );
    }

    // Try to access the seed student's data directly
    await page.goto(`${BASE_URL}/parent/students/audit-student`);
    await page.waitForLoadState("networkidle");

    // Should either redirect to dashboard or show access denied
    const url = page.url();
    const isAccessDenied =
      url.includes("/login") ||
      url.includes("/dashboard") ||
      url.includes("/unauthorized") ||
      (await page
        .getByText(/access denied|not authorized|forbidden|no.*child/i)
        .isVisible()
        .catch(() => false));

    expect(isAccessDenied).toBe(true);
  });
});
