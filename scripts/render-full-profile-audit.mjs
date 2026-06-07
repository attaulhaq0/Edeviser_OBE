// Render the Full-Profile Audit HTML to a self-contained PDF using the same
// playwright-core/chromium approach as the business-plan/storyboard renderers.
import { readFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname } from "node:path";
import { chromium } from "playwright-core";

const htmlPath = "docs/audit/EDEVISER-FULL-PROFILE-AUDIT-2026-06.html";
const outPath = "docs/audit/EDEVISER-FULL-PROFILE-AUDIT-2026-06.pdf";

if (!existsSync(htmlPath)) {
  console.error("HTML source not found:", htmlPath);
  process.exit(1);
}
mkdirSync(dirname(outPath), { recursive: true });

// Inline logo + character art as data URIs so the PDF is fully self-contained.
function dataUri(path, mime) {
  if (!existsSync(path)) {
    console.warn("asset missing, skipping:", path);
    return "";
  }
  return `data:${mime};base64,${readFileSync(path).toString("base64")}`;
}

const assets = {
  __LOGO_URI__: dataUri("public/edeviser-logo-final.png", "image/png"),
  // Cover ensemble — hero centre, two flanking, two far. Background-removed cutouts.
  __CHAR_HERO__: dataUri("docs/characters/_cover/foxi-magical.png", "image/png"),
  __CHAR_SIDE_L__: dataUri("docs/characters/_cover/foxi-smiling.png", "image/png"),
  __CHAR_SIDE_R__: dataUri("docs/characters/_cover/foxi-glowing-coin.png", "image/png"),
  __CHAR_FAR_L__: dataUri("docs/characters/_cover/foxi-studious.png", "image/png"),
  __CHAR_FAR_R__: dataUri("docs/characters/_cover/foxi-smart.png", "image/png"),
};

let html = readFileSync(htmlPath, "utf8");
for (const [token, uri] of Object.entries(assets)) {
  html = html.split(token).join(uri);
}

const browser = await chromium.launch();
const page = await browser.newPage();
await page.setContent(html, { waitUntil: "networkidle" });
// Give the web font a moment to load.
await page.waitForTimeout(1500);

await page.pdf({
  path: outPath,
  format: "A4",
  printBackground: true,
  margin: { top: "16mm", bottom: "16mm", left: "14mm", right: "14mm" },
  displayHeaderFooter: true,
  headerTemplate:
    '<div style="width:100%;font-size:7px;color:#94A3B8;padding:0 14mm;display:flex;justify-content:space-between;font-family:sans-serif;"><span>Edeviser — Full-Profile Audit &amp; Remediation Plan</span><span>Confidential — Internal</span></div>',
  footerTemplate:
    '<div style="width:100%;font-size:7px;color:#94A3B8;padding:0 14mm;display:flex;justify-content:space-between;font-family:sans-serif;"><span>© 2026 E Deviser</span><span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span></div>',
});

await browser.close();
console.log("PDF written to", outPath);
