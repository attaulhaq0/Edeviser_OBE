// Closed-loopback actual planner dialogs: synthetic data, not authenticated/backend evidence.
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
const entry = "/__planner_dialog_fixture.tsx";
const scenes = ["task", "session"].flatMap((kind) =>
  ["en", "ar"].flatMap((language) =>
    ["light", "dark"].flatMap((theme) =>
      [
        [320, 16],
        [1280, 16],
        [320, 32],
      ].map(([width, scale]) => ({ kind, language, theme, width, scale }))
    )
  )
);
const source = `import React,{useRef,useState} from 'react';import {createRoot} from 'react-dom/client';import {createInstance} from 'i18next';import {I18nextProvider} from 'react-i18next';
import CreateTaskDialog from '@/components/shared/CreateTaskDialog';import CreateSessionDialog from '@/components/shared/CreateSessionDialog';import {Button} from '@/components/ui/button';import en from '@/locales/en/common.json';import ar from '@/locales/ar/common.json';import '@/index.css';
const q=new URLSearchParams(location.search),kind=q.get('kind'),language=q.get('language'),i18n=createInstance();await i18n.init({lng:language,fallbackLng:false,defaultNS:'common',initAsync:false,resources:{en:{common:en},ar:{common:ar}}});document.documentElement.lang=language;document.documentElement.dir=i18n.dir();document.documentElement.classList.toggle('dark',q.get('theme')==='dark');document.documentElement.style.fontSize=q.get('scale')+'px';
const courses=[{id:'11111111-1111-4111-8111-111111111111',name:'Synthetic K–12 course',clos:[{id:'22222222-2222-4222-8222-222222222222',title:'Synthetic outcome'}]}];window.__audit={changes:[],submissions:[]};
function Fixture(){const openerRef=useRef(null),[open,setOpen]=useState(false),[pending,setPending]=useState(false);window.__audit.setPending=setPending;const onOpenChange=next=>{window.__audit.changes.push(next);setOpen(next)};const props={open,onOpenChange,onSubmit:data=>window.__audit.submissions.push(data),isPending:pending,returnFocusRef:openerRef,defaultDate:'2026-09-26',courses};return <main><Button ref={openerRef} type='button' data-opener onClick={()=>setOpen(true)}>Open planner fixture</Button>{kind==='task'?<CreateTaskDialog {...props}/>:<CreateSessionDialog {...props}/>}</main>};createRoot(document.getElementById('root')).render(<I18nextProvider i18n={i18n}><Fixture/></I18nextProvider>);`;
function clean(message, origin) {
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
async function measure(dialog) {
  return dialog.evaluate((e) => {
    const box = (n) => {
      if (!n) return null;
      const { left, right, top, bottom, width, height } =
        n.getBoundingClientRect();
      return { left, right, top, bottom, width, height };
    };
    const footer = e.querySelector('[data-slot="dialog-footer"]');
    return {
      dialog: box(e),
      dialogGrid: getComputedStyle(e).gridTemplateColumns,
      form: box(e.querySelector("form")),
      formMinWidth: getComputedStyle(e.querySelector("form")).minWidth,
      close: box(e.querySelector('[data-slot="dialog-close"]')),
      cancel: box(footer?.querySelector('button[type="button"]')),
      create: box(footer?.querySelector('button[type="submit"]')),
      fields: [
        ...e.querySelectorAll(
          'input[type="date"],input[type="time"],[data-slot="select-trigger"]'
        ),
      ].map((n) => ({
        type: n.getAttribute("type") ?? "select",
        box: box(n),
        minWidth: getComputedStyle(n).minWidth,
        width: getComputedStyle(n).width,
        parent: box(n.parentElement),
        grandparent: box(n.parentElement?.parentElement),
        parentGrid: getComputedStyle(n.parentElement).gridTemplateColumns,
        classes: n.className,
      })),
      scroll: e.scrollHeight,
      client: e.clientHeight,
      overflow: getComputedStyle(e).overflowY,
      doc:
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
      body: document.body.scrollWidth - document.body.clientWidth,
    };
  });
}
async function inspect(browser, origin, s, copy) {
  const id = JSON.stringify(s),
    context = await browser.newContext({
      viewport: { width: s.width, height: 720 },
      reducedMotion: "reduce",
      serviceWorkers: "block",
    }),
    faults = [];
  try {
    await context.route("**/*", async (route) => {
      const u = new URL(route.request().url());
      if (u.origin === origin) await route.continue();
      else {
        faults.push("external <blocked-origin>");
        await route.abort();
      }
    });
    const page = await context.newPage();
    page.on("pageerror", (e) =>
      faults.push("pageerror " + clean(e.message, origin))
    );
    page.on("requestfailed", (r) => {
      const u = new URL(r.url());
      if (u.origin === origin) faults.push("failed <fixture-origin>");
    });
    page.on("response", (r) => {
      if (r.status() >= 400)
        faults.push(
          "HTTP " +
            r.status() +
            " " +
            (new URL(r.url()).origin === origin
              ? "<fixture-origin>"
              : "<blocked-origin>")
        );
    });
    await page.goto(origin + "/?" + new URLSearchParams(s), {
      waitUntil: "networkidle",
    });
    assert.deepEqual(faults, [], id + " bootstrap faults");
    await expect(page.locator("html")).toHaveAttribute(
      "dir",
      s.language === "ar" ? "rtl" : "ltr"
    );
    assert.equal(
      await page.locator("html").evaluate((e) => getComputedStyle(e).fontSize),
      s.scale + "px"
    );
    const opener = page.locator("[data-opener]");
    await opener.click();
    const title = s.kind === "task" ? "Create Task" : "Create Study Session",
      submitText = s.kind === "task" ? "Create Task" : "Create Session",
      dialog = page.getByRole("dialog", { name: title });
    await expect(dialog).toBeVisible();
    await dialog.evaluate(async (e) => {
      await Promise.all(
        e
          .getAnimations({ subtree: true })
          .filter((a) => Number.isFinite(a.effect?.getComputedTiming().endTime))
          .map((a) => a.finished)
      );
    });
    const close = dialog.getByRole("button", {
      name: copy.buttons.close,
      exact: true,
    });
    await expect(close).toHaveCount(1);
    assert.equal(
      await dialog.locator('[data-slot="dialog-close"]').count(),
      1,
      id + " duplicate close"
    );
    assert.equal(
      await close.getAttribute("aria-label"),
      copy.buttons.close,
      id + " localized close"
    );
    if (s.language === "ar") {
      assert.notEqual(copy.buttons.close, "Close");
      assert.equal(
        await dialog
          .getByRole("button", { name: "Close", exact: true })
          .count(),
        0,
        id + " English duplicate"
      );
      assert.equal(
        await dialog.getByText("Close", { exact: true }).count(),
        0,
        id + " generated sr-only English"
      );
    }
    const m = await measure(dialog);
    assert(
      m.close && m.close.width >= 44 && m.close.height >= 44,
      id + " close >=44 " + JSON.stringify(m)
    );
    assert(
      m.dialog.left >= -1 &&
        m.dialog.right <= s.width + 1 &&
        m.dialog.top >= -1 &&
        m.dialog.bottom <= 721,
      id + " dialog viewport " + JSON.stringify(m)
    );
    assert(
      m.close.left >= m.dialog.left - 1 && m.close.right <= m.dialog.right + 1,
      id + " close contained " + JSON.stringify(m)
    );
    if (s.language === "ar")
      assert(
        m.close.left - m.dialog.left < m.dialog.right - m.close.right,
        id + " RTL inline end " + JSON.stringify(m)
      );
    else
      assert(
        m.dialog.right - m.close.right < m.close.left - m.dialog.left,
        id + " LTR inline end " + JSON.stringify(m)
      );
    assert.equal(m.doc, 0, id + " document overflow " + JSON.stringify(m));
    assert.equal(m.body, 0, id + " body overflow " + JSON.stringify(m));
    assert.equal(m.overflow, "auto", id + " scrollable dialog");
    if (s.kind === "session" && s.width === 320)
      assert(
        m.scroll > m.client + 10,
        id + " long form scrolls to footer " + JSON.stringify(m)
      );
    assert(
      m.cancel && m.cancel.width >= 44 && m.cancel.height >= 44,
      id + " Cancel >=44 " + JSON.stringify(m)
    );
    assert(
      m.create && m.create.width >= 44 && m.create.height >= 44,
      id + " Create >=44 " + JSON.stringify(m)
    );
    for (const f of m.fields)
      assert(
        f.box.left >= -1 && f.box.right <= s.width + 1 && f.box.width > 0,
        id +
          " date/time/select viewport " +
          JSON.stringify({
            field: f,
            dialog: m.dialog,
            dialogGrid: m.dialogGrid,
            form: m.form,
            formMinWidth: m.formMinWidth,
          })
      );
    const cancel = dialog.getByRole("button", { name: "Cancel", exact: true }),
      create = dialog.getByRole("button", { name: submitText, exact: true });
    await cancel.scrollIntoViewIfNeeded();
    await expect(cancel).toBeInViewport();
    await create.scrollIntoViewIfNeeded();
    await expect(create).toBeInViewport();
    // Only Close is translated; the other real form controls remain English in Arabic.
    await dialog
      .getByRole("textbox", { name: "Title" })
      .fill("Synthetic unsent draft");
    const course = dialog.getByRole("combobox", {
      name: s.kind === "task" ? /Course/ : "Course",
    });
    await course.click();
    const option = page.getByRole("option", { name: "Synthetic K–12 course" });
    await expect(option).toBeVisible();
    const layer = await option.evaluate((n) => {
      const floating = n.closest('[data-slot="select-content"]'),
        modal = document.querySelector('[data-slot="dialog-content"]');
      return {
        portal: !modal?.contains(n),
        floating: floating && Number(getComputedStyle(floating).zIndex),
        modal: modal && Number(getComputedStyle(modal).zIndex),
      };
    });
    assert(
      layer.portal && layer.floating > layer.modal,
      id + " select portal layering " + JSON.stringify(layer)
    );
    await option.click();
    await expect(page.getByRole("listbox")).toHaveCount(0);
    await expect(dialog).toBeVisible();
    assert.equal(
      await page.evaluate(() => window.__audit.submissions.length),
      0,
      id + " select did not submit"
    );
    await close.focus();
    await page.keyboard.press("Shift+Tab");
    assert(
      await dialog.evaluate((e) => e.contains(document.activeElement)),
      id + " reverse focus trap"
    );
    await close.focus();
    await page.keyboard.press("Tab");
    assert(
      await dialog.evaluate((e) => e.contains(document.activeElement)),
      id + " forward focus trap"
    );
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
    await expect(opener).toBeFocused();
    assert.deepEqual(
      await page.evaluate(() => window.__audit.changes),
      [false],
      id + " Escape callback"
    );
    assert.equal(
      await page.evaluate(() => window.__audit.submissions.length),
      0,
      id + " Escape did not submit"
    );
    await opener.click();
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("textbox", { name: "Title" })).toHaveValue(
      "Synthetic unsent draft"
    );
    await expect(
      dialog.getByRole("combobox", {
        name: s.kind === "task" ? /Course/ : "Course",
      })
    ).toContainText("Synthetic K–12 course");
    await cancel.click();
    await expect(dialog).toHaveCount(0);
    await expect(opener).toBeFocused();
    assert.deepEqual(
      await page.evaluate(() => window.__audit.changes),
      [false, false],
      id + " Cancel callback"
    );
    assert.equal(
      await page.evaluate(() => window.__audit.submissions.length),
      0,
      id + " Cancel did not submit"
    );
    await opener.click();
    await expect(dialog).toBeVisible();
    await page.evaluate(() => window.__audit.setPending(true));
    await expect(create).toBeDisabled();
    await expect(close).toBeEnabled(); // Existing X dismissal remains allowed during pending.
    await close.click();
    await expect(dialog).toHaveCount(0);
    await expect(opener).toBeFocused();
    assert.deepEqual(
      await page.evaluate(() => window.__audit.changes),
      [false, false, false],
      id + " pending X callback"
    );
    assert.equal(
      await page.evaluate(() => window.__audit.submissions.length),
      0,
      id + " X did not submit"
    );
    assert.deepEqual(faults, [], id + " network/page faults");
  } finally {
    await context.close();
  }
}
test(
  "planner task/session × EN/AR × light/dark × mobile/desktop/200%-text (24 contexts)",
  { timeout: 240000 },
  async (t) => {
    const cache = await mkdtemp(join(tmpdir(), "edeviser-planner-close-vite-"));
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
        envPrefix: "PLANNER_FIXTURE_PUBLIC_",
        resolve: { alias: { "@": resolve(root, "src") } },
        plugins: [
          react(),
          tailwindcss(),
          {
            name: "in-memory-planner-fixture",
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
      for (const s of scenes)
        await t.test(
          [s.kind, s.language, s.theme, s.width + "px/root" + s.scale].join(
            "/"
          ),
          async () => inspect(browser, origin, s, common[s.language])
        );
    } finally {
      await browser?.close();
      await vite?.close();
      await rm(cache, { recursive: true, force: true });
    }
  }
);
