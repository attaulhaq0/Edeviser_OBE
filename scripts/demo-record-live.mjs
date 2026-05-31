// =============================================================================
// E Deviser — LIVE interaction recorder (v2)
// Dismisses the onboarding tour, then records real interactions with a visible
// cursor on the DATA-RICH screens: teacher analytics, admin KPIs, and the AI
// tutor (persona + typed question). Output: WebM clips per scene.
// =============================================================================

import { chromium } from "playwright-core";
import { mkdirSync, rmSync, existsSync, readdirSync, renameSync } from "node:fs";

const APP = "https://e-deviser.vercel.app";
const PW = "DemoQatar2026!";
const LIVE = "docs/demo-capture/live";
const VIEWPORT = { width: 1920, height: 1080 };
const TUTOR_CONV = "89b580da-a68b-46ff-aa4e-ba0919c71400";

const ACC = {
  student: "student01@gulf-academy.test",
  teacher: "anderson@gulf-academy.test",
  admin: "principal@gulf-academy.test",
};

if (existsSync(LIVE)) rmSync(LIVE, { recursive: true, force: true });
mkdirSync(LIVE, { recursive: true });

const CURSOR_JS = `
(() => {
  if (window.__edCursor) return;
  const c = document.createElement('div');
  c.style.cssText='position:fixed;top:0;left:0;width:28px;height:28px;z-index:2147483647;pointer-events:none;will-change:transform;filter:drop-shadow(0 2px 5px rgba(0,0,0,.5))';
  c.innerHTML='<svg width="28" height="28" viewBox="0 0 24 24" fill="none"><path d="M5 3l14 7-6 2-2 6-6-15z" fill="#0B1220" stroke="#fff" stroke-width="1.5" stroke-linejoin="round"/></svg>';
  document.documentElement.appendChild(c);
  window.__edCursor=c;
  const move=(x,y)=>{c.style.transform='translate('+x+'px,'+y+'px)';};
  window.__edMoveCursor=move;
  document.addEventListener('mousemove',e=>move(e.clientX,e.clientY),true);
  window.__edRipple=(x,y)=>{const r=document.createElement('div');r.style.cssText='position:fixed;z-index:2147483646;pointer-events:none;border-radius:50%;left:'+(x-7)+'px;top:'+(y-7)+'px;width:14px;height:14px;background:rgba(31,111,235,.4);border:2px solid #13BFA6';document.documentElement.appendChild(r);r.animate([{transform:'scale(1)',opacity:1},{transform:'scale(4)',opacity:0}],{duration:600,easing:'ease-out'}).onfinish=()=>r.remove();};
})();`;

let cur = { x: 960, y: 540 };
const clean = "*{scrollbar-width:none!important}*::-webkit-scrollbar{display:none!important}";

