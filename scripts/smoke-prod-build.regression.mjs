// Real Chromium regression gate, independent of Vitest/browser installation in
// the ordinary unit suite. No production site, credentials or seeds are used.
// Run: node --test scripts/smoke-prod-build.regression.mjs
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { test } from "node:test";
import { chromium } from "@playwright/test";
import { reportSmoke, runBrowserSmoke, smokePassed } from "./smoke-prod-build.mjs";

const collectors = ["/_vercel/insights/script.js", "/_vercel/speed-insights/script.js"];
const fallback = "<!doctype html><html><body>Vite-like HTML fallback</body></html>";
const page = (scripts = "", render = true) => `<!doctype html><html><head><title>Local smoke fixture</title></head><body>
<div id="root"></div>
${render ? '<script>document.getElementById("root").innerHTML = "<main>Rendered fixture</main>";</script>' : ""}
${scripts}</body></html>`;

await test("local production smoke real Chromium boundary", { timeout: 60_000 }, async (suite) => {
  const requests = [];
  const server = createServer((request, response) => {
    const path = new URL(request.url, "http://127.0.0.1").pathname;
    requests.push({ path, method: request.method });
    if (path === "/hang") return; // Deliberate navigation timeout; browser must close.
    if (path === "/fixture-sw.js") {
      response.writeHead(200, { "Content-Type": "application/javascript" });
      response.end(`
        self.addEventListener('install', event => event.waitUntil(self.skipWaiting()));
        self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));
        self.addEventListener('fetch', event => {
          if (${JSON.stringify(collectors)}.includes(new URL(event.request.url).pathname)) {
            event.respondWith(new Response(${JSON.stringify(fallback)}, { headers: { 'Content-Type': 'text/html' } }));
          }
        });
      `);
      return;
    }
    if (path === "/assets/missing.js") {
      response.writeHead(404, { "Content-Type": "application/javascript" });
      response.end("// Missing application asset");
      return;
    }
    if (path === "/_vercel/insights/view" || path === "/_vercel/speed-insights/vitals") {
      response.writeHead(200, { "Content-Type": "text/plain" });
      response.end("collector fixture data received");
      return;
    }
    const pages = {
      "/collectors": page(collectors.map((url) => `<script src="${url}"></script>`).join("")),
      "/register-worker": page('<script>navigator.serviceWorker.register("/fixture-sw.js");</script>'),
      "/sw-collectors": page('<script>navigator.serviceWorker.register("/fixture-sw.js");</script>' +
        collectors.map((url) => `<script src="${url}"></script>`).join("")),
      "/app-html": page('<script src="/assets/app.js"></script>'),
      "/module-html": page('<script type="module" src="/assets/module.js"></script>'),
      "/empty": page("", false),
      "/uncaught": page('<script>throw new Error("ordinary application crash")</script>'),
      "/missing-asset": page('<script src="/assets/missing.js"></script>'),
      "/other-vercel": page('<script src="/_vercel/other/script.js"></script>'),
      "/collector-data": page(`<script>
        Promise.all([
          fetch("/_vercel/insights/script.js"),
          fetch("/_vercel/insights/view", { method: "POST", body: "fixture" }),
          fetch("/_vercel/speed-insights/vitals", { method: "POST", body: "fixture" })
        ]).then(() => { document.getElementById("root").dataset.requestsFinished = "true"; });
      </script>`),
    };
    response.writeHead(200, { "Content-Type": "text/html" });
    response.end(pages[path] ?? fallback);
  });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  assert(address && typeof address === "object");
  const base = `http://127.0.0.1:${address.port}`;
  const smoke = (path) => runBrowserSmoke(`${base}${path}`, { waitAfterLoadMs: 50, timeoutMs: 10_000 });
  try {
    await suite.test("only exact deployment collector scripts are isolated and the result says so", async () => {
      const result = await smoke("/collectors");
      assert(smokePassed(result));
      assert.deepEqual(result.isolatedCollectorScripts, collectors.map((path) => base + path));
      assert(!requests.some((request) => collectors.includes(request.path)));
      const logs = [];
      assert.equal(reportSmoke(result, { log: (message) => logs.push(message), error: assert.fail }), 0);
      assert(logs.some((message) => message.includes("deployed telemetry is NOT verified")));
    });

    await suite.test("controlled service-worker fixture reproduces page-route bypass", async () => {
      const browser = await chromium.launch();
      try {
        const controlledPage = await browser.newPage();
        const workerResponses = [];
        const errors = [];
        let routeCalls = 0;
        controlledPage.on("pageerror", (error) => errors.push(error.message));
        controlledPage.on("response", (response) => {
          if (collectors.includes(new URL(response.url()).pathname)) workerResponses.push(response.fromServiceWorker());
        });
        await controlledPage.route((url) => collectors.includes(url.pathname), async (route) => {
          routeCalls += 1;
          await route.fulfill({ contentType: "application/javascript", body: "/* fixture */" });
        });
        await controlledPage.goto(`${base}/register-worker`);
        await controlledPage.waitForFunction(() => Boolean(navigator.serviceWorker.controller));
        await controlledPage.goto(`${base}/collectors`, { waitUntil: "networkidle" });
        assert.deepEqual(workerResponses, [true, true]);
        assert.equal(routeCalls, 0);
        assert.equal(errors.filter((error) => error.includes("Unexpected token")).length, 2);
      } finally { await browser.close(); }
    });

    await suite.test("local bundle scope blocks service workers and discloses unverified PWA behavior", async () => {
      const before = requests.filter((request) => request.path === "/fixture-sw.js").length;
      const result = await smoke("/sw-collectors");
      assert(smokePassed(result));
      assert.equal(result.isolatedCollectorScripts.length, 2);
      assert.equal(requests.filter((request) => request.path === "/fixture-sw.js").length, before);
      const logs = [];
      assert.equal(reportSmoke(result, { log: (message) => logs.push(message), error: assert.fail }), 0);
      assert(logs.some((message) => message.includes("offline/PWA behavior is NOT verified")));
    });

    await suite.test("NEGATIVE: ordinary app JavaScript receiving HTML fails despite rendered root", async () => {
      const result = await smoke("/app-html");
      assert(result.rootLength > 0);
      assert(result.pageErrors.some((message) => message.includes("Unexpected token")));
      assert(result.assetErrors.some((message) => message.includes("/assets/app.js")));
      assert.equal(smokePassed(result), false);
      assert.equal(reportSmoke(result, { log: () => {}, error: () => {} }), 1);
    });

    await suite.test("NEGATIVE: module-script HTML MIME failure cannot pass without pageerror", async () => {
      const result = await smoke("/module-html");
      assert(result.rootLength > 0);
      assert(result.assetErrors.some((message) => message.includes("received HTML instead of JavaScript")));
      assert.equal(smokePassed(result), false);
    });

    await suite.test("NEGATIVE: empty root fails", async () => {
      const result = await smoke("/empty");
      assert.equal(result.rootLength, 0);
      assert.equal(smokePassed(result), false);
    });

    await suite.test("NEGATIVE: uncaught ordinary application error is never suppressed", async () => {
      const result = await smoke("/uncaught");
      assert(result.pageErrors.includes("ordinary application crash"));
      assert.equal(smokePassed(result), false);
    });

    await suite.test("NEGATIVE: missing application asset HTTP failure is never suppressed", async () => {
      const result = await smoke("/missing-asset");
      assert(result.assetErrors.some((message) => message.includes("/assets/missing.js: HTTP 404")));
      assert.equal(smokePassed(result), false);
    });

    await suite.test("NEGATIVE: arbitrary _vercel script paths remain real failures", async () => {
      const result = await smoke("/other-vercel");
      assert.equal(result.isolatedCollectorScripts.length, 0);
      assert(result.assetErrors.some((message) => message.includes("/_vercel/other/script.js")));
      assert.equal(smokePassed(result), false);
    });

    await suite.test("collector data endpoints and fetches to script paths reach the server unchanged", async () => {
      const result = await smoke("/collector-data");
      assert(smokePassed(result));
      assert.equal(result.isolatedCollectorScripts.length, 0);
      for (const [path, method] of [
        [collectors[0], "GET"],
        ["/_vercel/insights/view", "POST"],
        ["/_vercel/speed-insights/vitals", "POST"],
      ]) assert(requests.some((request) => request.path === path && request.method === method));
    });

    await suite.test("browser closes when real navigation throws", async () => {
      let browser;
      await assert.rejects(runBrowserSmoke(`${base}/hang`, {
        launch: async () => {
          browser = await chromium.launch();
          return browser;
        },
        timeoutMs: 150,
        waitAfterLoadMs: 0,
      }), /Timeout/);
      assert(browser);
      assert.equal(browser.isConnected(), false);
    });
  } finally {
    server.closeAllConnections();
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
});
