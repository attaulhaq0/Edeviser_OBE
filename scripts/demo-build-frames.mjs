// Compose branded 1920x1080 frames from the real screenshots + captions,
// then render each to PNG with Playwright. These frames become the video.
import { chromium } from "playwright-core";
import { readFileSync, mkdirSync, existsSync } from "node:fs";

const SHOTS = "docs/demo-capture/screens";
const FRAMES = "docs/demo-capture/frames";
const LOGO = "public/edeviser-logo-final.png";
mkdirSync(FRAMES, { recursive: true });

const dataUri = (p) =>
  existsSync(p) ? `data:image/png;base64,${readFileSync(p).toString("base64")}` : "";

const logo = dataUri(LOGO);

// scene id, screenshot file (or null for title/end), kicker, caption
const SCENES = [
  { id: "00-title", shot: null, kind: "title", kicker: "Live Product Demo",
    title: "A Real Day Inside E Deviser",
    caption: "Real product · Real school data · Gulf Academy (Grade 7)" },
  { id: "01-student", shot: "student-01-dashboard.png", kicker: "The Student",
    title: "A student's day, organized",
    caption: "Yusuf opens E Deviser to a clear starting point — courses, deadlines, and progress in one view." },
  { id: "02-student", shot: "student-03-habits-clos.png", kicker: "The Student",
    title: "The next right step — and a daily habit",
    caption: "The product points to the skill that needs work and tracks the daily habits that build consistency." },
  { id: "03-tutor", shot: "student-04-tutor.png", kicker: "The AI Professor",
    title: "Personal support, the moment it's needed",
    caption: "The AI Professor coaches students through problems step by step — guidance, not just answers." },
  { id: "04-teacher", shot: "teacher-01-dashboard.png", kicker: "The Teacher",
    title: "The whole class, in real time",
    caption: "Mr. Anderson's Math 7 — live CLO attainment and Bloom's distribution across real students." },
  { id: "05-teacher", shot: "teacher-03-atrisk.png", kicker: "The Teacher",
    title: "See who's slipping — act in one click",
    caption: "At-risk students surface early, with a one-click nudge — before a quiet week becomes a failed term." },
  { id: "06-admin", shot: "admin-01-dashboard.png", kicker: "The School",
    title: "A live picture of the whole school",
    caption: "Gulf Academy at a glance — 51 users, 3 courses, real outcomes, generated automatically." },
  { id: "07-end", shot: null, kind: "end", kicker: "One Connected System",
    title: "Student. Teacher. School.",
    caption: "One connected system — real, live, working today." },
];

const frameHtml = (s) => {
  const isCard = s.kind === "title" || s.kind === "end";
  const shotUri = s.shot ? dataUri(`${SHOTS}/${s.shot}`) : "";
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/>
<style>
@import url('https://fonts.googleapis.com/css2?family=Noto+Sans:wght@400;500;600;700;800;900&display=swap');
*{margin:0;box-sizing:border-box;font-family:'Noto Sans',sans-serif;}
html,body{width:1920px;height:1080px;overflow:hidden;}
.stage{width:1920px;height:1080px;position:relative;
  background:linear-gradient(135deg,#0B1220 0%,#10243f 45%,#143a63 75%,#0E5C6e 100%);}
.glow1{position:absolute;top:-200px;right:-150px;width:700px;height:700px;border-radius:50%;
  background:radial-gradient(circle,rgba(19,191,166,.20),transparent 65%);}
.glow2{position:absolute;bottom:-250px;left:-150px;width:760px;height:760px;border-radius:50%;
  background:radial-gradient(circle,rgba(31,111,235,.20),transparent 65%);}
.logo{position:absolute;top:54px;left:64px;height:46px;}
.kick{position:absolute;top:64px;right:64px;font-size:17px;font-weight:800;letter-spacing:4px;
  text-transform:uppercase;color:#5fe3cf;}
/* content frame */
.wrap{position:absolute;inset:0;display:flex;flex-direction:column;justify-content:center;padding:0 90px;}
.title{color:#fff;font-weight:900;font-size:52px;line-height:1.08;letter-spacing:-.5px;margin-bottom:14px;max-width:1100px;}
.cap{color:rgba(255,255,255,.82);font-size:23px;font-weight:500;line-height:1.5;max-width:1000px;}
.bar{width:88px;height:6px;border-radius:3px;background:linear-gradient(90deg,#13BFA6,#1F6FEB);margin:22px 0;}
/* screenshot composition */
.shotwrap{position:absolute;top:230px;left:760px;right:70px;bottom:90px;
  border-radius:16px;overflow:hidden;box-shadow:0 30px 80px rgba(0,0,0,.55);
  border:1px solid rgba(255,255,255,.12);background:#0b1220;}
.browserbar{height:34px;background:#0f172a;display:flex;align-items:center;gap:8px;padding:0 14px;}
.dot{width:11px;height:11px;border-radius:50%;}
.urlbar{margin-left:14px;height:18px;flex:1;background:#1e293b;border-radius:9px;}
.shot{width:100%;height:calc(100% - 34px);object-fit:cover;object-position:top center;}
.textcol{position:absolute;top:0;left:0;width:760px;height:1080px;display:flex;flex-direction:column;justify-content:center;padding:0 0 0 90px;}
/* title/end card centered */
.card{position:absolute;inset:0;display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;padding:0 120px;}
.card .title{font-size:74px;max-width:1400px;}
.card .cap{font-size:28px;max-width:1100px;}
.card .biglogo{height:84px;margin-bottom:40px;}
.tagline{position:absolute;bottom:60px;width:100%;text-align:center;color:rgba(255,255,255,.55);font-size:18px;font-weight:600;letter-spacing:2px;text-transform:uppercase;}
</style></head><body>
<div class="stage">
  <div class="glow1"></div><div class="glow2"></div>
  ${logo ? `<img class="logo" src="${logo}"/>` : ""}
  <div class="kick">${s.kicker}</div>
  ${isCard ? `
    <div class="card">
      ${s.kind === "end" && logo ? `<img class="biglogo" src="${logo}"/>` : ""}
      <div class="title">${s.title}</div>
      <div class="bar" style="margin:26px auto;"></div>
      <div class="cap">${s.caption}</div>
    </div>
    <div class="tagline">E Deviser — built in Qatar, for how the region learns</div>
  ` : `
    <div class="textcol">
      <div class="title">${s.title}</div>
      <div class="bar"></div>
      <div class="cap">${s.caption}</div>
    </div>
    <div class="shotwrap">
      <div class="browserbar">
        <div class="dot" style="background:#ff5f57"></div>
        <div class="dot" style="background:#febc2e"></div>
        <div class="dot" style="background:#28c840"></div>
        <div class="urlbar"></div>
      </div>
      <img class="shot" src="${shotUri}"/>
    </div>
  `}
</div></body></html>`;
};

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
for (const s of SCENES) {
  await page.setContent(frameHtml(s), { waitUntil: "networkidle" });
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${FRAMES}/${s.id}.png` });
  console.log("  frame:", s.id);
}
await browser.close();
console.log("Frames written to", FRAMES);
