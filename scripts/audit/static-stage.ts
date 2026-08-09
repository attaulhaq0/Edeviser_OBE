// Aggregate source/build scanners for the documented --stage=static command.
// The individual artifacts remain separate so the report can distinguish each
// scanner's findings and CI can upload them independently.

import { runA11yStage } from "./a11y-stage.ts";
import { runDesignTokensStage } from "./design-token-check.ts";
import { runI18nStage } from "./i18n-check.ts";
import { runPerfStage } from "./perf-budget.ts";
import type { StageResult } from "./types.ts";

export const runStaticStage = async (): Promise<StageResult> => {
  const startedAt = Date.now();
  const results = [
    await runDesignTokensStage(),
    await runI18nStage(),
    await runA11yStage(),
    await runPerfStage(),
  ];
  const failed = results.filter((result) => result.status === "failed");
  return {
    name: "static",
    status: failed.length === 0 ? "passed" : "failed",
    durationMs: Date.now() - startedAt,
    message: `${results.length} scanners completed; ${failed.length} failed.`,
  };
};
