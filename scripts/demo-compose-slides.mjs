// Compose branded 1920x1080 slides (real screenshot + title + caption) as PNGs
// using Playwright/Chromium — fonts and brand styling are perfect, no ffmpeg drawtext.
//
// Usage: node scripts/demo-compose-slides.mjs
// Output: docs/demo-capture/slides/slide-NN.png

import { chromium } from "playwright-core";
import { readFileSync, mkdirSync } from "node:fs";

const SHOTS = "docs/demo-capture/screens";
const OUT = "docs/demo-capture/slides";
mkdirSync(OUT, { recursive: true });

const dataUri = (f) =>
  `data:image/png;base64,${readFileSync(`${SHOTS}/${f}`).toString("base64")}`;
const logoUri = `data:image/png;base64,${readFileSync("public/edeviser-logo-final.png").toString("base64")}`;

// scene = { file?, kind, eyebrow, title, caption }
const scenes = [
  { kind: "title", eyebrow: "Live Product · Real Data", title: "A Real Day Inside E Deviser", caption: "Gulf Academy of Excellence · Grade 7 · real students, teachers, and outcomes" },
  { file: "student-01-dashboard.png", eyebrow: "Scene 1 · Student", title: "A student's day, organized", caption: "Yusuf Ahmadi, Grade 7 — real progress, deadlines, and streak on one screen" },
  { file: "student-03-habits-clos.png", eyebrow: "Scene 2 · Student", title: "The next right step", caption: "E Deviser points to the exact skill to work on — and offers help, right there" },
  { file: "teacher-01-dashboard.png", eyebrow: "Scene 3 · Teacher", title: "The teacher sees everything", caption: "Mr. Omar Anderson, Math 7 — every student's progress and outcomes, in real time" },
  { file: "teacher-03-atrisk.png", eyebrow: "Scene 4 · Teacher", title: "Act before it's too late", caption: "At-risk students surface early — one click sends a nudge" },
  { file: "admin-01-dashboard.png", eyebrow: "Scene 5 · School", title: "The school's real picture", caption: "Dr. Aisha Al-Mansoori, Principal — live outcomes across the whole school" },
  { kind: "end", eyebrow: "One connected system", title: "E Deviser", caption: "One student. One teacher. One school. Built in Qatar for the GCC." },
];

const slideHtml = (s) => {
  const isCard = s.kind === "title" || s.kind === "end";
  const shot = s.file ? dataUri(s.file) : null;
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/>
<style>
@import url('https://fonts.googleapis.com/css2?family=Noto+Sans:wght@400;500;700;800;900&display=swap');
*{margin:0;box-sizing:border-box;font-family:'Noto Sans',sans-serif;}
html,body{width:1920px;height:1080px;overflow:hidden;}
.stage{width:1920px;height:1080px;position:relative;
  background:radial-gradient(ellipse at 25% 15%,rgba(19,191,166,.10),transparent 55%),
             radial-gradient(ellipse at 80% 90%,rgba(31,111,235,.10),transparent 55%),
             linear-gradient(135deg,#0B1220 0%,#0f2238 55%,#10283f 100%);
  display:flex;align-items:center;justify-content:center;}
/* screenshot scenes */
.frame{width:1500px;border-radius:18px;overflow:hidden;box-shadow:0 40px 120px rgba(0,0,0,.55);
  border:1px solid rgba(255,255,255,.10);background:#0b1220;position:absolute;top:120px;left:210px;}
.bar{height:46px;background:#0d1626;display:flex;align-items:center;gap:9px;padding:0 18px;}
.dot{width:13px;height:13px;border-radius:50%;}
.bar img{height:20px;margin-left:14px;}
.frame .shot{width:100%;display:block;}
.lower{position:absolute;left:120px;right:120px;bottom:70px;}
.eyebrow{display:inline-block;background:linear-gradient(93deg,#13BFA6,#1F6FEB);color:#fff;
  font-size:22px;font-weight:800;letter-spacing:4px;text-transform:uppercase;padding:8px 22px;border-radius:30px;margin-bottom:18px;}
.title{color:#fff;font-size:62px;font-weight:900;line-height:1.05;text-shadow:0 2px 20px rgba(0,0,0,.5);}
.caption{color:rgba(255,255,255,.82);font-size:30px;font-weight:500;margin-top:14px;max-width:1500px;}
/* title/end cards */
.card{text-align:center;padding:0 140px;}
.card img.logo{width:340px;margin-bottom:40px;}
.card .eyebrow{font-size:24px;}
.card .title{font-size:92px;background:linear-gradient(93deg,#5eead4,#60a5fa);-webkit-background-clip:text;-webkit-text-fill-color:transparent;}
.card .caption{font-size:34px;margin:26px auto 0;}
.accent{position:absolute;bottom:0;left:0;right:0;height:10px;background:linear-gradient(93deg,#13BFA6,#1F6FEB);}
</style></head><body>
<div class="stage">
${isCard ? `
  <div class="card">
    ${s.kind === "end" ? `<img class="logo" src="${logoUri}"/>` : ""}
    <div class="eyebrow">${s.eyebrow}</div>
    <div class="title">${s.title}</div>
    <div class="caption">${s.caption}</div>
  </div>
` : `
  <div class="frame">
    <div class="bar"><span class="dot" style="background:#ff5f57"></span><span class="dot" style="background:#febc2e"></span><span class="dot" style="background:#28c840"></span><img src="${logoUri}"/></div>
    <img class="shot" src="${shot}"/>
  </div>
  <div class="lower">
    <div class="eyebrow">${s.eyebrow}</div>
    <div class="title">${s.title}</div>
    <div class="caption">${s.caption}</div>
  </div>
`}
  <div class="accent"></div>
</div></body></html>`;
};

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
for (let i = 0; i < scenes.length; i++) {
  await page.setContent(slideHtml(scenes[i]), { waitUntil: "networkidle" });
  await page.waitForTimeout(500);
  const name = `slide-${String(i).padStart(2, "0")}.png`;
  await page.screenshot({ path: `${OUT}/${name}`, clip: { x: 0, y: 0, width: 1920, height: 1080 } });
  console.log("  ✔ composed", name);
}
await browser.close();
console.log("\nDone. Slides in", OUT);
