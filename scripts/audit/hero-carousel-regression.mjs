// Isolated real-Chromium checks for the actual shared carousel, locales, Button,
// preference context and production CSS. No auth/DB/Preview/server mutation.
// Run: node --test scripts/audit/hero-carousel-regression.mjs
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
const entry = `
import React, {useState} from "react";
import {createRoot} from "react-dom/client";
import "@/index.css";
import i18n from "@/lib/i18n";
import HeroCarousel from "@/design-system/patterns/HeroCarousel";
import {Button} from "@/components/ui/button";
import {AccessibilityPreferencesContext} from "@/providers/AccessibilityPreferencesContext";
function Scene(){
  const [reduced,setReduced]=useState(false);
  const [theme,setTheme]=useState("light");
  const [count,setCount]=useState(3);
  window.__carousel={setReduced,setCount,setTheme,changeLanguage:(language)=>i18n.changeLanguage(language)};
  const slides=[0,1,2].slice(0,count).map((number)=><div key={number} className="min-h-[126px] p-5"><Button type="button" aria-label={"Slide action "+number}>Slide action {number}</Button></div>);
  return <AccessibilityPreferencesContext.Provider value={{controls:{effective:{reduced_animations:reduced}}}}><HeroCarousel theme={theme} slides={slides}/></AccessibilityPreferencesContext.Provider>;
}
createRoot(document.getElementById("root")).render(<Scene/>);
`;

async function fixture(directory) {
  const root = join(directory, "fixture"),
    outDir = join(directory, "dist");
  await mkdir(root, { recursive: true });
  await writeFile(join(root, "entry.jsx"), entry);
  await writeFile(
    join(root, "index.html"),
    '<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="root"></div><script type="module" src="/entry.jsx"></script></body></html>'
  );
  const sourceScope = {
    name: "carousel-fixture-source-scope",
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
  }));
  alias.push({ find: "@", replacement: join(repository, "src") });
  await build({
    root,
    configFile: false,
    envDir: join(root, "env"),
    publicDir: false,
    cacheDir: join(directory, "cache"),
    plugins: [react(), sourceScope, tailwindcss()],
    resolve: { alias, dedupe: ["react", "react-dom"] },
    build: { outDir, emptyOutDir: true, chunkSizeWarningLimit: 4000 },
    define: { "process.env.NODE_ENV": JSON.stringify("production") },
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
        outDir,
        "." + decodeURIComponent(path === "/" ? "/index.html" : path)
      );
      if (!file.startsWith(outDir + sep))
        throw new Error("Unsafe fixture path");
      let bytes;
      try {
        bytes = await readFile(file);
      } catch {
        if (path.startsWith("/assets/")) {
          res.statusCode = 404;
          return res.end("Missing fixture asset");
        }
        bytes = await readFile(join(outDir, "index.html"));
        res.setHeader("Content-Type", "text/html");
      }
      res.setHeader("Cache-Control", "no-store");
      res.setHeader(
        "Content-Type",
        mime[extname(file)] ?? "application/octet-stream"
      );
      res.end(bytes);
    } catch (error) {
      res.statusCode = 500;
      res.end(String(error));
    }
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  return {
    base: `http://127.0.0.1:${server.address().port}`,
    close: () => new Promise((resolve) => server.close(resolve)),
  };
}

