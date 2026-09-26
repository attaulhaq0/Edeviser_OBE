// Real Chromium geometry regression, with in-memory local HTML only.
// Run: node --test scripts/touch-targets.regression.mjs
// No authentication, Preview, seeds, external requests or repository reports.
import assert from "node:assert/strict";
import { test } from "node:test";
import { chromium } from "@playwright/test";
import { assertTouchTargets, scanTouchTargets } from "../tests/e2e/_helpers/touch-targets.mjs";

await test("44px touch-target policy in real mobile Chromium", { timeout: 30_000 }, async (suite) => {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    await page.route("**/*", (route) => route.abort()); // No fixture needs network.
    const fixture = async (markup, css = "") => {
      await page.setContent(`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>
        button, a, input, select, textarea, summary, [role], [tabindex], [contenteditable] {
          box-sizing: border-box; margin: 0; padding: 0; border: 0;
          display: inline-block; width: 44px; height: 44px;
        }
        input[type=hidden] { display:none; }
        ${css}
        </style></head><body>${markup}</body></html>`);
      return scanTouchTargets(page);
    };

    await suite.test("exact 44x44 visible controls pass in actual CSS pixels", async () => {
      const report = await fixture('<button id="good">Good</button><a href="#destination">Link</a><input aria-label="Input"><textarea aria-label="Text"></textarea>');
      assert.equal(report.checked, 4);
      assert(report.targets.every((target) => target.width === 44 && target.height === 44));
      assert.doesNotThrow(() => assertTouchTargets(report));
    });

    await suite.test("NEGATIVE: 43.99px width fails without rounding to 44", async () => {
      const report = await fixture('<button id="bad" style="width:43.99px">Bad</button>');
      assert(report.violations[0].width < 44);
      assert(report.violations[0].width > 43);
      assert.throws(() => assertTouchTargets(report), /button#bad/);
    });

    await suite.test("NEGATIVE: short height, ARIA roles and tabindex controls fail", async () => {
      const report = await fixture('<button id="short" style="height:20px">Short</button><div role="switch" aria-label="Switch" style="width:12px"></div><div tabindex="0" style="width:20px">Focus</div>');
      assert.equal(report.violations.length, 3);
      assert.throws(() => assertTouchTargets(report), /below 44x44/);
    });

    await suite.test("NEGATIVE: inline links have no blanket project-policy exemption", async () => {
      const report = await fixture('<p>Read <a id="small-link" href="#destination" style="width:20px;height:20px">more</a>.</p>');
      assert.equal(report.violations.length, 1);
      assert.throws(() => assertTouchTargets(report), /small-link/);
    });

    await suite.test("disabled, inert and nonrendered exclusions have explicit reasons", async () => {
      const report = await fixture(`<button>Good</button>
        <button disabled style="width:8px">Disabled</button>
        <div role="button" aria-disabled="true" style="width:8px">Disabled ARIA</div>
        <div inert><button style="width:8px">Inert</button></div>
        <button style="display:none;width:8px">Hidden</button>
        <button style="visibility:hidden;width:8px">Invisible</button>
        <input type="hidden">`);
      assert.equal(report.checked, 1);
      assert.equal(report.excluded.length, 6);
      assert(report.excluded.every((target) => target.reason.length > 0));
      assert.doesNotThrow(() => assertTouchTargets(report));
    });

    await suite.test("fully clipped keyboard-only link is excluded only while clipped", async () => {
      await fixture('<button>Good</button><a class="skip" href="#main">Skip</a><main id="main">Main</main>',
        '.skip {position:absolute;width:1px;height:1px;clip:rect(0,0,0,0)} .skip:focus {clip:auto;width:44px;height:44px}');
      const before = await scanTouchTargets(page);
      assert.equal(before.checked, 1);
      assert.equal(before.excluded[0].reason, "fully clipped non-pointer-visible control");
      await page.locator("a.skip").focus();
      const after = await scanTouchTargets(page);
      assert.equal(after.checked, 2);
      assert.equal(after.excluded.length, 0);
      assert.doesNotThrow(() => assertTouchTargets(after));
    });

    await suite.test("NEGATIVE: aria-hidden or offscreen actionable controls are not exempt", async () => {
      const report = await fixture('<button aria-hidden="true" style="width:20px">Still actionable</button><button style="position:absolute;left:-1000px;width:20px">Offscreen</button>');
      assert.equal(report.violations.length, 2);
      assert.equal(report.excluded.length, 0);
      assert.throws(() => assertTouchTargets(report), /below 44x44/);
    });

    await suite.test("NEGATIVE: rendered zero-size control fails; empty coverage also fails", async () => {
      const zero = await fixture('<button style="width:0;height:0;font-size:0">Zero</button>');
      assert.equal(zero.checked, 1);
      assert.throws(() => assertTouchTargets(zero), /below 44x44/);
      const empty = await fixture('<button disabled>Disabled</button>');
      assert.throws(() => assertTouchTargets(empty), /no rendered, enabled controls/);
    });

    await suite.test("uses transformed rendered geometry rather than declared CSS dimensions", async () => {
      const report = await fixture('<button style="width:88px;height:88px;transform:scale(0.5)">Scaled</button>');
      assert.equal(report.targets[0].width, 44);
      assert.equal(report.targets[0].height, 44);
      assert.doesNotThrow(() => assertTouchTargets(report));
    });
  } finally {
    await browser.close();
  }
});
