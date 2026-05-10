// Pre-deployment audit — accessibility stage.
//
// Implements Task 15.2 + 15.3 as the `a11y` stage in the orchestrator:
//   - Icon-only interactive elements without an accessible name (Req 11.2).
//   - WCAG 2.1 AA color-contrast failures on Bloom / outcome / attainment
//     badge color pairs (Req 11.4).
//
// Both scanners are source-tree-only (no running browser needed), which
// keeps the stage cheap enough to run on every PR. The full axe-core
// Playwright scan referenced by Task 15.1 is gated by staging infra and
// runs in a later PR when E2E goes live.

import {
  type Finding,
  type FindingsArtifact,
  worstSeverity,
  writeFindingsArtifact,
} from "./findings.ts";
import { scanColorContrast } from "./color-contrast-check.ts";
import { scanIconOnlyButtons } from "./icon-label-scan.ts";
import type { StageResult } from "./types.ts";

const ARTIFACT_NAME = "a11y-findings.json";

export const runA11yStage = async (): Promise<StageResult> => {
  const startedAt = Date.now();

  const contrastFindings = scanColorContrast();
  const iconLabelFindings = scanIconOnlyButtons();
  const allFindings: readonly Finding[] = [
    ...contrastFindings,
    ...iconLabelFindings,
  ];

  const artifact: FindingsArtifact = {
    stage: "a11y",
    generatedAt: new Date().toISOString(),
    requirementIds: ["11.2", "11.4"],
    findings: allFindings,
  };

  const artifactPath = writeFindingsArtifact(ARTIFACT_NAME, artifact);
  const durationMs = Date.now() - startedAt;

  const worst = worstSeverity(allFindings);
  const hardFail = worst === "Blocker" || worst === "Critical";
  const softFail = worst === "Major";

  return {
    name: "a11y",
    status: hardFail || softFail ? "failed" : "passed",
    durationMs,
    artifact: artifactPath,
    message: `${allFindings.length} finding(s)${
      worst === null ? "" : ` — worst: ${worst}`
    }. (${contrastFindings.length} contrast + ${
      iconLabelFindings.length
    } icon-label)`,
  };
};
