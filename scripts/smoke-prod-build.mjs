// Local production-bundle smoke gate. Run AFTER `npm run build`.
// Verifies rendering and application assets, NOT deployed Vercel telemetry.
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const PORT = 4199;
const COLLECTOR_SCRIPT_PATHS = new Set([
  "/_vercel/insights/script.js",
  "/_vercel/speed-insights/script.js",
]);
const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);
const ASSET_TYPES = new Set(["document", "script", "stylesheet", "image", "font", "media"]);

/** Exact local-only deployment script boundary; data requests are never isolated. */
export function isLocalCollectorScript(requestUrl, resourceType, baseUrl, method = "GET") {
  if (resourceType !== "script" || method !== "GET") return false;
  try {
    const base = new URL(baseUrl);
    const request = new URL(requestUrl);
    return (base.protocol === "http:" || base.protocol === "https:") &&
      LOOPBACK_HOSTS.has(base.hostname) &&
      request.origin === base.origin &&
      COLLECTOR_SCRIPT_PATHS.has(request.pathname);
  } catch {
    return false;
  }
}

/** One outcome for the full gate: a rendered root never cancels an asset/error failure. */
export function smokePassed(result) {
  return result.rootLength > 0 && result.pageErrors.length === 0 && result.assetErrors.length === 0;
}

async function launchChromium() {
  const { chromium } = await import("@playwright/test");
  return chromium.launch();
}

/** Owned browser lifecycle, also used by the real-browser fixture regressions. */
export async function runBrowserSmoke(baseUrl, options = {}) {
  const launch = options.launch ?? launchChromium;
  const browser = await launch();
  try {
    // Page routing cannot intercept service-worker-owned requests. This gate
    // checks the network-delivered bundle, not offline/PWA behavior.
    const page = await browser.newPage({ serviceWorkers: "block" });
    const pageErrors = [];
    const consoleErrors = [];
    const assetErrors = [];
    const isolatedCollectorScripts = new Set();
    page.on("pageerror", (error) => pageErrors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(message.text());
    });
    page.on("requestfailed", (request) => {
      if (ASSET_TYPES.has(request.resourceType())) {
        assetErrors.push(`${request.resourceType()} ${request.url()}: ${request.failure()?.errorText ?? "request failed"}`);
      }
    });
    page.on("response", (response) => {
      const request = response.request();
      if (ASSET_TYPES.has(request.resourceType()) && response.status() >= 400) {
        assetErrors.push(`${request.resourceType()} ${response.url()}: HTTP ${response.status()}`);
      }
      // Module MIME failures need not emit pageerror. An HTML fallback for any
      // non-isolated script must still fail, even if another script rendered root.
      if (request.resourceType() === "script" &&
          /^(?:text\/html|application\/xhtml\+xml)(?:;|$)/i.test(response.headers()["content-type"] ?? "")) {
        assetErrors.push(`script ${response.url()}: received HTML instead of JavaScript`);
      }
    });

    // Routing is registered only for these two exact local URLs. Even on those
    // paths, fetch/XHR and non-GET traffic continues unchanged. No collector data
    // endpoint, third-party origin, application asset or pageerror is suppressed.
    await page.route(
      (url) => isLocalCollectorScript(url.href, "script", baseUrl),
      async (route) => {
        const request = route.request();
        if (!isLocalCollectorScript(request.url(), request.resourceType(), baseUrl, request.method())) {
          await route.continue();
          return;
        }
        isolatedCollectorScripts.add(request.url());
        await route.fulfill({
          status: 200,
          contentType: "application/javascript",
          body: "/* Local bundle smoke: deployment-provided collector intentionally isolated. */",
        });
      },
    );

    await page.goto(baseUrl, { waitUntil: "networkidle", timeout: options.timeoutMs ?? 60_000 });
    await page.waitForTimeout(options.waitAfterLoadMs ?? 3000);
    const rootLength = await page.evaluate(() => {
      const root = document.getElementById("root");
      return root ? root.innerHTML.length : -1;
    });
    return {
      rootLength,
      title: await page.title(),
      pageErrors,
      consoleErrors,
      assetErrors,
      isolatedCollectorScripts: [...isolatedCollectorScripts].sort(),
    };
  } finally {
    // Includes newPage, routing, navigation and evaluation exceptions.
    await browser.close();
  }
}

export function reportSmoke(result, output = console) {
  output.log("LOCAL SMOKE SCOPE: service workers blocked for network interception; offline/PWA behavior is NOT verified.");
  output.log(
    `LOCAL SMOKE ISOLATION: ${result.isolatedCollectorScripts.length} deployment collector script request(s) isolated; deployed telemetry is NOT verified.`,
  );
  for (const url of result.isolatedCollectorScripts) output.log(`  isolated collector: ${url}`);
  if (result.rootLength <= 0) {
    output.error(`SMOKE FAIL: #root is empty (${result.rootLength} chars) — the production bundle did not render.`);
  }
  for (const error of result.pageErrors) output.error(`SMOKE FAIL: pageerror: ${error}`);
  for (const error of result.assetErrors) output.error(`SMOKE FAIL: asset: ${error}`);
  // Preserve diagnostic console output. It is not a substitute for the strict
  // root, uncaught-error and asset-failure assertions above.
  for (const error of result.consoleErrors) output.log(`console.error: ${error}`);
  if (!smokePassed(result)) return 1;
  output.log(`SMOKE PASS (local bundle only): #root rendered ${result.rootLength} chars (title: ${result.title})`);
  return 0;
}

export async function run(output = console) {
  let server;
  let exitCode = 1;
  try {
    const { preview } = await import("vite");
    server = await preview({ preview: { port: PORT, strictPort: true } });
    const result = await runBrowserSmoke(`http://localhost:${PORT}/`);
    exitCode = reportSmoke(result, output);
  } catch (error) {
    output.error(`SMOKE FAIL (harness error): ${error instanceof Error ? error.stack ?? error.message : String(error)}`);
  } finally {
    if (server?.httpServer) {
      try {
        await new Promise((resolveClose, rejectClose) => {
          server.httpServer.close((error) => error ? rejectClose(error) : resolveClose());
        });
      } catch (error) {
        exitCode = 1;
        output.error(`SMOKE FAIL (preview cleanup): ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }
  return exitCode;
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  process.exitCode = await run();
}
