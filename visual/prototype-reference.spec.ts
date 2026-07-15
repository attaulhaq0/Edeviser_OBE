/**
 * Captures the approved prototype screens as pixel-parity REFERENCE images.
 * Runs only when VISUAL_CAPTURE=1 (npm run test:visual:capture) so the normal
 * suite never overwrites committed references.
 *
 * Output: visual/references/<id>__<viewport>.png (committed = the design truth).
 * Requires network (the prototype loads CDN Tailwind + Google Fonts).
 */
import { test } from "@playwright/test";
import { SCREENS, VIEWPORTS, edvModeFor } from "./screen-map";
import { referencePath } from "./compare";

const PROTOTYPE_URL = process.env.PROTOTYPE_URL ?? "http://localhost:4180";
const CAPTURE = process.env.VISUAL_CAPTURE === "1";

const FREEZE_ANIMATIONS =
  "*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}";

if (!CAPTURE) {
  test("prototype reference capture is disabled", () => {
    test.info().annotations.push({
      type: "note",
      value:
        "Run `npm run test:visual:capture` (sets VISUAL_CAPTURE=1) to (re)generate reference images.",
    });
  });
} else {
  for (const screen of SCREENS) {
    for (const vp of VIEWPORTS) {
      test(`capture ${screen.id} @ ${vp.name} (${vp.width}x${vp.height})`, async ({ page }) => {
        // Prime the prototype's demo device-mode + role before its scripts run.
        await page.addInitScript(
          (cfg: { mode: string; role: string }) => {
            try {
              localStorage.setItem("edv-mode", cfg.mode);
              if (cfg.role) localStorage.setItem("edv-role", cfg.role);
            } catch {
              /* ignore storage errors */
            }
          },
          { mode: edvModeFor(vp.width), role: screen.role ?? "" }
        );

        await page.setViewportSize({ width: vp.width, height: vp.height });
        await page.goto(`${PROTOTYPE_URL}/${screen.prototype}`, {
          waitUntil: "networkidle",
        });
        await page.addStyleTag({ content: FREEZE_ANIMATIONS });
        await page
          .evaluate(async () => {
            await (document as unknown as { fonts?: { ready?: Promise<unknown> } }).fonts
              ?.ready;
          })
          .catch(() => {});
        await page.waitForTimeout(200);

        await page.screenshot({ path: referencePath(screen.id, vp.name) });
      });
    }
  }
}