async function inject(page) {
  try { await page.evaluate(CURSOR_JS); } catch {}
  try { await page.addStyleTag({ content: clean }); } catch {}
}
async function moveTo(page, x, y, ms = 700) {
  const steps = Math.max(14, Math.round(ms / 16)), sx = cur.x, sy = cur.y;
  for (let i = 1; i <= steps; i++) {
    const t = i / steps, e = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
    await page.mouse.move(Math.round(sx + (x - sx) * e), Math.round(sy + (y - sy) * e));
    await page.waitForTimeout(ms / steps);
  }
  cur = { x, y };
}
async function clickAt(page, x, y) {
  await moveTo(page, x, y, 600);
  await page.evaluate(([x, y]) => window.__edRipple && window.__edRipple(x, y), [x, y]).catch(() => {});
  await page.mouse.click(x, y);
  await page.waitForTimeout(450);
}
async function scroll(page, px, ms = 2600) {
  const steps = Math.max(24, Math.round(ms / 40));
  for (let i = 0; i < steps; i++) { await page.mouse.wheel(0, px / steps); await page.waitForTimeout(ms / steps); }
}
async function dismissTour(page) {
  for (let i = 0; i < 6; i++) {
    const skip = page.getByRole("button", { name: /skip tour/i }).first();
    if (await skip.isVisible().catch(() => false)) { await skip.click().catch(() => {}); await page.waitForTimeout(700); }
    else break;
  }
}
async function login(page, email) {
  await page.addInitScript(CURSOR_JS);
  await page.goto(`${APP}/login`, { waitUntil: "networkidle" });
  await inject(page);
  await page.fill("#login-email", email);
  await page.fill("#login-password", PW);
  await page.click('button[type="submit"]');
  await page.waitForURL((u) => !u.pathname.endsWith("/login"), { timeout: 30000 });
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(2500);
  await dismissTour(page);
  await inject(page);
  await page.waitForTimeout(1500);
  cur = { x: 960, y: 540 };
}
async function gotoClean(page, path, ms = 3500) {
  await page.goto(`${APP}${path}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);
  await dismissTour(page);
  await inject(page);
  await page.waitForTimeout(ms);
}
async function recordScene(browser, scene, email, fn) {
  const ctx = await browser.newContext({
    viewport: VIEWPORT,
    recordVideo: { dir: `${LIVE}/${scene}`, size: VIEWPORT },
  });
  const page = await ctx.newPage();
  try { console.log(`\n[${scene}]`); await login(page, email); await fn(page); await page.waitForTimeout(700); }
  catch (e) { console.error(`  ! ${scene}:`, e.message); }
  finally { await page.close(); await ctx.close(); }
  const dir = `${LIVE}/${scene}`;
  for (const f of readdirSync(dir).filter((f) => f.endsWith(".webm"))) renameSync(`${dir}/${f}`, `${LIVE}/${scene}.webm`);
  rmSync(dir, { recursive: true, force: true });
  console.log(`  ✔ ${scene}.webm`);
}

const browser = await chromium.launch();

// Scene 1 — Teacher analytics (data-rich charts).
await recordScene(browser, "1-teacher", ACC.teacher, async (page) => {
  await page.waitForTimeout(1200);
  await moveTo(page, 760, 360, 800);
  await page.waitForTimeout(1000);
  await scroll(page, 480, 2600);  // CLO attainment + Bloom's
  await page.waitForTimeout(1400);
  await scroll(page, 520, 2600);  // heatmap
  await page.waitForTimeout(1400);
  await scroll(page, 520, 2600);  // at-risk + grading queue
  await page.waitForTimeout(1400);
});

// Scene 2 — AI Tutor: open the seeded conversation, show persona + type a question.
await recordScene(browser, "2-tutor", ACC.student, async (page) => {
  await gotoClean(page, `/student/tutor/${TUTOR_CONV}`, 3000);
  const input = page.getByPlaceholder(/ask a question/i).first();
  if (await input.isVisible().catch(() => false)) {
    const ib = await input.boundingBox();
    if (ib) await moveTo(page, ib.x + 220, ib.y + 18, 800);
    await input.click().catch(() => {});
    await page.waitForTimeout(400);
    const q = "Explain how to find the area of a triangle, step by step.";
    for (const ch of q) { await page.keyboard.type(ch); await page.waitForTimeout(30 + Math.random() * 45); }
    await page.waitForTimeout(900);
    const send = page.getByLabel("Send message");
    const sb = await send.boundingBox().catch(() => null);
    if (sb) await moveTo(page, sb.x + sb.width / 2, sb.y + sb.height / 2, 600);
    // Hover the send button (don't rely on a backend reply); hold to show intent.
    await page.waitForTimeout(2500);
  } else {
    // Fallback: just show the tutor entry / persona screen.
    await page.waitForTimeout(4000);
  }
});

// Scene 3 — Admin school overview (KPIs).
await recordScene(browser, "3-admin", ACC.admin, async (page) => {
  await page.waitForTimeout(1200);
  await moveTo(page, 640, 340, 800);
  await page.waitForTimeout(1200);
  await scroll(page, 430, 2400);
  await page.waitForTimeout(1300);
  await scroll(page, 430, 2400);
  await page.waitForTimeout(1300);
});

await browser.close();
console.log("\nDone. Clips in", LIVE);
