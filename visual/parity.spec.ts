/**
 * Bounded historical prototype comparison, NOT application visual approval.
 * Missing references/role sessions and no active rows are explicit failures;
 * captured prototype images are migration aids, not current design authority.
 */
import { test, expect } from "@playwright/test";
import { loadStorageState } from "../tests/e2e/_helpers/auth.ts";
import {
  SCREENS,
  VIEWPORTS,
  DEFAULT_MAX_DIFF_RATIO,
  PIXELMATCH_THRESHOLD,
} from "./screen-map";
import {
  comparePng,
  referencePath,
  diffOutputPath,
  hasReference,
} from "./compare";

const FREEZE_ANIMATIONS =
  "*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}";
const active = SCREENS.filter((screen) => screen.rebuilt && screen.appPath);

if (active.length === 0) {
  test("historical prototype comparison has no declared app route coverage", () => {
    throw new Error(
      "No active application comparison rows. A green empty suite is not visual evidence."
    );
  });
}

for (const screen of active) {
  test.describe(screen.id, () => {
    for (const viewport of VIEWPORTS) {
      test(`@ ${viewport.name} (${viewport.width}x${viewport.height})`, async ({
        page,
      }, testInfo) => {
        if (
          testInfo.config.updateSnapshots !== "none" ||
          testInfo.project.ignoreSnapshots
        )
          throw new Error(
            "Visual verification may not update or ignore snapshots"
          );
        if (!hasReference(screen.id, viewport.name))
          throw new Error(
            `Historical reference missing for ${screen.id}@${viewport.name}; candidate capture and human review are separate.`
          );
        if (!screen.appPath)
          throw new Error(`No routed application path for ${screen.id}`);
        const protectedRoute =
          /^\/(admin|coordinator|teacher|student|parent)(?:\/|$)/.test(
            screen.appPath
          );
        if (protectedRoute && !screen.role)
          throw new Error(
            `Protected route ${screen.appPath} needs a verified role storageState`
          );
        // readStorageStateFile rejects missing/empty/unauthenticated state. No
        // silent fallback to an anonymous login page for protected comparisons.
        if (screen.role) await loadStorageState(page.context(), screen.role);
        await page.addInitScript(() => {
          localStorage.setItem("edeviser-language", "en");
          localStorage.setItem("theme", "light");
        });
        await page.setViewportSize({
          width: viewport.width,
          height: viewport.height,
        });
        await page.goto(screen.appPath, { waitUntil: "networkidle" });
        await expect
          .poll(() => new URL(page.url()).pathname)
          .toBe(screen.appPath);
        await expect(page.locator("html")).toHaveAttribute(
          "lang",
          /^en(?:-|$)/i
        );
        await expect(page.locator("html")).toHaveAttribute("dir", "ltr");
        await expect(page.locator("html")).not.toHaveClass(/\bdark\b/);
        await page.addStyleTag({ content: FREEZE_ANIMATIONS });
        await expect
          .poll(() =>
            page.evaluate(async () => {
              await document.fonts.ready;
              return document.fonts.status;
            })
          )
          .toBe("loaded");
        expect(new URL(page.url()).pathname).toBe(screen.appPath);

        const actual = await page.screenshot();
        expect(new URL(page.url()).pathname).toBe(screen.appPath);
        const max = screen.maxDiffRatio ?? DEFAULT_MAX_DIFF_RATIO;
        const result = comparePng(
          actual,
          referencePath(screen.id, viewport.name),
          diffOutputPath(screen.id, viewport.name),
          PIXELMATCH_THRESHOLD
        );
        expect(
          result.dimensionMismatch,
          `Reference size ${result.width}x${result.height} differs from current scene`
        ).toBe(false);
        expect(
          result.diffRatio,
          `Historical prototype diff ${(result.diffRatio * 100).toFixed(
            2
          )}% exceeds declared ${(max * 100).toFixed(
            0
          )}%; this is not approved app visual evidence${
            result.diffPath ? ` — ${result.diffPath}` : ""
          }`
        ).toBeLessThanOrEqual(max);
      });
    }
  });
}
