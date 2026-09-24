// @vitest-environment node
// Filesystem-only browser evidence tests: no browser, fixture seed, or network.
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const ids = vi.hoisted(() => ({ forced: undefined as string | undefined }));
vi.mock("node:crypto", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:crypto")>();
  return { ...actual, randomUUID: () => ids.forced ?? actual.randomUUID() };
});

import setupA11yEvidence from "../../../tests/e2e/_fixtures/axe-setup.ts";
import {
  type A11yScanContext,
  flushA11yFindings,
  getAxeRunId,
  persistA11yScan,
  setAxeRunId,
} from "../../../tests/e2e/_helpers/axe-evidence.ts";
import type { Finding } from "../findings.ts";
import { ingestFindings } from "../report.ts";

let workspace: string;
let originalCwd: string;
const finding = (message: string): Finding => ({ severity: "Major", requirementId: "11.1", message });
const context = (workerIndex = 0, projectName = "student"): A11yScanContext => ({
  outputDir: join(workspace, `results-${projectName}`),
  projectName,
  testId: `test-${workerIndex}`,
  workerIndex,
  parallelIndex: workerIndex,
  retry: 0,
  repeatEachIndex: 0,
});
const readMerged = (path: string): {
  runId: string;
  scanCount: number;
  coverage: string;
  findings: Finding[];
} => JSON.parse(readFileSync(path, "utf8"));

beforeEach(() => {
  originalCwd = process.cwd();
  workspace = mkdtempSync(join(tmpdir(), "axe-evidence-"));
  process.chdir(workspace);
  vi.stubEnv("A11Y_RUN_ID", "unit-run");
  ids.forced = undefined;
});

afterEach(() => {
  ids.forced = undefined;
  vi.unstubAllEnvs();
  process.chdir(originalCwd);
  rmSync(workspace, { recursive: true, force: true });
});

