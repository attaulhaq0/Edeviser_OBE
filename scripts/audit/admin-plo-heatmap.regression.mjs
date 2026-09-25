// Actual admin PLO component + CSS/i18n/Shadcn Select; synthetic DTOs are not academic provenance.
import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { mkdtemp, mkdir, readFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve, sep, extname } from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { build, normalizePath } from "vite";
import react from "@vitejs/plugin-react";
import tailwind from "@tailwindcss/vite";
import { chromium, expect } from "@playwright/test";
const repo = fileURLToPath(new URL("../../", import.meta.url)),
  require = createRequire(import.meta.url);
const translations = Object.fromEntries(
  await Promise.all(
    ["en", "ar"].map(async (l) => [
      l,
      JSON.parse(
        await readFile(join(repo, "src/locales", l, "common.json"), "utf8")
      ),
    ])
  )
);
const bands = [
  "excellent",
  "satisfactory",
  "developing",
  "notYet",
  "unmeasured",
];
const rows = [85, 84.99, 69.99, 0, -1].map((n, i) => ({
  ploId: bands[i],
  ploCodeTitle: `PLO-${i}`,
  meanAttainment: n,
  statusBand: bands[i],
  derivation: i === 0 ? "program" : i === 1 ? "clo_rollup" : "none",
  contributingCount: i === 0 ? 2 : i === 1 ? 3 : 0,
}));
const entry = `import React,{useState} from 'react';import {createRoot} from 'react-dom/client';import {flushSync} from 'react-dom';import '@/index.css';import '@/lib/i18n';import Heatmap from '@/features/admin/analytics/PloAttainmentHeatmap';
const rows=${JSON.stringify(
  rows
)};function App(){const [program,setProgram]=useState('all'),[state,setState]=useState('populated');window.setScenario=s=>flushSync(()=>setState(s));return <main data-role="admin" className="min-h-screen bg-background p-4"><Heatmap rows={state==='empty'?[]:state==='unsupported'?[{ploId:'unsupported',ploCodeTitle:'PLO-?',meanAttainment:85,statusBand:'unsupported'}]:rows} programs={[{id:'program-loading',name:document.documentElement.lang==='ar'?'برنامج التحميل':'Sample loading program'},{id:'program-error',name:document.documentElement.lang==='ar'?'برنامج الخطأ':'Sample error program'}]} selectedProgram={program} onProgramChange={p=>flushSync(()=>{setProgram(p);setState(p==='program-loading'?'loading':p==='program-error'?'error':'populated')})} filterState={state==='loading'?'loading':state==='error'?'error':'ready'} onRetry={()=>window.retryCount++}/></main>}window.retryCount=0;createRoot(document.getElementById('root')).render(<App/>);`;
async function fixture(dir) {
  const root = join(dir, "fixture"),
    out = join(dir, "dist");
  await mkdir(root, { recursive: true });
  await writeFile(join(root, "entry.jsx"), entry);
  await writeFile(
    join(root, "index.html"),
    '<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="root"></div><script type="module" src="/entry.jsx"></script></body></html>'
  );
  const scope = {
    name: "heatmap-real-css",
    enforce: "pre",
    transform(code, id) {
      if (
        normalizePath(id.split("?")[0]) ===
        normalizePath(join(repo, "src/index.css"))
      )
        return (
          code +
          `\n@source ${JSON.stringify(normalizePath(join(repo, "src")))};\n`
        );
    },
  };
  const alias = [
    ...[
      "react",
      "react/jsx-runtime",
      "react/jsx-dev-runtime",
      "react-dom",
      "react-dom/client",
      "react-i18next",
      "i18next",
    ].map((n) => ({
      find: new RegExp("^" + n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "$"),
      replacement: require.resolve(n),
    })),
    { find: "@", replacement: join(repo, "src") },
  ];
  await build({
    root,
    configFile: false,
    envDir: join(root, "env"),
    publicDir: false,
    cacheDir: join(dir, "cache"),
    plugins: [react(), scope, tailwind()],
    resolve: { alias, dedupe: ["react", "react-dom"] },
    build: { outDir: out, emptyOutDir: true, chunkSizeWarningLimit: 4000 },
    define: {
      "process.env.NODE_ENV": JSON.stringify("production"),
      "import.meta.env.VITE_SUPABASE_URL": JSON.stringify(
        "http://127.0.0.1:54321"
      ),
      "import.meta.env.VITE_SUPABASE_ANON_KEY":
        JSON.stringify("fake-admin-plo-key"),
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
      const path = new URL(req.url, "http://fixture").pathname,
        file = resolve(
          out,
          "." + decodeURIComponent(path === "/" ? "/index.html" : path)
        );
      if (!file.startsWith(out + sep)) throw Error("Unsafe asset");
      res.setHeader(
        "Content-Type",
        mime[extname(file)] ?? "application/octet-stream"
      );
      res.setHeader("Cache-Control", "no-store");
      res.end(await readFile(file));
    } catch (e) {
      res.statusCode = 404;
      res.end(String(e));
    }
  });
  await new Promise((done) => server.listen(0, "127.0.0.1", done));
  return {
    url: `http://127.0.0.1:${server.address().port}`,
    close: () => new Promise((done) => server.close(done)),
  };
}
function rgb(s) {
  const m = s.match(/^rgba?\(([^)]+)\)$/);
  assert(m, `Unsupported paint ${s}`);
  const n = m[1]
    .replaceAll(",", " ")
    .replaceAll("/", " ")
    .split(/\s+/)
    .filter(Boolean)
    .map(Number);
  assert(
    n.length >= 3 && n.slice(0, 3).every(Number.isFinite),
    `Invalid paint ${s}`
  );
  assert((n[3] ?? 1) >= 0 && (n[3] ?? 1) <= 1, `Invalid alpha ${s}`);
  return [...n.slice(0, 3), n[3] ?? 1];
}
function blend(a, b) {
  const alpha = a[3] + b[3] * (1 - a[3]);
  assert(alpha > 0, "Transparent paint");
  return [0, 1, 2]
    .map((i) => (a[i] * a[3] + b[i] * b[3] * (1 - a[3])) / alpha)
    .concat(alpha);
}
function backing(a) {
  return [...a]
    .reverse()
    .reduce((b, n) => blend(rgb(n), b), [255, 255, 255, 1]);
}
function contrast(a, b) {
  function lum(c) {
    return [0, 1, 2].reduce((s, i) => {
      const n = c[i] / 255;
      return (
        s +
        (n <= 0.04045 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4) *
          [0.2126, 0.7152, 0.0722][i]
      );
    }, 0);
  }
  const x = lum(a),
    y = lum(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}
async function paint(page, label, expected) {
  const data = await page.evaluate(() => {
    const card = document.querySelector(
      'main[data-role="admin"] > [data-slot="card"]'
    );
    if (!card) throw Error("No actual PCard");
    const sample = (n) => {
      if (!n) throw Error("Missing painted node");
      const layers = [];
      for (let p = n.parentElement; p; p = p.parentElement)
        layers.push(getComputedStyle(p).backgroundColor);
      return {
        bg: getComputedStyle(n).backgroundColor,
        ink: getComputedStyle(n).color,
        layers,
      };
    };
    return {
      card: sample(card),
      cells: [...card.querySelectorAll("li[data-plo-band]")].map((n) => ({
        band: n.dataset.ploBand,
        cell: sample(n),
        label: sample(n.querySelector("p.text-xs.font-semibold")),
      })),
      markers: [...card.querySelectorAll("li[data-plo-legend]")].map((n) => ({
        band: n.dataset.ploLegend,
        marker: sample(n.querySelector('span[aria-hidden="true"]')),
      })),
      overflow:
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
      size: getComputedStyle(document.documentElement).fontSize,
    };
  });
  assert.deepEqual(
    data.cells.map((x) => x.band),
    expected,
    `${label} cell bands`
  );
  assert.deepEqual(
    data.markers.map((x) => x.band),
    expected.length ? bands : [],
    `${label} visible legend`
  );
  const card = blend(rgb(data.card.bg), backing(data.card.layers));
  for (const { band, cell, label: labelPaint } of data.cells) {
    const surface = blend(rgb(cell.bg), backing(cell.layers)),
      ink = blend(rgb(labelPaint.ink), surface),
      ratio = contrast(ink, surface);
    assert(
      ratio >= 4.5,
      `${label}/${band} label/tinted surface ${ratio.toFixed(2)}:1 < 4.5`
    );
    const mark = data.markers.find((x) => x.band === band);
    assert(mark, `${label}/${band} marker missing`);
    const marker = blend(rgb(mark.marker.bg), backing(mark.marker.layers)),
      markRatio = contrast(marker, card);
    assert(
      markRatio >= 3,
      `${label}/${band} marker/PCard ${markRatio.toFixed(2)}:1 < 3`
    );
    for (let i = 0; i < 3; i++)
      assert(
        Math.abs(marker[i] - ink[i]) <= 1,
        `${label}/${band} marker != label ink`
      );
  }
  assert(data.overflow <= 0, `${label} horizontal overflow ${data.overflow}px`);
  return data.size;
}
async function inspect(page, l, theme, hc, width) {
  const loadingName = l === "ar" ? "برنامج التحميل" : "Sample loading program",
    errorName = l === "ar" ? "برنامج الخطأ" : "Sample error program",
    name = `${l}/${theme}/hc=${hc}/${width}`,
    strings = translations[l],
    t = strings.adminPloHeatmap,
    card = page.locator('main[data-role="admin"] > [data-slot="card"]'),
    cells = card.locator("li[data-plo-band]"),
    filter = card.getByRole("combobox", { name: t.programFilter });
  await expect(card).toHaveCount(1);
  await expect(filter).toBeVisible();
  await filter.focus();
  await expect(filter).toBeFocused();
  const box = await filter.boundingBox();
  assert(
    box && box.width >= 44 && box.height >= 44,
    `${name} filter target <44px`
  );
  await expect(page.locator("html")).toHaveAttribute("lang", l);
  await expect(page.locator("html")).toHaveAttribute(
    "dir",
    l === "ar" ? "rtl" : "ltr"
  );
  await expect(card.getByRole("heading")).toHaveText(t.title);
  const fmt = (n) =>
      new Intl.NumberFormat(l === "ar" ? "ar-QA" : "en", {
        style: "percent",
        maximumFractionDigits: 2,
      }).format(n / 100),
    num = (n) => new Intl.NumberFormat(l === "ar" ? "ar-QA" : "en").format(n),
    ranges = [
      t.rangeAtLeast.replace("{{min}}", fmt(85)),
      t.rangeBetween.replace("{{min}}", fmt(70)).replace("{{max}}", fmt(85)),
      t.rangeBetween.replace("{{min}}", fmt(50)).replace("{{max}}", fmt(70)),
      t.rangeBelow.replace("{{threshold}}", fmt(50)),
      "",
    ];
  async function legend() {
    const list = card.locator("ul[aria-label]");
    await expect(list).toHaveAttribute("aria-label", t.legend);
    for (const [i, band] of bands.entries())
      await expect(list.locator(`[data-plo-legend="${band}"]`)).toHaveText(
        (band === "unmeasured" ? t.unmeasured : strings.attainment[band]) +
          (band === "unmeasured" ? "" : `: ${ranges[i]}`)
      );
    await expect(card).toContainText(
      t.disclaimer
        .replace("{{excellent}}", fmt(85))
        .replace("{{satisfactory}}", fmt(70))
        .replace("{{developing}}", fmt(50))
    );
  }
  async function language() {
    const text = await card.innerText();
    assert(
      !text.includes("⚠ ") &&
        !text.includes("adminPloHeatmap.") &&
        !text.includes("attainment."),
      `${name} untranslated`
    );
    if (l === "ar")
      assert(
        !/[A-Za-z]{3,}/.test(text.replace(/PLO-[0-4?]/g, "")),
        `${name} English-only fallback`
      );
  }
  await page.evaluate(() => window.setScenario("populated"));
  await expect(cells).toHaveCount(5);
  for (const [i, row] of rows.entries()) {
    const cell = cells.nth(i),
      band = bands[i];
    await expect(cell).toHaveAttribute("data-plo-band", band);
    await expect(cell.locator("p").nth(0)).toHaveText(row.ploCodeTitle);
    await expect(cell.locator("p").nth(1)).toHaveText(
      i === 4 ? "—" : fmt(row.meanAttainment)
    );
    await expect(cell.locator("p").nth(2)).toHaveText(
      i === 4 ? t.unmeasured : strings.attainment[band]
    );
    if (i === 4) await expect(cell.locator("p")).toHaveCount(3);
  }
  await expect(cells.nth(0)).toContainText(
    t.sourceProgram.replace("{{formattedCount}}", num(2))
  );
  await expect(cells.nth(1)).toContainText(
    t.sourceClo.replace("{{formattedCount}}", num(3))
  );
  await expect(cells.nth(2)).toContainText(t.sourceRecorded);
  await legend();
  await language();
  assert.equal(
    await paint(page, `${name}/populated`, bands),
    width === 320 ? "20px" : "16px"
  );
  await page.evaluate(() => window.setScenario("unsupported"));
  await expect(cells).toHaveCount(1);
  await expect(cells).toHaveAttribute("data-plo-band", "unmeasured");
  await expect(cells.locator("p").nth(1)).toHaveText("—");
  await legend();
  await language();
  await paint(page, `${name}/unsupported`, ["unmeasured"]);
  await page.evaluate(() => window.setScenario("empty"));
  await expect(card).toContainText(t.empty);
  await expect(cells).toHaveCount(0);
  await language();
  await paint(page, `${name}/empty`, []);
  await page.evaluate(() => window.setScenario("populated"));
  await filter.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("option", { name: loadingName })).toBeVisible();
  await page.getByRole("option", { name: loadingName }).focus();
  await page.keyboard.press("Enter");
  await expect(filter).toContainText(loadingName);
  await expect(card.getByRole("status")).toHaveAttribute(
    "aria-label",
    t.loading
  );
  await expect(cells).toHaveCount(0);
  await language();
  await paint(page, `${name}/loading`, []);
  await filter.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("option", { name: errorName })).toBeVisible();
  await page.getByRole("option", { name: errorName }).focus();
  await page.keyboard.press("Enter");
  await expect(filter).toContainText(errorName);
  await expect(card.getByRole("alert")).toHaveText(t.error);
  await expect(cells).toHaveCount(0);
  const retry = card.getByRole("button", { name: t.retry });
  await retry.focus();
  await expect(retry).toBeFocused();
  await page.keyboard.press("Enter");
  assert.equal(await page.evaluate(() => window.retryCount), 1);
  await language();
  await paint(page, `${name}/error`, []);
  console.log(`${name}: semantic and paint checks passed`);
}
test(
  "admin PLO real component EN/AR x light/dark x standard/HC x desktop/narrow",
  { timeout: 240000 },
  async () => {
    const dir = await mkdtemp(join(tmpdir(), "edeviser-admin-plo-"));
    let host, browser;
    try {
      host = await fixture(dir);
      browser = await chromium.launch({ headless: true });
      for (const l of ["en", "ar"])
        for (const theme of ["light", "dark"])
          for (const hc of [false, true])
            for (const width of [1280, 320]) {
              const context = await browser.newContext({
                viewport: { width, height: 900 },
                serviceWorkers: "block",
                reducedMotion: "reduce",
              });
              try {
                await context.addInitScript(
                  (l) => localStorage.setItem("edeviser-language", l),
                  l
                );
                const errors = [];
                await context.route("**/*", async (route) => {
                  const u = new URL(route.request().url());
                  if (u.origin === host.url) await route.continue();
                  else {
                    errors.push(`Outbound ${u.origin}`);
                    await route.abort();
                  }
                });
                const page = await context.newPage();
                page.on("pageerror", (e) => errors.push(e.message));
                page.on("console", (m) => {
                  if (m.type() === "error") errors.push(m.text());
                });
                page.on("requestfailed", (r) =>
                  errors.push(`Failed ${new URL(r.url()).origin}`)
                );
                await page.goto(host.url, { waitUntil: "load" });
                await page.evaluate(
                  ({ theme, hc, width }) => {
                    document.documentElement.classList.toggle(
                      "dark",
                      theme === "dark"
                    );
                    document.documentElement.classList.toggle(
                      "high-contrast",
                      hc
                    );
                    document.documentElement.style.fontSize =
                      width === 320 ? "20px" : "16px";
                  },
                  { theme, hc, width }
                );
                await inspect(page, l, theme, hc, width);
                assert.deepEqual(
                  errors,
                  [],
                  `${l}/${theme}/${hc}/${width} browser errors/outbound`
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
