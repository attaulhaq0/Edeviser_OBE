// Real notification Bell/feed, CSS and EN/AR resources in isolated Chromium.
// Only auth/query/realtime DTO seams are replaced. No Preview, app server or data write.
// Run: node --test scripts/audit/notification-paint-regression.mjs
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

const repository = fileURLToPath(new URL("../../", import.meta.url));
const require = createRequire(import.meta.url);
const fixtureSource = `
import React from "react";
import {createRoot} from "react-dom/client";
import "@/index.css";
import "@/lib/i18n";
import NotificationBell from "@/components/shared/NotificationBell";
import SaleBadge from "@/components/shared/SaleBadge";
import NotificationsFeedPage from "@/features/shared/notifications/NotificationsFeedPage";
createRoot(document.getElementById("root")).render(<main className="min-h-screen bg-card p-5"><div data-audit-promotion><SaleBadge discountPercentage={25}/></div><NotificationBell/><NotificationsFeedPage/></main>);
`;
const hookSource = `
const now=new Date().toISOString();
const notifications=[
  {id:"n1",user_id:"actor",type:"grade_released",title:"Grade released",body:"Recorded assessment",is_read:false,metadata:null,created_at:now},
  {id:"n2",user_id:"actor",type:"badge_earned",title:"Badge earned",body:null,is_read:true,metadata:null,created_at:now},
];
export const useUnreadCount=()=>({data:5});
export const useNotifications=()=>({data:notifications,isLoading:false,isError:false});
export const useMarkAsRead=()=>({mutate:()=>{},isPending:false});
export const useMarkAllAsRead=()=>({mutate:()=>{},isPending:false});
export const useDeleteNotification=()=>({mutate:()=>{},isPending:false});
`;

