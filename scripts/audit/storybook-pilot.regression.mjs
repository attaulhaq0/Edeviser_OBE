// Review actual built Storybook pilot stories, not app routes or image baselines.
// First run npm run build:storybook:pilot. No Preview, DB, public server or network.
import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const root = fileURLToPath(new URL("../../", import.meta.url));
const output = resolve(root, "test-results/storybook-pilot");
const IDs = [
  "patterns-statepanel--loading",
  "patterns-statepanel--empty",
  "patterns-statepanel--error",
  "patterns-statepanel--partial",
  "patterns-statepanel--permission",
  "patterns-statepanel--local-action",
  "patterns-readingsurfaces--default",
  "patterns-readingsurfaces--extended-copy",
];
const cases = IDs.slice(0, 5);
const mime = {
  ".html": "text/html",
  ".js": "application/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

async function serveStatic() {
  const exists = await stat(resolve(output, "index.json")).catch(() => null);
  if (!exists?.isFile())
    throw new Error(
      "Missing built story index; run npm run build:storybook:pilot explicitly"
    );
  const index = JSON.parse(
    await readFile(resolve(output, "index.json"), "utf8")
  );
  assert.deepEqual(
    Object.keys(index.entries).sort(),
    [...IDs].sort(),
    "Pilot includes only eight reviewed real-source stories"
  );
  const server = createServer(async (request, response) => {
    try {
      const pathname = new URL(request.url, "http://pilot").pathname;
      const path = resolve(
        output,
        "." + decodeURIComponent(pathname === "/" ? "/index.html" : pathname)
      );
      if (!path.startsWith(output + sep))
        throw new Error("Unsafe Storybook asset path");
      response.setHeader(
        "Content-Type",
        mime[extname(path)] ?? "application/octet-stream"
      );
      response.setHeader("Cache-Control", "no-store");
      response.end(await readFile(path));
    } catch {
      response.statusCode = 404;
      response.end("Missing pilot asset");
    }
  });
  await new Promise((done) => server.listen(0, "127.0.0.1", done));
  return {
    origin: `http://127.0.0.1:${server.address().port}`,
    close: () => new Promise((done) => server.close(done)),
  };
}

async function inspect(page, id, language, theme, textScale, highContrast) {
  const shell = page.locator("#storybook-root");
  await expect(shell).toBeVisible();
  const state = id.slice("patterns-statepanel--".length);
  const common = JSON.parse(
    await readFile(resolve(root, `src/locales/${language}/common.json`), "utf8")
  );
  if (cases.includes(id)) {
    if (state === "loading") {
      const skeleton = shell.getByRole("status");
      await expect(skeleton).toHaveAttribute("aria-busy", "true");
      await expect(skeleton).toHaveAttribute(
        "aria-label",
        common.status.loading
      );
    } else {
      const text =
        state === "error" ? common.errors.generic : common.statePanel[state];
      assert(typeof text === "string" && text.length > 0);
      await expect(shell.getByText(text, { exact: true })).toBeVisible();
      if (state === "partial")
        await expect(shell.getByRole("status")).toHaveAttribute(
          "aria-live",
          "polite"
        );
      else if (state === "error" || state === "permission")
        await expect(shell.getByRole("alert")).toBeVisible();
      else assert.equal(await shell.getByRole("alert").count(), 0);
    }
  } else if (id.startsWith("patterns-readingsurfaces--")) {
    await expect(
      shell.getByRole("heading", {
        level: 1,
        name: common.header.notificationsLabel,
      })
    ).toBeVisible();
    await expect(
      shell.getByRole("heading", { level: 2, name: common.statePanel.empty })
    ).toBeVisible();
  }
  await expect(page.locator("html")).toHaveAttribute("lang", language);
  await expect(page.locator("html")).toHaveAttribute(
    "dir",
    language === "ar" ? "rtl" : "ltr"
  );
  assert.equal(
    await page
      .locator("html")
      .evaluate((element) => element.classList.contains("dark")),
    theme === "dark"
  );
  assert.equal(
    await page
      .locator("html")
      .evaluate((element) => element.classList.contains("high-contrast")),
    highContrast
  );
  const font = await page
    .locator("html")
    .evaluate((element) => getComputedStyle(element).fontSize);
  assert.equal(
    font,
    textScale === "double" ? "32px" : textScale === "large" ? "20px" : "16px"
  );
  // Actual face readiness plus computed family is bounded font delivery evidence,
  // not screenshot/glyph-shape approval of every route or character.
  if (language === "ar" && id === "patterns-readingsurfaces--extended-copy") {
    const typography = await page.evaluate(async () => {
      await document.fonts.ready;
      const heading = document.querySelector("#storybook-root h1");
      return {
        family: heading ? getComputedStyle(heading).fontFamily : "",
        loadedArabic: [...document.fonts].some(
          (face) =>
            face.family.includes("Noto Sans Arabic") && face.status === "loaded"
        ),
      };
    });
    assert(
      typography.family.includes("Noto Sans Arabic") && typography.loadedArabic,
      `Arabic face did not load on visible ${id} at ${textScale}: ${JSON.stringify(
        typography
      )}`
    );
  }
  if (textScale === "double") {
    for (const node of await shell.locator("h1, h2, p:not(.sr-only)").all()) {
      const box = await node.boundingBox();
      if (box)
        assert(
          box.x >= -0.5 && box.x + box.width <= 320.5,
          `${id} ${language}/${theme} text bounds leave 320px viewport: ${JSON.stringify(
            box
          )}`
        );
    }
  }
  const overflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth
  );
  assert(
    overflow <= 0,
    `${id} ${language}/${theme}/scale=${textScale}/hc=${highContrast}: horizontal overflow ${overflow}px`
  );
}

