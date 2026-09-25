// Contract tests with fake axe results/Playwright metadata; never launches a
// browser or provisions Preview fixtures. Evidence writes use real temp files.
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { FullConfig, Page } from "@playwright/test";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const browser = vi.hoisted(() => ({ analyze: vi.fn(), withTags: vi.fn(), info: vi.fn() }));
vi.mock("@axe-core/playwright", () => ({
  default: class {
    withTags(tags: string[]) { browser.withTags(tags); return this; }
    analyze() { return browser.analyze(); }
  },
}));
vi.mock("@playwright/test", () => ({ test: { info: browser.info } }));

import { flushA11yFindings, scanPage } from "../../../tests/e2e/_helpers/axe.ts";
import { persistA11yScan } from "../../../tests/e2e/_helpers/axe-evidence.ts";
import globalTeardown from "../../../tests/e2e/_fixtures/teardown.ts";
import type { Finding } from "../findings.ts";

let workspace: string;
let originalCwd: string;
const page = {} as Page;
const attachment = vi.fn();
const fakeResult = (impact: string | null, id = "button-name") => ({
  id,
  help: "Buttons must have discernible text",
  impact,
  nodes: [{ target: ["#unnamed"], html: '<button id="unnamed"></button>' }],
});
const readMerged = (): { findings: Finding[]; scanCount: number } =>
  JSON.parse(readFileSync(flushA11yFindings({ outputDirs: [join(workspace, "worker-results")] }), "utf8"));

beforeEach(() => {
  originalCwd = process.cwd();
  workspace = mkdtempSync(join(tmpdir(), "axe-helper-"));
  process.chdir(workspace);
  vi.stubEnv("A11Y_RUN_ID", "helper-unit-run");
  // Even teardown tests cannot reach protected Preview cleanup.
  vi.stubEnv("AUDIT_RUN_ID", "");
  vi.stubEnv("E2E_FIXTURES_ENABLED", "false");
  vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("Network forbidden")));
  browser.analyze.mockReset().mockResolvedValue({ violations: [] });
  browser.withTags.mockClear();
  browser.info.mockReset().mockReturnValue({
    project: { name: "student", outputDir: join(workspace, "worker-results") },
    testId: "fixture-test",
    workerIndex: 2,
    parallelIndex: 1,
    retry: 0,
    repeatEachIndex: 0,
    attach: attachment.mockReset().mockResolvedValue(undefined),
  });
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  process.chdir(originalCwd);
  rmSync(workspace, { recursive: true, force: true });
});

describe("scanPage enforcement", () => {
  it("passes a clean page and records the completed scan", async () => {
    await expect(scanPage(page, { role: "student", label: "clean fixture" })).resolves.toBeUndefined();
    expect(readMerged()).toMatchObject({ findings: [], scanCount: 1 });
    expect(browser.withTags).toHaveBeenCalledWith(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]);
    expect(attachment).toHaveBeenCalledWith(expect.stringMatching(/^axe-/), {
      path: expect.stringContaining(".json"), contentType: "application/json",
    });
  });

  it.each([["critical", "Critical"], ["serious", "Major"]])(
    "fails a known %s violation only after writing useful %s evidence",
    async (impact, severity) => {
      browser.analyze.mockResolvedValue({ violations: [fakeResult(impact)] });
      await expect(scanPage(page, { role: "student", label: "unnamed button" })).rejects.toThrow(/Major-or-higher/);
      const merged = readMerged();
      expect(merged.findings).toHaveLength(1);
      expect(merged.findings[0]).toMatchObject({
        severity,
        requirementId: "11.1",
        location: { file: "#unnamed" },
        detail: {
          axeId: "button-name", impact, html: '<button id="unnamed"></button>',
          runId: "helper-unit-run", workerIndex: 2, testId: "fixture-test", projectName: "student",
        },
      });
      expect(attachment).toHaveBeenCalledTimes(1);
    }
  );

  it.each([["moderate", "Minor"], ["minor", "Trivial"], [null, "Minor"]])(
    "keeps impact %s advisory at the existing %s severity",
    async (impact, severity) => {
      browser.analyze.mockResolvedValue({ violations: [fakeResult(impact)] });
      await expect(scanPage(page, { role: "teacher", label: "advisory" })).resolves.toBeUndefined();
      expect(readMerged().findings).toEqual([expect.objectContaining({ severity })]);
    }
  );

  it("writes all violations, including advisory ones, before failing and honors custom tags", async () => {
    browser.analyze.mockResolvedValue({ violations: [fakeResult("serious"), fakeResult("moderate", "contrast")] });
    await expect(scanPage(page, { role: "admin", label: "mixed", tags: ["wcag2a"] })).rejects.toThrow(/1 Major-or-higher/);
    expect(readMerged().findings.map((finding) => finding.severity)).toEqual(["Major", "Minor"]);
    expect(browser.withTags).toHaveBeenCalledWith(["wcag2a"]);
  });

  it("retains evidence if attaching it to the Playwright report fails", async () => {
    browser.analyze.mockResolvedValue({ violations: [fakeResult("serious")] });
    attachment.mockRejectedValue(new Error("attachment failed"));
    await expect(scanPage(page, { role: "parent", label: "fixture" })).rejects.toThrow("attachment failed");
    expect(readMerged().findings).toHaveLength(1);
  });

  it("fails before analyzing a page if run provenance is missing", async () => {
    delete process.env.A11Y_RUN_ID;
    await expect(scanPage(page, { role: "student", label: "fixture" })).rejects.toThrow(/A11Y_RUN_ID is missing/);
    expect(browser.analyze).not.toHaveBeenCalled();
  });

  it("does not swallow axe analysis errors or pretend a scan completed", async () => {
    browser.analyze.mockRejectedValue(new Error("axe analysis unavailable"));
    await expect(scanPage(page, { role: "student", label: "fixture" })).rejects.toThrow("axe analysis unavailable");
    expect(readMerged()).toMatchObject({ scanCount: 0 });
    expect(attachment).not.toHaveBeenCalled();
  });
});

describe("globalTeardown evidence boundary (Preview cleanup disabled)", () => {
  const config = (): FullConfig => ({
    projects: [{ outputDir: join(workspace, "worker-results") }],
  } as FullConfig);

  it("merges configured worker output roots without touching the network", async () => {
    vi.spyOn(console, "log").mockImplementation(() => undefined);
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    await scanPage(page, { role: "student", label: "clean" });
    await expect(globalTeardown(config())).resolves.toBeUndefined();
    expect(readMerged().scanCount).toBe(1);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("propagates invalid evidence while refusing unowned Preview cleanup", async () => {
    const notice = vi.spyOn(console, "log").mockImplementation(() => undefined);
    const scan = persistA11yScan({
      outputDir: join(workspace, "worker-results"), projectName: "student", testId: "broken",
      workerIndex: 0, parallelIndex: 0, retry: 0, repeatEachIndex: 0,
    }, []);
    writeFileSync(scan.path, "{broken", "utf8");
    await expect(globalTeardown(config())).rejects.toThrow();
    expect(notice).toHaveBeenCalledWith("[globalTeardown] No Preview fixture started by this setup; no deletion requested");
    expect(fetch).not.toHaveBeenCalled();
  });
});
