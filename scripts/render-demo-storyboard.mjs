import { readFileSync, existsSync } from "node:fs";
import { chromium } from "playwright-core";

const htmlPath = "docs/business/EDEVISER-DEMO-STORYBOARD.html";
const logoPath = "public/edeviser-logo-final.png";
const outPath = "docs/pdf/business/EDEVISER-DEMO-STORYBOARD.pdf";

let html = readFileSync(htmlPath, "utf8");
if (existsSync(logoPath)) {
  const b64 = readFileSync(logoPath).toString("base64");
  html = html.replace("__LOGO_DATA_URI__", `data:image/png;base64,${b64}`);
} else {
  html = html.replace("__LOGO_DATA_URI__", "");
}

const browser = await chromium.launch();
const page = await browser.newPage();
await page.setContent(html, { waitUntil: "networkidle" });
await page.waitForTimeout(1200);

await page.pdf({
  path: outPath,
  format: "A4",
  printBackground: true,
  margin: { top: "16mm", bottom: "18mm", left: "14mm", right: "14mm" },
  displayHeaderFooter: true,
  headerTemplate:
    '<div style="width:100%;font-size:7px;color:#94A3B8;padding:0 14mm;display:flex;justify-content:space-between;font-family:sans-serif;"><span>E Deviser — Accelerator Demo Storyboard</span><span>Confidential</span></div>',
  footerTemplate:
    '<div style="width:100%;font-size:7px;color:#94A3B8;padding:0 14mm;display:flex;justify-content:space-between;font-family:sans-serif;"><span>© 2026 E Deviser. All rights reserved.</span><span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span></div>',
});

await browser.close();
console.log("PDF written to", outPath);