async function visit(
  browser,
  origin,
  id,
  language,
  theme,
  textScale,
  width,
  highContrast = false
) {
  const context = await browser.newContext({
    viewport: { width, height: 880 },
    reducedMotion: "reduce",
    serviceWorkers: "block",
  });
  try {
    const errors = [];
    await context.route("**/*", async (route) => {
      const url = new URL(route.request().url());
      if (url.origin === origin) await route.continue();
      else {
        errors.push(`Blocked external origin: ${url.origin}`);
        await route.abort();
      }
    });
    const page = await context.newPage();
    page.on("pageerror", (error) => errors.push(error.message));
    const globals = `locale:${language};theme:${theme};contrast:${
      highContrast ? "high" : "standard"
    };textScale:${textScale}`;
    await page.goto(
      `${origin}/iframe.html?id=${id}&viewMode=story&globals=${encodeURIComponent(
        globals
      )}`,
      { waitUntil: "load" }
    );
    await inspect(page, id, language, theme, textScale, highContrast);
    if (id === "patterns-statepanel--local-action") {
      const action = page.getByRole("button", {
        name: language === "ar" ? "عرض مثال محلي" : "Show Local Example",
      });
      await expect(action).toBeVisible();
      await action.focus();
      await expect(action).toBeFocused();
      if (textScale === "double") {
        const bounds = await action.boundingBox();
        assert(
          bounds &&
            bounds.width >= 44 &&
            bounds.height >= 44 &&
            bounds.x >= 0 &&
            bounds.x + bounds.width <= width + 0.5,
          `200% action clipped or below 44px: ${JSON.stringify(bounds)}`
        );
      }
      await page.keyboard.press("Enter");
      const localMessage =
        language === "ar" ? "تفاعل محلي" : "Local interaction only";
      await expect(
        page.getByRole("status").filter({ hasText: localMessage })
      ).toContainText(localMessage);
    }
    if (
      textScale !== "large" &&
      [
        "patterns-statepanel--error",
        "patterns-readingsurfaces--extended-copy",
      ].includes(id)
    ) {
      const results = await new AxeBuilder({ page })
        .include("#storybook-root")
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .analyze();
      assert.deepEqual(
        results.violations.map((item) => ({
          id: item.id,
          impact: item.impact,
          targets: item.nodes.map((node) => node.target),
        })),
        [],
        `${id} ${language}/${theme}: scoped WCAG2.1 AA violations`
      );
    }
    assert.deepEqual(errors, [], `${id}: browser/outbound errors`);
  } finally {
    await context.close();
  }
}

test(
  "built real-source Storybook state pilot under closed network",
  { timeout: 240000 },
  async () => {
    const host = await serveStatic();
    let browser;
    try {
      browser = await chromium.launch({ headless: true });
      let scenes = 0;
      for (const language of ["en", "ar"])
        for (const theme of ["light", "dark"]) {
          for (const id of IDs) {
            await visit(
              browser,
              host.origin,
              id,
              language,
              theme,
              "normal",
              1280
            );
            scenes++;
          }
        }
      for (const language of ["en", "ar"])
        for (const theme of ["light", "dark"]) {
          for (const id of [
            ...cases,
            "patterns-readingsurfaces--extended-copy",
          ]) {
            await visit(
              browser,
              host.origin,
              id,
              language,
              theme,
              "large",
              320
            );
            scenes++;
          }
        }
      for (const language of ["en", "ar"])
        for (const theme of ["light", "dark"])
          for (const id of [
            "patterns-statepanel--error",
            "patterns-readingsurfaces--extended-copy",
          ]) {
            await visit(
              browser,
              host.origin,
              id,
              language,
              theme,
              "normal",
              1280,
              true
            );
            scenes++;
          }
      // 200% text is a 32px root on a 320px CSS viewport, not a claim
      // about every browser/OS zoom behavior or authenticated route.
      for (const language of ["en", "ar"])
        for (const theme of ["light", "dark"])
          for (const highContrast of [false, true])
            for (const id of [
              ...cases,
              "patterns-statepanel--local-action",
              "patterns-readingsurfaces--extended-copy",
            ]) {
              await visit(
                browser,
                host.origin,
                id,
                language,
                theme,
                "double",
                320,
                highContrast
              );
              scenes++;
            }
      assert.equal(scenes, 120);
      console.log(
        `Real-source Storybook pilot: ${scenes} closed-network render/state scenes; no screenshots or route attestation`
      );
    } finally {
      await browser?.close();
      await host.close();
    }
  }
);
