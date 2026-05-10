#!/usr/bin/env tsx
// Pre-deployment audit — orchestrator entry point.
//
// Usage:
//   tsx scripts/audit/run.ts --env=ci
//   tsx scripts/audit/run.ts --stage=rls
//   tsx scripts/audit/run.ts --role=student
//   tsx scripts/audit/run.ts --pr
//
// Wired into package.json as `npm run audit` (see tasks.md §1.4). This file is
// the skeleton produced by task 1.4. Every stage function is currently a stub
// that returns `{ status: 'skipped' }` — real stages land in tasks 8–16.
//
// See:
//   - .kiro/specs/pre-deployment-e2e-audit/design.md §Audit Runner
//   - .kiro/specs/pre-deployment-e2e-audit/requirements.md §17

import { parseArgs } from "./cli.ts";
import {
  appendStage,
  createManifest,
  finalizeManifest,
  writeManifest,
} from "./manifest.ts";
import { DEFAULT_STAGE_ORDER, PR_STAGE_ORDER, stages } from "./stages.ts";
import type { AuditCliOptions, StageName, StageResult } from "./types.ts";

const log = (message: string): void => {
  process.stdout.write(`[audit] ${message}\n`);
};

const resolveStageOrder = (options: AuditCliOptions): readonly StageName[] => {
  if (options.stage !== null) {
    return [options.stage];
  }
  const base = options.pr ? PR_STAGE_ORDER : DEFAULT_STAGE_ORDER;
  if (options.skip.length === 0) {
    return base;
  }
  const skipSet = new Set(options.skip);
  return base.filter((stage) => !skipSet.has(stage));
};

const runStage = async (name: StageName): Promise<StageResult> => {
  const fn = stages[name];
  const startedAt = Date.now();
  try {
    const result = await fn();
    return {
      ...result,
      durationMs: Date.now() - startedAt,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown stage error";
    return {
      name,
      status: "failed",
      durationMs: Date.now() - startedAt,
      message,
    };
  }
};

const main = async (): Promise<number> => {
  let options: AuditCliOptions;
  try {
    options = parseArgs(process.argv.slice(2));
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Argument parse error";
    process.stderr.write(`[audit] ${message}\n`);
    return 2;
  }

  let manifest = createManifest(options.env);
  writeManifest(manifest);

  log(`run ${manifest.runId} started (env=${options.envId ?? options.env})`);
  if (options.role !== null) {
    log(`role filter: ${options.role}`);
  }

  const order = resolveStageOrder(options);
  let failed = 0;
  for (const stage of order) {
    log(`stage ${stage} → start`);
    const result = await runStage(stage);
    manifest = appendStage(manifest, result);
    writeManifest(manifest);
    if (result.status === "failed") {
      failed += 1;
    }
    log(
      `stage ${stage} → ${result.status} in ${result.durationMs}ms${
        result.message ? ` (${result.message})` : ""
      }`
    );
  }

  manifest = finalizeManifest(manifest);
  writeManifest(manifest);

  log(`run complete — ${manifest.stages.length} stages, ${failed} failed`);
  return failed === 0 ? 0 : 1;
};

main().then(
  (code) => {
    process.exit(code);
  },
  (error: unknown) => {
    const message =
      error instanceof Error ? error.message : "Fatal audit runner error";
    process.stderr.write(`[audit] ${message}\n`);
    process.exit(1);
  }
);
