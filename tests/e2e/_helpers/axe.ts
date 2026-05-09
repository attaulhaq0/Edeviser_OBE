// Pre-deployment audit — axe-core Playwright helper.
//
// Implements Task 4.10 / Req 11.1, 11.2, 11.3: wraps @axe-core/playwright
// with a scanPage helper that filters violations by severity and appends
// into a run-scoped buffer. The buffer is flushed by globalTeardown
// (task 4.2) into audit/output/a11y-findings.json so the report
// aggregator (§16) consumes it the same way every other scanner's
// findings are consumed.
//
// The helper is intentionally minimal — every role's a11y spec calls
// scanPage(page, { role, label }) and the run-scoped buffer does the
// rest. We don't fail the spec on a violation here; the report
// aggregator decides severity once it sees every role's findings.

import AxeBuilder from "@axe-core/playwright";
import type { Page } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import type { Finding } from "../../../scripts/audit/findings";

interface ScanOptions {
  /** Role executing the spec — used for provenance in the finding. */
  readonly role: "admin" | "coordinator" | "teacher" | "student" | "parent";
  /** Short human label for the page being scanned (e.g. "dashboard"). */
  readonly label: string;
  /** Override the axe tags set. Defaults to WCAG 2.1 AA. */
  readonly tags?: readonly string[];
}

interface RunScopedBuffer {
  findings: Finding[];
  runId: string | null;
}

// Module-level singleton — process-scoped. Playwright runs every spec in
// its own worker; the buffer exists inside that worker's module cache and
// globalTeardown drains it. When workers finish, each writes its own
// sub-buffer, then the teardown merges them (task 4.2 does the merge).
const BUFFER: RunScopedBuffer = { findings: [], runId: null };

const AXE_SEVERITY_MAP: Record<string, Finding["severity"]> = {
  critical: "Critical",
  serious: "Major",
  moderate: "Minor",
  minor: "Trivial",
};

export const setAxeRunId = (runId: string): void => {
  BUFFER.runId = runId;
};

/**
 * Run an axe scan on the current page. Every returned violation is
 * appended to the module-scoped buffer as a Finding with severity derived
 * from axe's impact level.
 */
export const scanPage = async (
  page: Page,
  opts: ScanOptions
): Promise<void> => {
  const tags = opts.tags ?? ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];
  const builder = new AxeBuilder({ page }).withTags([...tags]);
  const results = await builder.analyze();
  for (const violation of results.violations) {
    const severity =
      AXE_SEVERITY_MAP[violation.impact ?? "moderate"] ?? "Minor";
    for (const node of violation.nodes) {
      BUFFER.findings.push({
        severity,
        requirementId: "11.1",
        message: `${opts.role} ${opts.label} — ${violation.help} (${violation.id})`,
        location: {
          file: node.target.join(" > "),
        },
        detail: {
          rule: "axe-violation",
          axeId: violation.id,
          impact: violation.impact ?? "moderate",
          role: opts.role,
          page: opts.label,
          html: node.html.slice(0, 200),
        },
      });
    }
  }
};

/**
 * Drain the in-memory buffer to audit/output/a11y-findings.json. Called
 * from globalTeardown (task 4.2). Safe to call multiple times — each
 * call overwrites the file with the current buffer state.
 */
export const flushA11yFindings = (): string => {
  const target = resolve("audit", "output", "a11y-findings.json");
  mkdirSync(dirname(target), { recursive: true });
  const artifact = {
    stage: "a11y",
    generatedAt: new Date().toISOString(),
    requirementIds: ["11.1", "11.2", "11.3", "11.4"],
    findings: [...BUFFER.findings],
  };
  writeFileSync(target, `${JSON.stringify(artifact, null, 2)}\n`, "utf8");
  return target;
};

/** Test-only: reset the buffer between unit tests. */
export const __resetA11yBuffer = (): void => {
  BUFFER.findings.length = 0;
  BUFFER.runId = null;
};
