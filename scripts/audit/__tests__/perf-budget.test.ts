// Unit tests for scripts/audit/perf-budget.ts
//
// Covers:
//   - measureBundle: recursive JS/CSS/HTML asset measurement with gzip
//   - runPerfBudgetScan: baseline comparison + regression cap logic

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { measureBundle, runPerfBudgetScan } from "../perf-budget.ts";

let originalCwd: string;
let workspaceDir: string;

beforeEach(() => {
  originalCwd = process.cwd();
  workspaceDir = mkdtempSync(join(tmpdir(), "audit-perf-"));
  mkdirSync(join(workspaceDir, "audit", "baselines"), { recursive: true });
  process.chdir(workspaceDir);
});

afterEach(() => {
  process.chdir(originalCwd);
  try {
    rmSync(workspaceDir, { recursive: true, force: true });
  } catch {
    // best-effort cleanup
  }
});

const writeDistFile = (relPath: string, content: string) => {
  const full = join(workspaceDir, "dist", relPath);
  mkdirSync(join(full, ".."), { recursive: true });
  writeFileSync(full, content, "utf8");
};

const writeBaseline = (body: unknown) => {
  writeFileSync(
    join(workspaceDir, "audit", "baselines", "bundle.json"),
    JSON.stringify(body, null, 2),
    "utf8"
  );
};

// ─── measureBundle ────────────────────────────────────────────────────────

describe("measureBundle (Task 14.1)", () => {
  it("returns null when dist/ is missing", () => {
    expect(measureBundle()).toBeNull();
  });

  it("measures JS, CSS, and HTML files but skips source maps", () => {
    // Use highly compressible content so gzipped < raw — makes the assertion
    // order stable regardless of platform zlib version.
    const body = "a".repeat(5000);
    writeDistFile("assets/index-abc.js", body);
    writeDistFile("assets/index-abc.js.map", '{"mappings":"...very long..."}');
    writeDistFile("assets/index-abc.css", body);
    writeDistFile("index.html", body);
    writeDistFile("bundle-report.html", "report only"); // excluded

    const result = measureBundle();
    expect(result).not.toBeNull();
    expect(result!.chunkCount).toBe(3); // .js + .css + index.html
    expect(result!.totalSizeBytes).toBe(body.length * 3);
    expect(result!.totalGzippedBytes).toBeLessThan(result!.totalSizeBytes);
  });

  it("reports largest chunks sorted by gzipped size", () => {
    // Give each file unique content so gzipped sizes differ.
    writeDistFile("assets/small.js", "abc");
    writeDistFile("assets/large.js", "x".repeat(10_000));
    writeDistFile("assets/medium.js", "y".repeat(2_000));

    const result = measureBundle();
    const names = result!.largestChunks.map((c) => c.file);
    expect(names[0]).toContain("large");
  });

  it("emits POSIX-style relative paths in chunk entries", () => {
    writeDistFile("assets/index.js", "x");
    const result = measureBundle();
    expect(result!.largestChunks[0]?.file).toBe("assets/index.js");
  });
});

// ─── runPerfBudgetScan ────────────────────────────────────────────────────

describe("runPerfBudgetScan — baseline comparison (Task 14.1, Req 12.1)", () => {
  it("returns bundleExists=false when dist/ is missing", () => {
    const result = runPerfBudgetScan();
    expect(result.bundleExists).toBe(false);
    expect(result.findings).toEqual([]);
  });

  it("emits a Trivial advisory when no baseline is present", () => {
    writeDistFile("assets/index.js", "x".repeat(1000));
    const result = runPerfBudgetScan();
    expect(result.bundleExists).toBe(true);
    expect(result.findings).toHaveLength(1);
    expect(result.findings[0]?.severity).toBe("Trivial");
    expect(result.findings[0]?.detail?.rule).toBe("bundle-baseline-missing");
  });

  it("emits a Trivial advisory when baseline exists but totalGzippedBytes is null", () => {
    writeDistFile("assets/index.js", "x".repeat(1000));
    writeBaseline({ createdAt: null, totalGzippedBytes: null });
    const result = runPerfBudgetScan();
    expect(result.findings).toHaveLength(1);
    expect(result.findings[0]?.severity).toBe("Trivial");
  });

  it("passes silently when current size is within 110% of baseline", () => {
    // Seed a baseline that accommodates some growth.
    writeDistFile("assets/index.js", "x".repeat(1000));
    const firstRun = runPerfBudgetScan();
    const baselineBytes = firstRun.measurement!.totalGzippedBytes;

    // Write baseline set to current measurement.
    writeBaseline({
      createdAt: "2026-01-01T00:00:00.000Z",
      lockedByCommit: "abc123",
      totalGzippedBytes: baselineBytes,
    });

    const result = runPerfBudgetScan();
    expect(result.findings).toEqual([]);
  });

  it("flags a Major finding when current size exceeds 110% of baseline", () => {
    writeDistFile("assets/index.js", "a".repeat(100_000));
    const firstRun = runPerfBudgetScan();
    const currentBytes = firstRun.measurement!.totalGzippedBytes;

    // Seed a baseline low enough that the current size is over the cap.
    // Cap = baseline * 1.10, so baseline < currentBytes / 1.10 guarantees a fail.
    const lowBaseline = Math.floor(currentBytes / 1.5);
    writeBaseline({
      createdAt: "2026-01-01T00:00:00.000Z",
      lockedByCommit: "abc123",
      totalGzippedBytes: lowBaseline,
    });

    const result = runPerfBudgetScan();
    expect(result.findings).toHaveLength(1);
    expect(result.findings[0]?.severity).toBe("Major");
    expect(result.findings[0]?.detail?.rule).toBe("bundle-size-regression");
    const detail = result.findings[0]?.detail as {
      readonly deltaPercent?: number;
    };
    expect(detail.deltaPercent).toBeGreaterThan(10);
  });

  it("treats a malformed baseline JSON as missing baseline", () => {
    writeDistFile("assets/index.js", "x".repeat(1000));
    writeFileSync(
      join(workspaceDir, "audit", "baselines", "bundle.json"),
      "{ malformed",
      "utf8"
    );
    const result = runPerfBudgetScan();
    // Falls through to the "no baseline" advisory — does NOT throw.
    expect(result.findings).toHaveLength(1);
    expect(result.findings[0]?.severity).toBe("Trivial");
  });
});
