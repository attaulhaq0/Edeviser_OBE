#!/usr/bin/env node
// Migration replay-order integrity checker.
//
// WHY THIS EXISTS (rule: never ship a migration chain that aborts on a fresh replay):
// Supabase Branching ("Supabase Preview" PR check) and any clean rebuild replay every
// migration in `supabase/migrations/` from an EMPTY database, in filename order. If an
// early migration ALTER/REVOKE/GRANT/COMMENTs a function (or attaches a trigger that
// EXECUTEs a function) that is only CREATEd by a LATER migration, the replay aborts with
// Postgres error 42883 ("function ... does not exist") even though production is fine
// (because production already has the function). This guard catches that class of bug
// statically — locally and in CI — before it ever reaches the Supabase Preview.
//
// It is intentionally conservative: it only flags statements that HARD-ABORT when the
// target function is missing, and treats two escape hatches as safe:
//   1. `DROP FUNCTION IF EXISTS ...`        — guarded by IF EXISTS, never aborts.
//   2. statements wrapped in a `DO $$ ... to_regprocedure(...) IS NOT NULL ... $$` block
//      — the established replay-only guard pattern in this repo.
//
// Usage:  node scripts/check-migration-replay-order.mjs
// Exit 0 = clean; exit 1 = at least one too-early reference found.

import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = join(__dirname, "..", "supabase", "migrations");

/** @returns {string[]} sorted .sql filenames (replay order) */
function listMigrations() {
  return readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort();
}

/** Leading numeric timestamp of a migration filename, as a comparable string. */
function ts(filename) {
  const m = filename.match(/^(\d+)/);
  return m ? m[1] : "0";
}

/**
 * Build a map: function name -> earliest (smallest-timestamp) migration that CREATEs it.
 * Keyed by bare function name (args ignored) — good enough for ordering, and avoids
 * false negatives from signature-format differences.
 */
function buildCreateMap(files) {
  /** @type {Map<string,string>} */
  const created = new Map();
  const createRe =
    /CREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION\s+(?:public\.)?"?([a-z0-9_]+)"?\s*\(/gi;
  for (const file of files) {
    const txt = readFileSync(join(MIGRATIONS_DIR, file), "utf8");
    let m;
    while ((m = createRe.exec(txt)) !== null) {
      const fn = m[1].toLowerCase();
      const t = ts(file);
      if (!created.has(fn) || t < created.get(fn)) created.set(fn, t);
    }
  }
  return created;
}

/**
 * Build a map: table name -> earliest migration that CREATEs it (in `public`).
 * Used to detect references to a table BEFORE the migration that creates it. We only
 * track tables created in the chain, and only flag references to those (created-later)
 * — platform/extension tables (auth.*, storage.*, cron.*, realtime.*) are intentionally
 * not tracked, so referencing them never false-positives.
 */
function buildTableCreateMap(files) {
  /** @type {Map<string,string>} */
  const created = new Map();
  const createRe =
    /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:public\.)?"?([a-z0-9_]+)"?/gi;
  for (const file of files) {
    const txt = readFileSync(join(MIGRATIONS_DIR, file), "utf8");
    let m;
    while ((m = createRe.exec(txt)) !== null) {
      const tbl = m[1].toLowerCase();
      const t = ts(file);
      if (!created.has(tbl) || t < created.get(tbl)) created.set(tbl, t);
    }
  }
  return created;
}

/**
 * Mask out spans that cannot hard-abort on a missing function, so they are not flagged:
 *   - DROP FUNCTION [IF EXISTS] ... (the whole statement)
 *   - DO $$ ... $$ blocks (the established to_regprocedure(...) guard pattern)
 * Returns the file text with those spans blanked (newlines preserved for line numbers).
 */
function maskSafeSpans(txt) {
  let out = txt;
  // Blank DO $$ ... $$;  blocks (dollar-quoted). Handles $$ and $tag$.
  out = out.replace(/DO\s+(\$[a-z0-9_]*\$)[\s\S]*?\1\s*;/gi, (s) =>
    s.replace(/[^\n]/g, " ")
  );
  // Blank DROP FUNCTION ... ; statements.
  out = out.replace(/DROP\s+FUNCTION[\s\S]*?;/gi, (s) =>
    s.replace(/[^\n]/g, " ")
  );
  return out;
}

