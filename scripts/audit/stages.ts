// Pre-deployment audit — stage function stubs.
//
// Per tasks.md §1.4: "Stub each stage function as `async () => ({ status:
// 'skipped' })` for now." Real implementations land in tasks 8–16. Each
// stage returns a StageResult so the orchestrator can append it to the
// manifest without branching per stage.

import { runA11yStage } from "./a11y-stage.ts";
import { runDesignTokensStage } from "./design-token-check.ts";
import { runI18nStage } from "./i18n-check.ts";
import { runPerfStage } from "./perf-budget.ts";
import {
  runBuildStage,
  runLintStage,
  runPropertyTestsStage,
  runTscStage,
} from "./process-stages.ts";
import { runReportStage } from "./report.ts";
import { runSecurityStage } from "./security-scan.ts";
import type { StageName, StageResult } from "./types.ts";

type StageFn = () => Promise<StageResult>;

const stub =
  (name: StageName): StageFn =>
  async () => ({
    name,
    status: "skipped",
    durationMs: 0,
    message: "Stub — implementation pending in a later task.",
  });

export const stages: Record<StageName, StageFn> = {
  lint: runLintStage,
  tsc: runTscStage,
  propertyTests: runPropertyTestsStage,
  build: runBuildStage,
  security: runSecurityStage,
  connectivity: stub("connectivity"),
  rls: stub("rls"),
  cron: stub("cron"),
  e2e: stub("e2e"),
  designTokens: runDesignTokensStage,
  i18n: runI18nStage,
  a11y: runA11yStage,
  perf: runPerfStage,
  report: runReportStage,
};

// Default execution order for a full audit run. Matches the pipeline DAG in
// design.md §Stage Ordering and Policy: static → contract → property → E2E → report.
export const DEFAULT_STAGE_ORDER: readonly StageName[] = [
  "lint",
  "tsc",
  "propertyTests",
  "build",
  "security",
  "connectivity",
  "rls",
  "cron",
  "e2e",
  "designTokens",
  "i18n",
  "a11y",
  "perf",
  "report",
];

// PR mode order. Per design.md §Per-PR vs Pre-Deploy Modes the E2E layer and
// the RTL screenshot capture are skipped to stay inside a 10-minute budget.
// A11y runs in PR mode because its two scanners are source-tree-only (no
// running browser); it catches icon-only-button regressions at review time.
export const PR_STAGE_ORDER: readonly StageName[] = [
  "lint",
  "tsc",
  "propertyTests",
  "build",
  "security",
  "connectivity",
  "rls",
  "cron",
  "designTokens",
  "i18n",
  "a11y",
  "perf",
  "report",
];
