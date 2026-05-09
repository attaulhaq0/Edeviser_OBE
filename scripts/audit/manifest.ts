// Pre-deployment audit — manifest writer.
//
// Writes audit/output/manifest.json matching the schema in design.md
// §Data Models. The file is overwritten on every run. Runs are keyed by
// a UUID generated at process start so downstream artifacts can cross-link.

import { randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import type { AuditManifest, EnvId, StageResult } from "./types.ts";

const MANIFEST_PATH = resolve("audit", "output", "manifest.json");

const safeGitSha = (): string | null => {
  try {
    const out = execFileSync("git", ["rev-parse", "HEAD"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
    return out.trim() || null;
  } catch {
    return null;
  }
};

export const createManifest = (envId: EnvId): AuditManifest => ({
  runId: randomUUID(),
  commitSha: safeGitSha(),
  // Migration head is resolved via Supabase MCP by downstream stages;
  // unknown at orchestrator start time.
  migrationHead: null,
  envId,
  startedAt: new Date().toISOString(),
  finishedAt: null,
  stages: [],
});

export const appendStage = (
  manifest: AuditManifest,
  result: StageResult
): AuditManifest => ({
  ...manifest,
  stages: [...manifest.stages, result],
});

export const finalizeManifest = (manifest: AuditManifest): AuditManifest => ({
  ...manifest,
  finishedAt: new Date().toISOString(),
});

export const writeManifest = (manifest: AuditManifest): void => {
  mkdirSync(dirname(MANIFEST_PATH), { recursive: true });
  writeFileSync(
    MANIFEST_PATH,
    `${JSON.stringify(manifest, null, 2)}\n`,
    "utf8"
  );
};
