// Production-bundle smoke gate (blank-screen regression guard).
//
// Boots the built dist/ via vite preview and asserts the React app actually
// renders in a headless browser. Dev mode and unit tests never execute the
// chunked production bundle, which is exactly how the 2026-09 blank-screen
// outage (circular manualChunks breaking React module init) reached production
// unnoticed. Run via `npm run smoke:build` AFTER `npm run build` (or in CI
// post-build). Fails (exit 1) when #root is empty or any uncaught page error
// occurs.
import { preview } from "vite";
import { chromium } from "@playwright/test";

const PORT = 4199;
const WAIT_AFTER_LOAD_MS = 3000;

let exitCode = 0;
const server = await preview({
  preview: { port: PORT, strictPort: true },
});

try {
  const base = `http://localhost:${PORT}/`;
  const browser = await chromium.launch();
  const page = await browser.newPage();

  const pageErrors = [];
  const consoleErrors = [];
  page.on("pageerror", (err) => pageErrors.push(err.message));
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });

  await page.goto(base, { waitUntil: "networkidle", timeout: 60_000 });
  await page.waitForTimeout(WAIT_AFTER_LOAD_MS);

  const rootLength = await page.evaluate(() => {
    const root = document.getElementById("root");
    return root ? root.innerHTML.length : -1;
  });
  const title = await page.title();

  if (rootLength <= 0) {
    exitCode = 1;
    console.error(
      `SMOKE FAIL: #root is empty (${rootLength} chars) — the production bundle did not render.`
    );
  } else {
    console.log(
      `SMOKE PASS: #root rendered ${rootLength} chars (title: ${title})`
    );
  }

  if (pageErrors.length > 0) {
    exitCode = 1;
    console.error(
      `SMOKE FAIL: ${pageErrors.length} uncaught page error(s):`
    );
    for (const e of pageErrors.slice(0, 10)) console.error(`  pageerror: ${e}`);
  }

  if (consoleErrors.length > 0) {
    // Console errors are surfaced for diagnosis but only fail the gate when
    // the render assertion above already failed (some libs log benign errors).
    console.log(
      `console.error entries (${consoleErrors.length}):`
    );
    for (const e of consoleErrors.slice(0, 10)) console.log(`  ${e}`);
  }

  await browser.close();
} catch (err) {
  exitCode = 1;
  console.error("SMOKE FAIL (harness error):", err);
} finally {
  await new Promise((resolve) => {
    if (server.httpServer) server.httpServer.close(resolve);
    else resolve(undefined);
  });
  process.exit(exitCode);
}
