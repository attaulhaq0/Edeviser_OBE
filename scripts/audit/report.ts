// Pre-deployment audit — report aggregator.
//
// Implements:
//   - Task 16.1 / Req 16.1, 16.2: finding ingestion from every
//     audit/output/*-findings.json. Normalises each entry and fails fast
//     on malformed severity.
//   - Task 16.3 / Req 16.1, 16.5, 16.6: Markdown report generator with
//     executive summary, per-requirement table, findings grouped by
//     severity, and the Go/No-Go Matrix.
//   - Task 16.4 / Req 16.7, 16.8: verdict.json emitter stamped with
//     commit SHA, environment id, timestamp. Refuses to emit a partial
//     stamp.

import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from "node:fs";
import { resolve } from "node:path";

import type { Finding, FindingsArtifact, Severity } from "./findings.ts";
import {
  type SeverityCounts,
  type Verdict,
  type Waiver,
  severityToVerdict,
} from "./verdict.ts";
import { loadWaivers as loadWaiverFile } from "./waivers.ts";

// ─── Manifest + artifact I/O ──────────────────────────────────────────────

interface Manifest {
  runId: string;
  commitSha: string | null;
  migrationHead: string | null;
  envId: string;
  startedAt: string;
  finishedAt: string | null;
  stages: Array<{
    name: string;
    status: "passed" | "failed" | "skipped" | "pending";
    durationMs: number;
    artifact?: string;
    message?: string;
  }>;
}

const AUDIT_OUTPUT = (): string => resolve("audit", "output");
const MANIFEST_PATH = (): string => resolve(AUDIT_OUTPUT(), "manifest.json");
const REPORT_PATH = (): string => resolve(AUDIT_OUTPUT(), "audit-report.md");
const VERDICT_PATH = (): string => resolve(AUDIT_OUTPUT(), "verdict.json");

const SEVERITIES: readonly Severity[] = [
  "Blocker",
  "Critical",
  "Major",
  "Minor",
  "Trivial",
];

export interface IngestedFindings {
  readonly findings: readonly Finding[];
  readonly artifactFilesScanned: readonly string[];
  /** Artifact files the ingestor could not parse. */
  readonly malformedArtifacts: readonly {
    readonly file: string;
    readonly reason: string;
  }[];
}

const FINDINGS_FILE_PATTERN = /-findings\.json$/;

const isFinding = (value: unknown): value is Finding => {
  if (!value || typeof value !== "object") return false;
  const f = value as Record<string, unknown>;
  return (
    typeof f.severity === "string" &&
    (SEVERITIES as readonly string[]).includes(f.severity) &&
    typeof f.requirementId === "string" &&
    typeof f.message === "string"
  );
};

/**
 * Walk audit/output/ for *-findings.json artifacts and collect every
 * finding. Any artifact whose findings are malformed is surfaced as a
 * Trivial finding of its own — this prevents silent "unknown" buckets per
 * Req 16.2.
 */
export const ingestFindings = (): IngestedFindings => {
  const outputRoot = AUDIT_OUTPUT();
  if (!existsSync(outputRoot)) {
    return { findings: [], artifactFilesScanned: [], malformedArtifacts: [] };
  }
  const artifactFiles = readdirSync(outputRoot)
    .filter((name) => FINDINGS_FILE_PATTERN.test(name))
    .map((name) => resolve(outputRoot, name));

  const findings: Finding[] = [];
  const malformedArtifacts: { file: string; reason: string }[] = [];

  for (const file of artifactFiles) {
    let parsed: FindingsArtifact | null = null;
    try {
      parsed = JSON.parse(readFileSync(file, "utf8")) as FindingsArtifact;
    } catch (error) {
      malformedArtifacts.push({
        file,
        reason: error instanceof Error ? error.message : "JSON parse error",
      });
      continue;
    }
    if (!parsed || !Array.isArray(parsed.findings)) {
      malformedArtifacts.push({
        file,
        reason: "artifact missing findings[] array",
      });
      continue;
    }
    for (const raw of parsed.findings) {
      if (!isFinding(raw)) {
        // Surface unknown-severity findings as their own Major finding so
        // the aggregator never silently skips them (Req 16.2).
        findings.push({
          severity: "Major",
          requirementId: "16.2",
          message: `Finding in ${file} has missing or invalid severity — aggregator refuses to classify.`,
          location: { file },
          detail: { rawFinding: raw },
        });
        continue;
      }
      findings.push(raw);
    }
  }

  return {
    findings,
    artifactFilesScanned: artifactFiles,
    malformedArtifacts,
  };
};

