// Closed-loopback Chromium fixture of actual generated Dialog, localized adoption,
// ConfirmDialog, canonical CSS and EN/AR keys; synthetic content is not route proof.
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
const entry = "/__dialog_fixture.tsx";
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

const source = `
import React,{useState} from 'react';
import {createRoot} from 'react-dom/client';
import {createInstance} from 'i18next';
import {I18nextProvider} from 'react-i18next';
import {Dialog,DialogTrigger,DialogContent,DialogHeader,DialogTitle,DialogDescription,DialogFooter,DialogClose} from '@/components/ui/dialog';
import {LocalizedDialogContent} from '@/components/shared/LocalizedDialogContent';
import {ConfirmDialog} from '@/components/shared/ConfirmDialog';
import {Button} from '@/components/ui/button';
import en from '@/locales/en/common.json';import ar from '@/locales/ar/common.json';
import '@/index.css';
const q=new URLSearchParams(location.search),language=q.get('language'),role=q.get('role');
const i18n=createInstance();
await i18n.init({lng:language,fallbackLng:false,defaultNS:'common',initAsync:false,resources:{en:{common:en},ar:{common:ar}}});
document.documentElement.lang=language;
document.documentElement.dir=i18n.dir();
document.documentElement.classList.toggle('dark',q.get('theme')==='dark');
document.documentElement.style.fontSize=q.get('scale')+'px';
function Fixture(){
  const [confirm,setConfirm]=useState(false),[action,setAction]=useState(0);
  return <main className='role-app-shell' data-role={role}>
    <div data-shell-accent style={{color:'var(--role-accent)'}}>Accent</div>
    <Dialog><DialogTrigger asChild><Button data-trigger>Open dialog</Button></DialogTrigger>
      <LocalizedDialogContent aria-describedby='fixture-description'>
        <DialogHeader><DialogTitle>Dialog fixture title</DialogTitle>
          <DialogDescription id='fixture-description'>Long content</DialogDescription></DialogHeader>
        <div>{Array.from({length:48},(_,n)=><p key={n}>#{n} Synthetic academic evidence and measured reassessment require attributable context and careful interpretation.</p>)}
          <a href='#destination' data-bottom-link onClick={()=>window.__linkClicks++}>Reachable bottom link</a>
          <span id='destination'>Destination</span></div>
        <DialogFooter><Button data-bottom-action onClick={()=>setAction(n=>n+1)}>Bottom action {action}</Button>
          <DialogClose asChild><Button variant='outline' data-footer-close>Dismiss footer</Button></DialogClose></DialogFooter>
      </LocalizedDialogContent></Dialog>
    <Dialog><DialogTrigger asChild><Button data-generated-trigger>Generated close</Button></DialogTrigger>
      <DialogContent><DialogHeader><DialogTitle>Generated title</DialogTitle>
        <DialogDescription>Generated geometry</DialogDescription></DialogHeader></DialogContent></Dialog>
    <Button data-confirm-trigger onClick={()=>setConfirm(true)}>Confirm fixture</Button>
    <ConfirmDialog open={confirm} onOpenChange={setConfirm} title='Confirm title'
      description='Confirm description' onConfirm={()=>setConfirm(false)}/>
  </main>;
}
window.__linkClicks=0;
createRoot(document.getElementById('root')).render(<I18nextProvider i18n={i18n}><Fixture/></I18nextProvider>);
`;

function clean(message, origin) {
  return String(message)
    .replaceAll(origin, "<fixture-origin>")
    .replace(/https?:\/\/[^\s)]+/g, (url) => {
      try {
        return "<" + new URL(url).origin + ">";
      } catch {
        return "<invalid-url>";
      }
    })
    .slice(0, 300);
}

