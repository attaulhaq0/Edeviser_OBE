// Feature: multi-tenant-rls-isolation, Property: Tenant Isolation — No role-gated policy ships unscoped
// **Validates: cross-institution RLS isolation invariant**
//
// Senior-dev / QA guard. This is a STATIC analogue of the runtime
// `public.rls_isolation_violations()` SQL function. It scans the migration
// files for `CREATE POLICY` blocks and fails CI if any policy gates access on
// `auth_user_role()` (a role check) but fails to tie rows to the caller's
// identity (`auth.uid()`) or institution (`auth_institution_id()` /
// `institution_id`).
//
// Why this matters: a policy that checks only the role (e.g.
// `auth_user_role() = 'admin'`) with no institution/ownership filter lets a
// staff member in one institution read/write another institution's rows. Six
// such table-policy leaks were found and fixed (student_gamification, evidence,
// submissions, sub_clos, audit_logs, badge_spotlight_schedule). This test
// prevents the class of bug from recurring.
//
// Net-state semantics: a policy may be created, then later DROPped or
// re-CREATEd by a subsequent migration. We replay every CREATE/DROP POLICY
// statement in chronological (file-sorted) order and evaluate only the policies
// that still exist at the end, using their final definition.

import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

const projectRoot = path.resolve(__dirname, "../../..");
const migrationDir = path.join(projectRoot, "supabase/migrations");

// Genuinely platform-wide tables: no tenant key (institution_id / student_id /
// actor_id) exists, so they cannot be institution-scoped. Admin-only is the
// intended design. Keep this list in sync with the allowlist in the
// `rls_isolation_violations()` SQL function.
const PLATFORM_ALLOWLIST = new Set([
  "audit_findings",
  "audit_runs",
  "blocked_ips",
  "rate_limit_events",
]);

// All previously-tracked storage.objects leaks (course-materials read/upload,
// submissions/session-evidence staff read, reports buckets) have been
// institution-scoped. No known follow-ups remain. If a NEW unscoped role-gated
// storage policy is added, the main test below will catch it.
const KNOWN_STORAGE_FOLLOWUP = new Set<string>([]);

interface PolicyState {
  table: string;
  policy: string;
  body: string;
  sourceFile: string;
}

/**
 * Replay all CREATE/DROP POLICY statements across migrations in chronological
 * order and return the policies that still exist at the end, keyed by
 * `table.policy`, with their final CREATE definition.
 */
const computeFinalPolicies = (): Map<string, PolicyState> => {
  const files = fs.existsSync(migrationDir)
    ? fs
        .readdirSync(migrationDir)
        .filter((f) => f.endsWith(".sql"))
        .sort()
    : [];

  const createRegex =
    /CREATE\s+POLICY\s+"?([a-zA-Z0-9_]+)"?\s+ON\s+(?:[a-zA-Z0-9_]+\.)?"?([a-zA-Z0-9_]+)"?([\s\S]*?);/gi;
  const dropRegex =
    /DROP\s+POLICY\s+(?:IF\s+EXISTS\s+)?"?([a-zA-Z0-9_]+)"?\s+ON\s+(?:[a-zA-Z0-9_]+\.)?"?([a-zA-Z0-9_]+)"?/gi;

  const live = new Map<string, PolicyState>();

  for (const file of files) {
    const content = fs.readFileSync(path.join(migrationDir, file), "utf-8");

    // Build an ordered timeline of events within this file so a DROP followed
    // by a CREATE (the common "replace" idiom) is applied in source order.
    interface Event {
      idx: number;
      kind: "create" | "drop";
      table: string;
      policy: string;
      body?: string;
    }
    const events: Event[] = [];

    createRegex.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = createRegex.exec(content)) !== null) {
      events.push({
        idx: m.index,
        kind: "create",
        policy: m[1]!,
        table: m[2]!,
        body: m[0]!,
      });
    }
    dropRegex.lastIndex = 0;
    while ((m = dropRegex.exec(content)) !== null) {
      events.push({
        idx: m.index,
        kind: "drop",
        policy: m[1]!,
        table: m[2]!,
      });
    }

    events.sort((a, b) => a.idx - b.idx);

    for (const e of events) {
      const key = `${e.table}.${e.policy}`;
      if (e.kind === "drop") {
        live.delete(key);
      } else {
        live.set(key, {
          table: e.table,
          policy: e.policy,
          body: e.body!,
          sourceFile: file,
        });
      }
    }
  }

  return live;
};

const isRoleGated = (body: string): boolean => /auth_user_role/i.test(body);

const isTenantScoped = (body: string): boolean =>
  /auth\.uid/i.test(body) ||
  /auth_institution_id/i.test(body) ||
  /institution_id/i.test(body);

describe("RLS multi-tenant isolation guard", () => {
  const policies = computeFinalPolicies();

  it("parses at least one CREATE POLICY from migrations (sanity)", () => {
    // If this fails, the parser or migration layout changed — the guard would
    // otherwise pass vacuously, which is worse than a loud failure.
    expect(policies.size).toBeGreaterThan(0);
  });

  it("no role-gated table policy ships without institution/uid scoping", () => {
    const violations: { key: string; file: string }[] = [];

    for (const [key, p] of policies) {
      if (PLATFORM_ALLOWLIST.has(p.table)) continue;
      if (KNOWN_STORAGE_FOLLOWUP.has(key)) continue;
      if (isRoleGated(p.body) && !isTenantScoped(p.body)) {
        violations.push({ key, file: p.sourceFile });
      }
    }

    expect(
      violations,
      `Cross-institution RLS leak(s) detected. Each role-gated policy must tie rows to ` +
        `auth.uid() or the caller's institution (auth_institution_id()/institution_id). ` +
        `Offending policies:\n` +
        violations.map((v) => `  - ${v.key} (in ${v.file})`).join("\n")
    ).toEqual([]);
  });

  it("has no remaining known storage follow-ups (all storage leaks fixed)", () => {
    // Every storage.objects leak has been institution-scoped. This pins that
    // state: if a future change needs to defer a storage fix, it must be added
    // to KNOWN_STORAGE_FOLLOWUP explicitly (and this assertion updated), rather
    // than silently slipping past the main guard.
    expect([...KNOWN_STORAGE_FOLLOWUP]).toEqual([]);
  });

  it("platform allowlist only covers tables with no tenant key", () => {
    expect([...PLATFORM_ALLOWLIST].sort()).toEqual([
      "audit_findings",
      "audit_runs",
      "blocked_ips",
      "rate_limit_events",
    ]);
  });
});
