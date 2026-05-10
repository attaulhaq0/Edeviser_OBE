// Pre-deployment audit — admin mutation audit-log coverage scanner.
//
// Implements Task 13.5 / Req 13.5: every admin mutation hook MUST write a row
// to audit_logs. This is a Blocker-class invariant per
// .kiro/steering/domain-knowledge.md: "Audit logs are append-only" and
// "All admin mutations must log to audit_logs".
//
// Heuristic (intentionally conservative to avoid false positives):
//   A file is in-scope when it imports `logAuditEvent` from '@/lib/auditLogger'.
//   That import signals the developer's intent: "this hook file records
//   audit events." If ANY useMutation in that file does NOT call
//   logAuditEvent inside its mutationFn body, that is a Blocker.
//
// False-positive control:
//   - Files that don't import logAuditEvent are out of scope. Non-admin
//     hook files (e.g., student self-service mutations) legitimately don't
//     need audit logs, so we don't scan them.
//   - Mutations that only call Edge Functions via .invoke() are trusted —
//     the Edge Function is responsible for its own audit logging.
//   - Files listed in audit/baselines/audit-log-coverage-exceptions.json
//     are suppressed with a documented rationale. Exceptions with an
//     `expiresAt` timestamp become active findings once the date passes —
//     this keeps the backlog honest and prevents exceptions from becoming
//     permanent skeletons in the closet.
//
// Precision vs recall tradeoff: we prefer recall (catching real regressions)
// over false positives. The scoping-by-import rule means we miss the
// "someone added an admin hook file and forgot to import logAuditEvent at
// all" case — but that's a rarer and more obvious regression that a code
// review or the zodResolver scan (§13.3) will also catch.

import { existsSync, readFileSync } from "node:fs";
import { relative, resolve, sep } from "node:path";

import { type Finding } from "./findings.ts";
import { walkFiles } from "./fs-walk.ts";

// ─── Exception baseline loader ─────────────────────────────────────────────

interface FileExceptionEntry {
  readonly file: string;
  readonly rationale: string;
  readonly expiresAt?: string;
}

interface ExceptionBaseline {
  readonly fileLevel?: readonly FileExceptionEntry[];
}

const EXCEPTION_PATH = (): string =>
  resolve("audit", "baselines", "audit-log-coverage-exceptions.json");

interface ExceptionCheck {
  readonly suppressed: boolean;
  readonly rationale: string | null;
  /** True if the exception had an expiresAt in the past — still fires as a
   * finding but with detail noting the expiry. */
  readonly expired: boolean;
}

const loadExceptions = (
  now: Date = new Date()
): ((filePath: string) => ExceptionCheck) => {
  const path = EXCEPTION_PATH();
  if (!existsSync(path)) {
    return () => ({ suppressed: false, rationale: null, expired: false });
  }
  let baseline: ExceptionBaseline;
  try {
    baseline = JSON.parse(readFileSync(path, "utf8")) as ExceptionBaseline;
  } catch {
    // Malformed baseline — be safe: no suppressions applied.
    return () => ({ suppressed: false, rationale: null, expired: false });
  }
  const entries = baseline.fileLevel ?? [];
  const byFile = new Map<string, FileExceptionEntry>();
  for (const entry of entries) {
    // Normalise to POSIX-style relative path for cross-platform matching.
    const normalised = entry.file.split("\\").join("/");
    byFile.set(normalised, entry);
  }

  return (filePath: string): ExceptionCheck => {
    const normalised = relative(process.cwd(), filePath).split(sep).join("/");
    const entry = byFile.get(normalised);
    if (entry === undefined) {
      return { suppressed: false, rationale: null, expired: false };
    }
    if (entry.expiresAt) {
      const exp = new Date(entry.expiresAt);
      if (Number.isFinite(exp.getTime()) && exp.getTime() <= now.getTime()) {
        // Expired exception — still surfaces as a finding with Minor
        // severity so the backlog doesn't rot silently.
        return { suppressed: false, rationale: entry.rationale, expired: true };
      }
    }
    return { suppressed: true, rationale: entry.rationale, expired: false };
  };
};

