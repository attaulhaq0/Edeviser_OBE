// RLS coverage gate (Phase 12/13/17 hardening — continuous-verification spec).
//
// WHY THIS EXISTS: Supabase Security Advisors surface `rls_enabled_no_policy` as an
// INFO-level finding, and the security-gates CI job blocks only on ERROR-level
// advisor findings. That means a table created WITHOUT row level security would
// never block a merge. RLS is part of the application architecture (repo rule),
// so coverage must be enforced statically, in CI, from the migration chain
// itself — not only observed in a live-posture report.
//
// WHAT IT CHECKS (static, no DB connection needed):
//   For every `CREATE TABLE [public.]x` in supabase/migrations/*.sql (excluding
//   `private.` and other schemas, temp tables, and tables later dropped):
//     PASS if any of:
//       1. An explicit `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` for x exists
//          anywhere in the migration chain; OR
//       2. The table is created AFTER the migration that registers the
//          `ensure_rls` event trigger (handler `rls_auto_enable`), which is
//          live-verified to auto-enable RLS on ddl_command_end for public
//          tables — replay parity holds because the trigger is itself created
//          by a migration.
//     FAIL otherwise, naming the table and its creating migration.
//
// SQL inside `--` comments, `/* */` blocks, and `$$ ... $$` dollar-quoted
// bodies is ignored (dynamic SQL inside the auto-enable function cannot match
// anyway — it is built via format() placeholders).
//
// Exit 0 = every public table is covered. Exit 1 = at least one uncovered
// table (a real finding — do NOT add it to a baseline silently; fix the
// migration chain or document the exception with an owner in
// scripts/rls-coverage-baseline.json, which this script also honors).
//
// Style mirrors check-migration-replay-order.mjs / check-declared-objects.mjs.

import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = join(__dirname, "..", "supabase", "migrations");
const BASELINE_PATH = join(__dirname, "rls-coverage-baseline.json");

/** Strip `--` comments, block comments, and $$-quoted bodies so regexes only
 * see executable DDL. Dollar-quoted tags ($tag$ ... $tag$) are supported. */
function stripNonDdl(sql) {
  let out = sql.replace(/\/\*[\s\S]*?\*\//g, " ");
  out = out.replace(/^[ \t]*--.*$/gm, " ");
  out = out.replace(/\$([a-zA-Z_][a-zA-Z0-9_]*)?\$[\s\S]*?\1\$/g, " ");
  return out;
}

function loadMigrations() {
  const files = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort(); // timestamped names — lexicographic order == replay order
  return files.map((name) => ({
    name,
    sql: stripNonDdl(readFileSync(join(MIGRATIONS_DIR, name), "utf8")),
  }));
}

const CREATED_RE =
  /create\s+table\s+(?:if\s+not\s+exists\s+)?(?:(public|private|[a-z_]+)\.)?([a-z_][a-z0-9_]*)\s*\(/gi;
const ENABLE_RE =
  /alter\s+table\s+(?:only\s+)?(?:if\s+exists\s+)?(?:(public)\.)?([a-z_][a-z0-9_]*)\s+enable\s+row\s+level\s+security/gi;
const DROP_RE =
  /drop\s+table\s+(?:if\s+exists\s+)?(?:(public|private|[a-z_]+)\.)?([a-z_][a-z0-9_]*)/gi;
const EVENT_TRIGGER_RE = /create\s+event\s+trigger\s+([a-z_]+)/gi;

function scan() {
  const migrations = loadMigrations();
  const created = new Map(); // table -> { migration, index }
  const dropped = new Set();
  const enabled = new Set();
  let eventTriggerAt = -1; // migration index where `ensure_rls` is registered

  migrations.forEach(({ name, sql }, idx) => {
    for (const m of sql.matchAll(EVENT_TRIGGER_RE)) {
      if (m[1].toLowerCase() === "ensure_rls" && eventTriggerAt === -1) {
        eventTriggerAt = idx;
      }
    }
    for (const m of sql.matchAll(CREATED_RE)) {
      const schema = (m[1] || "public").toLowerCase();
      const table = m[2].toLowerCase();
      if (schema === "public" && !created.has(table)) {
        created.set(table, { migration: name, index: idx });
      }
    }
    for (const m of sql.matchAll(DROP_RE)) {
      const schema = (m[1] || "public").toLowerCase();
      const table = m[2].toLowerCase();
      if (schema === "public") dropped.add(table);
    }
    for (const m of sql.matchAll(ENABLE_RE)) {
      enabled.add(m[2].toLowerCase());
    }
  });

  return { migrations, created, dropped, enabled, eventTriggerAt };
}

// main() is defined below and invoked at the end of the file.

function main() {
  const { migrations, created, dropped, enabled, eventTriggerAt } = scan();

  let baseline = { tables: [] };
  if (existsSync(BASELINE_PATH)) {
    baseline = JSON.parse(readFileSync(BASELINE_PATH, "utf8"));
  }
  const baselined = new Set((baseline.tables ?? []).map((t) => t.name));

  const uncovered = [];
  for (const [table, meta] of created) {
    if (dropped.has(table)) continue; // created then dropped — no live surface
    const explicit = enabled.has(table);
    const autoEligible = eventTriggerAt !== -1 && meta.index > eventTriggerAt;
    if (!explicit && !autoEligible && !baselined.has(table)) {
      uncovered.push({ table, migration: meta.migration });
    }
  }

  const coveredExplicit = [...created.keys()].filter(
    (t) => !dropped.has(t) && enabled.has(t),
  ).length;
  const coveredByTrigger =
    eventTriggerAt === -1
      ? 0
      : [...created.keys()].filter(
          (t) =>
            !dropped.has(t) && !enabled.has(t) && created.get(t).index > eventTriggerAt,
        ).length;

  console.log(
    `RLS coverage: ${migrations.length} migrations · ${created.size} public tables created · ` +
      `${coveredExplicit} explicit ENABLE · ` +
      (eventTriggerAt === -1
        ? `no ensure_rls event trigger in migration chain (explicit ENABLE required for all) · `
        : `${coveredByTrigger} auto-enabled by ensure_rls (trigger at migration #${eventTriggerAt + 1}) · `) +
      `${uncovered.length} uncovered`,
  );

  if (uncovered.length > 0) {
    console.error("\nFAIL — public tables created without any RLS guarantee:");
    for (const v of uncovered) {
      console.error(`  - ${v.table}  (created by ${v.migration})`);
    }
    console.error(
      "\nFix: add `ALTER TABLE public.<table> ENABLE ROW LEVEL SECURITY;` in a" +
        " forward-only migration, or record a dated, owned exception in" +
        " scripts/rls-coverage-baseline.json.",
    );
    process.exit(1);
  }

  const baselinedStill = [...created.keys()].filter(
    (t) => !dropped.has(t) && !enabled.has(t) && baselined.has(t),
  );
  if (baselinedStill.length > 0) {
    console.log(
      `\nNOTE — ${baselinedStill.length} table(s) rely on dated baseline exceptions:` +
        baselinedStill.map((t) => `\n  - ${t}`).join(""),
    );
  }
  console.log("\nPASS — every live public table has an RLS guarantee.");
  process.exit(0);
}

main();
