// Pre-deployment audit — performance budget scanner.
//
// Implements:
//   - Task 14.1 / Req 12.1: gzipped bundle size measurement + baseline
//     comparison. Fails the stage when total gzipped bundle size exceeds
//     baseline × 110%. First run (when baseline.totalGzippedBytes is null)
//     reports current measurements without enforcing a regression cap —
//     explicit opt-in to freeze the baseline happens in Task 19.1.
//   - Task 14.5 / Req 12.5: N+1 detection from Supabase query log.
//     During per-role critical-path run, normalizes REST calls by stripping
//     row-identifier query params and counts templates per page transition.
//     Flags any template with > 10 hits in a single transition. Honors
//     per-template overrides in audit/baselines/n-plus-one-threshold.json.
//
// Tasks 14.2 (per-role TTI), 14.3 (list-page pagination), 14.4 (realtime
// filter AST) land in separate files. This scanner deliberately does not
// measure raw `dist/` size — only JS, CSS, and HTML assets that the browser
// actually downloads.

import { existsSync, readFileSync } from "node:fs";
import { relative, resolve, sep } from "node:path";
import { gzipSync } from "node:zlib";

import {
  type Finding,
  type FindingsArtifact,
  worstSeverity,
  writeFindingsArtifact,
} from "./findings.ts";
import { walkFiles } from "./fs-walk.ts";
import { scanListPagePagination } from "./pagination-scan.ts";
import { scanRealtimeFilters } from "./realtime-filter-scan.ts";
import type { StageResult } from "./types.ts";

// ─── N+1 detection (Task 14.5 / Req 12.5) ────────────────────────────────

interface NPlusOneThresholdBaseline {
  createdAt: string | null;
  lockedByCommit: string | null;
  description: string;
  templates: Record<string, number>;
}

const N_PLUS_ONE_BASELINE_PATH = (): string =>
  resolve("audit", "baselines", "n-plus-one-threshold.json");

const DEFAULT_N_PLUS_ONE_THRESHOLD = 10;

const loadNPlusOneBaseline = (): NPlusOneThresholdBaseline | null => {
  const path = N_PLUS_ONE_BASELINE_PATH();
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, "utf8")) as NPlusOneThresholdBaseline;
  } catch {
    return null;
  }
};

/**
 * Normalizes a Supabase REST URL by stripping row-identifier query params
 * (eq.*, id=*, etc.) to produce a stable template for counting.
 *
 * Example:
 *   /rest/v1/assignments?id=eq.abc123&select=*
 *   → /rest/v1/assignments?select=*
 */
export const normalizeRestUrl = (url: string): string => {
  try {
    const parsed = new URL(url);
    const params = new URLSearchParams(parsed.search);
    const normalized = new URLSearchParams();

    for (const [key, value] of params.entries()) {
      // Strip row-identifier filters: eq.*, neq.*, gt.*, lt.*, gte.*, lte.*
      // and bare id= params
      if (key === "id") continue;
      if (/^(eq|neq|gt|lt|gte|lte|in|is)\..+/.test(value)) continue;
      // Keep structural params: select, order, limit, offset, columns
      normalized.set(key, value);
    }

    return `${parsed.pathname}?${normalized.toString()}`;
  } catch {
    return url;
  }
};

/**
 * Analyzes a list of REST call URLs recorded during a page transition and
 * flags any query template that appears more than the threshold times.
 *
 * @param calls - Array of REST call URLs recorded during a single page transition
 * @param pageLabel - Human-readable label for the page transition (for findings)
 * @param baseline - Per-template threshold overrides
 */
export const detectNPlusOne = (
  calls: readonly string[],
  pageLabel: string,
  baseline: NPlusOneThresholdBaseline | null
): Finding[] => {
  const templateCounts = new Map<string, number>();

  for (const url of calls) {
    const template = normalizeRestUrl(url);
    templateCounts.set(template, (templateCounts.get(template) ?? 0) + 1);
  }

  const findings: Finding[] = [];

  for (const [template, count] of templateCounts.entries()) {
    const threshold =
      baseline?.templates[template] ?? DEFAULT_N_PLUS_ONE_THRESHOLD;

    if (count > threshold) {
      findings.push({
        severity: "Major",
        requirementId: "12.5",
        message: `N+1 detected on "${pageLabel}": query template "${template}" executed ${count} times (threshold: ${threshold})`,
        detail: {
          rule: "n-plus-one",
          pageLabel,
          template,
          count,
          threshold,
        },
      });
    }
  }

  return findings;
};