async function check(page, language) {
  const root = page.getByRole("region", {
    name: language === "ar" ? "أبرز الأخبار" : "Highlights",
  });
  await expect(root).toHaveAttribute("dir", language === "ar" ? "rtl" : "ltr");
  const next = page.getByRole("button", {
    name: language === "ar" ? "الشريحة التالية" : "Next slide",
  });
  const prev = page.getByRole("button", {
    name: language === "ar" ? "الشريحة السابقة" : "Previous slide",
  });
  const dot = page.getByRole("button", {
    name: language === "ar" ? "انتقل إلى الشريحة 2" : "Go to slide 2",
  });
  const pause = page.getByRole("button", {
    name:
      language === "ar"
        ? "إيقاف تبديل الشرائح تلقائياً"
        : "Pause automatic slides",
  });
  for (const target of [prev, next, dot, pause]) {
    const rect = await target.boundingBox();
    assert(
      rect && rect.width >= 44 && rect.height >= 44,
      `Target below 44px: ${rect?.width}x${rect?.height}`
    );
  }
  await expect(
    root.getByRole("button", { name: "Slide action 0" })
  ).toBeVisible();
  assert.equal(
    await root
      .locator('[role="group"][aria-roledescription="slide"][inert]')
      .count(),
    2
  );
  await root.getByRole("button", { name: "Slide action 0" }).focus();
  await page.keyboard.press("Tab");
  assert.notEqual(
    await page.evaluate(() =>
      document.activeElement?.getAttribute("aria-label")
    ),
    "Slide action 1",
    "Inactive slide entered tab order"
  );
  await next.click();
  await expect(
    root.getByRole("button", { name: "Slide action 1" })
  ).toBeVisible();
  await expect(dot).toHaveAttribute("aria-current", "true");
  await expect(root.getByRole("status")).toHaveText(
    language === "ar" ? "2 من 3" : "2 of 3"
  );
  assert.equal(
    await root
      .locator('[role="group"][aria-roledescription="slide"][inert]')
      .count(),
    2
  );
  const transformed = await root
    .locator('[dir="' + (language === "ar" ? "rtl" : "ltr") + '"]')
    .first()
    .evaluate((el) => getComputedStyle(el).transform);
  assert.notEqual(transformed, "none", "Slide movement missing");
  await expect(
    page.getByRole("button", {
      name:
        language === "ar"
          ? "استئناف تبديل الشرائح تلقائياً"
          : "Resume automatic slides",
    })
  ).toBeVisible();
  try {
    await expect
      .poll(() =>
        root.evaluate((el) => {
          const slide = el.querySelector(
            '[aria-roledescription="slide"]:not([inert])'
          );
          if (!slide) return Infinity;
          const outer = el.getBoundingClientRect(),
            inner = slide.getBoundingClientRect();
          return Math.abs(
            el.dir === "rtl"
              ? inner.right - outer.right
              : inner.left - outer.left
          );
        })
      )
      .toBeLessThan(1);
  } catch (error) {
    console.error(
      "Carousel geometry",
      await root.evaluate((el) => {
        const slide = el.querySelector(
            '[aria-roledescription="slide"]:not([inert])'
          ),
          track = slide?.parentElement;
        const box = (node) => {
          const r = node?.getBoundingClientRect();
          return r && { x: r.x, right: r.right, width: r.width };
        };
        return {
          region: box(el),
          regionScrollLeft: el.scrollLeft,
          track: box(track),
          slide: box(slide),
          active: document.activeElement?.getAttribute("aria-label"),
          transform: track && getComputedStyle(track).transform,
          doc: document.documentElement.scrollWidth,
        };
      })
    );
    throw error;
  }
  const rect = await root
    .locator('[aria-roledescription="slide"]:not([inert])')
    .boundingBox();
  assert(rect, "No active slide for native touch");
  const start = {
    x: rect.x + rect.width / 2,
    y: rect.y + Math.min(rect.height / 2, 50),
    id: 1,
  };
  const end = {
    ...start,
    x: start.x + (language === "ar" ? 90 : -90),
    y: start.y + 5,
  };
  const cdp = await page.context().newCDPSession(page);
  try {
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [start],
    });
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [end],
    });
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });
  } finally {
    await cdp.detach();
  }
  const third = page.getByRole("button", {
    name: language === "ar" ? "انتقل إلى الشريحة 3" : "Go to slide 3",
  });
  await expect(third).toHaveAttribute("aria-current", "true");
  await expect(
    root.getByRole("button", { name: "Slide action 2" })
  ).toBeVisible();
  const overflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth
  );
  assert(overflow <= 0, `Horizontal page overflow: ${overflow}`);
  return { targets: 4, slide: 2 };
}

