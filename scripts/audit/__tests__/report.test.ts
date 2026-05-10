// Unit tests for scripts/audit/report.ts
//
// Covers:
//   - ingestFindings — artifact discovery, malformed-artifact handling,
//     invalid-severity detection
//   - countSeverities — bucket arithmetic
//   - renderReport — markdown structure sanity (doesn't snapshot the
//     whole doc; just asserts the critical sections exist)
//   - buildVerdictArtifact — refuses to emit when provenance is incomplete

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  ProvenanceIncompleteError,
  buildVerdictArtifact,
  countSeverities,
  ingestFindings,
  renderReport,
} from "../report.ts";

let originalCwd: string;
let workspaceDir: string;

beforeEach(() => {
  originalCwd = process.cwd();
  workspaceDir = mkdtempSync(join(tmpdir(), "audit-report-"));
  mkdirSync(join(workspaceDir, "audit", "output"), { recursive: true });
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

const writeArtifact = (name: string, body: unknown) => {
  writeFileSync(
    join(workspaceDir, "audit", "output", name),
    JSON.stringify(body, null, 2),
    "utf8"
  );
};

// ─── ingestFindings ───────────────────────────────────────────────────────

describe("ingestFindings (Task 16.1)", () => {
  it("returns empty when audit/output/ is missing", () => {
    // Move cwd to a directory without audit/output/.
    const freshDir = mkdtempSync(join(tmpdir(), "audit-empty-"));
    process.chdir(freshDir);
    try {
      const result = ingestFindings();
      expect(result.findings).toEqual([]);
      expect(result.artifactFilesScanned).toEqual([]);
    } finally {
      process.chdir(workspaceDir);
      rmSync(freshDir, { recursive: true, force: true });
    }
  });

  it("only ingests files matching *-findings.json", () => {
    writeArtifact("manifest.json", { runId: "x" });
    writeArtifact("security-findings.json", {
      stage: "security",
      generatedAt: "2026-01-01T00:00:00.000Z",
      requirementIds: ["13.1"],
      findings: [],
    });
    const result = ingestFindings();
    expect(result.artifactFilesScanned).toHaveLength(1);
    expect(result.artifactFilesScanned[0]).toContain("security-findings.json");
  });

  it("collects findings from multiple artifacts", () => {
    writeArtifact("security-findings.json", {
      stage: "security",
      generatedAt: "2026-01-01T00:00:00.000Z",
      requirementIds: ["13.1"],
      findings: [
        { severity: "Blocker", requirementId: "13.1", message: "leak" },
      ],
    });
    writeArtifact("i18n-findings.json", {
      stage: "i18n",
      generatedAt: "2026-01-01T00:00:00.000Z",
      requirementIds: ["10.1"],
      findings: [
        { severity: "Major", requirementId: "10.1", message: "missing key" },
      ],
    });
    const result = ingestFindings();
    expect(result.findings).toHaveLength(2);
    expect(result.findings.map((f) => f.severity).sort()).toEqual([
      "Blocker",
      "Major",
    ]);
  });

  it("reports malformed artifacts without crashing", () => {
    writeFileSync(
      join(workspaceDir, "audit", "output", "broken-findings.json"),
      "{ malformed",
      "utf8"
    );
    const result = ingestFindings();
    expect(result.malformedArtifacts).toHaveLength(1);
  });

  it("rejects a finding with invalid severity — adds its own Major finding", () => {
    writeArtifact("bad-findings.json", {
      stage: "bad",
      generatedAt: "2026-01-01T00:00:00.000Z",
      requirementIds: ["x"],
      findings: [
        { severity: "Whoopsie", requirementId: "1.1", message: "invalid" },
      ],
    });
    const result = ingestFindings();
    expect(result.findings).toHaveLength(1);
    expect(result.findings[0]?.severity).toBe("Major");
    expect(result.findings[0]?.requirementId).toBe("16.2");
  });
});

// ─── countSeverities ──────────────────────────────────────────────────────

describe("countSeverities", () => {
  it("returns all zeros for empty findings", () => {
    expect(countSeverities([])).toEqual({
      blocker: 0,
      critical: 0,
      major: 0,
      minor: 0,
      trivial: 0,
    });
  });

  it("counts each severity bucket", () => {
    const counts = countSeverities([
      { severity: "Blocker", requirementId: "13.1", message: "x" },
      { severity: "Blocker", requirementId: "13.2", message: "x" },
      { severity: "Major", requirementId: "10.1", message: "x" },
      { severity: "Trivial", requirementId: "12.1", message: "x" },
    ]);
    expect(counts.blocker).toBe(2);
    expect(counts.critical).toBe(0);
    expect(counts.major).toBe(1);
    expect(counts.trivial).toBe(1);
  });
});

// ─── renderReport ─────────────────────────────────────────────────────────

describe("renderReport", () => {
  it("produces a report with all mandatory sections", () => {
    const md = renderReport({
      manifest: {
        runId: "r1",
        commitSha: "abc1234567",
        migrationHead: null,
        envId: "local",
        startedAt: "2026-01-01T00:00:00.000Z",
        finishedAt: "2026-01-01T00:01:00.000Z",
        stages: [{ name: "security", status: "passed", durationMs: 100 }],
      },
      findings: [],
      counts: countSeverities([]),
      verdict: "Go",
      migrationHead: "20260101_x.sql",
      artifactsScanned: ["security-findings.json"],
      malformedArtifacts: [],
    });
    expect(md).toContain("# Edeviser Pre-Deployment Audit");
    expect(md).toContain("Verdict: **Go**");
    expect(md).toContain("## Executive Summary");
    expect(md).toContain("## Per-Stage Status");
    expect(md).toContain("## Findings");
    expect(md).toContain("## Go/No-Go Matrix");
    expect(md).toContain("## Provenance");
  });

  it("lists each finding under its severity heading", () => {
    const md = renderReport({
      manifest: null,
      findings: [
        { severity: "Blocker", requirementId: "13.1", message: "leaked SRK" },
        { severity: "Major", requirementId: "10.1", message: "missing ar key" },
      ],
      counts: countSeverities([
        { severity: "Blocker", requirementId: "13.1", message: "leaked SRK" },
        { severity: "Major", requirementId: "10.1", message: "missing ar key" },
      ]),
      verdict: "No-Go",
      migrationHead: null,
      artifactsScanned: [],
      malformedArtifacts: [],
    });
    expect(md).toContain("### 🛑 Blocker (1)");
    expect(md).toContain("leaked SRK");
    expect(md).toContain("### 🟠 Major (1)");
    expect(md).toContain("missing ar key");
  });

  it("shows a clean-state message when there are no findings", () => {
    const md = renderReport({
      manifest: null,
      findings: [],
      counts: countSeverities([]),
      verdict: "Go",
      migrationHead: null,
      artifactsScanned: [],
      malformedArtifacts: [],
    });
    expect(md).toContain("No findings");
  });

  it("surfaces aggregator warnings for malformed artifacts", () => {
    const md = renderReport({
      manifest: null,
      findings: [],
      counts: countSeverities([]),
      verdict: "Go",
      migrationHead: null,
      artifactsScanned: [],
      malformedArtifacts: [
        { file: "broken-findings.json", reason: "JSON parse error" },
      ],
    });
    expect(md).toContain("## Aggregator Warnings");
    expect(md).toContain("broken-findings.json");
  });
});

// ─── buildVerdictArtifact ─────────────────────────────────────────────────

describe("buildVerdictArtifact (Task 16.4, Req 16.7, 16.8)", () => {
  const zeroCounts = {
    blocker: 0,
    critical: 0,
    major: 0,
    minor: 0,
    trivial: 0,
  };

  it("emits a stamped artifact when every provenance field is present", () => {
    const artifact = buildVerdictArtifact({
      manifest: {
        runId: "run-1",
        commitSha: "abc123",
        migrationHead: null,
        envId: "ci",
        startedAt: "2026-01-01T00:00:00.000Z",
        finishedAt: "2026-01-01T00:01:00.000Z",
        stages: [],
      },
      counts: zeroCounts,
      verdict: "Go",
      migrationHead: "20260101_x.sql",
      now: new Date("2026-01-02T00:00:00.000Z"),
    });
    expect(artifact.commitSha).toBe("abc123");
    expect(artifact.envId).toBe("ci");
    expect(artifact.runId).toBe("run-1");
    expect(artifact.migrationHead).toBe("20260101_x.sql");
    expect(artifact.producedAt).toBe("2026-01-02T00:00:00.000Z");
  });

  it("refuses to emit when commitSha is missing", () => {
    expect(() =>
      buildVerdictArtifact({
        manifest: {
          runId: "run-1",
          commitSha: null,
          migrationHead: null,
          envId: "ci",
          startedAt: "",
          finishedAt: null,
          stages: [],
        },
        counts: zeroCounts,
        verdict: "Go",
        migrationHead: "20260101_x.sql",
      })
    ).toThrow(ProvenanceIncompleteError);
  });

  it("refuses to emit when migrationHead is missing", () => {
    expect(() =>
      buildVerdictArtifact({
        manifest: {
          runId: "run-1",
          commitSha: "abc",
          migrationHead: null,
          envId: "ci",
          startedAt: "",
          finishedAt: null,
          stages: [],
        },
        counts: zeroCounts,
        verdict: "Go",
        migrationHead: null,
      })
    ).toThrow(ProvenanceIncompleteError);
  });

  it("refuses to emit when manifest is null", () => {
    expect(() =>
      buildVerdictArtifact({
        manifest: null,
        counts: zeroCounts,
        verdict: "Go",
        migrationHead: "20260101_x.sql",
      })
    ).toThrow(ProvenanceIncompleteError);
  });
});
