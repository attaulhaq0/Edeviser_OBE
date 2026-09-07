#!/usr/bin/env node
/**
 * sync-advisor-baseline.mjs — Refresh scripts/advisors-error-baseline.json from
 * a live Supabase Security Advisor report so check-advisors.cjs detects NEW
 * ERROR-level findings (fail-closed) rather than snapshotting the current state.
 *
 * Usage:
 *   node scripts/sync-advisor-baseline.mjs <advisors.json> [<baseline.json>]
 *
 * Only ERROR-level findings become baseline cache_keys. WARN/INFO findings are
 * summarized to stdout (non-blocking) so CI never suppresses a new warning
 * merely to keep the gate green.
 */
import { readFileSync, writeFileSync } from "node:fs";

const [
  ,
  ,
  reportPath = "advisors.json",
  baselinePath = "scripts/advisors-error-baseline.json",
] = process.argv;

let report;
try {
  report = JSON.parse(readFileSync(reportPath, "utf8"));
} catch (error) {
  console.error(
    `Cannot read advisors report at ${reportPath}: ${error.message}`
  );
  process.exit(1);
}

const lints = Array.isArray(report?.lints) ? report.lints : [];
const keys = [];
for (const lint of lints) {
  const level = lint?.level;
  if (level === "ERROR") {
    keys.push(
      typeof lint?.cache_key === "string"
        ? lint.cache_key
        : `${lint.name}:${String(lint.metadata?.name ?? "")}`
    );
  } else if (level === "WARN" || level === "INFO") {
    console.log(
      `[${level}] ${lint?.name}: ${String(
        lint?.metadata?.name ?? lint?.title ?? ""
      )}`
    );
  }
}

const unique = [...new Set(keys)].sort();
writeFileSync(baselinePath, `${JSON.stringify(unique, null, 2)}\n`);
console.log(
  `Baseline refreshed: ${baselinePath} (${unique.length} ERROR-level key(s)).`
);
console.log(
  unique.length === 0
    ? "No blocking ERROR-level advisor findings today. check-advisors.cjs stays fail-closed on any future ERROR."
    : "Review each key before committing; they are intentionally allowed ERROR findings."
);
