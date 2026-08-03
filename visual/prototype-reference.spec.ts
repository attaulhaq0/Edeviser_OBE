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
      test(`capture ${screen.id} @ ${vp.name} (${vp.width}x${vp.height})`, async ({
        page,
      }) => {
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

        // The prototype's Google Fonts requests can remain pending in restricted
        // developer environments. Playwright waits for those requests during
        // `page.screenshot`, so abort only the non-essential font hosts. The
        // capture still uses the browser's deterministic fallback font and
        // retains the prototype's local HTML, CSS, and Tailwind CDN styling.
        await page.route(
          /https:\/\/(fonts\.googleapis\.com|fonts\.gstatic\.com)\//,
          (route) => route.abort()
        );

        await page.setViewportSize({ width: vp.width, height: vp.height });
        await page.goto(`${PROTOTYPE_URL}/${screen.prototype}`, {
          // The prototype deliberately pulls Tailwind and fonts from CDNs.
          // `networkidle` can therefore wait forever on a slow or blocked
          // third-party request, preventing every visual baseline from being
          // captured. The DOM is sufficient for a deterministic screenshot;
          // font readiness gets a short bounded grace period below.
          waitUntil: "domcontentloaded",
        });
        await page.evaluate(() => {
          document
            .querySelectorAll('link[href*="fonts.googleapis.com"]')
            .forEach((link) => link.remove());
        });
        await page.addStyleTag({ content: FREEZE_ANIMATIONS });
        await page
          .evaluate(async () => {
            const fonts = (
              document as unknown as { fonts?: { ready?: Promise<unknown> } }
            ).fonts;
            if (!fonts?.ready) return;
            await Promise.race([
              fonts.ready,
              new Promise<void>((resolve) => window.setTimeout(resolve, 1_000)),
            ]);
          })
          .catch(() => {});
        await page.waitForTimeout(200);

        await page.screenshot({ path: referencePath(screen.id, vp.name) });
      });
    }
  }
}
