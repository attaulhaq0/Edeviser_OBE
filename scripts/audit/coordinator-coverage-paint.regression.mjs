// Real CoordinatorCoveragePanels/CSS/locales, controlled props; no live services or screenshots.
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
const repo = fileURLToPath(new URL("../../", import.meta.url)),
  require = createRequire(import.meta.url);
const scenarios = [
  {
    id: "zero",
    coverage: { mappedClos: 0, totalClos: 4, coveragePercent: 0 },
    readiness: 0,
    expected: 0,
  },
  {
    id: "partial",
    coverage: { mappedClos: 2, totalClos: 4, coveragePercent: 50 },
    readiness: 50,
    expected: 50,
  },
  {
    id: "complete",
    coverage: { mappedClos: 4, totalClos: 4, coveragePercent: 100 },
    readiness: 100,
    expected: 100,
  },
  {
    id: "unknown",
    coverage: { mappedClos: 0, totalClos: 0, coveragePercent: 0 },
    readiness: null,
    expected: null,
  },
  { id: "no-data", coverage: null, readiness: null, expected: null },
];
const pack = [
  { key: "cloMapping", state: "done" },
  { key: "samples", state: "prog" },
  { key: "analysis", state: "pending" },
  { key: "unknown-key", state: "unknown-state" },
];
const entry = `import React from 'react';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import { MemoryRouter, useLocation } from 'react-router-dom';
import '@/index.css'; import '@/lib/i18n';
import CoordinatorCoveragePanels from '@/features/coordinator/dashboard/CoordinatorCoveragePanels';
const scenarios=${JSON.stringify(scenarios)},pack=${JSON.stringify(pack)};
const root=createRoot(document.getElementById('root'));
function Route(){const location=useLocation();return <output data-route hidden>{location.pathname}</output>}
window.setScenario=id=>{const props=scenarios.find(s=>s.id===id);if(!props)throw Error('Bad scenario');flushSync(()=>root.render(<MemoryRouter key={id} initialEntries={['/coordinator/dashboard']}><main data-role="coordinator" className="min-h-screen bg-background p-4"><CoordinatorCoveragePanels coverage={props.coverage} readiness={props.readiness} evidencePack={id === "unknown" || id === "no-data" ? [] : pack}/><Route/></main></MemoryRouter>))};
window.setScenario('zero');`;
const copies = Object.fromEntries(
  await Promise.all(
    ["en", "ar"].map(async (lang) => [
      lang,
      JSON.parse(
        await readFile(
          join(repo, "src/locales", lang, "coordinator.json"),
          "utf8"
        )
      ).dashboard,
    ])
  )
);
async function fixture(dir) {
  const root = join(dir, "fixture"),
    out = join(dir, "dist");
  await mkdir(root, { recursive: true });
  await writeFile(join(root, "entry.jsx"), entry);
  await writeFile(
    join(root, "index.html"),
    '<html lang="en"><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="root"></div><script type="module" src="/entry.jsx"></script></body></html>'
  );
  const sourceScope = {
    name: "coverage-source",
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
      "react-router-dom",
      "react-i18next",
      "i18next",
    ].map((name) => ({
      find: new RegExp("^" + name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "$"),
      replacement: require.resolve(name),
    })),
    { find: "@", replacement: join(repo, "src") },
  ];
  await build({
    root,
    configFile: false,
    envDir: join(root, "env"),
    publicDir: false,
    cacheDir: join(dir, "cache"),
    plugins: [react(), sourceScope, tailwindcss()],
    resolve: { alias, dedupe: ["react", "react-dom", "react-router-dom"] },
    build: { outDir: out, emptyOutDir: true, chunkSizeWarningLimit: 4000 },
    define: {
      "process.env.NODE_ENV": JSON.stringify("production"),
      "import.meta.env.VITE_SUPABASE_URL": JSON.stringify(
        "http://127.0.0.1:54321"
      ),
      "import.meta.env.VITE_SUPABASE_ANON_KEY": JSON.stringify(
        "fake-coordinator-coverage-key"
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
      const pathname = new URL(req.url, "http://fixture").pathname,
        file = resolve(
          out,
          "." + decodeURIComponent(pathname === "/" ? "/index.html" : pathname)
        );
      if (!file.startsWith(out + sep)) throw Error("Unsafe asset path");
      res.setHeader(
        "Content-Type",
        mime[extname(file)] ?? "application/octet-stream"
      );
      res.setHeader("Cache-Control", "no-store");
      res.end(await readFile(file));
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
  const n = match[1]
    .replaceAll(",", " ")
    .replaceAll("/", " ")
    .split(/\s+/)
    .filter(Boolean)
    .map(Number);
  assert(
    n.length >= 3 && n.slice(0, 3).every(Number.isFinite),
    `Invalid color: ${value}`
  );
  return [...n.slice(0, 3), n[3] ?? 1];
}
function blend(a, b) {
  const alpha = a[3] + b[3] * (1 - a[3]);
  return [0, 1, 2]
    .map((i) => (a[i] * a[3] + b[i] * b[3] * (1 - a[3])) / alpha)
    .concat(alpha);
}
function backing(layers) {
  return [...layers]
    .reverse()
    .reduce(
      (bottom, layer) => blend(channels(layer), bottom),
      [255, 255, 255, 1]
    );
}
function luminance(rgb) {
  return [0, 1, 2].reduce((sum, i) => {
    const v = rgb[i] / 255;
    return (
      sum +
      (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4) *
        [0.2126, 0.7152, 0.0722][i]
    );
  }, 0);
}
function contrast(a, b) {
  const x = luminance(a),
    y = luminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}
async function paint(page, label, expected) {
  const result = await page.evaluate(() => {
    const cards = document.querySelectorAll(
      'main[data-role="coordinator"] > div > *'
    );
    if (cards.length !== 2) throw Error("Missing real cards");
    const [mapping, evidence] = cards;
    const sample = (node, background = false) => {
      if (!node) throw Error("Missing painted node");
      const layers = [];
      for (let p = node.parentElement; p; p = p.parentElement)
        layers.push(getComputedStyle(p).backgroundColor);
      return {
        color: background
          ? getComputedStyle(node).backgroundColor
          : getComputedStyle(node).color,
        layers,
      };
    };
    const texts = [
      ...mapping.querySelectorAll("h2,p,span.text-2xl"),
      ...evidence.querySelectorAll("h2,p,li span,span.text-sm"),
    ]
      .filter((n) => n.textContent?.trim())
      .map((n) => ({ text: n.textContent.trim(), ...sample(n) }));
    const bars = [mapping, evidence]
      .map((card) => card.querySelector('[role="progressbar"]'))
      .filter(Boolean)
      .map((track) => {
        const fill = track.querySelector('span[aria-hidden="true"]');
        if (!fill) throw Error("Missing fill");
        return {
          track: sample(track, true),
          fill: sample(fill, true),
          width: track.getBoundingClientRect().width,
          fillWidth: fill.getBoundingClientRect().width,
          inline: fill.style.width,
        };
      });
    const cta = mapping.querySelector('span[class*="action-primary"]');
    return {
      texts,
      bars,
      cta: sample(cta),
      ctaFill: sample(cta, true),
      overflow:
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
      rootSize: getComputedStyle(document.documentElement).fontSize,
    };
  });
  for (const text of result.texts) {
    const back = backing(text.layers),
      ratio = contrast(blend(channels(text.color), back), back);
    assert(
      ratio >= 4.5,
      `${label}: card text "${text.text}" ${ratio.toFixed(2)}:1 < 4.5`
    );
  }
  for (const bar of result.bars) {
    const track = blend(channels(bar.track.color), backing(bar.track.layers)),
      fill = blend(channels(bar.fill.color), track),
      ratio = contrast(fill, track);
    assert(ratio >= 3, `${label}: fill/track ${ratio.toFixed(2)}:1 < 3`);
  }
  const ctaBack = blend(
      channels(result.ctaFill.color),
      backing(result.ctaFill.layers)
    ),
    ctaRatio = contrast(blend(channels(result.cta.color), ctaBack), ctaBack);
  assert(
    ctaRatio >= 4.5,
    `${label}: CTA text/fill ${ctaRatio.toFixed(2)}:1 < 4.5`
  );
  assert.equal(
    result.bars.length,
    expected.length,
    `${label}: painted bar count`
  );
  expected.forEach((value, index) => {
    const bar = result.bars[index];
    assert.equal(bar.inline, `${value}%`, `${label}: inline fill`);
    assert(
      bar.width > 0 && Math.abs(bar.fillWidth - (bar.width * value) / 100) <= 1,
      `${label}: fill ${bar.fillWidth}px / track ${bar.width}px != ${value}%`
    );
  });
  assert(
    result.overflow <= 0,
    `${label}: horizontal overflow ${result.overflow}px`
  );
  return result.rootSize;
}
async function inspect(page, lang, theme, hc, width, scenario) {
  const label = `${lang}/${theme}/hc=${hc}/${width}/${scenario.id}`,
    copy = copies[lang];
  await page.evaluate((id) => window.setScenario(id), scenario.id);
  const cards = page.locator('main[data-role="coordinator"] > div > *');
  await expect(cards).toHaveCount(2);
  const mapping = cards.nth(0),
    evidence = cards.nth(1),
    mapBar = mapping.getByRole("progressbar"),
    evBar = evidence.getByRole("progressbar");
  await expect(mapBar).toHaveCount(scenario.expected === null ? 0 : 1);
  await expect(evBar).toHaveCount(scenario.readiness === null ? 0 : 1);
  const percent = new Intl.NumberFormat(lang === "ar" ? "ar-QA" : "en", {
      style: "percent",
      maximumFractionDigits: 0,
    }),
    number = new Intl.NumberFormat(lang === "ar" ? "ar-QA" : "en");
  await expect(mapping.locator("span.text-2xl")).toHaveText(
    scenario.expected === null ? "—" : percent.format(scenario.expected / 100)
  );
  await expect(evidence.locator("span.text-sm.tabular-nums")).toHaveText(
    scenario.readiness === null ? "—" : percent.format(scenario.readiness / 100)
  );
  if (scenario.expected === null)
    await expect(mapping.getByRole("status")).toHaveText(copy.gap.unknownBody);
  else {
    await expect(mapBar).toHaveAttribute("aria-label", copy.gap.progressLabel);
    await expect(mapBar).toHaveAttribute(
      "aria-valuenow",
      String(scenario.expected)
    );
    await expect(mapping).toContainText(
      copy.gap.count
        .replace("{{mapped}}", number.format(scenario.coverage.mappedClos))
        .replace("{{total}}", number.format(scenario.coverage.totalClos))
    );
  }
  if (scenario.readiness === null)
    await expect(evidence.getByRole("status")).toHaveText(
      copy.evidence.coverageUnavailable
    );
  else {
    await expect(evBar).toHaveAttribute(
      "aria-label",
      copy.evidence.documentedCoverage
    );
    await expect(evBar).toHaveAttribute(
      "aria-valuenow",
      String(scenario.readiness)
    );
  }
  for (const bar of [mapBar, evBar])
    if (await bar.count()) {
      await expect(bar).toHaveAttribute("aria-valuemin", "0");
      await expect(bar).toHaveAttribute("aria-valuemax", "100");
    }
  await expect(mapping.getByRole("heading")).toHaveText(
    scenario.expected === 100
      ? copy.gap.completeTitle
      : scenario.expected === null
      ? copy.gap.unknownTitle
      : copy.gap.title
  );
  await expect(evidence).toContainText(copy.evidence.documentedCoverage);
  await expect(evidence).toContainText(copy.evidence.scope);
  const rows = evidence.locator("li");
  await expect(rows).toHaveCount(scenario.expected === null ? 0 : pack.length);
  if (scenario.expected === null)
    await expect(evidence).toContainText(copy.evidence.emptyPack);
  for (const [i, item] of (scenario.expected === null ? [] : pack).entries()) {
    await expect(rows.nth(i)).toContainText(
      copy.evidence.item[item.key] ?? copy.evidence.item.unknown
    );
    await expect(rows.nth(i)).toContainText(
      copy.evidence.state[item.state] ?? copy.evidence.state.unknown
    );
  }
  await expect(page.locator("html")).toHaveAttribute("lang", lang);
  await expect(page.locator("html")).toHaveAttribute(
    "dir",
    lang === "ar" ? "rtl" : "ltr"
  );
  const content = await page.locator("main").innerText();
  assert(
    !/assessment\s+certified|attainment\s+certified|certified\s+(assessment|attainment)/i.test(
      content
    ),
    `${label}: false certification`
  );
  assert(!content.includes("⚠ "), `${label}: missing translation`);
  assert.equal(
    await paint(
      page,
      label,
      [scenario.expected, scenario.readiness].filter((n) => n !== null)
    ),
    width === 320 ? "20px" : "16px"
  );
  for (const [link, href] of [
    [mapping, "/coordinator/matrix"],
    [evidence.getByRole("link"), "/coordinator/accreditation"],
  ]) {
    await expect(link).toHaveAttribute("href", href);
    const box = await link.boundingBox();
    assert(
      box && box.width >= 44 && box.height >= 44,
      `${label}: ${href} link ${box?.width}x${box?.height} < 44px`
    );
    await link.focus();
    await expect(link).toBeFocused();
  }
  await mapping.focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("[data-route]")).toHaveText("/coordinator/matrix");
  await evidence.getByRole("link").focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("[data-route]")).toHaveText(
    "/coordinator/accreditation"
  );
  console.log(`${label}: semantic and paint checks passed`);
}
test(
  "coordinator coverage real paint EN/AR x light/dark x normal/HC x 320/1280",
  { timeout: 240000 },
  async () => {
    const dir = await mkdtemp(
      join(tmpdir(), "edeviser-coordinator-coverage-paint-")
    );
    let host, browser;
    try {
      host = await fixture(dir);
      browser = await chromium.launch({ headless: true });
      for (const lang of ["en", "ar"])
        for (const theme of ["light", "dark"])
          for (const hc of [false, true])
            for (const width of [320, 1280]) {
              const context = await browser.newContext({
                viewport: { width, height: 900 },
                serviceWorkers: "block",
                reducedMotion: "reduce",
              });
              try {
                await context.addInitScript(
                  (language) =>
                    localStorage.setItem("edeviser-language", language),
                  lang
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
                page.on("pageerror", (error) => errors.push(error.message));
                page.on("console", (msg) => {
                  if (msg.type() === "error")
                    errors.push(`Console: ${msg.text()}`);
                });
                page.on("requestfailed", (req) =>
                  errors.push(
                    `Request failed at origin: ${new URL(req.url()).origin}`
                  )
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
                for (const scenario of scenarios)
                  await inspect(page, lang, theme, hc, width, scenario);
                assert.deepEqual(
                  errors,
                  [],
                  `${lang}/${theme}/hc=${hc}/${width}: browser errors/outbound`
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
