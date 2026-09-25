import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { mkdtemp, mkdir, readFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { extname, join, resolve, sep } from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { build, normalizePath } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { chromium, expect } from "@playwright/test";

// Real component, CSS and i18n; only useAuth/useFriends hooks mocked.
const repository = fileURLToPath(new URL("../../", import.meta.url));
const require = createRequire(import.meta.url);
const entry = `import React from 'react'; import { createRoot } from 'react-dom/client'; import '@/index.css'; import '@/lib/i18n'; import StudentFriendsPage from '@/features/student/friends/StudentFriendsPage'; createRoot(document.getElementById('root')).render(<main className="min-h-screen bg-background p-4"><StudentFriendsPage /></main>);`;
const hooks = `const base={avatar_url:null,xp_total:42,level:2,streak_current:0,online:true};
const friends=[{...base,student_id:'recent',full_name:'Recent Test Friend',last_seen_at:new Date(Date.now()-60000).toISOString()},{...base,student_id:'missing',full_name:'Missing Timestamp Friend',last_seen_at:null},{...base,student_id:'future',full_name:'Future Timestamp Friend',last_seen_at:new Date(Date.now()+3600000).toISOString()}];
export const useFriends=()=>({data:friends,isPending:false}); export const useFriendRequests=()=>({data:[],isPending:false}); export const useClassmateSearch=()=>({data:[],isPending:false}); const mutation=()=>({mutate:()=>{},isPending:false}); export const useSendFriendRequest=mutation,useRespondFriendRequest=mutation,useRemoveFriend=mutation;`;
async function fixture(directory) {
  const root = join(directory, "fixture"),
    out = join(directory, "dist");
  await mkdir(root, { recursive: true });
  await writeFile(join(root, "entry.jsx"), entry);
  await writeFile(join(root, "friends.mjs"), hooks);
  await writeFile(
    join(root, "auth.mjs"),
    "export const useAuth=()=>({user:{id:'fixture-student'},role:'student'});"
  );
  await writeFile(
    join(root, "index.html"),
    '<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="root"></div><script type="module" src="/entry.jsx"></script></body></html>'
  );
  const sourceScope = {
    name: "friends-source-scope",
    enforce: "pre",
    transform(code, id) {
      if (
        normalizePath(id.split("?")[0]) ===
        normalizePath(join(repository, "src/index.css"))
      )
        return (
          code +
          `\n@source ${JSON.stringify(
            normalizePath(join(repository, "src"))
          )};\n`
        );
    },
  };
  const alias = [
    { find: /^@\/hooks\/useAuth$/, replacement: join(root, "auth.mjs") },
    { find: /^@\/hooks\/useFriends$/, replacement: join(root, "friends.mjs") },
    ...[
      "react",
      "react/jsx-runtime",
      "react/jsx-dev-runtime",
      "react-dom",
      "react-dom/client",
      "react-i18next",
      "i18next",
    ].map((name) => ({
      find: new RegExp("^" + name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "$"),
      replacement: require.resolve(name),
    })),
    { find: "@", replacement: join(repository, "src") },
  ];
  await build({
    root,
    configFile: false,
    envDir: join(root, "env"),
    publicDir: false,
    cacheDir: join(directory, "cache"),
    plugins: [react(), sourceScope, tailwindcss()],
    resolve: { alias, dedupe: ["react", "react-dom"] },
    build: { outDir: out, emptyOutDir: true, chunkSizeWarningLimit: 4000 },
    define: {
      "process.env.NODE_ENV": JSON.stringify("production"),
      "import.meta.env.VITE_SUPABASE_URL": JSON.stringify(
        "http://127.0.0.1:54321"
      ),
      "import.meta.env.VITE_SUPABASE_ANON_KEY": JSON.stringify(
        "fake-friends-fixture-key"
      ),
    },
  });
  const mime = {
    ".html": "text/html",
    ".js": "application/javascript",
    ".css": "text/css",
    ".woff": "font/woff",
    ".woff2": "font/woff2",
    ".svg": "image/svg+xml",
  };
  const server = createServer(async (req, res) => {
    try {
      const path = new URL(req.url, "http://fixture").pathname;
      const file = resolve(
        out,
        "." + decodeURIComponent(path === "/" ? "/index.html" : path)
      );
      if (!file.startsWith(out + sep)) throw Error("Unsafe fixture path");
      const bytes = await readFile(file);
      res.setHeader(
        "Content-Type",
        mime[extname(file)] ?? "application/octet-stream"
      );
      res.setHeader("Cache-Control", "no-store");
      res.end(bytes);
    } catch (error) {
      res.statusCode = 404;
      res.end(String(error));
    }
  });
  await new Promise((done) => server.listen(0, "127.0.0.1", done));
  return {
    url: `http://127.0.0.1:${server.address().port}`,
    close: () => new Promise((done) => server.close(done)),
  };
}
function channels(value) {
  const match = value.match(/^rgba?\(([^)]+)\)$/);
  assert(match, `Unsupported computed color: ${value}`);
  const parts = match[1]
    .replaceAll(",", " ")
    .replaceAll("/", " ")
    .split(/\s+/)
    .filter(Boolean)
    .map(Number);
  assert(
    parts.length >= 3 && parts.slice(0, 3).every(Number.isFinite),
    `Invalid color: ${value}`
  );
  return [...parts.slice(0, 3), parts[3] ?? 1];
}
function blend(a, b) {
  const t = a[3] + b[3] * (1 - a[3]);
  return [0, 1, 2]
    .map((i) => (a[i] * a[3] + b[i] * b[3] * (1 - a[3])) / t)
    .concat(t);
}
function backing(layers) {
  return [...layers]
    .reverse()
    .reduce(
      (color, layer) => blend(channels(layer), color),
      [255, 255, 255, 1]
    );
}
function luminance(rgb) {
  return [0, 1, 2].reduce((sum, i) => {
    const c = rgb[i] / 255;
    return (
      sum +
      (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4) *
        [0.2126, 0.7152, 0.0722][i]
    );
  }, 0);
}
function contrast(a, b) {
  const x = luminance(a),
    y = luminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}
