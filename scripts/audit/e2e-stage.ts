// Pre-deployment audit — authenticated Playwright E2E stage.
//
// Fixture seeding is destructive by design, so this stage is opt-in and will
// only run against an explicitly marked Supabase preview environment. Without
// those guards it reports a transparent skipped result instead of pretending
// that the E2E suite passed.

import { spawnSync } from "node:child_process";

import {
  type Finding,
  type FindingsArtifact,
  writeFindingsArtifact,
} from "./findings.ts";
import type { StageResult } from "./types.ts";

const ARTIFACT_NAME = "e2e-findings.json";

const writeArtifact = (findings: readonly Finding[]): string => {
  const artifact: FindingsArtifact = {
    stage: "e2e",
    generatedAt: new Date().toISOString(),
    requirementIds: ["17.4", "17.5"],
    findings,
  };
  return writeFindingsArtifact(ARTIFACT_NAME, artifact);
};

export const runE2EStage = async (): Promise<StageResult> => {
  const startedAt = Date.now();
  const required = [
    "E2E_FIXTURES_ENABLED=true",
    "SUPABASE_DB_ENV=preview",
    "PLAYWRIGHT_BASE_URL",
    "VITE_SUPABASE_URL",
    "VITE_SUPABASE_ANON_KEY",
  ] as const;
  const missing = required.filter((requirement) => {
    if (requirement.includes("=")) {
      const separator = requirement.indexOf("=");
      const name = requirement.slice(0, separator);
      const value = requirement.slice(separator + 1);
      return process.env[name] !== value;
    }
    return !process.env[requirement];
  });

  if (missing.length > 0) {
    const artifact = writeArtifact([]);
    return {
      name: "e2e",
      status: "skipped",
      durationMs: Date.now() - startedAt,
      artifact,
      message: `Authenticated E2E not run; preview-only configuration is missing: ${missing.join(
        ", "
      )}.`,
    };
  }

  const isWindows = process.platform === "win32";
  const command = isWindows ? "npx.cmd" : "npx";
  const result = spawnSync(command, ["playwright", "test"], {
    encoding: "utf8",
    shell: isWindows,
    stdio: "pipe",
    timeout: 10 * 60 * 1000,
    env: process.env,
  });
  const exitCode = result.status ?? 1;
  const output = `${result.stdout ?? ""}\n${result.stderr ?? ""}`.slice(-4000);
  const findings: readonly Finding[] =
    exitCode === 0
      ? []
      : [
          {
            severity: "Blocker",
            requirementId: "17.4",
            message: "Authenticated Playwright E2E failed.",
            detail: { exitCode, output },
          },
        ];
  const artifact = writeArtifact(findings);

  return {
    name: "e2e",
    status: exitCode === 0 ? "passed" : "failed",
    durationMs: Date.now() - startedAt,
    artifact,
    message:
      exitCode === 0
        ? "Authenticated Playwright E2E passed against the explicitly configured preview environment."
        : `Authenticated Playwright E2E failed with exit code ${exitCode}.`,
  };
};