describe("persisted browser accessibility evidence", () => {
  it("merges independent worker modules and project roots exactly once in stable order", async () => {
    persistA11yScan(context(0), [finding("worker zero")]);
    // A fresh module instance models a different worker/teardown process: no
    // in-memory state from the first writer can participate in its merge.
    vi.resetModules();
    const secondWorker = await import("../../../tests/e2e/_helpers/axe-evidence.ts");
    secondWorker.persistA11yScan(context(1, "admin"), [finding("worker one")]);
    vi.resetModules();
    const teardown = await import("../../../tests/e2e/_helpers/axe-evidence.ts");
    const outputDirs = [context(0).outputDir, context(1, "admin").outputDir];
    const first = readMerged(teardown.flushA11yFindings({ outputDirs: [...outputDirs, outputDirs[0]!] }));
    const second = readMerged(teardown.flushA11yFindings({ outputDirs: [...outputDirs].reverse() }));

    expect(first.findings.map((entry) => entry.message)).toEqual(["worker one", "worker zero"]);
    expect(second.findings).toEqual(first.findings);
    expect(first.scanCount).toBe(2);
    expect(first.coverage).toBe("scanned");
    expect(first.findings[0]?.detail).toMatchObject({ runId: "unit-run", workerIndex: 1, projectName: "admin", testId: "test-1" });
    expect(ingestFindings().findings).toEqual(first.findings);
  });

  it("gives simultaneous/repeated scans and retries independent immutable files", async () => {
    const scans = await Promise.all(Array.from({ length: 20 }, async (_, index) =>
      persistA11yScan({ ...context(), retry: index % 2, repeatEachIndex: index % 3 }, [finding(`scan ${index}`)])
    ));
    expect(new Set(scans.map((scan) => scan.path)).size).toBe(20);
    expect(new Set(scans.map((scan) => scan.artifact.scanId)).size).toBe(20);
    for (const scan of scans) {
      expect(JSON.parse(readFileSync(scan.path, "utf8"))).toEqual(scan.artifact);
    }
    const merged = readMerged(flushA11yFindings({ outputDirs: [context().outputDir] }));
    expect(merged.scanCount).toBe(20);
    expect(merged.findings).toHaveLength(20);
  });

  it("refuses to overwrite even if a scan ID collides", () => {
    const first = persistA11yScan(context(), [finding("original")]);
    const bytes = readFileSync(first.path, "utf8");
    ids.forced = first.artifact.scanId;
    expect(() => persistA11yScan(context(), [finding("replacement")])).toThrow(/EEXIST/);
    expect(readFileSync(first.path, "utf8")).toBe(bytes);
  });

  it("excludes stale runs even when their files remain in the same output directory", () => {
    setAxeRunId("previous-run");
    const stale = persistA11yScan(context(), [finding("stale")]);
    setAxeRunId("current-run");
    persistA11yScan(context(), [finding("current")]);

    const merged = readMerged(flushA11yFindings({ outputDirs: [context().outputDir] }));

    expect(existsSync(stale.path)).toBe(true);
    expect(merged.runId).toBe("current-run");
    expect(merged.scanCount).toBe(1);
    expect(merged.findings.map((entry) => entry.message)).toEqual(["current"]);
  });

  it("records an empty selection as unverified coverage, not as a clean scan", () => {
    setAxeRunId("old-run");
    persistA11yScan(context(), [finding("old finding")]);
    setAxeRunId("new-run");
    const merged = readMerged(flushA11yFindings({ outputDirs: [context().outputDir] }));
    expect(merged).toMatchObject({ runId: "new-run", scanCount: 0, coverage: "not-scanned" });
    expect(merged.findings).toEqual([expect.objectContaining({
      severity: "Trivial", message: expect.stringContaining("coverage was not verified"),
    })]);
    expect(ingestFindings().findings).toEqual(merged.findings);
  });

  it("distinguishes a completed clean scan and preserves the default flush API", () => {
    persistA11yScan({ ...context(), outputDir: join(workspace, "test-results") }, []);
    expect(readMerged(flushA11yFindings())).toMatchObject({ scanCount: 1, coverage: "scanned", findings: [] });
  });

  it.each([
    ["malformed JSON", "{broken"],
    ["invalid schema", JSON.stringify({ version: 1, findings: [] })],
    ["foreign run in active directory", JSON.stringify({ version: 1, runId: "another-run", findings: [] })],
  ])("fails closed for %s rather than emitting a partial aggregate", (_label, contents) => {
    const scan = persistA11yScan(context(), [finding("valid")]);
    writeFileSync(join(dirname(scan.path), "broken.json"), contents, "utf8");
    expect(() => flushA11yFindings({ outputDirs: [context().outputDir] })).toThrow();
    expect(existsSync(join(workspace, "audit/output/a11y-findings.json"))).toBe(false);
  });

  it.each([
    { label: "non-record location", fields: { location: "invalid" } },
    { label: "non-string location file", fields: { location: { file: 42 } } },
    { label: "zero location line", fields: { location: { file: "fixture.ts", line: 0 } } },
    { label: "negative location line", fields: { location: { file: "fixture.ts", line: -1 } } },
    { label: "fractional location line", fields: { location: { file: "fixture.ts", line: 1.5 } } },
    { label: "string location line", fields: { location: { file: "fixture.ts", line: "1" } } },
    { label: "null detail", fields: { detail: null } },
    { label: "array detail", fields: { detail: [] } },
    { label: "string detail", fields: { detail: "invalid" } },
  ])("rejects malformed optional finding field: $label", ({ fields }) => {
    const scan = persistA11yScan(context(), [finding("valid")]);
    writeFileSync(scan.path, JSON.stringify({
      ...scan.artifact,
      findings: [{ ...finding("invalid optional field"), ...fields }],
    }), "utf8");
    expect(() => flushA11yFindings({ outputDirs: [context().outputDir] })).toThrow(/Invalid browser accessibility evidence/);
    expect(existsSync(join(workspace, "audit/output/a11y-findings.json"))).toBe(false);
  });

  it("accepts a valid optional location line and detail record", () => {
    persistA11yScan(context(), [{
      ...finding("valid optional fields"),
      location: { file: "fixture.ts", line: 1 },
      detail: { rule: "fixture" },
    }]);
    expect(readMerged(flushA11yFindings({ outputDirs: [context().outputDir] })).findings).toEqual([
      expect.objectContaining({ location: { file: "fixture.ts", line: 1 }, detail: expect.objectContaining({ rule: "fixture" }) }),
    ]);
  });

  it("rejects duplicated scan evidence instead of silently double-counting it", () => {
    const scan = persistA11yScan(context(), [finding("single")]);
    writeFileSync(join(dirname(scan.path), "duplicate.json"), readFileSync(scan.path, "utf8"), "utf8");
    expect(() => flushA11yFindings({ outputDirs: [context().outputDir] })).toThrow(/Duplicate.*scan ID/);
  });

  it("fails closed without a run ID before creating scan or aggregate artifacts", () => {
    delete process.env.A11Y_RUN_ID;
    expect(() => persistA11yScan(context(), [])).toThrow(/A11Y_RUN_ID is missing/);
    expect(() => flushA11yFindings()).toThrow(/A11Y_RUN_ID is missing/);
    expect(existsSync(context().outputDir)).toBe(false);
    expect(existsSync(join(workspace, "audit"))).toBe(false);
  });

  it("starts a fresh identity without Preview and clears only prior browser aggregation", async () => {
    vi.stubEnv("AUDIT_RUN_ID", "independent-preview-id");
    mkdirSync(join(workspace, "audit/output"), { recursive: true });
    writeFileSync(join(workspace, "audit/output/a11y-findings.json"), "old browser", "utf8");
    writeFileSync(join(workspace, "audit/output/a11y-static-findings.json"), "static bytes", "utf8");
    await setupA11yEvidence();
    const firstRun = getAxeRunId();
    await setupA11yEvidence();
    expect(getAxeRunId()).not.toBe(firstRun);
    expect(process.env.AUDIT_RUN_ID).toBe("independent-preview-id");
    expect(existsSync(join(workspace, "audit/output/a11y-findings.json"))).toBe(false);
    expect(readFileSync(join(workspace, "audit/output/a11y-static-findings.json"), "utf8")).toBe("static bytes");
  });
});