/**
 * Scans the Supabase query log file if present at audit/output/query-log.json.
 * The query log is produced by the Playwright TTI spec which intercepts
 * network requests during critical-path runs.
 *
 * Format of query-log.json:
 * [{ "page": "admin-dashboard", "calls": ["url1", "url2", ...] }]
 */
export const scanNPlusOne = (): Finding[] => {
  const queryLogPath = resolve("audit", "output", "query-log.json");
  if (!existsSync(queryLogPath)) return [];

  const baseline = loadNPlusOneBaseline();
  const findings: Finding[] = [];

  try {
    const log = JSON.parse(readFileSync(queryLogPath, "utf8")) as Array<{
      page: string;
      calls: string[];
    }>;

    for (const entry of log) {
      const pageFindings = detectNPlusOne(entry.calls, entry.page, baseline);
      findings.push(...pageFindings);
    }
  } catch (error) {
    findings.push({
      severity: "Trivial",
      requirementId: "12.5",
      message: `Could not parse query-log.json: ${
        error instanceof Error ? error.message : String(error)
      }`,
    });
  }

  return findings;
};

// ─── Budget configuration ─────────────────────────────────────────────────

/**
 * Ratio of baseline that triggers a Major finding. 1.10 means "current
 * bundle must stay at or below 110% of baseline." Tweaking this is a
 * deliberate decision — update requirements.md §12.1 if changed.
 */
const REGRESSION_CAP_RATIO = 1.1;

const BASELINE_PATH = (): string =>
  resolve("audit", "baselines", "bundle.json");
const BUNDLE_ROOT = (): string => resolve("dist");

// ─── Asset classification ─────────────────────────────────────────────────
// We only measure assets the browser actually downloads. Source maps, HTML
// bundle-reports, and images are excluded — they are either dev-only or
// accounted for separately (images via CDN/storage budgets).

const isMeasuredAsset = (name: string): boolean => {
  if (name.endsWith(".map")) return false;
  if (name === "bundle-report.html") return false;
  return /\.(js|css|html)$/.test(name);
};

// ─── Measurement ──────────────────────────────────────────────────────────

export interface ChunkMeasurement {
  readonly file: string;
  readonly sizeBytes: number;
  readonly gzippedBytes: number;
}

export interface BundleMeasurement {
  readonly totalSizeBytes: number;
  readonly totalGzippedBytes: number;
  readonly chunkCount: number;
  readonly largestChunks: readonly ChunkMeasurement[];
}

export const measureBundle = (): BundleMeasurement | null => {
  const root = BUNDLE_ROOT();
  if (!existsSync(root)) return null;

  const files = walkFiles(root, isMeasuredAsset);
  const chunks: ChunkMeasurement[] = [];
  let totalSizeBytes = 0;
  let totalGzippedBytes = 0;

  for (const file of files) {
    const raw = readFileSync(file);
    const gzipped = gzipSync(raw);
    const chunk: ChunkMeasurement = {
      file: relative(root, file).split(sep).join("/"),
      sizeBytes: raw.byteLength,
      gzippedBytes: gzipped.byteLength,
    };
    chunks.push(chunk);
    totalSizeBytes += chunk.sizeBytes;
    totalGzippedBytes += chunk.gzippedBytes;
  }

  // Sort by gzipped size for the "largest chunks" summary.
  const largestChunks = [...chunks]
    .sort((a, b) => b.gzippedBytes - a.gzippedBytes)
    .slice(0, 10);

  return {
    totalSizeBytes,
    totalGzippedBytes,
    chunkCount: chunks.length,
    largestChunks,
  };
};

// ─── Baseline comparison ──────────────────────────────────────────────────

interface BundleBaseline {
  createdAt?: string | null;
  lockedByCommit?: string | null;
  totalGzippedBytes?: number | null;
  chunks?: Record<string, number>;
}

const loadBaseline = (): BundleBaseline | null => {
  const path = BASELINE_PATH();
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, "utf8")) as BundleBaseline;
  } catch {
    // Malformed baseline — surface as a finding by returning null here
    // and letting the comparator raise.
    return null;
  }
};

export interface PerfScanResult {
  readonly bundleExists: boolean;
  readonly measurement: BundleMeasurement | null;
  readonly baseline: BundleBaseline | null;
  readonly findings: readonly Finding[];
}

