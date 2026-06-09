import { readFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { chromium } from "playwright-core";

const SRC = "docs/business/E3-INVESTOR-QA-CHEATSHEET.md";
const OUT = "docs/pdf/business/E3-INVESTOR-QA-CHEATSHEET.pdf";

const md = readFileSync(SRC, "utf8");

// --- minimal, dependency-free markdown -> HTML ---
const esc = (s) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const inline = (s) =>
  esc(s)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[^*])\*(?!\*)(.+?)\*(?!\*)/g, "$1<em>$2</em>")
    .replace(/`([^`]+?)`/g, "<code>$1</code>")
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2">$1</a>');

const lines = md.split(/\r?\n/);
let html = "";
let inList = false;
let inQuote = false;
const closeList = () => {
  if (inList) {
    html += "</ul>";
    inList = false;
  }
};
const closeQuote = () => {
  if (inQuote) {
    html += "</blockquote>";
    inQuote = false;
  }
};

for (const raw of lines) {
  const line = raw.trimEnd();
  if (/^---\s*$/.test(line)) {
    closeList();
    closeQuote();
    html += "<hr/>";
    continue;
  }
  let m;
  if ((m = line.match(/^(#{1,6})\s+(.*)$/))) {
    closeList();
    closeQuote();
    const lvl = m[1].length;
    html += `<h${lvl}>${inline(m[2])}</h${lvl}>`;
    continue;
  }
  if ((m = line.match(/^>\s?(.*)$/))) {
    closeList();
    if (!inQuote) {
      html += "<blockquote>";
      inQuote = true;
    }
    html += `<p>${inline(m[1])}</p>`;
    continue;
  }
  if ((m = line.match(/^[-*]\s+(.*)$/))) {
    closeQuote();
    if (!inList) {
      html += "<ul>";
      inList = true;
    }
    html += `<li>${inline(m[1])}</li>`;
    continue;
  }
  if ((m = line.match(/^\d+\.\s+(.*)$/))) {
    closeQuote();
    if (!inList) {
      html += "<ul>";
      inList = true;
    }
    html += `<li>${inline(m[1])}</li>`;
    continue;
  }
  if (line === "") {
    closeList();
    closeQuote();
    continue;
  }
  closeList();
  closeQuote();
  html += `<p>${inline(line)}</p>`;
}
closeList();
closeQuote();

const doc = `<!DOCTYPE html><html><head><meta charset="utf-8"/>
<style>
@import url('https://fonts.googleapis.com/css2?family=Noto+Sans:wght@400;500;600;700;800;900&display=swap');
:root{--teal:#13BFA6;--blue:#1F6FEB;--navy:#0B1220;--ink:#1A2332;--mute:#6B7280;--border:#E2E8F0;--soft:#F8FAFC;--teal-soft:#ECFDF5;
--grad:linear-gradient(93.65deg,#13BFA6 5%,#1F6FEB 79%);}
*{font-family:'Noto Sans',system-ui,sans-serif;box-sizing:border-box;}
body{color:var(--ink);font-size:10.5px;line-height:1.5;margin:0;}
h1{font-size:21px;font-weight:900;color:var(--navy);margin:0 0 4px;}
h2{font-size:13px;font-weight:800;color:#fff;background:var(--grad);padding:5px 10px;border-radius:6px;margin:16px 0 8px;page-break-after:avoid;}
h3{font-size:11.5px;font-weight:800;color:var(--navy);border-bottom:2px solid var(--teal);display:inline-block;padding-bottom:2px;margin:12px 0 5px;page-break-after:avoid;}
p{margin:4px 0;}
strong{color:var(--navy);}
ul{margin:4px 0;padding-left:16px;}
li{margin-bottom:3px;}
code{background:var(--soft);border:1px solid var(--border);border-radius:3px;padding:0 4px;font-size:9.5px;color:var(--navy);}
hr{border:none;border-top:1px solid var(--border);margin:10px 0;}
blockquote{margin:8px 0;padding:8px 12px;background:var(--teal-soft);border-left:3px solid var(--teal);border-radius:0 6px 6px 0;font-style:italic;color:var(--navy);}
a{color:var(--blue);text-decoration:none;}
h1+p{color:var(--mute);}
</style></head><body>${html}</body></html>`;

mkdirSync(dirname(OUT), { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage();
await page.setContent(doc, { waitUntil: "networkidle" });
await page.pdf({
  path: OUT,
  format: "A4",
  printBackground: true,
  margin: { top: "14mm", bottom: "14mm", left: "12mm", right: "12mm" },
});
await browser.close();
console.log("PDF written:", OUT);
