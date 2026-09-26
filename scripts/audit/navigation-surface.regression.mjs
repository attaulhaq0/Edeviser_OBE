// Chromium fixture: real Sidebar, MobileTabBar, Radix, source CSS and bilingual resources.
// Only auth, survey-count and route-prefetch are stubbed; no Preview/DB or shell-header claim.
import assert from "node:assert/strict";
import { test } from "node:test";
import { createServer } from "node:http";
import { mkdtemp, mkdir, readFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve, sep, extname } from "node:path";
import { createRequire } from "node:module";
import { pathToFileURL, fileURLToPath } from "node:url";
const repo = fileURLToPath(new URL("../../", import.meta.url)),
  req = createRequire(join(repo, "package.json"));
const { build, normalizePath } = await import(
  pathToFileURL(req.resolve("vite")).href
);
const { default: react } = await import(
  pathToFileURL(req.resolve("@vitejs/plugin-react")).href
);
const { default: tailwindcss } = await import(
  pathToFileURL(req.resolve("@tailwindcss/vite")).href
);
const { chromium } = req("@playwright/test");
const roles = ["student", "teacher", "coordinator", "admin", "parent"],
  langs = ["en", "ar"],
  widths = [390, 1280];
const exact = (name, replacement) => ({
  find: new RegExp("^" + name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "$"),
  replacement,
});
const entry = `import React from 'react';import {createRoot} from 'react-dom/client';import {BrowserRouter,Routes,Route,useLocation} from 'react-router-dom';import i18next from 'i18next';import {I18nextProvider,initReactI18next} from 'react-i18next';import {SidebarProvider,useSidebar} from '@/components/shared/SidebarContext';import Sidebar from '@/components/shared/Sidebar';import MobileTabBar from '@/components/shared/MobileTabBar';import {Button} from '@/components/ui/button';import {navItems} from '@/lib/navItems';import {getMobileTabItems,getPrimaryNavItems,getMoreNavItems} from '@/lib/navPresentation';import en from '@/locales/en/common.json';import ar from '@/locales/ar/common.json';import '@/index.css';const q=new URL(location.href).searchParams,role=q.get('role'),language=q.get('language');window.__navScene={role,assigned:Number(q.get('assigned')??0)};window.__navContract={items:navItems[role].map(({to,labelKey})=>({to,labelKey})),primary:getPrimaryNavItems(role).map(({to,labelKey})=>({to,labelKey})),more:getMoreNavItems(role).map(({to,labelKey})=>({to,labelKey})),tabs:getMobileTabItems(role).map(({to,labelKey})=>({to,labelKey}))};document.documentElement.lang=language;document.documentElement.dir=language==='ar'?'rtl':'ltr';function Fixture(){const {toggle,mobileOpen}=useSidebar(),location=useLocation();return <div data-role={role} className="role-app-shell min-h-screen bg-background"><header className="min-h-14 bg-card"><Button onClick={toggle} aria-label="Open navigation" aria-expanded={mobileOpen} aria-controls="mobile-navigation" className="min-h-11 min-w-11 min-[640px]:hidden">Menu</Button></header><Sidebar/><main id="main-content" tabIndex={-1} className="min-w-0 min-[640px]:ps-(--app-sidebar-w)"><p data-route>{location.pathname}</p><Routes><Route path="/admin/settings/configuration" element={<p data-configuration-route>Configuration route mounted</p>}/></Routes></main><MobileTabBar/></div>}async function start(){const i18n=i18next.createInstance();await i18n.use(initReactI18next).init({lng:language,fallbackLng:'en',defaultNS:'common',resources:{en:{common:en},ar:{common:ar}},interpolation:{escapeValue:false}});createRoot(document.getElementById('root')).render(<I18nextProvider i18n={i18n}><BrowserRouter><SidebarProvider><Fixture/></SidebarProvider></BrowserRouter></I18nextProvider>)}start().catch(error=>{document.documentElement.dataset.fixtureError=String(error);throw error});`;
const fake = `export const useAuth=()=>({user:{id:'fixture'},profile:{id:'fixture',role:window.__navScene.role}});export const useSurveyAssignmentsCount=()=>({data:window.__navScene.assigned});export const useIntentPrefetch=()=>()=>({});export const prefetchRoute=()=>{};`;
async function fixture(directory) {
  const root = join(directory, "fixture"),
    outDir = join(directory, "dist");
  await mkdir(join(root, "env"), { recursive: true });
  const stub = join(root, "stubs.js");
  await writeFile(stub, fake);
  await writeFile(join(root, "entry.jsx"), entry);
  await writeFile(
    join(root, "index.html"),
    '<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="root"></div><script type="module" src="/entry.jsx"></script></body></html>'
  );
  const scope = {
    name: "nav-source-scope",
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
  const aliases = [
    "@/hooks/useAuth",
    "@/hooks/useSurveyAssignmentsCount",
    "@/hooks/useIntentPrefetch",
    "@/lib/routePrefetch",
  ].map((name) => exact(name, stub));
  for (const name of [
    "react",
    "react/jsx-runtime",
    "react/jsx-dev-runtime",
    "react-dom",
    "react-dom/client",
    "react-router-dom",
    "i18next",
    "react-i18next",
  ])
    aliases.push(exact(name, req.resolve(name)));
  aliases.push({ find: "@", replacement: join(repo, "src") });
  await build({
    configFile: false,
    root,
    envDir: join(root, "env"),
    envPrefix: "NAV_FIXTURE_PUBLIC_",
    publicDir: false,
    cacheDir: join(directory, "vite-cache"),
    plugins: [react(), scope, tailwindcss()],
    resolve: { alias: aliases, dedupe: ["react", "react-dom"] },
    build: { outDir, emptyOutDir: true, minify: false, sourcemap: false },
  });
  return outDir;
}
async function serve(outDir) {
  const types = {
    ".html": "text/html",
    ".js": "application/javascript",
    ".css": "text/css",
    ".svg": "image/svg+xml",
    ".woff": "font/woff",
    ".woff2": "font/woff2",
    ".png": "image/png",
  };
  const server = createServer(async (request, response) => {
    try {
      const path = decodeURIComponent(
          new URL(request.url, "http://127.0.0.1").pathname
        ),
        requested = resolve(outDir, "." + path);
      if (requested !== outDir && !requested.startsWith(outDir + sep)) {
        response.writeHead(403);
        response.end();
        return;
      }
      const file = path.startsWith("/assets/")
          ? requested
          : join(outDir, "index.html"),
        bytes = await readFile(file);
      response.writeHead(200, {
        "content-type": types[extname(file)] ?? "application/octet-stream",
        "cache-control": "no-store",
      });
      response.end(bytes);
    } catch (error) {
      response.writeHead(error?.code === "ENOENT" ? 404 : 500);
      response.end("Fixture read error");
    }
  });
  await new Promise((ok, no) => {
    server.once("error", no);
    server.listen(0, "127.0.0.1", ok);
  });
  const address = server.address();
  assert(address && typeof address === "object");
  return { server, origin: `http://127.0.0.1:${address.port}` };
}
const locales = Object.fromEntries(
  await Promise.all(
    langs.map(async (lang) => [
      lang,
      JSON.parse(
        await readFile(join(repo, "src/locales", lang, "common.json"), "utf8")
      ),
    ])
  )
);
function translated(lang, key) {
  const result = key
    .split(".")
    .reduce((value, part) => value?.[part], locales[lang]);
  assert.equal(typeof result, "string", `${lang} missing ${key}`);
  assert(result.trim() && result !== key, `${lang} untranslated ${key}`);
  return result;
}
async function visibleLinks(locator) {
  return locator.evaluateAll((nodes) =>
    nodes
      .filter(
        (node) =>
          node.getClientRects().length &&
          getComputedStyle(node).visibility !== "hidden"
      )
      .map((node) => ({
        to: node.getAttribute("href"),
        label:
          node.querySelector(".sidebar-nav-label")?.textContent?.trim() ??
          node.textContent.trim(),
      }))
  );
}
async function target44(locator, scene) {
  await locator.scrollIntoViewIfNeeded();
  const box = await locator.boundingBox();
  assert(
    box && box.width >= 44 && box.height >= 44,
    `${scene}: target under 44px: ${JSON.stringify(box)}`
  );
}
test(
  "actual navigation five roles × EN/AR × mobile/desktop (20 scenes)",
  { timeout: 180000 },
  async () => {
    const directory = await mkdtemp(join(tmpdir(), "edeviser-nav-"));
    let server, browser;
    try {
      const outDir = await fixture(directory);
      let origin;
      ({ server, origin } = await serve(outDir));
      browser = await chromium.launch({ headless: true });
      for (const role of roles)
        for (const language of langs)
          for (const width of widths) {
            const scene = `${role}/${language}/${width}`,
              context = await browser.newContext({
                viewport: { width, height: 844 },
                locale: language,
                serviceWorkers: "block",
                reducedMotion: "reduce",
              }),
              page = await context.newPage(),
              errors = [];
            page.on("pageerror", (e) => errors.push(`page: ${e.message}`));
            page.on("requestfailed", (r) =>
              errors.push(
                `request origin: ${new URL(r.url()).origin} ${
                  r.failure()?.errorText
                }`
              )
            );
            await context.route("**/*", (route) => {
              if (new URL(route.request().url()).origin !== origin) {
                errors.push(
                  `external origin: ${new URL(route.request().url()).origin}`
                );
                return route.abort();
              }
              return route.continue();
            });
            try {
              await page.goto(
                `${origin}/${role}/dashboard?role=${role}&language=${language}&assigned=0`,
                { waitUntil: "networkidle" }
              );
              await page.locator("[data-route]").waitFor();
              assert.equal(
                await page.locator("html").getAttribute("dir"),
                language === "ar" ? "rtl" : "ltr",
                scene
              );
              assert.equal(
                await page
                  .locator(".role-app-shell")
                  .evaluate((el) => getComputedStyle(el).direction),
                language === "ar" ? "rtl" : "ltr",
                scene
              );
              const contract = await page.evaluate(() => window.__navContract),
                expected = [...contract.primary, ...contract.more].filter(
                  (item) => item.to !== "/student/surveys"
                );
              assert.deepEqual(
                [...expected.map((item) => item.to)].sort(),
                contract.items
                  .filter((item) => item.to !== "/student/surveys")
                  .map((item) => item.to)
                  .sort(),
                scene
              );
              assert.equal(
                new Set(contract.items.map((item) => item.to)).size,
                contract.items.length,
                scene
              );
              if (width === 390) {
                assert(await page.locator(".new-mobile-tabbar").isVisible());
                await page
                  .getByRole("button", { name: "Open navigation" })
                  .click();
                await page.locator("#mobile-navigation").waitFor();
              } else
                assert.equal(
                  await page.locator(".new-mobile-tabbar").isVisible(),
                  false
                );
              const surface = page.locator(
                  width === 390 ? "#mobile-navigation" : ".app-sidebar"
                ),
                actual = await visibleLinks(surface.locator("a.sidebar-item"));
              assert.deepEqual(
                actual,
                expected.map(({ to, labelKey }) => ({
                  to,
                  label: translated(language, labelKey),
                })),
                `${scene} canonical order/hrefs/labels`
              );
              assert.equal(
                new Set(actual.map((item) => item.to)).size,
                actual.length,
                scene
              );
              await target44(
                surface.locator("a.sidebar-item").first(),
                `${scene} first sidebar`
              );
              await target44(
                surface.locator("a.sidebar-item").last(),
                `${scene} last sidebar`
              );
              if (width === 390) {
                const tabs = contract.tabs;
                assert(tabs.length >= 4 && tabs.length <= 5, scene);
                assert.equal(
                  new Set(tabs.map((item) => item.to)).size,
                  tabs.length,
                  scene
                );
                assert(
                  tabs.every((tab) =>
                    contract.items.some((item) => item.to === tab.to)
                  ),
                  scene
                );
                const seen = await page
                  .locator(".new-mobile-tabbar a")
                  .evaluateAll((nodes) =>
                    nodes.map((node) => ({
                      to: node.getAttribute("href"),
                      label: node.textContent.trim(),
                    }))
                  );
                assert.deepEqual(
                  seen,
                  tabs.map(({ to, labelKey }) => ({
                    to,
                    label: translated(language, labelKey),
                  })),
                  `${scene} mobile core`
                );
                assert(seen.length < contract.items.length, scene);
                await target44(
                  page.locator(".new-mobile-tabbar a").first(),
                  `${scene} first tab`
                );
                await target44(
                  page.locator(".new-mobile-tabbar a").last(),
                  `${scene} last tab`
                );
              }
              if (role === "admin") {
                assert.equal(
                  actual.filter(
                    (item) => item.to === "/admin/settings/configuration"
                  ).length,
                  1,
                  scene
                );
                assert.equal(
                  actual.filter((item) => item.to === "/admin/departments")
                    .length,
                  1,
                  scene
                );
                await surface
                  .locator(
                    'a.sidebar-item[href="/admin/settings/configuration"]'
                  )
                  .focus();
                await page.keyboard.press("Enter");
                await page.locator("[data-configuration-route]").waitFor();
                assert.equal(
                  new URL(page.url()).pathname,
                  "/admin/settings/configuration",
                  scene
                );
              }
              if (width === 390) {
                if (role === "admin") {
                  await page
                    .getByRole("button", { name: "Open navigation" })
                    .click();
                  await page.locator("#mobile-navigation").waitFor();
                }
                const last = page
                    .locator("#mobile-navigation a.sidebar-item")
                    .last(),
                  lastHref = await last.getAttribute("href");
                await last.scrollIntoViewIfNeeded();
                await last.click();
                assert.equal(
                  new URL(page.url()).pathname,
                  lastHref,
                  `${scene} deepest MORE destination unreachable`
                );
                assert.equal(
                  await page.locator("#mobile-navigation").count(),
                  0,
                  `${scene} drawer did not close`
                );
              }
              const dimensions = await page.evaluate(() => ({
                document: document.documentElement.scrollWidth,
                body: document.body.scrollWidth,
                viewport: innerWidth,
              }));
              assert(
                dimensions.document <= width + 1 &&
                  dimensions.body <= width + 1,
                `${scene} horizontal overflow ${JSON.stringify(dimensions)}`
              );
              assert.deepEqual(errors, [], scene);
            } finally {
              await context.close();
            }
          }
      for (const language of langs)
        for (const width of widths) {
          const context = await browser.newContext({
              viewport: { width, height: 844 },
              locale: language,
              serviceWorkers: "block",
            }),
            page = await context.newPage();
          try {
            const errors = [];
            page.on("pageerror", (error) => errors.push(error.message));
            page.on("requestfailed", (request) =>
              errors.push(`failed origin: ${new URL(request.url()).origin}`)
            );
            await context.route("**/*", (route) => {
              const url = new URL(route.request().url());
              if (url.origin === origin) return route.continue();
              errors.push(`external origin: ${url.origin}`);
              return route.abort();
            });
            await page.goto(
              `${origin}/student/dashboard?role=student&language=${language}&assigned=1`,
              { waitUntil: "networkidle" }
            );
            if (width === 390)
              await page
                .getByRole("button", { name: "Open navigation" })
                .click();
            const surface = page.locator(
                width === 390 ? "#mobile-navigation" : ".app-sidebar"
              ),
              contract = await page.evaluate(() => window.__navContract),
              actual = await visibleLinks(surface.locator("a.sidebar-item"));
            assert.deepEqual(
              actual,
              [...contract.primary, ...contract.more].map(
                ({ to, labelKey }) => ({
                  to,
                  label: translated(language, labelKey),
                })
              ),
              `student assigned1 ${language}/${width}`
            );
            assert.equal(
              actual.filter((item) => item.to === "/student/surveys").length,
              1
            );
            assert.deepEqual(
              errors,
              [],
              `student assigned1 ${language}/${width} browser/network errors`
            );
          } finally {
            await context.close();
          }
        }
    } finally {
      if (browser) await browser.close();
      if (server)
        await new Promise((ok, no) =>
          server.close((error) => (error ? no(error) : ok()))
        );
      await rm(directory, { recursive: true, force: true });
    }
  }
);