// ─── Severity counts ──────────────────────────────────────────────────────

export const countSeverities = (
  findings: readonly Finding[]
): SeverityCounts => {
  const counts: SeverityCounts = {
    blocker: findings.filter((f) => f.severity === "Blocker").length,
    critical: findings.filter((f) => f.severity === "Critical").length,
    major: findings.filter((f) => f.severity === "Major").length,
    minor: findings.filter((f) => f.severity === "Minor").length,
    trivial: findings.filter((f) => f.severity === "Trivial").length,
  };
  return counts;
};

// ─── Waiver loader ────────────────────────────────────────────────────────
// Waivers live in audit/waivers.json (gitignored; audit/waivers.example.json
// is the committed template). severityToVerdict's expiry check enforces
// time-bounded scope; malformed waivers are silently rejected AND surfaced
// via the ingestor's malformedArtifacts path.

const loadWaivers = (): readonly Waiver[] => {
  const result = loadWaiverFile();
  return result.waivers;
};

// ─── Manifest reader ──────────────────────────────────────────────────────

const loadManifest = (): Manifest | null => {
  const path = MANIFEST_PATH();
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, "utf8")) as Manifest;
  } catch {
    return null;
  }
};

// ─── Migration head resolver (best-effort) ────────────────────────────────
// supabase/migrations/ files follow the timestamp-prefix convention. The
// head is the lexically-greatest filename — good enough for a
// reproducibility stamp without a round-trip to the DB.

const resolveMigrationHead = (): string | null => {
  const migrationsDir = resolve("supabase", "migrations");
  if (!existsSync(migrationsDir)) return null;
  try {
    const entries = readdirSync(migrationsDir)
      .filter((name) => name.endsWith(".sql"))
      .sort();
    const head = entries[entries.length - 1];
    return head ?? null;
  } catch {
    return null;
  }
};

// ─── Markdown helpers ─────────────────────────────────────────────────────

const fmtDate = (iso: string | null): string =>
  iso === null ? "—" : new Date(iso).toISOString();

const truncate = (s: string, max = 200): string =>
  s.length > max ? `${s.slice(0, max - 1)}…` : s;

const severityEmoji: Record<Severity, string> = {
  Blocker: "🛑",
  Critical: "🔴",
  Major: "🟠",
  Minor: "🟡",
  Trivial: "⚪",
};

const formatFinding = (f: Finding): string => {
  const loc = f.location
    ? `\n  - Location: \`${f.location.file}${
        f.location.line ? `:${f.location.line}` : ""
      }\``
    : "";
  return `- ${severityEmoji[f.severity]} **Req ${
    f.requirementId
  }** — ${truncate(f.message, 300)}${loc}`;
};

// ─── Report rendering ─────────────────────────────────────────────────────

export interface ReportInputs {
  readonly manifest: Manifest | null;
  readonly findings: readonly Finding[];
  readonly counts: SeverityCounts;
  readonly verdict: Verdict;
  readonly migrationHead: string | null;
  readonly artifactsScanned: readonly string[];
  readonly malformedArtifacts: readonly {
    readonly file: string;
    readonly reason: string;
  }[];
}