export const runPerfBudgetScan = (): PerfScanResult => {
  const measurement = measureBundle();
  if (measurement === null) {
    return {
      bundleExists: false,
      measurement: null,
      baseline: null,
      findings: [],
    };
  }

  const baseline = loadBaseline();
  const findings: Finding[] = [];

  if (
    baseline === null ||
    baseline.totalGzippedBytes === null ||
    baseline.totalGzippedBytes === undefined
  ) {
    // No baseline yet — first-run advisory. Recorded as an informational
    // Trivial finding so the report still flags the establish-baseline
    // action item.
    findings.push({
      severity: "Trivial",
      requirementId: "12.1",
      message: `Bundle baseline not yet established. Current gzipped size: ${(
        measurement.totalGzippedBytes / 1024
      ).toFixed(1)} KB across ${
        measurement.chunkCount
      } chunks. Run Task 19.1 to freeze this as the enforcement baseline.`,
      detail: {
        rule: "bundle-baseline-missing",
        measured: {
          totalGzippedBytes: measurement.totalGzippedBytes,
          chunkCount: measurement.chunkCount,
        },
      },
    });
    return {
      bundleExists: true,
      measurement,
      baseline,
      findings,
    };
  }

  const baselineBytes = baseline.totalGzippedBytes;
  const capBytes = Math.floor(baselineBytes * REGRESSION_CAP_RATIO);
  const deltaBytes = measurement.totalGzippedBytes - baselineBytes;
  const deltaPercent = (deltaBytes / baselineBytes) * 100;

  if (measurement.totalGzippedBytes > capBytes) {
    findings.push({
      severity: "Major",
      requirementId: "12.1",
      message: `Gzipped bundle size ${(
        measurement.totalGzippedBytes / 1024
      ).toFixed(1)} KB exceeds baseline + ${(
        (REGRESSION_CAP_RATIO - 1) *
        100
      ).toFixed(0)}% cap (${(capBytes / 1024).toFixed(1)} KB). Delta: +${(
        deltaBytes / 1024
      ).toFixed(1)} KB (+${deltaPercent.toFixed(1)}%).`,
      detail: {
        rule: "bundle-size-regression",
        baselineBytes,
        currentBytes: measurement.totalGzippedBytes,
        capBytes,
        deltaBytes,
        deltaPercent,
      },
    });
  }

  return {
    bundleExists: true,
    measurement,
    baseline,
    findings,
  };
};

// ─── Stage entry point ────────────────────────────────────────────────────

const ARTIFACT_NAME = "perf-findings.json";

export const runPerfStage = async (): Promise<StageResult> => {
  const startedAt = Date.now();

  const result = runPerfBudgetScan();
  const realtimeFindings = scanRealtimeFilters();
  const paginationFindings = scanListPagePagination();
  const nPlusOneFindings = scanNPlusOne();
  const combinedFindings: readonly Finding[] = [
    ...result.findings,
    ...realtimeFindings,
    ...paginationFindings,
    ...nPlusOneFindings,
  ];

  // Even on a skipped run (no bundle) we emit an artifact so the report
  // aggregator in Task 16 has a consistent set of inputs.
  const artifactBody: FindingsArtifact & {
    measurement?: BundleMeasurement;
    baseline?: BundleBaseline;
  } = {
    stage: "perf",
    generatedAt: new Date().toISOString(),
    requirementIds: ["12.1", "12.3", "12.4", "12.5"],
    findings: combinedFindings,
    ...(result.measurement ? { measurement: result.measurement } : {}),
    ...(result.baseline ? { baseline: result.baseline } : {}),
  };

  const artifactPath = writeFindingsArtifact(ARTIFACT_NAME, artifactBody);
  const durationMs = Date.now() - startedAt;

  if (
    !result.bundleExists &&
    realtimeFindings.length === 0 &&
    paginationFindings.length === 0
  ) {
    return {
      name: "perf",
      status: "skipped",
      durationMs,
      artifact: artifactPath,
      message:
        "dist/ not found — run `npm run build` first. Realtime + pagination scans clean.",
    };
  }

  const worst = worstSeverity(combinedFindings);
  const hardFail = worst === "Blocker" || worst === "Critical";
  const softFail = worst === "Major";

  const bundleSummary = result.measurement
    ? `Gzipped total ${(result.measurement.totalGzippedBytes / 1024).toFixed(
        1
      )} KB (${result.measurement.chunkCount} chunks). `
    : "";

  return {
    name: "perf",
    status: hardFail || softFail ? "failed" : "passed",
    durationMs,
    artifact: artifactPath,
    message: `${bundleSummary}${combinedFindings.length} finding(s)${
      worst === null ? "" : ` — worst: ${worst}`
    }.`,
  };
};
