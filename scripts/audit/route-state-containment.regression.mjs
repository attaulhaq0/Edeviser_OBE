// Real RoleAppShell and route boundaries, CSS, i18n, browser; business seams mocked.
// Eight EN/AR × light/dark × 390/1280 scenes; no AppRouter/backend/Preview/DB claim.
import assert from "node:assert/strict";
import { test } from "node:test";
import { createServer } from "node:http";
import { mkdtemp, mkdir, readFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve, sep, extname } from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
const repo = fileURLToPath(new URL("../../", import.meta.url));
const req = createRequire(join(repo, "package.json"));
const { build, normalizePath } = await import(
  pathToFileURL(req.resolve("vite")).href
);
const { default: react } = await import(
  pathToFileURL(req.resolve("@vitejs/plugin-react")).href
);
const { default: tailwindcss } = await import(
  pathToFileURL(req.resolve("@tailwindcss/vite")).href
);
const { chromium, expect } = req("@playwright/test");
const exact = (name, replacement) => ({
  find: new RegExp("^" + name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "$"),
  replacement,
});
const entry = `
import React,{useEffect} from 'react';import{createRoot}from'react-dom/client';
import{BrowserRouter,useNavigate,useLocation}from'react-router-dom';
import i18next from'i18next';import{I18nextProvider,initReactI18next}from'react-i18next';
import RoleAppShell from'@/app/RoleAppShell';import en from'@/locales/en/common.json';import ar from'@/locales/ar/common.json';import'@/index.css';
const q=new URL(location.href).searchParams,lang=q.get('language'),theme=q.get('theme');
document.documentElement.lang=lang;document.documentElement.dir=lang==='ar'?'rtl':'ltr';document.documentElement.classList.toggle('dark',theme==='dark');
window.__fixture={mounts:0,navigate:null};
const Slow=React.lazy(()=>new Promise(()=>{}));
function BrokenPage(){throw Error('FIXTURE_CAUGHT_PAGE_SENTINEL')}
function BrokenRail(){throw Error('FIXTURE_CAUGHT_RAIL_SENTINEL')}
function Scene(){const nav=useNavigate(),route=useLocation();useEffect(()=>{window.__fixture.mounts++;window.__fixture.navigate=nav;return()=>{window.__fixture.mounts--}},[nav]);
const page=route.pathname==='/slow'?<Slow/>:route.pathname==='/broken'?<BrokenPage/>:<section data-healthy-page>Healthy main</section>;
const rail=route.pathname==='/rail'?<BrokenRail/>:<aside data-healthy-rail className="hidden xl:col-start-3 xl:row-start-1 xl:block">Healthy rail</aside>;
return <RoleAppShell userRole="student" rail={rail}>{page}</RoleAppShell>}
async function boot(){const i=i18next.createInstance();await i.use(initReactI18next).init({lng:lang,fallbackLng:'en',defaultNS:'common',resources:{en:{common:en},ar:{common:ar}},interpolation:{escapeValue:false}});createRoot(document.getElementById('root')).render(<I18nextProvider i18n={i}><BrowserRouter><Scene/></BrowserRouter></I18nextProvider>)}boot();`;
const stubs = `export const useAuth=()=>({user:{id:'fixture'},profile:{id:'fixture',role:'student',full_name:'Fixture Learner'}});
export const useSurveyAssignmentsCount=()=>({data:0});export const useIntentPrefetch=()=>()=>({});export const prefetchRoute=()=>{};
export const usePageViewLogger=()=>{};export const isAiSurfaceEnabled=()=>false;export const captureAnalyticsEvent=()=>{};
export const supabase={};export default function Ancillary(){return null}`;
async function fixture(directory) {
  const root = join(directory, "fixture"),
    out = join(directory, "dist"),
    stub = join(root, "stubs.jsx");
  await mkdir(join(root, "env"), { recursive: true });
  await writeFile(stub, stubs);
  await writeFile(join(root, "entry.jsx"), entry);
  await writeFile(
    join(root, "index.html"),
    '<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="root"></div><script type="module" src="/entry.jsx"></script></body></html>'
  );
  const scope = {
    name: "route-state-css-source",
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
  const mock = [
    "@/lib/supabase",
    "@/hooks/useAuth",
    "@/hooks/useSurveyAssignmentsCount",
    "@/hooks/useIntentPrefetch",
    "@/lib/routePrefetch",
    "@/hooks/usePageViewLogger",
    "@/ai/lib/featureGate",
    "@/lib/analyticsConsent",
    "@/components/shared/RoleHeaderStats",
    "@/components/shared/StudentHeaderStats",
    "@/components/shared/GuidedTour",
    "@/components/shared/EmailVerificationBanner",
    "@/components/shared/EDeviserIntelligencePanel",
    "@/components/shared/NotificationBell",
    "@/components/shared/ProfileDropdown",
    "@/components/shared/SearchCommand",
  ];
  const aliases = mock.map((name) => exact(name, stub));
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
    envPrefix: "ROUTE_FIXTURE_PUBLIC_",
    publicDir: false,
    cacheDir: join(directory, "cache"),
    plugins: [react(), scope, tailwindcss()],
    resolve: { alias: aliases, dedupe: ["react", "react-dom"] },
    build: {
      outDir: out,
      emptyOutDir: true,
      minify: false,
      sourcemap: false,
      chunkSizeWarningLimit: 4000,
    },
  });
  return out;
}
async function serve(out) {
  const mime = {
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
      const pathname = decodeURIComponent(
          new URL(request.url, "http://127.0.0.1").pathname
        ),
        path = resolve(out, "." + pathname);
      if (path !== out && !path.startsWith(out + sep)) {
        response.writeHead(403);
        response.end();
        return;
      }
      const file = pathname.startsWith("/assets/")
          ? path
          : join(out, "index.html"),
        data = await readFile(file);
      response.writeHead(200, {
        "content-type": mime[extname(file)] ?? "application/octet-stream",
        "cache-control": "no-store",
      });
      response.end(data);
    } catch (error) {
      response.writeHead(error?.code === "ENOENT" ? 404 : 500);
      response.end("Fixture asset missing");
    }
  });
  await new Promise((ok, no) => {
    server.once("error", no);
    server.listen(0, "127.0.0.1", ok);
  });
  const addr = server.address();
  assert(addr && typeof addr === "object");
  return { server, origin: `http://127.0.0.1:${addr.port}` };
}
const locale = Object.fromEntries(
  await Promise.all(
    ["en", "ar"].map(async (language) => [
      language,
      JSON.parse(
        await readFile(
          join(repo, "src/locales", language, "common.json"),
          "utf8"
        )
      ),
    ])
  )
);
async function noOverflow(page, label) {
  const size = await page.evaluate(() => ({
    scroll: document.documentElement.scrollWidth,
    width: innerWidth,
  }));
  assert(
    size.scroll <= size.width + 1,
    `${label}: overflow ${JSON.stringify(size)}`
  );
}
async function checkAction(container, label, copy) {
  const action = container.getByRole("button", {
    name: copy.reload,
    exact: true,
  });
  await expect(action).toBeVisible();
  const box = await action.boundingBox();
  assert(
    box && box.width >= 44 && box.height >= 44,
    `${label}: reload target under 44px`
  );
  await action.focus();
  assert(
    await action.evaluate((node) => node === document.activeElement),
    `${label}: reload not keyboard focusable`
  );
}
test(
  "actual shell containment: eight language/theme/viewport contexts",
  { timeout: 180000 },
  async () => {
    const directory = await mkdtemp(join(tmpdir(), "edeviser-route-state-"));
    let server, browser;
    try {
      const out = await fixture(directory);
      let origin;
      ({ server, origin } = await serve(out));
      browser = await chromium.launch({ headless: true });
      for (const language of ["en", "ar"])
        for (const theme of ["light", "dark"])
          for (const width of [390, 1280]) {
            const label = `${language}/${theme}/${width}`,
              context = await browser.newContext({
                viewport: { width, height: 844 },
                locale: language,
                serviceWorkers: "block",
                reducedMotion: "reduce",
              }),
              page = await context.newPage(),
              unexpected = [];
            page.on("pageerror", (error) =>
              unexpected.push(`pageerror ${error.message}`)
            );
            page.on("console", (message) => {
              if (
                message.type() === "error" &&
                !/FIXTURE_CAUGHT_(PAGE|RAIL)_SENTINEL/.test(message.text())
              )
                unexpected.push(`console ${message.text()}`);
            });
            page.on("requestfailed", (request) =>
              unexpected.push(
                `request origin ${new URL(request.url()).origin} ${
                  request.failure()?.errorText
                }`
              )
            );
            page.on("response", (response) => {
              if (response.status() >= 400)
                unexpected.push(
                  `HTTP ${response.status()} origin ${
                    new URL(response.url()).origin
                  }`
                );
            });
            await context.route("**/*", (route) => {
              if (new URL(route.request().url()).origin !== origin) {
                unexpected.push(
                  `external origin ${new URL(route.request().url()).origin}`
                );
                return route.abort();
              }
              return route.continue();
            });
            try {
              await page.goto(
                `${origin}/slow?language=${language}&theme=${theme}`,
                { waitUntil: "networkidle" }
              );
              const main = page.locator("#main-content"),
                shell = page.locator(".role-app-shell"),
                rail = page.locator("[data-healthy-rail]"),
                copy = locale[language].routeState;
              await expect(
                main.getByRole("status", { name: copy.loading })
              ).toBeVisible();
              await expect(rail).toBeVisible({ visible: width === 1280 });
              await expect(shell.locator(".app-sidebar")).toBeVisible({
                visible: width === 1280,
              });
              assert.equal(
                await page.locator("html").getAttribute("dir"),
                language === "ar" ? "rtl" : "ltr",
                label
              );
              assert.equal(
                await shell.evaluate((el) => getComputedStyle(el).direction),
                language === "ar" ? "rtl" : "ltr",
                label
              );
              assert.equal(
                await page.evaluate(() =>
                  document.documentElement.classList.contains("dark")
                ),
                theme === "dark",
                label
              );
              assert.equal(
                await page.evaluate(() => window.__fixture.mounts),
                1,
                label
              );
              await noOverflow(page, `${label} loading`);
              await page.evaluate(() => window.__fixture.navigate("/broken"));
              await expect(
                main.getByRole("heading", { name: copy.title })
              ).toBeVisible();
              await expect(main.getByRole("alert")).toHaveText(copy.message);
              await checkAction(main, `${label} page`, copy);
              assert(
                !/FIXTURE_CAUGHT_PAGE_SENTINEL/.test(
                  await page.locator("body").innerText()
                ),
                `${label}: exception text visible`
              );
              await expect(rail).toBeVisible({ visible: width === 1280 });
              await expect(shell).toBeVisible();
              await noOverflow(page, `${label} page failure`);
              await page.evaluate(() => window.__fixture.navigate("/healthy"));
              await expect(main.locator("[data-healthy-page]")).toBeVisible();
              await expect(main.getByRole("alert")).toHaveCount(0);
              assert.equal(
                await page.evaluate(() => window.__fixture.mounts),
                1,
                `${label}: shell remounted`
              );
              await page.evaluate(() => window.__fixture.navigate("/rail"));
              await expect(main.locator("[data-healthy-page]")).toBeVisible();
              const failedRail = shell.locator("aside[aria-labelledby]");
              await expect(failedRail).toBeVisible({ visible: width === 1280 });
              await expect(failedRail.locator("[role=alert]")).toHaveCount(1);
              await expect(failedRail.locator("[role=alert]")).toHaveText(
                copy.message
              );
              await expect(main.getByRole("alert")).toHaveCount(0);
              if (width === 1280)
                await checkAction(failedRail, `${label} rail`, copy);
              assert(
                !/FIXTURE_CAUGHT_RAIL_SENTINEL/.test(
                  await page.locator("body").innerText()
                ),
                `${label}: rail exception text visible`
              );
              await noOverflow(page, `${label} rail failure`);
              assert.deepEqual(unexpected, [], `${label}: browser diagnostics`);
            } catch (error) {
              console.error(label, unexpected);
              throw error;
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
