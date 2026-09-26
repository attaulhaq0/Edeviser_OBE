// Closed-loopback Chromium test of actual DataTable, CSS, locales and primitives.
// Synthetic fixture: not auth, backend, Preview, deployment or screenshot evidence.
import assert from "node:assert/strict";
import { test } from "node:test";
import { mkdtemp, rm, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { chromium, expect } from "@playwright/test";
const root = fileURLToPath(new URL("../../", import.meta.url));
const entry = "/__table_fixture.tsx";
const source = `
import React,{useState} from 'react';
import {createRoot} from 'react-dom/client';
import {createInstance} from 'i18next';
import {I18nextProvider} from 'react-i18next';
import {DataTable} from '@/components/shared/DataTable';
import {Button} from '@/components/ui/button';
import en from '@/locales/en/common.json';
import ar from '@/locales/ar/common.json';
import '@/index.css';
const q=new URLSearchParams(location.search),language=q.get('language'),mode=q.get('mode');
const i18n=createInstance();await i18n.init({lng:language,fallbackLng:false,defaultNS:'common',initAsync:false,resources:{en:{common:en},ar:{common:ar}}});
document.documentElement.lang=language;document.documentElement.dir=i18n.dir();document.documentElement.classList.toggle('dark',q.get('theme')==='dark');document.documentElement.style.fontSize=q.get('scale')==='32'?'32px':'16px';
const rows=Array.from({length:12},(_,i)=>({id:String(i+1),name:'Learner '+String(i+1).padStart(2,'0'),detail:'Academic evidence '+'W'.repeat(100)}));
const columns=[{accessorKey:'name',sortDescFirst:false,header:({column})=><Button variant='ghost' onClick={column.getToggleSortingHandler()}>Sort fixture name</Button>},{accessorKey:'detail',header:'Evidence',enableSorting:false}];
function Fixture(){const [page,setPage]=useState(1),[sorting,setSorting]=useState([]),[fetching,setFetching]=useState(mode==='stale'||mode==='fetch'),[placeholder,setPlaceholder]=useState(mode==='stale');const server=['server','stale','fetch','manual','unknown'].includes(mode);const data=['loading','empty'].includes(mode)?[]:server?rows.slice((page-1)*3,page*3):rows;const props={columns,data,isLoading:mode==='loading',isFetching:fetching,isPlaceholderData:placeholder,getRowId:row=>row.id};const pagination=server?{page,pageSize:3,totalCount:mode==='unknown'?undefined:7,onPageChange:next=>{window.__pageCalls.push(next);setPage(next);setFetching(false);setPlaceholder(false);}}:{};window.__finishPending=()=>{setFetching(false);setPlaceholder(false);};return <main id='fixture' className='mx-auto w-full max-w-5xl min-w-0 px-4 py-6'>{mode==='manual'?<DataTable {...props} {...pagination} sorting={sorting} onSortingChange={setSorting} manualSorting/>:<DataTable {...props} {...pagination}/>}</main>}
window.__pageCalls=[];createRoot(document.getElementById('root')).render(<I18nextProvider i18n={i18n}><Fixture/></I18nextProvider>);
`;
const scenes = ["en", "ar"].flatMap((language) =>
  ["light", "dark"].flatMap((theme) =>
    [
      [320, 16],
      [390, 16],
      [1280, 16],
      [320, 32],
    ].flatMap(([width, scale]) =>
      ["client", "server"].map((mode) => ({
        language,
        theme,
        width,
        scale,
        mode,
      }))
    )
  )
);
for (const language of ["en", "ar"])
  for (const theme of ["light", "dark"])
    for (const mode of [
      "stale",
      "fetch",
      "loading",
      "empty",
      "manual",
      "unknown",
    ])
      scenes.push({ language, theme, width: 320, scale: 32, mode });
async function geometry(page, s, pagerExpected = true) {
  const g = await page.evaluate(() => {
    const rect = (e) => {
      if (!e) return null;
      const { left, right, top, bottom, width, height } =
        e.getBoundingClientRect();
      return { left, right, top, bottom, width, height };
    };
    const wrapper = document.querySelector(
        "#fixture [data-slot=table-container]"
      ),
      pager = wrapper?.parentElement?.nextElementSibling;
    return {
      overflow:
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
      bodyOverflow: document.body.scrollWidth - document.body.clientWidth,
      dir: getComputedStyle(document.documentElement).direction,
      font: getComputedStyle(document.documentElement).fontSize,
      pager: rect(pager),
      count: rect(pager?.querySelector("p")),
      buttons: [...(pager?.querySelectorAll("button") || [])].map(rect),
      wrapper: rect(wrapper),
      table: rect(document.querySelector("[data-slot=table]")),
    };
  });
  const id = JSON.stringify(s);
  assert.equal(g.overflow, 0, `${id}: document overflow ${JSON.stringify(g)}`);
  assert.equal(g.bodyOverflow, 0, `${id}: body overflow ${JSON.stringify(g)}`);
  assert.equal(g.dir, s.language === "ar" ? "rtl" : "ltr", id);
  assert.equal(g.font, `${s.scale}px`, id);
  if (!pagerExpected) return;
  assert(
    g.pager && g.count && g.buttons.length === 2,
    `${id}: missing pager ${JSON.stringify(g)}`
  );
  const {
    pager,
    count,
    buttons: [back, next],
  } = g;
  for (const [name, b] of [
    ["count", count],
    ["back", back],
    ["next", next],
  ]) {
    assert(
      b.left >= -0.5 && b.right <= s.width + 0.5,
      `${id}: ${name} clipped ${JSON.stringify(g)}`
    );
    assert(
      b.left >= pager.left - 0.5 &&
        b.right <= pager.right + 0.5 &&
        b.top >= pager.top - 0.5 &&
        b.bottom <= pager.bottom + 0.5,
      `${id}: ${name} outside pager ${JSON.stringify(g)}`
    );
  }
  for (const b of [back, next])
    assert(
      b.width >= 44 && b.height >= 44,
      `${id}: target below 44px ${JSON.stringify(g)}`
    );
  const intersect = (a, b) =>
    a.left < b.right - 0.5 &&
    b.left < a.right - 0.5 &&
    a.top < b.bottom - 0.5 &&
    b.top < a.bottom - 0.5;
  assert(
    !intersect(count, back) &&
      !intersect(count, next) &&
      !intersect(back, next),
    `${id}: overlapping pager ${JSON.stringify(g)}`
  );
  assert(
    s.language === "ar" ? back.left > next.left : back.left < next.left,
    `${id}: wrong direction ${JSON.stringify(g)}`
  );
  assert(
    g.wrapper && g.wrapper.left >= -0.5 && g.wrapper.right <= s.width + 0.5,
    `${id}: table wrapper escaped viewport ${JSON.stringify(g)}`
  );
  assert(
    g.table && g.table.width > g.wrapper.width,
    `${id}: synthetic long rows did not exercise internal scroll`
  );
}
async function inspect(browser, origin, s, c) {
  const context = await browser.newContext({
      viewport: { width: s.width, height: 850 },
      reducedMotion: "reduce",
      serviceWorkers: "block",
    }),
    faults = [];
  try {
    await context.route("**/*", async (route) => {
      const url = new URL(route.request().url());
      if (url.origin === origin) await route.continue();
      else {
        faults.push(`blocked external origin ${url.origin}`);
        await route.abort();
      }
    });
    const page = await context.newPage();
    page.on("pageerror", (e) => faults.push(`pageerror ${e.message}`));
    page.on("requestfailed", (r) => {
      if (new URL(r.url()).origin === origin)
        faults.push(`failed loopback origin ${new URL(r.url()).origin}`);
    });
    await page.goto(`${origin}/?${new URLSearchParams(s)}`, {
      waitUntil: "load",
    });
    try {
      await expect(page.locator("#fixture")).toBeVisible();
    } catch (error) {
      throw new Error(
        "fixture failed: " + JSON.stringify(faults) + "; " + error.message
      );
    }
    await expect(page.locator("html")).toHaveAttribute("lang", s.language);
    await expect(page.locator("html")).toHaveAttribute(
      "dir",
      s.language === "ar" ? "rtl" : "ltr"
    );
    assert.equal(
      await page.locator("html").evaluate((e) => e.classList.contains("dark")),
      s.theme === "dark"
    );
    if (s.mode === "loading") {
      await expect(page.getByRole("table")).toHaveCount(0);
      await expect(
        page.getByRole("status", { name: c.tableSorting.loading })
      ).toBeVisible();
      await geometry(page, s, false);
    } else {
      await expect(page.getByRole("table")).toBeVisible();
      const back = page.getByRole("button", {
          name: c.buttons.back,
          exact: true,
        }),
        next = page.getByRole("button", { name: c.buttons.next, exact: true });
      await expect(back).toBeVisible();
      await expect(next).toBeVisible();
      await geometry(page, s);
      if (s.mode === "empty") {
        await expect(
          page.getByText(c.pagination.noResults, { exact: true })
        ).toBeVisible();
        await expect(back).toBeDisabled();
        await expect(next).toBeDisabled();
      } else if (s.mode === "unknown") {
        await expect(
          page.getByText(
            c.tableSorting.pageUnknownCount.replace("{{page}}", "1"),
            { exact: true }
          )
        ).toBeVisible();
        await expect(next).toBeDisabled();
      } else {
        await expect(
          page.getByText(
            c.pagination.pageOf
              .replace("{{page}}", "1")
              .replace("{{total}}", String(s.mode === "client" ? 2 : 3)),
            { exact: true }
          )
        ).toBeVisible();
        await expect(back).toBeDisabled();
        await expect(next).toBeEnabled();
      }
      if (["stale", "fetch"].includes(s.mode)) {
        await expect(page.getByRole("status")).toHaveText(
          s.mode === "stale"
            ? c.tableSorting.previousResults
            : c.tableSorting.updatingResults
        );
        await expect(page.locator('#fixture [aria-busy="true"]')).toHaveCount(
          1
        );
        assert.equal(
          await page
            .getByRole("status")
            .evaluate((e) => !!e.closest('[aria-busy="true"]')),
          false,
          "status inside busy region"
        );
        await page.evaluate(() => window.__finishPending());
        await expect(page.getByRole("status")).toHaveCount(0);
        await expect(page.locator('#fixture [aria-busy="true"]')).toHaveCount(
          0
        );
      }
      if (s.mode === "manual") {
        await page.getByRole("button", { name: "Sort fixture name" }).click();
        await expect(
          page.getByRole("columnheader", { name: "Sort fixture name" })
        ).toHaveAttribute("aria-sort", "ascending");
        await expect(
          page.getByRole("cell", { name: "Learner 01" })
        ).toBeVisible();
        await expect(page.getByText(c.tableSorting.pageOnly)).toHaveCount(0);
      }
      if (["client", "server"].includes(s.mode)) {
        await expect(
          page.getByRole("cell", { name: "Learner 01" })
        ).toBeVisible();
        await next.click();
        await expect(
          page.getByRole("cell", {
            name: s.mode === "client" ? "Learner 11" : "Learner 04",
          })
        ).toBeVisible();
        await expect(back).toBeEnabled();
        if (s.mode === "server") {
          assert.deepEqual(await page.evaluate(() => window.__pageCalls), [2]);
          await next.click();
          await expect(
            page.getByRole("cell", { name: "Learner 07" })
          ).toBeVisible();
          assert.deepEqual(
            await page.evaluate(() => window.__pageCalls),
            [2, 3]
          );
        }
        await expect(next).toBeDisabled();
        await geometry(page, s);
        await back.click();
        await expect(
          page.getByRole("cell", {
            name: s.mode === "client" ? "Learner 01" : "Learner 04",
          })
        ).toBeVisible();
        if (s.mode === "server")
          assert.deepEqual(
            await page.evaluate(() => window.__pageCalls),
            [2, 3, 2]
          );
        await geometry(page, s);
      }
    }
    assert.deepEqual(
      faults,
      [],
      `${JSON.stringify(s)} browser/network failures`
    );
  } finally {
    await context.close();
  }
}
test(
  "real DataTable responsive bilingual theme state matrix",
  { timeout: 240_000 },
  async (t) => {
    const cacheDir = await mkdtemp(join(tmpdir(), "edeviser-table-vite-"));
    let vite, browser;
    try {
      const locales = Object.fromEntries(
        await Promise.all(
          ["en", "ar"].map(async (language) => [
            language,
            JSON.parse(
              await readFile(
                resolve(root, `src/locales/${language}/common.json`),
                "utf8"
              )
            ),
          ])
        )
      );
      vite = await createServer({
        root,
        configFile: false,
        cacheDir,
        resolve: { alias: { "@": resolve(root, "src") } },
        plugins: [
          react(),
          tailwindcss(),
          {
            name: "in-memory-table-fixture",
            enforce: "pre",
            configureServer(server) {
              server.middlewares.use(async (req, res, next) => {
                if (new URL(req.url, "http://localhost").pathname !== "/")
                  return next();
                res.setHeader("Content-Type", "text/html; charset=utf-8");
                res.end(
                  await server.transformIndexHtml(
                    req.url,
                    `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="root"></div><script type="module" src="${entry}"></script></body></html>`
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
      const origin = `http://127.0.0.1:${address.port}`;
      browser = await chromium.launch({ headless: true });
      for (const scene of scenes)
        await t.test(
          `${scene.language}/${scene.theme}/${scene.width}px/root${scene.scale}/${scene.mode}`,
          async () => inspect(browser, origin, scene, locales[scene.language])
        );
    } finally {
      await browser?.close();
      await vite?.close();
      await rm(cacheDir, { recursive: true, force: true });
    }
  }
);
