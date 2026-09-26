// Closed-loopback regression: actual SearchCommand, Dialog/Input/Button, CSS; synthetic auth/search.
import assert from "node:assert/strict";
import { test } from "node:test";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { chromium, expect } from "@playwright/test";
const root = fileURLToPath(new URL("../../", import.meta.url));
const entry = "/__search_fixture.tsx",
  auth = "\0search-auth",
  search = "\0search-data";
const scenes = ["student", "teacher", "coordinator", "admin", "parent"].flatMap(
  (role) =>
    ["en", "ar"].flatMap((language) =>
      ["light", "dark"].flatMap((theme) =>
        [
          [320, 16],
          [1280, 16],
          [320, 32],
        ].map(([width, scale]) => ({ role, language, theme, width, scale }))
      )
    )
);
const source = `import React from 'react';import {createRoot} from 'react-dom/client';
import {BrowserRouter,useLocation} from 'react-router-dom';import {createInstance} from 'i18next';import {I18nextProvider} from 'react-i18next';
import SearchCommand from '@/components/shared/SearchCommand';import {Button} from '@/components/ui/button';import en from '@/locales/en/common.json';import ar from '@/locales/ar/common.json';import '@/index.css';
const q=new URLSearchParams(location.search),language=q.get('language'),i18n=createInstance();
await i18n.init({lng:language,fallbackLng:false,defaultNS:'common',initAsync:false,resources:{en:{common:en},ar:{common:ar}}});
document.documentElement.lang=language;document.documentElement.dir=i18n.dir();document.documentElement.classList.toggle('dark',q.get('theme')==='dark');document.documentElement.style.fontSize=q.get('scale')+'px';window.__role=q.get('role');
function Fixture(){let route=useLocation();return <main id='main-content' className='role-app-shell' data-role={q.get('role')}><SearchCommand showTrigger/><Button data-shortcut-opener type='button'>Shortcut opener</Button><p data-route>{route.pathname}</p></main>}
createRoot(document.getElementById('root')).render(<I18nextProvider i18n={i18n}><BrowserRouter><Fixture/></BrowserRouter></I18nextProvider>);`;
function sanitize(message, origin) {
  return String(message)
    .replaceAll(origin, "<fixture-origin>")
    .replace(/https?:\/\/[^\s)]+/g, (url) => {
      try {
        return "<" + new URL(url).origin + ">";
      } catch {
        return "<invalid-origin>";
      }
    })
    .slice(0, 400);
}
async function textContrast(dialog, selector) {
  return dialog.evaluate((container, selector) => {
    const text = container.querySelector(selector);
    if (!text) throw new Error("Missing rendered contrast target: " + selector);
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 1;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) throw new Error("Canvas color sampler unavailable");
    function rgba(color) {
      ctx.clearRect(0, 0, 1, 1);
      ctx.fillStyle = color;
      ctx.fillRect(0, 0, 1, 1);
      return [...ctx.getImageData(0, 0, 1, 1).data];
    }
    const background = rgba(getComputedStyle(container).backgroundColor);
    const foreground = rgba(getComputedStyle(text).color);
    if (background[3] !== 255 || foreground[3] !== 255)
      throw new Error("Unsupported translucent contrast paint");
    const luminance = (channels) =>
      channels
        .slice(0, 3)
        .map((value) => {
          const channel = value / 255;
          return channel <= 0.04045
            ? channel / 12.92
            : ((channel + 0.055) / 1.055) ** 2.4;
        })
        .reduce(
          (sum, channel, index) =>
            sum + channel * [0.2126, 0.7152, 0.0722][index],
          0
        );
    const a = luminance(background),
      b = luminance(foreground);
    return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
  }, selector);
}
async function inspect(browser, origin, scene, common) {
  const context = await browser.newContext({
      viewport: { width: scene.width, height: 720 },
      reducedMotion: "reduce",
      serviceWorkers: "block",
    }),
    faults = [],
    id = JSON.stringify(scene);
  try {
    await context.route("**/*", async (route) => {
      let u = new URL(route.request().url());
      if (u.origin === origin) await route.continue();
      else {
        faults.push("outbound " + u.origin);
        await route.abort();
      }
    });
    const page = await context.newPage();
    page.on("pageerror", (error) =>
      faults.push("pageerror " + sanitize(error.message, origin))
    );
    page.on("requestfailed", (request) => {
      let u = new URL(request.url());
      if (u.origin === origin) faults.push("failed " + u.origin);
    });
    page.on("response", (response) => {
      if (response.status() >= 400)
        faults.push(
          "HTTP " + response.status() + " " + new URL(response.url()).origin
        );
    });
    await page.goto(origin + "/?" + new URLSearchParams(scene), {
      waitUntil: "networkidle",
    });
    assert.deepEqual(faults, [], id + " bootstrap faults");
    await expect(page.locator("html")).toHaveAttribute(
      "dir",
      scene.language === "ar" ? "rtl" : "ltr"
    );
    assert.equal(
      await page.locator("html").evaluate((e) => getComputedStyle(e).fontSize),
      scene.scale + "px",
      id + " root scale"
    );
    const trigger = page.getByRole("button", {
        name: common.header.openGlobalSearch,
      }),
      opener =
        scene.width === 1280 ? trigger : page.locator("[data-shortcut-opener]");
    if (scene.width === 1280) {
      await expect(trigger).toBeVisible();
      await trigger.click();
    } else {
      await expect(trigger).toBeHidden();
      await opener.focus();
      await page.keyboard.press("Control+k");
    }
    const dialog = page.getByRole("dialog", { name: common.header.search });
    await expect(dialog).toBeVisible();
    const input = dialog.getByRole("textbox", { name: common.header.search });
    await expect(input).toBeFocused({ timeout: 3000 });
    const close = dialog.getByRole("button", {
      name: common.buttons.close,
      exact: true,
    });
    await expect(close).toHaveCount(1);
    assert.equal(
      await dialog.locator('[data-slot="dialog-close"]').count(),
      1,
      id + " duplicate close"
    );
    assert.equal(
      await dialog.getByRole("button", { name: "Close", exact: true }).count(),
      scene.language === "en" ? 1 : 0,
      id + " untranslated default close"
    );
    await dialog.evaluate(async (e) => {
      await Promise.all(
        e
          .getAnimations({ subtree: true })
          .filter((a) => Number.isFinite(a.effect?.getComputedTiming().endTime))
          .map((a) => a.finished)
      );
    });
    const g = await dialog.evaluate((e) => {
      let i = e.querySelector('input[name="global-search"]'),
        c = e.querySelector('[data-slot="dialog-close"]'),
        r = i?.parentElement;
      let rect = (n) => {
        let { left, right, top, bottom, width, height } =
          n.getBoundingClientRect();
        return { left, right, top, bottom, width, height };
      };
      return {
        dialog: rect(e),
        input: i && rect(i),
        close: c && rect(c),
        row: r && rect(r),
        ring: r && getComputedStyle(r).boxShadow,
        outline: r && getComputedStyle(r).outlineStyle,
        focused: document.activeElement === i,
        closeName: c?.getAttribute("aria-label"),
        inputName: i?.getAttribute("aria-label"),
        autocomplete: i?.getAttribute("autocomplete"),
        doc:
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
        body: document.body.scrollWidth - document.body.clientWidth,
      };
    });
    assert.equal(g.closeName, common.buttons.close, id + " localized close");
    assert.equal(g.inputName, common.header.search, id + " labeled input");
    assert.equal(g.autocomplete, "off", id + " autocomplete");
    assert(
      g.focused && g.close && g.input && g.row,
      id + " delayed focus/geometry " + JSON.stringify(g)
    );
    assert(
      g.close.width >= 44 && g.close.height >= 44,
      id + " 44px close " + JSON.stringify(g)
    );
    assert(
      g.input.width >= 96 && g.input.height > 0,
      id + " collapsed input " + JSON.stringify(g)
    );
    assert(
      g.input.right <= g.close.left + 0.5 ||
        g.close.right <= g.input.left + 0.5 ||
        g.input.bottom <= g.close.top + 0.5 ||
        g.close.bottom <= g.input.top + 0.5,
      id + " input/close overlap " + JSON.stringify(g)
    );
    assert(
      g.close.top >= g.row.top - 1 &&
        g.close.bottom <= g.row.bottom + 1 &&
        g.input.top >= g.row.top - 1 &&
        g.input.bottom <= g.row.bottom + 1,
      id + " controls out of row " + JSON.stringify(g)
    );
    assert(
      g.close.left >= -0.5 &&
        g.close.right <= scene.width + 0.5 &&
        g.dialog.left >= -0.5 &&
        g.dialog.right <= scene.width + 0.5,
      id + " viewport bounds " + JSON.stringify(g)
    );
    assert.equal(g.doc, 0, id + " document overflow " + JSON.stringify(g));
    assert.equal(g.body, 0, id + " body overflow " + JSON.stringify(g));
    if (scene.language === "ar")
      assert(
        g.close.left - g.row.left < g.row.right - g.close.right &&
          (g.input.bottom <= g.close.top + 0.5 ||
            g.close.right <= g.input.left + 0.5),
        id + " RTL end " + JSON.stringify(g)
      );
    else
      assert(
        g.row.right - g.close.right < g.close.left - g.row.left &&
          (g.input.bottom <= g.close.top + 0.5 ||
            g.input.right <= g.close.left + 0.5),
        id + " LTR end " + JSON.stringify(g)
      );
    assert(
      g.ring !== "none" || g.outline !== "none",
      id + " focus-visible group " + JSON.stringify(g)
    );
    assert(
      (await textContrast(dialog, 'input[name="global-search"]')) >= 4.5,
      id + " input text contrast below 4.5:1"
    );
    async function reopen() {
      if (scene.width === 1280) await trigger.click();
      else {
        await opener.focus();
        await page.keyboard.press("Control+k");
      }
      await expect(dialog).toBeVisible();
      await expect(input).toBeFocused();
      await expect(input).toHaveValue("");
    }
    async function closed(reason) {
      await expect(dialog).toHaveCount(0);
      await expect(opener).toBeFocused();
      await reopen();
      assert.equal(await input.inputValue(), "", id + " reset after " + reason);
    }
    await input.fill("algebra");
    await close.click();
    await closed("X");
    await input.fill("algebra");
    await page.keyboard.press("Escape");
    await closed("Escape");
    await input.fill("algebra");
    await page.keyboard.press("Control+k");
    await closed("Ctrl+K");
    await input.fill("algebra");
    await page.keyboard.press("Meta+k");
    await closed("Cmd+K");
    await input.fill("algebra");
    const result = dialog.getByRole("button", { name: /Algebra Fixture/ });
    await expect(result).toBeVisible({ timeout: 5000 });
    await expect(
      dialog.getByText(common.header.searchType.course, { exact: true })
    ).toBeVisible();
    assert(
      (await textContrast(dialog, ".max-h-80 button p.font-medium")) >= 4.5,
      id + " result title contrast below 4.5:1"
    );
    assert(
      (await textContrast(
        dialog,
        ".max-h-80 .mb-2:has(button p.font-medium) > p"
      )) >= 4.5,
      id + " result category contrast below 4.5:1"
    );
    assert(
      (await textContrast(dialog, ".max-h-80 button p.text-xs")) >= 4.5,
      id + " result description contrast below 4.5:1"
    );
    await result.click();
    await expect(dialog).toHaveCount(0);
    await expect(page.locator("[data-route]")).toHaveText("/fixture/algebra");
    await expect(opener).toBeFocused();
    await reopen();
    const command = dialog
      .locator('.max-h-80 button[data-slot="button"]')
      .first();
    await expect(command).toBeVisible();
    await command.click();
    await expect(dialog).toHaveCount(0);
    assert.match(
      await page.locator("[data-route]").textContent(),
      new RegExp("^/" + scene.role + "/"),
      id + " role command route"
    );
    await expect(opener).toBeFocused();
    await reopen();
    assert.deepEqual(faults, [], id + " page/network failures");
  } finally {
    await context.close();
  }
}
test(
  "SearchCommand: five roles x EN/AR x light/dark x 320/1280/320 root32",
  { timeout: 300000 },
  async (t) => {
    const cache = await mkdtemp(join(tmpdir(), "edeviser-search-vite-"));
    let vite, browser;
    try {
      const common = Object.fromEntries(
        await Promise.all(
          ["en", "ar"].map(async (language) => [
            language,
            JSON.parse(
              await readFile(
                resolve(root, "src/locales/" + language + "/common.json"),
                "utf8"
              )
            ),
          ])
        )
      );
      vite = await createServer({
        root,
        configFile: false,
        cacheDir: cache,
        publicDir: false,
        envDir: cache,
        envPrefix: "SEARCH_FIXTURE_PUBLIC_",
        resolve: { alias: { "@": resolve(root, "src") } },
        plugins: [
          react(),
          tailwindcss(),
          {
            name: "search-fixture-hook-mocks",
            enforce: "pre",
            resolveId(id, importer) {
              if (
                id === "@/hooks/useAuth" ||
                id.replaceAll("\\", "/").endsWith("/src/hooks/useAuth")
              )
                return auth;
              if (
                id === "@/hooks/useGlobalSearch" ||
                id.replaceAll("\\", "/").endsWith("/src/hooks/useGlobalSearch")
              )
                return search;
            },
            load(id) {
              if (id === auth)
                return "export function useAuth(){return {role:window.__role}}";
              if (id === search)
                return "export function useGlobalSearch(q){return {data:q.toLowerCase()==='algebra'?[{id:'fixture',type:'course',title:'Algebra Fixture',description:'Synthetic course',url:'/fixture/algebra'}]:[],isLoading:false}}";
            },
          },
          {
            name: "search-fixture-entry",
            enforce: "pre",
            configureServer(server) {
              server.middlewares.use(async (req, res, next) => {
                if (new URL(req.url, "http://localhost").pathname !== "/")
                  return next();
                res.setHeader("Content-Type", "text/html; charset=utf-8");
                res.end(
                  await server.transformIndexHtml(
                    req.url,
                    '<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="root"></div><script type="module" src="' +
                      entry +
                      '"></script></body></html>'
                  )
                );
              });
            },
            resolveId(id) {
              if (id === entry) return id;
            },
            load(id) {
              if (id === entry) return source;
            },
          },
        ],
        server: { host: "127.0.0.1", port: 0, strictPort: false },
      });
      await vite.listen();
      let addr = vite.httpServer.address();
      assert(addr && typeof addr !== "string", "Vite did not bind loopback");
      let origin = "http://127.0.0.1:" + addr.port;
      browser = await chromium.launch({ headless: true });
      for (const scene of scenes)
        await t.test(
          `${scene.role}/${scene.language}/${scene.theme}/${scene.width}px/root${scene.scale}`,
          async () => inspect(browser, origin, scene, common[scene.language])
        );
    } finally {
      await browser?.close();
      await vite?.close();
      await rm(cache, { recursive: true, force: true });
    }
  }
);
