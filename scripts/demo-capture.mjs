// =============================================================================
// E Deviser — automated demo capture (real data, live app)
// Logs in as real Gulf Academy demo accounts, navigates the exact demo routes,
// and captures: (a) high-res screenshots, (b) per-scene screen-recording clips.
//
//   node scripts/demo-capture.mjs
//
// Output:
//   docs/demo-capture/screens/*.png   — stills for deck / application
//   docs/demo-capture/clips/<scene>/*.webm — one clip per scene
// =============================================================================

import { chromium } from "playwright-core";
import { mkdirSync, renameSync, readdirSync, rmSync, existsSync } from "node:fs";

const APP = "https://e-deviser.vercel.app";
const PASSWORD = "DemoQatar2026!";
const OUT = "docs/demo-capture";
const SHOTS = `${OUT}/screens`;
const CLIPS = `${OUT}/clips`;
const VIEWPORT = { width: 1440, height: 900 };

const ACCOUNTS = {
  student: "student01@gulf-academy.test", // Yusuf Ahmadi, 7A
  teacher: "anderson@gulf-academy.test", // Mr. Omar Anderson, Math 7
  admin: "principal@gulf-academy.test", // Dr. Aisha Al-Mansoori, Principal
};

mkdirSync(SHOTS, { recursive: true });
if (existsSync(CLIPS)) rmSync(CLIPS, { recursive: true, force: true });
mkdirSync(CLIPS, { recursive: true });

// Hide scrollbars + freeze caret for clean capture.
const CLEAN_CSS = `*{scrollbar-width:none!important}*::-webkit-scrollbar{display:none!important}`;

async function login(page, email) {
  await page.goto(`${APP}/login`, { waitUntil: "networkidle" });
  await page.waitForSelector("#login-email", { timeout: 20000 });
  await page.fill("#login-email", email);
  await page.fill("#login-password", PASSWORD);
  await page.click('button[type="submit"]');
  // Wait for the client-side redirect off /login (profile fetch ~6-8s).
  await page.waitForURL((url) => !url.pathname.endsWith("/login"), {
    timeout: 30000,
  });
  await page.waitForLoadState("networkidle");
  await page.addStyleTag({ content: CLEAN_CSS });
  await page.waitForTimeout(2500); // let data + animations settle
}

async function goto(page, path) {
  await page.goto(`${APP}${path}`, { waitUntil: "networkidle" });
  await page.addStyleTag({ content: CLEAN_CSS });
  await page.waitForTimeout(3500);
}

async function shot(page, name) {
  await page.screenshot({ path: `${SHOTS}/${name}.png` });
  console.log("   screenshot:", name);
}

// Smooth, slow scroll to make the clip feel produced rather than jumpy.
async function slowScroll(page, totalMs = 4000) {
  await page.evaluate(async (ms) => {
    const max = Math.max(
      document.body.scrollHeight - window.innerHeight,
      0
    );
    if (max <= 0) {
      await new Promise((r) => setTimeout(r, ms));
      return;
    }
    const steps = 60;
    for (let i = 0; i <= steps; i++) {
      window.scrollTo(0, (max * i) / steps);
      await new Promise((r) => setTimeout(r, ms / steps));
    }
    await new Promise((r) => setTimeout(r, 400));
    window.scrollTo(0, 0);
  }, totalMs);
}

// Run one role inside its own recorded context; move the resulting webm
// into clips/<scene>/.
async function recordScene(browser, scene, email, fn) {
  const context = await browser.newContext({
    viewport: VIEWPORT,
    recordVideo: { dir: `${CLIPS}/${scene}`, size: VIEWPORT },
    deviceScaleFactor: 2, // crisp screenshots
  });
  const page = await context.newPage();
  try {
    console.log(`\n[${scene}] ${email}`);
    await login(page, email);
    await fn(page);
  } catch (err) {
    console.error(`   ! ${scene} error:`, err.message);
    await shot(page, `${scene}-ERROR`).catch(() => {});
  } finally {
    await page.close();
    await context.close();
  }
}

const browser = await chromium.launch();

// ── Scenes 1–2: Student dashboard (real Yusuf data) ──
await recordScene(browser, "scene1-2-student", ACCOUNTS.student, async (page) => {
  await shot(page, "student-01-dashboard");
  await slowScroll(page, 6000);
  await shot(page, "student-02-progress");
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(2000);
  await shot(page, "student-03-habits-clos");
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(1500);
});

// ── Scene 3: AI Professor (tutor) ──
await recordScene(browser, "scene3-tutor", ACCOUNTS.student, async (page) => {
  await goto(page, "/student/tutor");
  await shot(page, "student-04-tutor");
  await page.waitForTimeout(3000);
});

// ── Scene 4: Teacher dashboard (real Math 7 data) ──
await recordScene(browser, "scene4-teacher", ACCOUNTS.teacher, async (page) => {
  await shot(page, "teacher-01-dashboard");
  await slowScroll(page, 7000);
  await shot(page, "teacher-02-charts");
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(2000);
  await shot(page, "teacher-03-atrisk");
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(1500);
});

// ── Scene 5: Principal / admin dashboard (whole-school real data) ──
await recordScene(browser, "scene5-admin", ACCOUNTS.admin, async (page) => {
  await shot(page, "admin-01-dashboard");
  await slowScroll(page, 6000);
  await shot(page, "admin-02-content");
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(1500);
});

await browser.close();

// Rename the random webm filenames to scene-friendly names.
for (const scene of readdirSync(CLIPS)) {
  const dir = `${CLIPS}/${scene}`;
  const files = readdirSync(dir).filter((f) => f.endsWith(".webm"));
  files.forEach((f, i) => {
    const target = `${dir}/${scene}${files.length > 1 ? `-${i + 1}` : ""}.webm`;
    renameSync(`${dir}/${f}`, target);
  });
}

console.log("\nDone.");
console.log("  Screenshots:", SHOTS);
console.log("  Clips:", CLIPS);
