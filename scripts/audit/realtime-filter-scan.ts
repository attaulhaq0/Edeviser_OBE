// Pre-deployment audit — realtime subscription filter scan.
//
// Implements Task 14.4 / Req 12.4: every realtime subscription MUST pass a
// filter. Unfiltered subscriptions are both a performance risk (every row
// change floods every subscriber) and a privacy risk (the client receives
// rows it shouldn't see). Per .kiro/steering/supabase-patterns.md:
// "Always scope realtime subscriptions with filters (don't subscribe to
// entire tables)".
//
// Two subscription shapes to detect:
//
// 1. Centralized: `useRealtime({ table, event, filter?, onPayload })` call
//    sites. The Edeviser codebase routes most realtime work through this
//    hook — when `filter` is missing or resolves to `undefined`, the
//    subscription covers the entire table.
//
// 2. Direct: `supabase.channel(name).on('postgres_changes', config, cb)`
//    call sites where the config object must carry a `filter:` key.
//
// Severity: Major per requirements.md §12.6. Escalates to Critical if we
// detect this on tables listed in TENANT_SCOPED_TABLES because those are
// known to leak cross-tenant data without a filter.

import { existsSync, readFileSync } from "node:fs";
import { relative, resolve, sep } from "node:path";

import { type Finding } from "./findings.ts";
import { walkFiles } from "./fs-walk.ts";

// ─── Tenant-scoped tables (escalate to Critical on unfiltered access) ─────
// These tables contain cross-institution or cross-student rows. A subscriber
// without a filter leaks data beyond its RLS scope because realtime is
// bypassed by RLS under the publication config; the filter is the defense.

const TENANT_SCOPED_TABLES = new Set([
  "notifications",
  "submissions",
  "grades",
  "evidence",
  "audit_logs",
  "xp_transactions",
  "badges",
  "parent_student_links",
]);

// ─── Scan 1: useRealtime call sites ────────────────────────────────────────
//
// The hook signature is `useRealtime({ table, event, filter?, onPayload, ... })`.
// We walk every `useRealtime({` callsite, extract its config object, and
// verify a `filter:` key is present. Object literal brace balancing reuses
// the same state machine pattern from audit-log-coverage.ts.

const USE_REALTIME_RE = /useRealtime\s*\(\s*\{/g;

const CHANNEL_ON_RE = /\.channel\([^)]*\)\s*(?:\s*\.on\s*\([^,]+,\s*\{)/g;

const extractObjectLiteralBody = (
  contents: string,
  openBraceIndex: number
): string | null => {
  let depth = 0;
  let inString: string | null = null;
  let inLineComment = false;
  let inBlockComment = false;
  const len = contents.length;
  for (let i = openBraceIndex; i < len; i += 1) {
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
        return contents.slice(openBraceIndex + 1, i);
      }
    }
  }
  return null;
};

const TABLE_KEY_RE = /\btable\s*:\s*['"`]([^'"`]+)['"`]/;
const FILTER_KEY_PRESENT_RE = /\bfilter\s*:\s*(?!undefined\b)/;

// Extract the line number of a match offset.
const lineAt = (contents: string, offset: number): number =>
  contents.slice(0, offset).split("\n").length;

const isLocation = (file: string, line: number) => ({
  file: file.split(sep).join("/"),
  line,
});

// Exclude files that are the realtime infrastructure itself or tests.
const isAuditSource = (absPath: string): boolean => {
  const rel = relative(process.cwd(), absPath);
  if (rel.startsWith(`src${sep}__tests__${sep}`)) return false;
  if (rel.includes(`${sep}test${sep}`)) return false;
  // useRealtime.ts is the implementation of the hook itself. Scanning its
  // internal .channel() call would always flag because the filter is
  // passed in by the caller, not inlined. Skip it.
  if (rel === `src${sep}hooks${sep}useRealtime.ts`) return false;
  return true;
};

export const scanRealtimeFilters = (): readonly Finding[] => {
  const hooksRoot = resolve("src", "hooks");
  if (!existsSync(hooksRoot)) return [];

  const files = walkFiles(hooksRoot, (name) => /\.(ts|tsx)$/.test(name)).filter(
    isAuditSource
  );
  const findings: Finding[] = [];

  for (const file of files) {
    const contents = readFileSync(file, "utf8");
    const relPath = relative(process.cwd(), file);

    // Scan 1: useRealtime({ ... }) call sites
    USE_REALTIME_RE.lastIndex = 0;
    let match: RegExpExecArray | null = USE_REALTIME_RE.exec(contents);
    while (match !== null) {
      const openBraceIndex = match.index + match[0].length - 1;
      const body = extractObjectLiteralBody(contents, openBraceIndex);
      if (body !== null) {
        const tableMatch = TABLE_KEY_RE.exec(body);
        const table = tableMatch?.[1] ?? "(unknown)";
        const hasFilter = FILTER_KEY_PRESENT_RE.test(body);
        if (!hasFilter) {
          const line = lineAt(contents, match.index);
          const tenantScoped = TENANT_SCOPED_TABLES.has(table);
          findings.push({
            severity: tenantScoped ? "Critical" : "Major",
            requirementId: "12.4",
            message: `useRealtime subscription to table "${table}" in ${relPath
              .split(sep)
              .join(
                "/"
              )} has no filter. Unfiltered subscriptions flood every subscriber with every row change${
              tenantScoped
                ? " and leak cross-tenant rows (tenant-scoped table — escalated to Critical)"
                : ""
            }. Add a \`filter: '<column>=eq.<value>'\` clause per .kiro/steering/supabase-patterns.md.`,
            location: isLocation(relPath, line),
            detail: {
              rule: "unfiltered-realtime-subscription",
              subscriptionShape: "useRealtime",
              table,
              tenantScoped,
            },
          });
        }
      }
      match = USE_REALTIME_RE.exec(contents);
    }

    // Scan 2: Direct supabase.channel().on('postgres_changes', { ... }, cb)
    CHANNEL_ON_RE.lastIndex = 0;
    let directMatch: RegExpExecArray | null = CHANNEL_ON_RE.exec(contents);
    while (directMatch !== null) {
      // directMatch[0] ends at the opening `{` of the config object.
      const openBraceIndex = directMatch.index + directMatch[0].length - 1;
      const body = extractObjectLiteralBody(contents, openBraceIndex);
      if (body !== null) {
        const tableMatch = TABLE_KEY_RE.exec(body);
        const table = tableMatch?.[1] ?? "(unknown)";
        const hasFilter = FILTER_KEY_PRESENT_RE.test(body);
        if (!hasFilter) {
          const line = lineAt(contents, directMatch.index);
          const tenantScoped = TENANT_SCOPED_TABLES.has(table);
          findings.push({
            severity: tenantScoped ? "Critical" : "Major",
            requirementId: "12.4",
            message: `Direct supabase.channel().on('postgres_changes', …) subscription to "${table}" in ${relPath
              .split(sep)
              .join(
                "/"
              )} has no filter. Prefer the centralized useRealtime hook and always pass a filter clause.`,
            location: isLocation(relPath, line),
            detail: {
              rule: "unfiltered-realtime-subscription",
              subscriptionShape: "direct-channel",
              table,
              tenantScoped,
            },
          });
        }
      }
      directMatch = CHANNEL_ON_RE.exec(contents);
    }
  }

  return findings;
};
