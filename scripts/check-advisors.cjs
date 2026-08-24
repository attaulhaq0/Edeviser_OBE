#!/usr/bin/env node
/**
 * Supabase Security Advisors CI gate (security-checklist.md checks 6/7/8/29/30/33).
 *
 * Reads a downloaded Advisors report (advisors.json) and fails the CI job when
 * ERROR-level findings exist that are not recorded in the baseline allowlist.
 * WARN/INFO findings are summarized into $GITHUB_STEP_SUMMARY (non-blocking).
 *
 * Usage: node scripts/check-advisors.cjs <advisors.json> <baseline.json>
 * Exit codes: 0 = no new blocking findings, 1 = new ERROR findings or bad input.
 */
const fs = require("fs");

const [
  ,
  ,
  reportPath = "advisors.json",
  baselinePath = "scripts/advisors-error-baseline.json",
] = process.argv;

let report;
try {
  report = JSON.parse(fs.readFileSync(reportPath, "utf8"));
} catch (error) {
  console.error(
    `::error::Cannot read advisors report at ${reportPath}: ${error.message}`
  );
  process.exit(1);
}

// Advisor payloads are untrusted API output — validate shape before use.
const lints = Array.isArray(report?.lints) ? report.lints : [];
const findings = lints
  .filter((l) => l && typeof l.name === "string" && typeof l.level === "string")
  .map((l) => ({
    name: l.name,
    level: l.level,
    key:
      typeof l.cache_key === "string"
        ? l.cache_key
        : `${l.name}:${String(l.metadata?.name ?? "")}`,
  }));

let baseline = [];
try {
  const parsed = JSON.parse(fs.readFileSync(baselinePath, "utf8"));
  if (Array.isArray(parsed))
    baseline = parsed.filter((k) => typeof k === "string");
} catch {
  // Missing baseline = empty allowlist (fail-closed).
}

const errors = findings.filter((f) => f.level === "ERROR");
const warnings = findings.filter((f) => f.level === "WARN");
const blocking = errors.filter((f) => !baseline.includes(f.key));

const summary = process.env.GITHUB_STEP_SUMMARY;
if (summary) {
  fs.appendFileSync(
    summary,
    "## Supabase Security Advisors\n" +
      `- ERROR: ${errors.length} (blocking when outside baseline)\n` +
      `- WARN: ${warnings.length} (non-blocking)\n` +
      `- Baseline allowlist entries: ${baseline.length}\n`
  );
}

if (blocking.length > 0) {
  for (const f of blocking) console.error(`::error::${f.name}: ${f.key}`);
  console.error(
    `::error::${blocking.length} new ERROR-level advisor finding(s) — add the keys above to ${baselinePath} only after triage.`
  );
  process.exit(1);
}

console.log(
  `No blocking advisor findings. (ERROR: ${errors.length}, WARN: ${warnings.length})`
);
