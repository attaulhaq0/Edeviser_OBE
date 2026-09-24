// Pre-deployment audit — axe-core Playwright helper.
// Persist every scan before enforcing the existing Major-or-higher a11y gate.
// Global teardown merges the current run's files across all worker processes.
import AxeBuilder from "@axe-core/playwright";
import { test, type Page } from "@playwright/test";

import type { Finding } from "../../../scripts/audit/findings.ts";
import { getAxeRunId, persistA11yScan } from "./axe-evidence.ts";

// Keep the existing helper API available to callers; state is now on disk.
export { setAxeRunId, flushA11yFindings, __resetA11yBuffer } from "./axe-evidence.ts";

interface ScanOptions {
  readonly role: "admin" | "coordinator" | "teacher" | "student" | "parent";
  readonly label: string;
  /** Override the axe tags set. Defaults to WCAG 2.1 AA. */
  readonly tags?: readonly string[];
}

const AXE_SEVERITY_MAP: Record<string, Finding["severity"]> = {
  critical: "Critical",
  serious: "Major",
  moderate: "Minor",
  minor: "Trivial",
};

export const scanPage = async (page: Page, opts: ScanOptions): Promise<void> => {
  // Resolve provenance before starting browser work. A missing globalSetup
  // must fail rather than accidentally join an earlier run's evidence.
  getAxeRunId();
  const info = test.info();
  const tags = opts.tags ?? ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];
  const results = await new AxeBuilder({ page }).withTags([...tags]).analyze();
  const findings: Finding[] = [];
  for (const violation of results.violations) {
    const severity = AXE_SEVERITY_MAP[violation.impact ?? "moderate"] ?? "Minor";
    for (const node of violation.nodes) {
      findings.push({
        severity,
        requirementId: "11.1",
        message: `${opts.role} ${opts.label} — ${violation.help} (${violation.id})`,
        location: { file: node.target.join(" > ") },
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
  // Store outside individual test output folders: Playwright can prune those
  // according to preserveOutput, but the project-level merge still needs them.
  const evidence = persistA11yScan({
    outputDir: info.project.outputDir,
    projectName: info.project.name,
    testId: info.testId,
    workerIndex: info.workerIndex,
    parallelIndex: info.parallelIndex,
    retry: info.retry,
    repeatEachIndex: info.repeatEachIndex,
  }, findings);
  await info.attach(`axe-${evidence.artifact.scanId}`, {
    path: evidence.path,
    contentType: "application/json",
  });

  // Match scripts/audit/a11y-stage.ts: Major, Critical, and Blocker fail;
  // Minor/Trivial remain visible evidence without changing severity policy.
  const failures = findings.filter((finding) =>
    ["Major", "Critical", "Blocker"].includes(finding.severity)
  );
  if (failures.length > 0) {
    throw new Error(
      `Accessibility scan failed for ${opts.role} ${opts.label}: ${failures.length} Major-or-higher finding(s). ` +
      `Evidence: ${evidence.path}\n${failures.map((finding) => finding.message).join("\n")}`
    );
  }
};
