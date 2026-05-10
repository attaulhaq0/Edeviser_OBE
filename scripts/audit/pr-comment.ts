// Pre-deployment audit — PR comment template generator.
//
// Implements Task 16.5 / Req 17.5. Reads audit/output/verdict.json and
// produces the Markdown body for the GitHub PR comment:
//   - Verdict line (Go / Go-with-backlog / No-Go) with emoji
//   - Severity counts table
//   - Top-3 findings (by severity, then message)
//   - Link to full audit report
//
// The comment is idempotent: the CI bot job (§18.3) edits the existing
// comment on re-runs rather than appending a new one. This script only
// produces the Markdown body; the GitHub Actions step handles the
// create-or-edit logic via actions/github-script.

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import type { Finding, Severity } from "./findings.ts";
import type { Verdict } from "./verdict.ts";

// ─── Types matching audit/output/verdict.json ─────────────────────────────

interface VerdictJson {
  readonly verdict: Verdict;
  readonly commitSha: string | null;
  readonly migrationHead: string | null;
  readonly envId: string;
  readonly generatedAt: string;
  readonly counts: {
    readonly blocker: number;
    readonly critical: number;
    readonly major: number;
    readonly minor: number;
    readonly trivial: number;
  };
  readonly waiverCount: number;
}

interface FindingsArtifact {
  readonly stage: string;
  readonly findings: readonly Finding[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────

const VERDICT_EMOJI: Record<Verdict, string> = {
  Go: "✅",
  "Go-with-backlog": "⚠️",
  "No-Go": "🚫",
};

const SEVERITY_ORDER: readonly Severity[] = [
  "Blocker",
  "Critical",
  "Major",
  "Minor",
  "Trivial",
];

const severityRank = (s: Severity): number => SEVERITY_ORDER.indexOf(s);

const loadAllFindings = (): readonly Finding[] => {
  const outputDir = resolve("audit", "output");
  if (!existsSync(outputDir)) return [];

  const entries = readdirSync(outputDir);
  const findings: Finding[] = [];

  for (const entry of entries) {
    if (
      !entry.endsWith(".json") ||
      entry === "verdict.json" ||
      entry === "manifest.json"
    ) {
      continue;
    }
    try {
      const raw = JSON.parse(
        readFileSync(resolve(outputDir, entry), "utf8")
      ) as FindingsArtifact | null;
      if (raw?.findings) {
        findings.push(...raw.findings);
      }
    } catch {
      // Skip malformed artifacts — the report aggregator already flags them.
    }
  }

  return findings;
};

// ─── Comment body generator ───────────────────────────────────────────────

export const generatePrCommentBody = (
  verdictJson: VerdictJson,
  allFindings: readonly Finding[]
): string => {
  const { verdict, counts, commitSha, generatedAt, waiverCount } = verdictJson;
  const emoji = VERDICT_EMOJI[verdict];
  const sha = commitSha ? commitSha.slice(0, 7) : "unknown";
  const date = new Date(generatedAt).toUTCString();

  const lines: string[] = [];

  // Header
  lines.push(`## ${emoji} Pre-Deployment Audit — ${verdict}`);
  lines.push("");
  lines.push(
    `**Commit:** \`${sha}\` | **Generated:** ${date} | **Env:** \`${verdictJson.envId}\``
  );
  if (waiverCount > 0) {
    lines.push(`> ⚠️ ${waiverCount} active waiver(s) applied to this verdict.`);
  }
  lines.push("");

  // Severity counts table
  lines.push("### Severity Counts");
  lines.push("");
  lines.push("| Severity | Count |");
  lines.push("|----------|-------|");
  lines.push(`| 🚫 Blocker  | ${counts.blocker} |`);
  lines.push(`| 🔴 Critical | ${counts.critical} |`);
  lines.push(`| 🟠 Major    | ${counts.major} |`);
  lines.push(`| 🟡 Minor    | ${counts.minor} |`);
  lines.push(`| ⚪ Trivial  | ${counts.trivial} |`);
  lines.push("");

  // Top-3 findings sorted by severity (worst first)
  const sorted = [...allFindings].sort(
    (a, b) => severityRank(b.severity) - severityRank(a.severity)
  );
  const top3 = sorted.slice(0, 3);

  if (top3.length > 0) {
    lines.push("### Top Findings");
    lines.push("");
    for (const f of top3) {
      const loc = f.location
        ? ` — \`${f.location.file}${
            f.location.line ? `:${f.location.line}` : ""
          }\``
        : "";
      lines.push(
        `- **[${f.severity}]** Req ${f.requirementId}: ${f.message.slice(
          0,
          120
        )}${loc}`
      );
    }
    const remaining = allFindings.length - top3.length;
    if (remaining > 0) {
      lines.push(`- _…and ${remaining} more finding(s)_`);
    }
    lines.push("");
  }

  // Link to full report
  lines.push(
    "> 📄 Full report: `audit/output/audit-report.md` (download from workflow artifacts)"
  );

  return lines.join("\n");
};

// ─── CLI entry point ──────────────────────────────────────────────────────

const main = (): void => {
  const verdictPath = resolve("audit", "output", "verdict.json");
  if (!existsSync(verdictPath)) {
    process.stderr.write(
      "audit/output/verdict.json not found — run the audit pipeline first.\n"
    );
    process.exit(1);
  }

  const verdictJson = JSON.parse(
    readFileSync(verdictPath, "utf8")
  ) as VerdictJson;

  const allFindings = loadAllFindings();
  const body = generatePrCommentBody(verdictJson, allFindings);

  // Write to stdout so the GitHub Actions step can capture it.
  process.stdout.write(body);
  process.stdout.write("\n");
};

// Only run when executed directly (not when imported by tests).
// tsx sets import.meta.url to a file:// URL matching process.argv[1].
const isMain =
  typeof process !== "undefined" &&
  process.argv[1] !== undefined &&
  import.meta.url.endsWith(process.argv[1].replace(/\\/g, "/"));

if (isMain) {
  main();
}