async function inspectDot(locator, label) {
  const paint = await locator.evaluate((node) => {
    const css = getComputedStyle(node),
      layers = [];
    for (let p = node.parentElement; p; p = p.parentElement)
      layers.push(getComputedStyle(p).backgroundColor);
    const rect = node.getBoundingClientRect();
    return {
      dot: css.backgroundColor,
      ring: css.borderTopColor,
      ringStyle: css.borderTopStyle,
      ringWidth: parseFloat(css.borderTopWidth),
      radius: css.borderRadius,
      width: rect.width,
      height: rect.height,
      layers,
    };
  });
  assert(
    paint.width > 0 && paint.height > 0 && parseFloat(paint.radius) > 0,
    `${label}: invisible dot`
  );
  const back = backing(paint.layers),
    dot = blend(channels(paint.dot), back),
    dotBack = contrast(dot, back);
  const hasRing =
    paint.ringWidth >= 1 &&
    paint.ringStyle !== "none" &&
    channels(paint.ring)[3] > 0;
  const ring = hasRing ? blend(channels(paint.ring), back) : null;
  const dotRing = ring ? contrast(dot, ring) : 0,
    ringBack = ring ? contrast(ring, back) : 0;
  assert(
    dotBack >= 3 || (hasRing && dotRing >= 3 && ringBack >= 3),
    `${label}: dot/back ${dotBack.toFixed(2)}:1, dot/ring ${dotRing.toFixed(
      2
    )}:1, ring/back ${ringBack.toFixed(2)}:1, ring ${paint.ringWidth}px ${
      paint.ringStyle
    }`
  );
  return {
    dotBack: +dotBack.toFixed(2),
    dotRing: +dotRing.toFixed(2),
    ringBack: +ringBack.toFixed(2),
  };
}
async function inspect(page, language, theme, hc) {
  const heading = page.getByRole("heading", {
    name: language === "ar" ? "نشاط حديث" : "Recently Active",
  });
  await expect(heading).toBeVisible();
  const section = page.locator("section").filter({ has: heading });
  await expect(section).toHaveCount(1);
  await expect(section).toContainText(
    language === "ar" ? "سُجّل نشاط حديث" : "Recent activity recorded"
  );
  await expect(section).toContainText("Recent");
  await expect(section.locator("div.w-16")).toHaveCount(1);
  await expect(section).not.toContainText("Missing Timestamp Friend");
  await expect(section).not.toContainText("Future Timestamp Friend");
  await expect(
    page.getByText(/Online now|Offline|متصل الآن|غير متصل/i)
  ).toHaveCount(0);
  const all = page.locator("section").filter({
    has: page.getByRole("heading", {
      name: language === "ar" ? /جميع الأصدقاء|كل الأصدقاء/ : /all friends/i,
    }),
  });
  await expect(all).toHaveCount(1);
  for (const name of [
    "Recent Test Friend",
    "Missing Timestamp Friend",
    "Future Timestamp Friend",
  ])
    await expect(all.getByText(name, { exact: true })).toBeVisible();
  for (const name of ["Missing Timestamp Friend", "Future Timestamp Friend"]) {
    const row = all.getByText(name, { exact: true }).locator("xpath=../..");
    await expect(row).toBeVisible();
    await expect(row.locator("span.absolute.rounded-full")).toHaveCount(0);
    await expect(row.locator("span.sr-only")).toHaveCount(0);
  }
  const headerDot = heading
    .locator('span[aria-hidden="true"].rounded-full')
    .first();
  const avatarDot = all
    .getByText("Recent Test Friend", { exact: true })
    .locator("xpath=../..")
    .locator("span.absolute.rounded-full")
    .first();
  await expect(headerDot).toBeVisible();
  await expect(avatarDot).toBeVisible();
  await expect(section.locator("span.absolute.rounded-full")).toHaveCount(1);
  const header = await inspectDot(
      headerDot,
      `${language}/${theme}/hc=${hc} header`
    ),
    avatar = await inspectDot(
      avatarDot,
      `${language}/${theme}/hc=${hc} avatar`
    );
  const overflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth
  );
  assert(
    overflow <= 0,
    `${language}/${theme}/hc=${hc}: horizontal overflow ${overflow}px`
  );
  assert.equal(await page.locator("html").getAttribute("lang"), language);
  assert.equal(
    await page.locator("html").getAttribute("dir"),
    language === "ar" ? "rtl" : "ltr"
  );
  return { header, avatar };
}
test(
  "real StudentFriendsPage recent-activity paint EN/AR x light/dark x normal/high contrast",
  { timeout: 120000 },
  async () => {
    const directory = await mkdtemp(
      join(tmpdir(), "edeviser-recent-activity-paint-")
    );
    let host, browser;
    try {
      host = await fixture(directory);
      browser = await chromium.launch({ headless: true });
      for (const language of ["en", "ar"])
        for (const theme of ["light", "dark"])
          for (const hc of [false, true]) {
            const context = await browser.newContext({
              viewport: { width: hc ? 320 : 1280, height: 900 },
              serviceWorkers: "block",
              reducedMotion: "reduce",
            });
            try {
              await context.addInitScript(
                (language) =>
                  localStorage.setItem("edeviser-language", language),
                language
              );
              const errors = [];
              await context.route("**/*", async (route) => {
                const url = new URL(route.request().url());
                if (url.origin === host.url) await route.continue();
                else {
                  errors.push(`Blocked outbound origin: ${url.origin}`);
                  await route.abort();
                }
              });
              const page = await context.newPage();
              page.on("pageerror", (e) => errors.push(e.message));
              await page.goto(host.url, { waitUntil: "load" });
              await page.evaluate(
                ({ theme, hc }) => {
                  document.documentElement.classList.toggle(
                    "dark",
                    theme === "dark"
                  );
                  document.documentElement.classList.toggle(
                    "high-contrast",
                    hc
                  );
                  if (hc) document.documentElement.style.fontSize = "20px";
                },
                { theme, hc }
              );
              const result = await inspect(page, language, theme, hc);
              assert.deepEqual(
                errors,
                [],
                `Browser errors: ${errors.join(" / ")}`
              );
              console.log(
                `Recent friends ${language} ${theme} hc=${hc}: ${JSON.stringify(
                  result
                )}`
              );
            } finally {
              await context.close();
            }
          }
    } finally {
      await browser?.close();
      await host?.close();
      await rm(directory, { recursive: true, force: true });
    }
  }
);