async function createFixture(directory) {
  const root = join(directory, "fixture"),
    out = join(directory, "dist");
  await mkdir(root, { recursive: true });
  await writeFile(join(root, "entry.jsx"), fixtureSource);
  await writeFile(join(root, "notifications.mjs"), hookSource);
  await writeFile(
    join(root, "auth.mjs"),
    'export const useAuth=()=>({user:{id:"actor"},role:"teacher"});'
  );
  await writeFile(
    join(root, "realtime.mjs"),
    "export const useNotificationRealtime=()=>({isLive:false});"
  );
  await writeFile(
    join(root, "index.html"),
    '<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="root"></div><script type="module" src="/entry.jsx"></script></body></html>'
  );
  const sourceScope = {
    name: "notification-source-scope",
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
    {
      find: /^@\/hooks\/useNotifications$/,
      replacement: join(root, "notifications.mjs"),
    },
    {
      find: /^@\/hooks\/useNotificationRealtime$/,
      replacement: join(root, "realtime.mjs"),
    },
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
        "fake-notification-fixture-key"
      ),
    },
  });
  const mime = {
    ".html": "text/html",
    ".js": "application/javascript",
    ".css": "text/css",
    ".woff": "font/woff",
    ".woff2": "font/woff2",
  };
  const server = createServer(async (req, res) => {
    try {
      const path = new URL(req.url, "http://fixture").pathname;
      const file = resolve(
        out,
        "." + decodeURIComponent(path === "/" ? "/index.html" : path)
      );
      if (!file.startsWith(out + sep))
        throw new Error("Unsafe fixture asset path");
      let bytes;
      try {
        bytes = await readFile(file);
      } catch {
        if (path.startsWith("/assets/")) {
          res.statusCode = 404;
          return res.end("Missing asset");
        }
        bytes = await readFile(join(out, "index.html"));
      }
      res.setHeader("Content-Type", mime[extname(file)] ?? "text/html");
      res.setHeader("Cache-Control", "no-store");
      res.end(bytes);
    } catch (error) {
      res.statusCode = 500;
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
  const found = value.match(/^rgba?\(([^)]+)\)$/);
  if (!found) throw new Error(`Unsupported computed color: ${value}`);
  const parts = found[1]
    .replaceAll(",", " ")
    .replaceAll("/", " ")
    .split(/\s+/)
    .filter(Boolean)
    .map(Number);
  if (parts.length < 3 || parts.slice(0, 3).some((v) => !Number.isFinite(v)))
    throw new Error(`Invalid computed color: ${value}`);
  return [...parts.slice(0, 3), parts[3] ?? 1];
}
const blend = (above, below) => {
  const alpha = above[3],
    total = alpha + (below[3] ?? 1) * (1 - alpha);
  return [
    ...[0, 1, 2].map(
      (i) =>
        (above[i] * alpha + below[i] * (below[3] ?? 1) * (1 - alpha)) / total
    ),
    total,
  ];
};
const backing = (layers) =>
  layers
    .reverse()
    .reduce(
      (color, layer) => blend(channels(layer), color),
      [255, 255, 255, 1]
    );
const luminance = (rgb) =>
  [0, 1, 2]
    .map((i) => {
      const c = rgb[i] / 255;
      return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    })
    .reduce((s, v, i) => s + v * [0.2126, 0.7152, 0.0722][i], 0);
const contrast = (a, b) => {
  const x = luminance(a),
    y = luminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
};

async function inspect(page, config) {
  const bell = page
    .locator("button[aria-label]")
    .filter({ has: page.locator("svg.lucide-bell") })
    .first();
  await expect(bell).toBeVisible();
  const name = await bell.getAttribute("aria-label");
  assert(name?.includes("5"), `Missing uncapped notification label: ${name}`);
  if (config.language === "ar")
    assert(
      name.includes("غير مقروء") && !name.includes("unread"),
      `Arabic label not localized: ${name}`
    );
  else
    assert(
      name.includes("unread notifications"),
      `English label not localized: ${name}`
    );
  const box = await bell.boundingBox();
  assert(
    box && box.width >= 44 && box.height >= 44,
    `Bell target below 44px: ${box?.width}x${box?.height}`
  );
  const unread = page.locator('[data-testid="notif-n1"]');
  await expect(unread).toBeVisible();
  const read = page.locator('[data-testid="notif-n2"]');
  await expect(unread).toContainText(
    config.language === "ar" ? "غير مقروء" : "Unread"
  );
  await expect(read).not.toContainText(
    config.language === "ar" ? "غير مقروء" : "Unread"
  );
  const promotion = page.locator("[data-audit-promotion] span");
  await expect(promotion).toContainText(
    config.language === "ar" ? "خصم" : "Off"
  );
  const formattedDiscount = new Intl.NumberFormat(
    config.language === "ar" ? "ar-QA" : "en",
    { style: "percent", maximumFractionDigits: 2 }
  ).format(0.25);
  await expect(promotion).toContainText(formattedDiscount);
  const status = await page.evaluate(() => {
    const badge = document.querySelector(
      'button[aria-label] span[aria-live="polite"]'
    );
    const dot = document.querySelector(
      '[data-testid="notif-n1"] span.bg-primary[aria-hidden="true"]'
    );
    const promotion = document.querySelector("[data-audit-promotion] span");
    if (!badge || !dot || !promotion)
      throw new Error("Real notification or promotion paint missing");
    const layers = (node) => {
      const result = [];
      for (let item = node.parentElement; item; item = item.parentElement)
        result.push(getComputedStyle(item).backgroundColor);
      return result;
    };
    return {
      badgeBg: getComputedStyle(badge).backgroundColor,
      badgeFg: getComputedStyle(badge).color,
      badgeBack: layers(badge),
      dotFg: getComputedStyle(dot).backgroundColor,
      dotBack: layers(dot),
      promotionBg: getComputedStyle(promotion).backgroundColor,
      promotionFg: getComputedStyle(promotion).color,
      promotionBack: layers(promotion),
      role: document.documentElement.lang,
      dir: document.documentElement.dir,
    };
  });
  assert.equal(status.role, config.language);
  assert.equal(status.dir, config.language === "ar" ? "rtl" : "ltr");
  const badgeRatio = contrast(
    channels(status.badgeFg),
    channels(status.badgeBg)
  );
  const badgeSurface = contrast(
    channels(status.badgeBg),
    backing(status.badgeBack)
  );
  const dotRatio = contrast(channels(status.dotFg), backing(status.dotBack));
  assert(
    badgeRatio >= 4.5,
    `Unread count contrast ${badgeRatio}:1 is below 4.5`
  );
  assert(
    badgeSurface >= 3,
    `Unread count background contrast ${badgeSurface}:1 is below 3`
  );
  assert(dotRatio >= 3, `Unread dot contrast ${dotRatio}:1 is below 3`);
  const promotionText = contrast(
    channels(status.promotionFg),
    channels(status.promotionBg)
  );
  const promotionSurface = contrast(
    channels(status.promotionBg),
    backing(status.promotionBack)
  );
  assert(
    promotionText >= 4.5,
    `Promotion badge text contrast ${promotionText}:1 is below 4.5`
  );
  assert(
    promotionSurface >= 3,
    `Promotion badge surface contrast ${promotionSurface}:1 is below 3`
  );
  return {
    badgeRatio: +badgeRatio.toFixed(2),
    badgeSurface: +badgeSurface.toFixed(2),
    dotRatio: +dotRatio.toFixed(2),
    promotionText: +promotionText.toFixed(2),
    promotionSurface: +promotionSurface.toFixed(2),
  };
}

test(
  "real Bell/feed and promotion cues in EN/AR light/dark/high-contrast",
  { timeout: 120000 },
  async () => {
    const dir = await mkdtemp(join(tmpdir(), "edeviser-notification-paint-"));
    let host, browser;
    try {
      host = await createFixture(dir);
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
                ({ language, theme, hc }) => {
                  localStorage.setItem("edeviser-language", language);
                },
                { language, theme, hc }
              );
              const errors = [];
              await context.route("**/*", async (route) => {
                const url = new URL(route.request().url());
                if (url.origin === host.url) await route.continue();
                else {
                  errors.push(`Unexpected request: ${url.origin}`);
                  await route.abort();
                }
              });
              const page = await context.newPage();
              page.on("pageerror", (error) => errors.push(error.message));
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
                },
                { theme, hc }
              );
              if (hc)
                await page.addStyleTag({ content: ":root{font-size:20px}" });
              const result = await inspect(page, { language, theme, hc });
              const overflow = await page.evaluate(
                () =>
                  document.documentElement.scrollWidth -
                  document.documentElement.clientWidth
              );
              assert(
                overflow <= 0,
                `Horizontal document overflow: ${overflow}`
              );
              assert.deepEqual(
                errors,
                [],
                `Browser errors: ${errors.join(" / ")}`
              );
              console.log(
                `Bell/feed ${language} ${theme} hc=${hc}: ${JSON.stringify(
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
      await rm(dir, { recursive: true, force: true });
    }
  }
);
