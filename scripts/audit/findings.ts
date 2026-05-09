// Pre-deployment audit — shared finding type.
//
// Every scanner, probe, and property test emits findings in this shape. The
// report aggregator (§16) loads the JSON files emitted by each stage and
// normalises them against this schema before applying the Severity_Ladder.

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";

export type Severity = "Blocker" | "Critical" | "Major" | "Minor" | "Trivial";

export interface Finding {
  readonly severity: Severity;
  /** Ordinal of the requirement this finding maps to, e.g. "13.1". */
  readonly requirementId: string;
  /** Human-readable one-liner. */
  readonly message: string;
  /**
   * Optional file + line location. `file` is a workspace-relative path and
   * `line` is 1-indexed.
   */
  readonly location?: { readonly file: string; readonly line?: number };
  /** Optional detail block captured at finding time for reproducibility. */
  readonly detail?: Record<string, unknown>;
}

export interface FindingsArtifact {
  readonly stage: string;
  readonly generatedAt: string;
  readonly requirementIds: readonly string[];
  readonly findings: readonly Finding[];
}

const AUDIT_OUTPUT_ROOT = resolve("audit", "output");

const outputPath = (relativeName: string): string => {
  return resolve(AUDIT_OUTPUT_ROOT, relativeName);
};

export const writeFindingsArtifact = (
  relativeName: string,
  artifact: FindingsArtifact
): string => {
  const destination = outputPath(relativeName);
  mkdirSync(dirname(destination), { recursive: true });
  writeFileSync(destination, `${JSON.stringify(artifact, null, 2)}\n`, "utf8");
  // Return a workspace-relative, POSIX-style path so the manifest is
  // reproducible across machines and OSes (important for CI diffs and
  // cross-platform grep-through-logs).
  return relative(process.cwd(), destination).split("\\").join("/");
};

/**
 * Worst severity across a finding list. Used by the orchestrator to decide
 * whether a stage passed or failed. Empty list → passed.
 */
export const worstSeverity = (
  findings: readonly Finding[]
): Severity | null => {
  const order: readonly Severity[] = [
    "Trivial",
    "Minor",
    "Major",
    "Critical",
    "Blocker",
  ];
  let worst: Severity | null = null;
  let worstIdx = -1;
  for (const f of findings) {
    const idx = order.indexOf(f.severity);
    if (idx > worstIdx) {
      worst = f.severity;
      worstIdx = idx;
    }
  }
  return worst;
};
