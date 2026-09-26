// Run against an already-built Edeviser URL; never starts a server or mocks UI.
// Usage: node scripts/audit/font-delivery-regression.mjs http://127.0.0.1:4173
// Scope: real public auth consumers, EN/AR, light/dark, stored reading on/off.
// This is not five-role/sidebar, interactive settings, or performance attestation.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { chromium } from "@playwright/test";

const base = process.argv[2] ?? process.env.FONT_DELIVERY_BASE_URL;
assert.ok(base, "Pass the existing built-app URL; this script does not build or serve it.");
const target = new URL("/login", base);
const notice = readFileSync(new URL("../../public/font-licenses.txt", import.meta.url), "utf8").replace(/\r\n/g, "\n");
const manifest = [...notice.matchAll(/^([^\s]+\.woff2?)\n {2}Bytes: (\d+)\n {2}SHA-256: ([a-f0-9]{64})/gm)]
  .map((m) => ({ file: m[1], bytes: Number(m[2]), sha: m[3] }));
assert.equal(manifest.length, 11);
const browser = await chromium.launch({ headless: true });
try {
  for (const language of ["en", "ar"]) for (const theme of ["light", "dark"]) for (const reading of [false, true]) {
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, serviceWorkers: "block" });
    try {
      await context.addInitScript(({ language, theme, reading }) => {
        localStorage.setItem("edeviser-language", language);
        localStorage.setItem("theme", theme);
        localStorage.setItem("edeviser-accessibility-prefs", JSON.stringify({
          font_size: "default", high_contrast: false, reduced_animations: false,
          dyslexia_font: reading, simplified_view: false,
        }));
      }, { language, theme, reading });
      const page = await context.newPage();
      const requests = [], checks = [], failures = [], warnings = [];
      page.on("request", (request) => {
        const url = new URL(request.url());
        if (/\.(?:woff2?|ttf|otf)$/.test(url.pathname)) requests.push(url.href);
        if (/fonts\.(?:googleapis|gstatic)\.com|cdn\.jsdelivr\.net/.test(url.hostname)) failures.push(`External font origin: ${url.hostname}`);
      });
      page.on("console", (message) => {
        if (/preload/i.test(message.text())) warnings.push(message.text());
      });
      page.on("response", (response) => {
        const url = new URL(response.url());
        if (!/\.woff2?$/.test(url.pathname)) return;
        checks.push((async () => {
          assert.equal(url.origin, target.origin, "Font must be same-origin");
          assert.ok(url.pathname.startsWith("/assets/"), "Use the production build, not /src/ development assets");
          assert.equal(response.status(), 200);
          assert.match(response.headers()["content-type"] ?? "", /^font\/woff2?(?:;|$)/);
          const basename = url.pathname.split("/").at(-1);
          const entry = manifest.find(({ file }) => basename === file || basename?.startsWith(`${file.replace(/\.woff2?$/, "")}-`));
          assert.ok(entry, `Unrecognized font artifact: ${basename}`);
          const bytes = await response.body();
          assert.equal(bytes.length, entry.bytes);
          assert.equal(bytes.toString("ascii", 0, 4), entry.file.endsWith("woff2") ? "wOF2" : "wOFF");
          assert.equal(createHash("sha256").update(bytes).digest("hex"), entry.sha);
        })().catch((error) => { failures.push(error.message); }));
      });
      await page.goto(target.href, { waitUntil: "load" });
      await page.locator(".auth-intro").waitFor();
      await page.waitForFunction(({ language, theme, reading }) => {
        const root = document.documentElement;
        return root.lang === language && root.classList.contains("dark") === (theme === "dark")
          && root.dataset.alternateFont === (reading ? "ready" : "off");
      }, { language, theme, reading });
      await page.evaluate(async () => { await document.fonts.ready; });
      const cdp = await context.newCDPSession(page);
      await cdp.send("DOM.enable");
      await cdp.send("CSS.enable");
      const { root } = await cdp.send("DOM.getDocument");
      const observations = [];
      for (const [selector, expected] of [
        [".auth-intro > strong", language === "ar" ? /NotoSansArabic|Noto Sans Arabic/ : reading ? /OpenDyslexic/ : /SourceSans3|Source Sans 3/],
        ["#auth-hero-title .auth-headline-blue", language === "ar" ? /NotoSansArabic|Noto Sans Arabic/ : reading ? /OpenDyslexic/ : /PlusJakartaSans|Plus Jakarta Sans/],
        [".auth-brand-lockup > span:last-child", language === "ar" ? /NotoSansArabic|Noto Sans Arabic/ : /PlusJakartaSans|Plus Jakarta Sans/],
      ]) {
        const { nodeId } = await cdp.send("DOM.querySelector", { nodeId: root.nodeId, selector });
        assert.ok(nodeId, `Missing production consumer: ${selector}`);
        const { fonts } = await cdp.send("CSS.getPlatformFontsForNode", { nodeId });
        assert.ok(fonts.some((font) => font.isCustomFont && font.glyphCount > 0
          && expected.test(`${font.postScriptName} ${font.familyName}`)), `${selector}: ${JSON.stringify(fonts)}`);
        const allowed = language !== "ar" ? expected
          : selector.includes("auth-brand-lockup") ? /NotoSansArabic|Noto Sans Arabic|PlusJakartaSans|Plus Jakarta Sans/
          : reading ? /NotoSansArabic|Noto Sans Arabic|OpenDyslexic/
          : selector.includes("auth-intro") ? /NotoSansArabic|Noto Sans Arabic|SourceSans3|Source Sans 3/
          : /NotoSansArabic|Noto Sans Arabic|PlusJakartaSans|Plus Jakarta Sans/;
        assert.ok(fonts.every((font) => font.isCustomFont && font.glyphCount > 0
          && allowed.test(`${font.postScriptName} ${font.familyName}`)),
        `${selector}: unexpected fallback or competing font: ${JSON.stringify(fonts)}`);
        observations.push({ selector, fonts });
      }
      const urls = await page.evaluate(() => {
        const preload = document.querySelector('link[rel="preload"][as="font"]');
        let cssUrl;
        const visit = (rules, base) => {
          for (const rule of rules) {
            if (rule instanceof CSSFontFaceRule && rule.style.fontFamily.replaceAll('"', "") === "Source Sans 3"
              && rule.style.fontStyle === "normal" && /source-sans-3-latin-wght-normal/.test(rule.style.src)) {
              const source = /url\(["']?([^"')]+)["']?\)/.exec(rule.style.src)?.[1];
              if (source) cssUrl = new URL(source, base).href;
            }
            if ("cssRules" in rule) visit(rule.cssRules, base);
          }
        };
        for (const sheet of document.styleSheets) visit(sheet.cssRules, sheet.href ?? document.baseURI);
        return { preload: preload?.href, css: cssUrl, inlineFamily: document.documentElement.style.fontFamily };
      });
      assert.ok(urls.preload && urls.css, "Missing critical preload or real CSS face");
      assert.equal(urls.preload, urls.css, "Preload and CSS must share the Vite-emitted URL");
      assert.equal(requests.filter((url) => url === urls.preload).length, 1, "No duplicate critical-font fetch");
      assert.equal(urls.inlineFamily, "", "Direction management must not write font-family");
      const optional = requests.filter((url) => /OpenDyslexic-/.test(url));
      assert.equal(optional.length, reading ? 4 : 0, "Reading faces load only when the stored preference requests them");
      assert.equal(new Set(optional).size, optional.length, "No duplicate optional requests");
      await Promise.all(checks);
      assert.deepEqual(failures, []);
      console.log(JSON.stringify({ scope: "production auth consumers; service worker blocked", language, theme, reading,
        criticalFontUrl: urls.preload, fontRequests: requests.length, optionalRequests: optional.length, observations, warnings }));
    } finally {
      await context.close();
    }
  }
} finally {
  await browser.close();
}