function main() {
  const files = listMigrations();
  const created = buildCreateMap(files);
  const tableCreated = buildTableCreateMap(files);

  // Statements that HARD-ABORT if the target function does not yet exist.
  const refRe =
    /^\s*(ALTER\s+FUNCTION|REVOKE\s+EXECUTE\s+ON\s+FUNCTION|GRANT\s+EXECUTE\s+ON\s+FUNCTION|COMMENT\s+ON\s+FUNCTION)\s+(?:public\.)?"?([a-z0-9_]+)"?/i;

  // Statements that reference a TABLE and HARD-ABORT if it does not yet exist. We only
  // flag references whose target table IS created somewhere in the chain but LATER than
  // this migration (platform/extension tables are never tracked, so never false-flagged).
  const tableRefRe =
    /^\s*(?:CREATE\s+(?:UNIQUE\s+)?INDEX|ALTER\s+TABLE|CREATE\s+POLICY|CREATE\s+TRIGGER|COMMENT\s+ON\s+(?:TABLE|COLUMN)|ALTER\s+PUBLICATION\s+\w+\s+ADD\s+TABLE)\b/i;
  const onTableRe = /\bON\s+(?:public\.)?"?([a-z0-9_]+)"?/i;
  const alterTableRe =
    /^\s*ALTER\s+TABLE\s+(?:IF\s+EXISTS\s+)?(?:ONLY\s+)?(?:public\.)?"?([a-z0-9_]+)"?/i;
  const commentTableRe =
    /^\s*COMMENT\s+ON\s+TABLE\s+(?:public\.)?"?([a-z0-9_]+)"?/i;
  const pubAddTableRe =
    /^\s*ALTER\s+PUBLICATION\s+\w+\s+ADD\s+TABLE\s+(?:ONLY\s+)?(?:public\.)?"?([a-z0-9_]+)"?/i;

  /** @type {{file:string,line:number,name:string,createdAt:string,stmt:string,kind:string}[]} */
  const problems = [];

  for (const file of files) {
    const fileTs = ts(file);
    const masked = maskSafeSpans(
      readFileSync(join(MIGRATIONS_DIR, file), "utf8")
    );
    const lines = masked.split("\n");
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // ── function references ──────────────────────────────────────────────
      const m = refRe.exec(line);
      if (m) {
        const fn = m[2].toLowerCase();
        const createdAt = created.get(fn);
        // Problem if the function is created LATER in the chain, OR is NEVER created
        // anywhere in the chain. Both abort a fresh replay with 42883 — production has
        // the function (extension/platform/live-only), which is why this hides until a
        // clean rebuild.
        if (createdAt === undefined || fileTs < createdAt) {
          problems.push({
            file,
            line: i + 1,
            name: `${fn}()`,
            createdAt: createdAt ?? "(never created in chain)",
            stmt: m[1].toUpperCase().replace(/\s+/g, " "),
            kind: "function",
          });
        }
        continue;
      }

      // ── table references ─────────────────────────────────────────────────
      if (!tableRefRe.test(line)) continue;
      let tbl;
      const a = alterTableRe.exec(line);
      const c = commentTableRe.exec(line);
      const p = pubAddTableRe.exec(line);
      if (a) tbl = a[1];
      else if (c) tbl = c[1];
      else if (p) tbl = p[1];
      else {
        const on = onTableRe.exec(line);
        if (on) tbl = on[1];
      }
      if (!tbl) continue;
      tbl = tbl.toLowerCase();
      const tblCreatedAt = tableCreated.get(tbl);
      // Only flag when the table IS created in the chain but LATER than this reference.
      if (tblCreatedAt !== undefined && fileTs < tblCreatedAt) {
        problems.push({
          file,
          line: i + 1,
          name: tbl,
          createdAt: tblCreatedAt,
          stmt: line.trim().slice(0, 52).replace(/\s+/g, " "),
          kind: "table",
        });
      }
    }
  }

  const checked = files.length;
  if (problems.length === 0) {
    console.log(
      `✓ migration replay-order: CLEAN — ${checked} migrations, no too-early function or table references.`
    );
    process.exit(0);
  }

  const fnCount = problems.filter((p) => p.kind === "function").length;
  const tblCount = problems.filter((p) => p.kind === "table").length;
  console.error(
    `✗ migration replay-order: ${problems.length} too-early reference(s) found ` +
      `(${fnCount} function, ${tblCount} table).\n` +
      `  These abort a fresh replay (Supabase Preview / clean rebuild) with 42883/42P01\n` +
      `  even though production is unaffected. Fix by moving the CREATE earlier, hardening\n` +
      `  the object at its CREATE site, or guarding with a DO $$ ... IS NOT NULL ... $$ block.\n`
  );
  for (const p of problems) {
    console.error(
      `  [${p.kind}] ${p.file}:${p.line}  ${p.name}  — referenced before CREATE at ${p.createdAt}  (\`${p.stmt}\`)`
    );
  }
  process.exit(1);
}

main();