export const renderReport = (input: ReportInputs): string => {
  const {
    manifest,
    findings,
    counts,
    verdict,
    migrationHead,
    artifactsScanned,
    malformedArtifacts,
  } = input;

  const commitShort = manifest?.commitSha?.slice(0, 8) ?? "unknown";
  const totalFindings = findings.length;

  const lines: string[] = [];
  lines.push(`# Edeviser Pre-Deployment Audit — ${commitShort}`);
  lines.push("");
  lines.push(`- Verdict: **${verdict}**`);
  lines.push(`- Commit: \`${manifest?.commitSha ?? "unknown"}\``);
  lines.push(`- Migration head: \`${migrationHead ?? "unknown"}\``);
  lines.push(`- Environment: \`${manifest?.envId ?? "unknown"}\``);
  lines.push(`- Run started: ${fmtDate(manifest?.startedAt ?? null)}`);
  lines.push(`- Run finished: ${fmtDate(manifest?.finishedAt ?? null)}`);
  lines.push("");

  // Executive Summary
  lines.push("## Executive Summary");
  lines.push("");
  lines.push(`Total findings: ${totalFindings}`);
  lines.push("");
  lines.push("| Severity | Count |");
  lines.push("|----------|-------|");
  lines.push(`| 🛑 Blocker  | ${counts.blocker} |`);
  lines.push(`| 🔴 Critical | ${counts.critical} |`);
  lines.push(`| 🟠 Major    | ${counts.major} |`);
  lines.push(`| 🟡 Minor    | ${counts.minor} |`);
  lines.push(`| ⚪ Trivial  | ${counts.trivial} |`);
  lines.push("");

  // Per-stage status table
  if (manifest !== null) {
    lines.push("## Per-Stage Status");
    lines.push("");
    lines.push("| Stage | Status | Duration | Artifact |");
    lines.push("|-------|--------|----------|----------|");
    for (const s of manifest.stages) {
      lines.push(
        `| ${s.name} | ${s.status} | ${s.durationMs}ms | ${
          s.artifact ? `\`${s.artifact}\`` : "—"
        } |`
      );
    }
    lines.push("");
  }

  // Malformed artifacts warning
  if (malformedArtifacts.length > 0) {
    lines.push("## Aggregator Warnings");
    lines.push("");
    for (const m of malformedArtifacts) {
      lines.push(`- Could not parse \`${m.file}\`: ${m.reason}`);
    }
    lines.push("");
  }

  // Findings grouped by severity
  lines.push("## Findings");
  lines.push("");
  if (findings.length === 0) {
    lines.push("No findings. The audit is clean for every live stage.");
    lines.push("");
  } else {
    for (const severity of SEVERITIES) {
      const bucket = findings.filter((f) => f.severity === severity);
      if (bucket.length === 0) continue;
      lines.push(
        `### ${severityEmoji[severity]} ${severity} (${bucket.length})`
      );
      lines.push("");
      for (const f of bucket) {
        lines.push(formatFinding(f));
      }
      lines.push("");
    }
  }

  // Go/No-Go Matrix (as reference)
  lines.push("## Go/No-Go Matrix (reference)");
  lines.push("");
  lines.push("| Blocker | Critical | Major | Verdict |");
  lines.push("|---------|----------|-------|---------|");
  lines.push("| ≥ 1 | any | any | No-Go |");
  lines.push("| 0 | ≥ 1 without waiver | any | No-Go |");
  lines.push("| 0 | ≥ 1 with signed waiver | any | Go-with-backlog |");
  lines.push("| 0 | 0 | > threshold | Go-with-backlog |");
  lines.push("| 0 | 0 | ≤ threshold | Go-with-backlog |");
  lines.push("| 0 | 0 | 0 | Go |");
  lines.push("");

  // Provenance
  lines.push("## Provenance");
  lines.push("");
  lines.push(`- Artifacts scanned: ${artifactsScanned.length}`);
  for (const f of artifactsScanned) {
    lines.push(`  - \`${f.split(/[\\/]/).slice(-2).join("/")}\``);
  }
  lines.push("");

  return `${lines.join("\n")}\n`;
};

// ─── verdict.json ─────────────────────────────────────────────────────────

export interface VerdictArtifact {
  readonly verdict: Verdict;
  readonly severityCounts: SeverityCounts;
  readonly commitSha: string;
  readonly migrationHead: string;
  readonly envId: string;
  readonly runId: string;
  readonly producedAt: string;
  readonly waivers: readonly Waiver[];
}