async function geometry(dialog) {
  return dialog.evaluate((element) => {
    const rect = (node) => {
      const r = node.getBoundingClientRect();
      return {
        left: r.left,
        right: r.right,
        top: r.top,
        bottom: r.bottom,
        width: r.width,
        height: r.height,
      };
    };
    const style = getComputedStyle(element);
    const close =
      element.querySelector('[data-slot="dialog-close"][aria-label]') ??
      element.querySelector('[data-slot="dialog-close"]');
    const header = element.querySelector('[data-slot="dialog-header"]');
    return {
      content: rect(element),
      close: close && rect(close),
      max: style.maxBlockSize,
      overflow: style.overflowY,
      overscroll: style.overscrollBehaviorY,
      scroll: element.scrollHeight,
      client: element.clientHeight,
      accent: style.getPropertyValue("--role-accent").trim(),
      parent: element.parentElement?.getAttribute("data-role"),
      align: header && getComputedStyle(header).textAlign,
      doc:
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
      body: document.body.scrollWidth - document.body.clientWidth,
      label: close?.getAttribute("aria-label"),
      viewport: { width: innerWidth, height: innerHeight },
    };
  });
}

async function inspect(browser, origin, scene, copy) {
  const context = await browser.newContext({
    viewport: { width: scene.width, height: 720 },
    reducedMotion: "reduce",
    serviceWorkers: "block",
  });
  const faults = [],
    id = JSON.stringify(scene);
  try {
    await context.route("**/*", async (route) => {
      const url = new URL(route.request().url());
      if (url.origin === origin) await route.continue();
      else {
        faults.push("external " + url.origin);
        await route.abort();
      }
    });
    const page = await context.newPage();
    page.on("pageerror", (error) =>
      faults.push("pageerror " + clean(error.message, origin))
    );
    page.on("requestfailed", (request) => {
      const url = new URL(request.url());
      if (url.origin === origin) faults.push("failed " + url.origin);
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
    await expect(page.locator("html")).toHaveAttribute(
      "dir",
      scene.language === "ar" ? "rtl" : "ltr"
    );
    assert.equal(
      await page.locator("html").evaluate((e) => getComputedStyle(e).fontSize),
      scene.scale + "px"
    );
    const accent = await page
      .locator(".role-app-shell")
      .evaluate((e) =>
        getComputedStyle(e).getPropertyValue("--role-accent").trim()
      );
    await page.locator("[data-trigger]").click();
    const dialog = page.getByRole("dialog", { name: "Dialog fixture title" });
    await expect(dialog).toBeVisible();
    await dialog.evaluate(async (e) => {
      await Promise.all(
        e
          .getAnimations({ subtree: true })
          .filter((a) => Number.isFinite(a.effect?.getComputedTiming().endTime))
          .map((a) => a.finished)
      );
    });
    const g = await geometry(dialog);
    assert.equal(
      g.accent,
      accent,
      id + " portal accent versus shell computed paint"
    );
    assert.notEqual(g.parent, scene.role, id + " actual body portal");
    assert.equal(
      g.max,
      g.viewport.height - 2 * scene.scale + "px",
      id + " generated slot max block"
    );
    assert.equal(g.overflow, "auto", id + " scroll containment");
    assert.equal(g.overscroll, "contain", id + " scroll chaining");
    assert(
      g.scroll > g.client + 100,
      id + " synthetic body does not overflow " + JSON.stringify(g)
    );
    assert(
      g.content.height <= g.viewport.height - 2 * scene.scale + 2,
      id + " max height " + JSON.stringify(g)
    );
    assert(
      g.content.top >= -1 && g.content.bottom <= g.viewport.height + 1,
      id + " viewport clipping " + JSON.stringify(g)
    );
    assert.equal(g.doc, 0, id + " document horizontal overflow");
    assert.equal(g.body, 0, id + " body horizontal overflow");
    assert.equal(
      g.label,
      copy.buttons.close,
      id + " translated close aria-label"
    );
    assert.equal(
      await dialog.locator('[data-slot="dialog-close"]').count(),
      2,
      id + " one icon close plus footer dismissal"
    );
    const icon = dialog.getByRole("button", {
      name: copy.buttons.close,
      exact: true,
    });
    await expect(icon).toHaveCount(1);
    assert(
      g.close.width >= 44 && g.close.height >= 44,
      id + " 44px close target " + JSON.stringify(g)
    );
    assert(
      g.close.top >= g.content.top - 1 &&
        g.close.left >= -1 &&
        g.close.right <= scene.width + 1,
      id + " close viewport " + JSON.stringify(g)
    );
    if (scene.language === "ar")
      assert(
        g.close.left - g.content.left < g.content.right - g.close.right,
        id + " RTL inline-end " + JSON.stringify(g)
      );
    else
      assert(
        g.content.right - g.close.right < g.close.left - g.content.left,
        id + " LTR inline-end " + JSON.stringify(g)
      );
    if (scene.width === 1280)
      assert.equal(g.align, "start", id + " desktop logical text-align:start");
    await dialog.locator("[data-bottom-link]").scrollIntoViewIfNeeded();
    await dialog.locator("[data-bottom-link]").click();
    assert.equal(
      await page.evaluate(() => window.__linkClicks),
      1,
      id + " bottom link reachability"
    );
    const action = dialog.locator("[data-bottom-action]");
    await action.click();
    await expect(action).toHaveText("Bottom action 1");
    await icon.focus();
    await page.keyboard.press("Shift+Tab");
    assert(
      await dialog.evaluate((e) => e.contains(document.activeElement)),
      id + " backwards focus trap"
    );
    await icon.focus();
    await page.keyboard.press("Tab");
    assert(
      await dialog.evaluate((e) => e.contains(document.activeElement)),
      id + " forwards focus trap"
    );
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
    await expect(page.locator("[data-trigger]")).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(dialog).toBeVisible();
    await dialog
      .getByRole("button", { name: copy.buttons.close, exact: true })
      .click();
    await expect(dialog).toHaveCount(0);
    await expect(page.locator("[data-trigger]")).toBeFocused();
    // The raw generated close is NOT claimed translated or 44px; wrapper owns those.
    await page.locator("[data-generated-trigger]").click();
    const generated = page.getByRole("dialog", { name: "Generated title" });
    await expect(generated).toBeVisible();
    await generated.evaluate(async (e) => {
      await Promise.all(
        e
          .getAnimations({ subtree: true })
          .filter((a) => Number.isFinite(a.effect?.getComputedTiming().endTime))
          .map((a) => a.finished)
      );
    });
    const raw = await geometry(generated);
    assert.equal(raw.accent, accent, id + " generated portal accent");
    if (scene.language === "ar")
      assert(
        raw.close.left - raw.content.left < raw.content.right - raw.close.right,
        id + " generated RTL close " + JSON.stringify(raw)
      );
    if (scene.width === 1280)
      assert.equal(raw.align, "start", id + " generated header logical start");
    await page.keyboard.press("Escape");
    await expect(generated).toHaveCount(0);
    await page.locator("[data-confirm-trigger]").click();
    const confirm = page.getByRole("dialog", { name: "Confirm title" });
    await expect(confirm).toBeVisible();
    assert.equal(
      await confirm.locator('[data-slot="dialog-close"]').count(),
      0,
      id + " explicit-false close"
    );
    await confirm
      .getByRole("button", { name: copy.buttons.cancel, exact: true })
      .click();
    await expect(confirm).toHaveCount(0);
    assert.deepEqual(faults, [], id + " page/network failures");
  } finally {
    await context.close();
  }
}

test(
  "portal: five roles x EN/AR x light/dark x 320/1280/320 root32",
  { timeout: 240_000 },
  async (t) => {
    const cache = await mkdtemp(join(tmpdir(), "edeviser-dialog-vite-"));
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
        envPrefix: "DIALOG_FIXTURE_PUBLIC_",
        resolve: { alias: { "@": resolve(root, "src") } },
        plugins: [
          react(),
          tailwindcss(),
          {
            name: "in-memory-dialog-fixture",
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
      const address = vite.httpServer.address();
      assert(
        address && typeof address !== "string",
        "Vite did not bind loopback"
      );
      const origin = "http://127.0.0.1:" + address.port;
      browser = await chromium.launch({ headless: true });
      for (const scene of scenes)
        await t.test(
          scene.role +
            "/" +
            scene.language +
            "/" +
            scene.theme +
            "/" +
            scene.width +
            "px/root" +
            scene.scale,
          async () => inspect(browser, origin, scene, common[scene.language])
        );
    } finally {
      await browser?.close();
      await vite?.close();
      await rm(cache, { recursive: true, force: true });
    }
  }
);
