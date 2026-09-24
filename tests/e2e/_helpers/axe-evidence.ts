// Browser accessibility evidence is persisted per scan, never held in a worker
// buffer. The run ID is established by globalSetup and inherited by workers.
import { createHash, randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import type { Finding, FindingsArtifact } from "../../../scripts/audit/findings.ts";

export interface A11yScanContext {
  readonly outputDir: string;
  readonly projectName: string;
  readonly testId: string;
  readonly workerIndex: number;
  readonly parallelIndex: number;
  readonly retry: number;
  readonly repeatEachIndex: number;
}

export interface A11yScanArtifact {
  readonly version: 1;
  readonly runId: string;
  readonly scanId: string;
  readonly generatedAt: string;
  readonly projectName: string;
  readonly testId: string;
  readonly workerIndex: number;
  readonly parallelIndex: number;
  readonly retry: number;
  readonly repeatEachIndex: number;
  readonly findings: readonly Finding[];
}

export const setAxeRunId = (runId: string): void => {
  if (!runId.trim()) throw new Error("A browser accessibility run ID is required.");
  process.env.A11Y_RUN_ID = runId;
};

export const getAxeRunId = (): string => {
  const runId = process.env.A11Y_RUN_ID;
  if (!runId?.trim()) {
    throw new Error("A11Y_RUN_ID is missing; run the accessibility globalSetup before scanning or merging.");
  }
  return runId;
};

const digest = (value: string): string => createHash("sha256").update(value).digest("hex");
const runDirectory = (outputDir: string, runId: string): string =>
  resolve(outputDir, ".a11y", digest(runId));

export const persistA11yScan = (
  context: A11yScanContext,
  findings: readonly Finding[]
): { readonly path: string; readonly artifact: A11yScanArtifact } => {
  const runId = getAxeRunId();
  const scanId = randomUUID();
  const { outputDir, ...provenance } = context;
  const artifact: A11yScanArtifact = {
    version: 1,
    runId,
    scanId,
    generatedAt: new Date().toISOString(),
    ...provenance,
    findings: findings.map((finding) => ({
      ...finding,
      detail: { ...finding.detail, runId, scanId, ...provenance },
    })),
  };
  const directory = runDirectory(outputDir, runId);
  mkdirSync(directory, { recursive: true });
  const path = resolve(directory, `${digest(context.testId)}-${context.workerIndex}-${scanId}.json`);
  // UUID + exclusive creation protects simultaneous scans and repeated calls
  // in the same test. A collision must fail, never overwrite another scan.
  writeFileSync(path, `${JSON.stringify(artifact, null, 2)}\n`, { encoding: "utf8", flag: "wx" });
  return { path, artifact };
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isFinding = (value: unknown): value is Finding =>
  isRecord(value) &&
  typeof value.severity === "string" &&
  ["Blocker", "Critical", "Major", "Minor", "Trivial"].includes(value.severity) &&
  typeof value.requirementId === "string" &&
  typeof value.message === "string" &&
  (value.location === undefined || (
    isRecord(value.location) && typeof value.location.file === "string" &&
    (value.location.line === undefined || (
      typeof value.location.line === "number" &&
      Number.isSafeInteger(value.location.line) && value.location.line > 0
    ))
  )) &&
  (value.detail === undefined || isRecord(value.detail));

const isA11yScanArtifact = (value: unknown): value is A11yScanArtifact =>
  isRecord(value) && value.version === 1 &&
  typeof value.runId === "string" && value.runId.length > 0 &&
  typeof value.scanId === "string" && value.scanId.length > 0 &&
  typeof value.generatedAt === "string" &&
  typeof value.projectName === "string" && typeof value.testId === "string" &&
  [value.workerIndex, value.parallelIndex, value.retry, value.repeatEachIndex].every(
    (index) => typeof index === "number" && Number.isSafeInteger(index) && index >= 0
  ) &&
  Array.isArray(value.findings) && value.findings.every(isFinding);

const readScan = (file: string, runId: string): A11yScanArtifact => {
  const value: unknown = JSON.parse(readFileSync(file, "utf8"));
  if (!isA11yScanArtifact(value) || value.runId !== runId) {
    throw new Error(`Invalid browser accessibility evidence for the current run: ${file}`);
  }
  return value;
};

export interface FlushA11yOptions {
  /** FullConfig project output directories; duplicates are merged only once. */
  readonly outputDirs?: readonly string[];
  readonly workspaceRoot?: string;
}

export const flushA11yFindings = (options: FlushA11yOptions = {}): string => {
  const runId = getAxeRunId();
  const workspaceRoot = options.workspaceRoot ?? process.cwd();
  const outputDirs = options.outputDirs ?? [resolve(workspaceRoot, "test-results")];
  const scans: A11yScanArtifact[] = [];
  const scanIds = new Set<string>();
  for (const outputDir of new Set(outputDirs.map((directory) => resolve(directory)))) {
    const directory = runDirectory(outputDir, runId);
    if (!existsSync(directory)) continue;
    for (const name of readdirSync(directory).filter((name) => name.endsWith(".json")).sort()) {
      const scan = readScan(resolve(directory, name), runId);
      if (scanIds.has(scan.scanId)) {
        throw new Error(`Duplicate browser accessibility scan ID: ${scan.scanId}`);
      }
      scanIds.add(scan.scanId);
      scans.push(scan);
    }
  }
  // Stable binary ordering, independent of filesystem order and process finish
  // order. Multiple scans/retries remain separate evidence, not deduplicated.
  scans.sort((left, right) => {
    const a = [left.projectName, left.testId, left.repeatEachIndex, left.retry, left.workerIndex, left.scanId].join("\0");
    const b = [right.projectName, right.testId, right.repeatEachIndex, right.retry, right.workerIndex, right.scanId].join("\0");
    return a < b ? -1 : a > b ? 1 : 0;
  });
  const artifact: FindingsArtifact & {
    readonly runId: string;
    readonly scanCount: number;
    readonly coverage: "scanned" | "not-scanned";
  } = {
    stage: "a11y",
    generatedAt: new Date().toISOString(),
    requirementIds: ["11.1", "11.2", "11.3", "11.4"],
    runId,
    scanCount: scans.length,
    coverage: scans.length > 0 ? "scanned" : "not-scanned",
    // Targeted non-axe suites need not fail teardown, but their report must
    // explicitly distinguish missing coverage from a clean accessibility scan.
    findings: scans.length > 0 ? scans.flatMap((scan) => scan.findings) : [{
      severity: "Trivial",
      requirementId: "11.1",
      message: "No browser accessibility scans executed in this run; accessibility coverage was not verified.",
      detail: { runId, rule: "axe-not-scanned" },
    }],
  };
  const target = resolve(workspaceRoot, "audit", "output", "a11y-findings.json");
  mkdirSync(resolve(workspaceRoot, "audit", "output"), { recursive: true });
  writeFileSync(target, `${JSON.stringify(artifact, null, 2)}\n`, "utf8");
  return target;
};

/** Compatibility helper: clears run identity, not persisted evidence. */
export const __resetA11yBuffer = (): void => {
  delete process.env.A11Y_RUN_ID;
};