const AUDIT_LOGGER_IMPORT =
  /import\s*\{[^}]*logAuditEvent[^}]*\}\s*from\s*['"]@\/lib\/auditLogger['"]/;

// Match each `useMutation({ ... })` call. This is a simple brace-balanced
// scan — sufficient because every real-world call we care about is a
// top-level export statement, never nested inside another template.
// We capture the full object-literal body so we can test it for the
// required logAuditEvent call.

const USE_MUTATION_RE = /useMutation\s*\(\s*\{/g;

const extractMutationBody = (
  contents: string,
  startIndex: number
): string | null => {
  // Caller passes the index of the '{' in `useMutation({`.
  let depth = 0;
  let i = startIndex;
  const len = contents.length;
  // inString is one of `"`, `'`, "`" when inside a string literal, null otherwise.
  let inString: string | null = null;
  let inLineComment = false;
  let inBlockComment = false;

  for (; i < len; i += 1) {
    const ch = contents[i];
    const next = contents[i + 1];

    if (inLineComment) {
      if (ch === "\n") inLineComment = false;
      continue;
    }
    if (inBlockComment) {
      if (ch === "*" && next === "/") {
        inBlockComment = false;
        i += 1;
      }
      continue;
    }
    if (inString !== null) {
      if (ch === "\\") {
        i += 1;
        continue;
      }
      if (ch === inString) inString = null;
      continue;
    }

    if (ch === "/" && next === "/") {
      inLineComment = true;
      continue;
    }
    if (ch === "/" && next === "*") {
      inBlockComment = true;
      i += 1;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === "`") {
      inString = ch;
      continue;
    }
    if (ch === "{") depth += 1;
    else if (ch === "}") {
      depth -= 1;
      if (depth === 0) {
        // Return the body slice EXCLUSIVE of the outer braces so we don't
        // mistake the outer boundaries for something significant.
        return contents.slice(startIndex + 1, i);
      }
    }
  }
  return null;
};

const AUDIT_LOG_CALL = /\b(?:logAuditEvent|auditLogger\.log)\s*\(/;

// Mutations that just proxy to an Edge Function via `.invoke` are excused —
// the Edge Function is responsible for server-side audit logging.
const INVOKE_ONLY = /supabase(?:\.\w+)*\.functions\.invoke\(/;

// Mutations that write to the database (.from(...).insert|update|delete) but
// don't call logAuditEvent. If .from(...).select(...) is the only DB call
// in the body, that's a read and doesn't need an audit log either.
const DB_WRITE =
  /\.from\(\s*['"`][^'"`]+['"`]\s*\)\s*\.\s*(?:insert|update|delete|upsert)\b/;

export interface MutationFinding {
  readonly file: string;
  readonly line: number;
  readonly bodyPreview: string;
}

export const scanAuditLogCoverage = (
  now: Date = new Date()
): readonly Finding[] => {
  const hooksRoot = resolve("src", "hooks");
  if (!existsSync(hooksRoot)) return [];

  const files = walkFiles(hooksRoot, (name) => /\.ts$/.test(name));
  const findings: Finding[] = [];
  const checkException = loadExceptions(now);

  for (const file of files) {
    const contents = readFileSync(file, "utf8");

    // Scope: only files that import logAuditEvent. Developer intent says
    // "this file records audit events" — every mutation here must comply.
    if (!AUDIT_LOGGER_IMPORT.test(contents)) continue;

    const exceptionCheck = checkException(file);
    if (exceptionCheck.suppressed) continue;

    USE_MUTATION_RE.lastIndex = 0;
    let match: RegExpExecArray | null = USE_MUTATION_RE.exec(contents);
    while (match !== null) {
      const braceIndex = match.index + match[0].length - 1;
      const body = extractMutationBody(contents, braceIndex);
      if (body === null) {
        match = USE_MUTATION_RE.exec(contents);
        continue;
      }

      const hasAuditLog = AUDIT_LOG_CALL.test(body);
      const invokesEdgeFunction = INVOKE_ONLY.test(body);
      const writesToDb = DB_WRITE.test(body);

      // Only flag if the mutation writes to DB directly AND doesn't log.
      // Edge-function-only mutations are trusted (they log server-side).
      // Mutations that don't even write to DB (rare, usually an Edge
      // Function proxy) don't need logs either.
      if (!hasAuditLog && writesToDb && !invokesEdgeFunction) {
        const prefix = contents.slice(0, match.index);
        const line = prefix.split("\n").length;
        const bodyPreview = body.slice(0, 120).replace(/\s+/g, " ").trim();
        const relPath = relative(process.cwd(), file).split(sep).join("/");

        if (exceptionCheck.expired) {
          // Exception window has closed — still fires but surfaces as
          // Minor so the team sees it without immediate deploy-block.
          findings.push({
            severity: "Minor",
            requirementId: "13.5",
            message: `Admin mutation in ${relPath} still lacks logAuditEvent AND its suppression window has expired. ${
              exceptionCheck.rationale ?? ""
            } Resolve by adding the audit log call or renewing the exception with a new expiresAt.`,
            location: { file: relPath, line },
            detail: {
              rule: "admin-mutation-missing-audit-log",
              expiredException: true,
              rationale: exceptionCheck.rationale,
              bodyPreview,
            },
          });
        } else {
          findings.push({
            severity: "Blocker",
            requirementId: "13.5",
            message: `Admin mutation in ${relPath} writes to the database but does not call logAuditEvent. Append-only audit trail is a Blocker-class invariant per .kiro/steering/domain-knowledge.md.`,
            location: { file: relPath, line },
            detail: {
              rule: "admin-mutation-missing-audit-log",
              bodyPreview,
            },
          });
        }
      }

      match = USE_MUTATION_RE.exec(contents);
    }
  }

  return findings;
};

// ─── Exports ──────────────────────────────────────────────────────────────
//
// The findings from this scanner are consumed by runSecurityStage in
// security-scan.ts — they ship inside the `security-findings.json` artifact
// alongside secret-boundary and VITE_ allowlist findings. That keeps the
// orchestrator stage list stable and gives release engineers a single
// "security" finding bucket to review.
//
// We intentionally don't expose a standalone runSecurityStage analogue
// here. If we ever need to run audit-log coverage independently for
// debugging, call scanAuditLogCoverage() directly and wrap the result
// in writeFindingsArtifact().
