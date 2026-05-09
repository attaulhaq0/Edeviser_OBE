// Pre-deployment audit — shared types for the orchestrator.
//
// See .kiro/specs/pre-deployment-e2e-audit/design.md §Audit Runner and
// §Data Models for context. The orchestrator skeleton in run.ts imports
// these; every stage function returns a StageResult so the manifest is
// uniform across stages.

export type StageName =
  | "lint"
  | "tsc"
  | "propertyTests"
  | "build"
  | "security"
  | "connectivity"
  | "rls"
  | "cron"
  | "e2e"
  | "designTokens"
  | "i18n"
  | "a11y"
  | "perf"
  | "report";

export type StageStatus = "passed" | "failed" | "skipped" | "pending";

export interface StageResult {
  name: StageName;
  status: StageStatus;
  durationMs: number;
  artifact?: string;
  message?: string;
}

export type EnvId = "local" | "ci" | "audit-staging";

export interface AuditCliOptions {
  env: EnvId;
  stage: StageName | null;
  role: string | null;
  skip: readonly StageName[];
  incremental: boolean;
  pr: boolean;
}

export interface AuditManifest {
  runId: string;
  commitSha: string | null;
  migrationHead: string | null;
  envId: EnvId;
  startedAt: string;
  finishedAt: string | null;
  stages: StageResult[];
}
