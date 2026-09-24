// @vitest-environment node
import { describe, expect, it, vi } from "vitest";

import {
  isLocalCollectorScript,
  reportSmoke,
  runBrowserSmoke,
  smokePassed,
  type SmokeResult,
} from "../../../scripts/smoke-prod-build.mjs";

const base = "http://localhost:4199/";
const insights = "/_vercel/insights/script.js";
const speed = "/_vercel/speed-insights/script.js";
const rendered = (): SmokeResult => ({
  rootLength: 100,
  title: "Fixture",
  pageErrors: [],
  consoleErrors: [],
  assetErrors: [],
  isolatedCollectorScripts: [],
});

describe("local production smoke collector isolation", () => {
  it.each([insights, speed, `${insights}?version=1`])("isolates exact script path %s", (path) => {
    expect(isLocalCollectorScript(new URL(path, base).href, "script", base)).toBe(true);
  });

  it.each([
    "/assets/app.js", "/_vercel/insights/script.js.map", "/_vercel/insights/script.js/other",
    "/_vercel/insights/view", "/_vercel/insights/event", "/_vercel/speed-insights/vitals",
    "/_vercel/other/script.js", "/prefix/_vercel/insights/script.js",
  ])("does not isolate other assets or collector data path %s", (path) => {
    expect(isLocalCollectorScript(new URL(path, base).href, "script", base)).toBe(false);
  });

  it.each(["fetch", "xhr", "document", "image", "stylesheet", "other"])("does not isolate %s traffic even to the exact script URL", (type) => {
    expect(isLocalCollectorScript(new URL(insights, base).href, type, base)).toBe(false);
  });

  it.each(["POST", "HEAD", "OPTIONS"])("does not isolate method %s", (method) => {
    expect(isLocalCollectorScript(new URL(insights, base).href, "script", base, method)).toBe(false);
  });

  it.each([
    "http://localhost:4200/", "http://127.0.0.1:4199/", "https://localhost:4199/",
    "http://localhost.evil.test:4199/", "https://example.com/",
  ])("does not isolate a different origin %s", (origin) => {
    expect(isLocalCollectorScript(new URL(insights, origin).href, "script", base)).toBe(false);
  });

  it.each(["https://example.com/", "http://192.168.1.2/", "file:///tmp/"])("never applies local isolation to non-loopback origin %s", (origin) => {
    expect(isLocalCollectorScript(new URL(insights, origin).href, "script", origin)).toBe(false);
  });

  it.each(["http://127.0.0.1:4199/", "http://[::1]:4199/"])("supports explicit loopback origin %s", (origin) => {
    expect(isLocalCollectorScript(new URL(insights, origin).href, "script", origin)).toBe(true);
  });

  it("rejects malformed URL input", () => {
    expect(isLocalCollectorScript("not a URL", "script", base)).toBe(false);
    expect(isLocalCollectorScript(new URL(insights, base).href, "script", "not a URL")).toBe(false);
  });
});

describe("local production smoke outcome and diagnostics", () => {
  it("reports an explicitly local pass, not deployed telemetry verification", () => {
    const result = { ...rendered(), isolatedCollectorScripts: [new URL(insights, base).href] };
    const output = { log: vi.fn<(message: string) => void>(), error: vi.fn<(message: string) => void>() };
    expect(reportSmoke(result, output)).toBe(0);
    expect(output.log).toHaveBeenCalledWith(expect.stringContaining("deployed telemetry is NOT verified"));
    expect(output.log).toHaveBeenCalledWith(expect.stringContaining("offline/PWA behavior is NOT verified"));
    expect(output.log).toHaveBeenCalledWith(expect.stringContaining("SMOKE PASS (local bundle only)"));
    expect(output.error).not.toHaveBeenCalled();
  });

  it.each([0, -1])("fails an empty or absent root (%s)", (rootLength) => {
    expect(smokePassed({ ...rendered(), rootLength })).toBe(false);
  });

  it("never cancels application page errors because root rendered or collectors were isolated", () => {
    const result = { ...rendered(), pageErrors: ["Unexpected token '<'"], isolatedCollectorScripts: [new URL(insights, base).href] };
    const output = { log: vi.fn<(message: string) => void>(), error: vi.fn<(message: string) => void>() };
    expect(smokePassed(result)).toBe(false);
    expect(reportSmoke(result, output)).toBe(1);
    expect(output.error).toHaveBeenCalledWith("SMOKE FAIL: pageerror: Unexpected token '<'");
    expect(output.log.mock.calls.flat().join("\n")).not.toContain("SMOKE PASS");
  });

  it("fails asset request/HTTP/MIME errors even with a nonempty root", () => {
    expect(smokePassed({ ...rendered(), assetErrors: ["script /assets/app.js: HTTP 404"] })).toBe(false);
    expect(smokePassed({ ...rendered(), assetErrors: ["script /assets/app.js: received HTML instead of JavaScript"] })).toBe(false);
  });

  it("retains console diagnostics without globally suppressing errors", () => {
    const output = { log: vi.fn<(message: string) => void>(), error: vi.fn<(message: string) => void>() };
    expect(reportSmoke({ ...rendered(), consoleErrors: ["diagnostic"] }, output)).toBe(0);
    expect(output.log).toHaveBeenCalledWith("console.error: diagnostic");
  });

  it("closes a launched browser even when page creation throws", async () => {
    const close = vi.fn<() => Promise<void>>().mockResolvedValue(undefined);
    const newPage = vi.fn(async () => { throw new Error("controlled page creation failure"); });
    const launch = async () => ({ newPage, close });
    await expect(runBrowserSmoke(base, { launch })).rejects.toThrow("controlled page creation failure");
    expect(newPage).toHaveBeenCalledWith({ serviceWorkers: "block" });
    expect(close).toHaveBeenCalledOnce();
  });
});