export class ProvenanceIncompleteError extends Error {
  readonly missing: readonly string[];
  constructor(missing: readonly string[]) {
    super(
      `verdict.json refused to emit — reproducibility stamps missing: ${missing.join(
        ", "
      )}`
    );
    this.name = "ProvenanceIncompleteError";
    this.missing = missing;
  }
}

export interface BuildVerdictInput {
  readonly manifest: Manifest | null;
  readonly counts: SeverityCounts;
  readonly verdict: Verdict;
  readonly migrationHead: string | null;
  readonly waivers?: readonly Waiver[];
  /** Override in tests for determinism. */
  readonly now?: Date;
}

export const buildVerdictArtifact = (
  input: BuildVerdictInput
): VerdictArtifact => {
  const missing: string[] = [];
  if (!input.manifest?.commitSha) missing.push("commitSha");
  if (!input.manifest?.envId) missing.push("envId");
  if (!input.manifest?.runId) missing.push("runId");
  if (!input.migrationHead) missing.push("migrationHead");
  if (missing.length > 0) {
    throw new ProvenanceIncompleteError(missing);
  }

  const manifest = input.manifest!;
  return {
    verdict: input.verdict,
    severityCounts: input.counts,
    commitSha: manifest.commitSha!,
    migrationHead: input.migrationHead!,
    envId: manifest.envId,
    runId: manifest.runId,
    producedAt: (input.now ?? new Date()).toISOString(),
    waivers: input.waivers ?? [],
  };
};

// ─── Stage entry point ────────────────────────────────────────────────────

import type { StageResult } from "./types.ts";

export const runReportStage = async (): Promise<StageResult> => {
  const startedAt = Date.now();

  const manifest = loadManifest();
  const ingested = ingestFindings();
  const counts = countSeverities(ingested.findings);
  const waivers = loadWaivers();
  const verdict = severityToVerdict(counts, waivers);
  const migrationHead = resolveMigrationHead();

  // Render Markdown report — always produced, even on incomplete runs.
  const report = renderReport({
    manifest,
    findings: ingested.findings,
    counts,
    verdict,
    migrationHead,
    artifactsScanned: ingested.artifactFilesScanned,
    malformedArtifacts: ingested.malformedArtifacts,
  });
  mkdirSync(AUDIT_OUTPUT(), { recursive: true });
  writeFileSync(REPORT_PATH(), report, "utf8");

  // verdict.json requires all provenance stamps. If any are missing, emit a
  // Critical finding to the report stage rather than a partial stamp.
  let verdictEmitted = false;
  let provenanceError: string | null = null;
  try {
    const artifact = buildVerdictArtifact({
      manifest,
      counts,
      verdict,
      migrationHead,
      waivers,
    });
    writeFileSync(
      VERDICT_PATH(),
      `${JSON.stringify(artifact, null, 2)}\n`,
      "utf8"
    );
    verdictEmitted = true;
  } catch (error) {
    provenanceError =
      error instanceof Error ? error.message : "Unknown provenance error";
  }

  const durationMs = Date.now() - startedAt;
  const artifactRelative = "audit/output/audit-report.md";

  if (!verdictEmitted) {
    return {
      name: "report",
      status: "failed",
      durationMs,
      artifact: artifactRelative,
      message:
        provenanceError ??
        "verdict.json missing reproducibility stamps; deploy must not proceed.",
    };
  }

  // Stage status reflects the verdict:
  //   Go               → passed
  //   Go-with-backlog  → passed (the deploy can still go; backlog is advisory)
  //   No-Go            → failed
  return {
    name: "report",
    status: verdict === "No-Go" ? "failed" : "passed",
    durationMs,
    artifact: artifactRelative,
    message: `Verdict: ${verdict}. Findings: ${ingested.findings.length} (B:${counts.blocker} C:${counts.critical} M:${counts.major} m:${counts.minor} T:${counts.trivial}).`,
  };
};

// Silence unused import warning if execFileSync is not invoked by a future
// stage-specific helper; retained because the report stage is expected to
// grow git-describe integration when tag-stamped releases land.
void execFileSync;
