/**
 * Pixel-parity gate: screenshots each REBUILT app route and diffs it against the
 * committed prototype reference. Fails when the diff ratio exceeds the screen's
 * threshold, writing an annotated diff PNG to test-results/visual-diffs/.
 *
 * Activates row by row: only screens with `rebuilt: true` + `appPath` in
 * screen-map.ts are asserted. Today none are rebuilt, so this suite is green and
 * simply reports the harness is ready.
 */
import fs from "node:fs";
import path from "node:path";
import { test, expect } from "@playwright/test";
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

const storageStateFor = (role?: string): string | undefined => {
  if (!role) return undefined;
  const p = path.join(
    process.cwd(),
    "tests",
    "e2e",
    "_fixtures",
    "storage-states",
    `${role}.json`
  );
  return fs.existsSync(p) ? p : undefined;
};

const active = SCREENS.filter((s) => s.rebuilt && s.appPath);

if (active.length === 0) {
  test("visual parity — harness ready (no rebuilt screens yet)", () => {
    test.info().annotations.push({
      type: "note",
      value:
        "Set `rebuilt: true` + `appPath` on a screen in visual/screen-map.ts to activate its pixel-parity check.",
    });
    expect(active.length).toBe(0);
  });
}

for (const screen of active) {
  test.describe(screen.id, () => {
    const ss = storageStateFor(screen.role);
    if (ss) test.use({ storageState: ss });

    for (const vp of VIEWPORTS) {
      test(`@ ${vp.name} (${vp.width}x${vp.height})`, async ({ page }) => {
        test.skip(
          !hasReference(screen.id, vp.name),
          `No reference for ${screen.id}@${vp.name} — run npm run test:visual:capture`
        );

        await page.setViewportSize({ width: vp.width, height: vp.height });
        await page.goto(screen.appPath as string, { waitUntil: "networkidle" });
        await page.addStyleTag({ content: FREEZE_ANIMATIONS });
        await page
          .evaluate(async () => {
            await (
              document as unknown as { fonts?: { ready?: Promise<unknown> } }
            ).fonts?.ready;
          })
          .catch(() => {});

        const actual = await page.screenshot();
        const max = screen.maxDiffRatio ?? DEFAULT_MAX_DIFF_RATIO;
        const result = comparePng(
          actual,
          referencePath(screen.id, vp.name),
          diffOutputPath(screen.id, vp.name),
          PIXELMATCH_THRESHOLD
        );

        expect(
          result.dimensionMismatch,
          `size mismatch vs reference (ref ${result.width}x${result.height}) — check viewport/dpr`
        ).toBe(false);
        expect(
          result.diffRatio,
          `pixel diff ${(result.diffRatio * 100).toFixed(2)}% exceeds ${(
            max * 100
          ).toFixed(0)}%${result.diffPath ? ` — see ${result.diffPath}` : ""}`
        ).toBeLessThanOrEqual(max);
      });
    }
  });
}