test(
  "actual carousel bilingual narrow/desktop controls and stored/OS reduction",
  { timeout: 120000 },
  async () => {
    const directory = await mkdtemp(join(tmpdir(), "edeviser-carousel-s11-"));
    let host, browser;
    try {
      host = await fixture(directory);
      browser = await chromium.launch({ headless: true });
      for (const language of ["en", "ar"])
        for (const width of [320, 1280]) {
          const context = await browser.newContext({
            viewport: { width, height: 900 },
            hasTouch: true,
            reducedMotion: "no-preference",
            serviceWorkers: "block",
          });
          try {
            await context.addInitScript(
              (language) => localStorage.setItem("edeviser-language", language),
              language
            );
            const page = await context.newPage();
            const errors = [];
            page.on("pageerror", (error) => errors.push(error.message));
            page.on("console", (message) => {
              if (message.type() === "error")
                errors.push("console: " + message.text());
            });
            page.on("requestfailed", (request) =>
              errors.push(
                "request: " + request.url() + " " + request.failure()?.errorText
              )
            );
            await page.goto(host.base, { waitUntil: "load" });
            if (width === 320)
              await page.addStyleTag({ content: ":root{font-size:20px}" });
            try {
              await expect(page.getByRole("region")).toBeVisible();
            } catch (error) {
              console.error("Browser boot diagnostics", errors);
              throw error;
            }
            await page.evaluate(
              async (language) => window.__carousel.changeLanguage(language),
              language
            );
            const result = await check(page, language);
            assert.deepEqual(
              errors,
              [],
              `Browser errors: ${errors.join(" / ")}`
            );
            console.log(
              `Carousel ${language} ${width}: ${JSON.stringify(result)}`
            );
          } finally {
            await context.close();
          }
        }
      // Dark inverse controls keep the same 20%-white hover intent after
      // moving its paint into the named CSS owner; not baseline approval.
      for (const language of ["en", "ar"]) {
        const context = await browser.newContext({
          viewport: { width: 1280, height: 900 },
          serviceWorkers: "block",
        });
        try {
          await context.addInitScript(
            (locale) => localStorage.setItem("edeviser-language", locale),
            language
          );
          const page = await context.newPage();
          const errors = [];
          page.on("pageerror", (error) => errors.push(error.message));
          await page.goto(host.base, { waitUntil: "load" });
          await page.evaluate(async (locale) => {
            document.documentElement.classList.add("dark");
            await window.__carousel.changeLanguage(locale);
            window.__carousel.setTheme("dark");
          }, language);
          const dot = page.getByRole("button", {
            name: language === "ar" ? "انتقل إلى الشريحة 2" : "Go to slide 2",
          });
          await expect(dot).toBeVisible();
          await dot.hover();
          // Button has a native color transition; poll computed paint, never sample mid-transition.
          await expect
            .poll(() =>
              dot.evaluate(
                (element) => getComputedStyle(element).backgroundColor
              )
            )
            .toMatch(/^rgba?\(255,\s*255,\s*255,\s*0\.2\)$/);
          const paint = await dot.evaluate((element) => ({
            hover: getComputedStyle(element).backgroundColor,
            token: getComputedStyle(document.documentElement)
              .getPropertyValue("--hero-inverse-control-hover")
              .trim(),
          }));
          assert.match(paint.hover, /^rgba?\(255,\s*255,\s*255,\s*0\.2\)$/);
          assert.match(paint.token, /^(?:rgba?\(255,\s*255,\s*255,\s*0\.20?\)|#fff3)$/i);
          assert.deepEqual(errors, []);
          console.log(
            `Carousel ${language} dark inverse hover: ${paint.hover}`
          );
        } finally {
          await context.close();
        }
      }
      for (const mode of ["os", "stored"]) {
        const context = await browser.newContext({
          viewport: { width: 390, height: 900 },
          reducedMotion: mode === "os" ? "reduce" : "no-preference",
          serviceWorkers: "block",
        });
        try {
          const page = await context.newPage();
          await page.goto(host.base);
          const root = page.getByRole("region");
          await expect(root).toBeVisible();
          if (mode === "stored") {
            await expect(
              page.getByRole("button", { name: "Pause automatic slides" })
            ).toBeVisible();
            await page.evaluate(() => window.__carousel.setReduced(true));
          }
          await expect(
            page.getByRole("button", { name: "Pause automatic slides" })
          ).toHaveCount(0);
          await expect(
            root
              .locator('[aria-roledescription="slide"]')
              .first()
              .locator("xpath=..")
          ).toHaveCSS("transition-duration", "0s");
          await page.getByRole("button", { name: "Next slide" }).click();
          await expect(
            root.getByRole("button", { name: "Slide action 1" })
          ).toBeVisible();
          console.log(
            `Carousel ${mode} reduction: manual navigation preserved`
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
