// Unit and artifact-ingestion regressions for the static accessibility stage.

import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { runA11yStage } from "../a11y-stage.ts";
import * as contrast from "../color-contrast-check.ts";
import type { FindingsArtifact } from "../findings.ts";
import { countSeverities, ingestFindings, renderReport } from "../report.ts";

let originalCwd: string;
let workspaceDir: string;

beforeEach(() => {
  originalCwd = process.cwd();
  workspaceDir = mkdtempSync(join(tmpdir(), "audit-a11y-"));
  process.chdir(workspaceDir);
});

afterEach(() => {
  vi.restoreAllMocks();
  process.chdir(originalCwd);
  rmSync(workspaceDir, { recursive: true, force: true });
});

const writeButton = (accessible: boolean): void => {
  const components = join(workspaceDir, "src", "components");
  mkdirSync(components, { recursive: true });
  writeFileSync(
    join(components, "Fixture.tsx"),
    `<Button${accessible ? ' aria-label="Open menu"' : ""}><Menu /></Button>`,
    "utf8"
  );
};

const readStaticArtifact = (): FindingsArtifact =>
  JSON.parse(
    readFileSync(join(workspaceDir, "audit/output/a11y-static-findings.json"), "utf8")
  ) as FindingsArtifact;

describe("runA11yStage", () => {
  it("passes a named control and writes a clean static artifact", async () => {
    writeButton(true);

    const result = await runA11yStage();

    expect(result.name).toBe("a11y");
    expect(result.status).toBe("passed");
    expect(result.artifact).toBe("audit/output/a11y-static-findings.json");
    expect(result.message).toBe("0 finding(s). (0 contrast + 0 icon-label)");
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
    expect(readStaticArtifact()).toEqual({
      stage: "a11y",
      generatedAt: expect.any(String),
      requirementIds: ["11.2", "11.4"],
      findings: [],
    });
  });

  it("fails deterministically for an unnamed icon-only control", async () => {
    writeButton(false);

    const result = await runA11yStage();

    expect(result.status).toBe("failed");
    expect(result.message).toBe("1 finding(s) — worst: Major. (0 contrast + 1 icon-label)");
    expect(readStaticArtifact().findings).toEqual([
      expect.objectContaining({
        severity: "Major",
        requirementId: "11.2",
        location: { file: "src/components/Fixture.tsx", line: 1 },
        message: expect.stringContaining("has no accessible name"),
      }),
    ]);
  });

  it("includes contrast failures as well as icon-label failures", async () => {
    // Use the real contrast calculation on a known-bad pair rather than
    // relying on today's (passing) design-system badge palette to fail.
    const contrastFindings = contrast.scanColorContrast([
      { label: "Invisible fixture", foreground: "#ffffff", background: "#ffffff" },
    ]);
    expect(contrastFindings).toHaveLength(1);
    vi.spyOn(contrast, "scanColorContrast").mockReturnValue(contrastFindings);
    writeButton(false);

    const result = await runA11yStage();

    expect(result.status).toBe("failed");
    expect(result.message).toBe("2 finding(s) — worst: Major. (1 contrast + 1 icon-label)");
    const findings = readStaticArtifact().findings;
    expect(findings).toHaveLength(2);
    expect(findings[0]).toEqual(contrastFindings[0]);
    expect(findings[1]?.requirementId).toBe("11.2");
  });

  it("preserves browser evidence and aggregates both artifacts exactly once after static reruns", async () => {
    const browserArtifact: FindingsArtifact = {
      stage: "a11y",
      generatedAt: "2026-01-01T00:00:00.000Z",
      requirementIds: ["11.1"],
      findings: [{ severity: "Critical", requirementId: "11.1", message: "Browser axe fixture failure" }],
    };
    const browserPath = join(workspaceDir, "audit/output/a11y-findings.json");
    mkdirSync(join(workspaceDir, "audit/output"), { recursive: true });
    const browserBytes = `${JSON.stringify(browserArtifact, null, 2)}\n`;
    writeFileSync(browserPath, browserBytes, "utf8");
    writeButton(false);

    // Mirrors default e2e -> a11y ordering, including a static-stage retry.
    await runA11yStage();
    expect(readFileSync(browserPath, "utf8")).toBe(browserBytes);
    await runA11yStage();
    expect(readFileSync(browserPath, "utf8")).toBe(browserBytes);

    const staticArtifact = readStaticArtifact();
    expect(staticArtifact.findings).toHaveLength(1);
    const ingested = ingestFindings();
    expect(ingested.malformedArtifacts).toEqual([]);
    expect(ingested.artifactFilesScanned.map((file) => basename(file)).sort()).toEqual([
      "a11y-findings.json",
      "a11y-static-findings.json",
    ]);
    expect(ingested.findings).toHaveLength(2);
    expect(ingested.findings).toEqual(expect.arrayContaining([
      ...browserArtifact.findings,
      ...staticArtifact.findings,
    ]));
    const counts = countSeverities(ingested.findings);
    expect(counts).toEqual({ blocker: 0, critical: 1, major: 1, minor: 0, trivial: 0 });
    const report = renderReport({
      manifest: null,
      findings: ingested.findings,
      counts,
      verdict: "No-Go",
      migrationHead: null,
      artifactsScanned: ingested.artifactFilesScanned,
      malformedArtifacts: ingested.malformedArtifacts,
    });
    expect(report).toContain("Total findings: 2");
    expect(report.match(/Browser axe fixture failure/g)).toHaveLength(1);
    expect(report.match(/has no accessible name/g)).toHaveLength(1);
    expect(report).toContain("output/a11y-findings.json");
    expect(report).toContain("output/a11y-static-findings.json");
  });
});
