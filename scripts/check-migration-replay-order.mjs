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

  // Statements that HARD-ABORT if the target function does not yet exist.
  const refRe =
    /^\s*(ALTER\s+FUNCTION|REVOKE\s+EXECUTE\s+ON\s+FUNCTION|GRANT\s+EXECUTE\s+ON\s+FUNCTION|COMMENT\s+ON\s+FUNCTION)\s+(?:public\.)?"?([a-z0-9_]+)"?/i;

  /** @type {{file:string,line:number,fn:string,createdAt:string,stmt:string}[]} */
  const problems = [];

  for (const file of files) {
    const fileTs = ts(file);
    const masked = maskSafeSpans(
      readFileSync(join(MIGRATIONS_DIR, file), "utf8")
    );
    const lines = masked.split("\n");
    for (let i = 0; i < lines.length; i++) {
      const m = refRe.exec(lines[i]);
      if (!m) continue;
      const fn = m[2].toLowerCase();
      const createdAt = created.get(fn);
      // A problem if the function is created LATER in the chain (createdAt > fileTs),
      // OR is NEVER created anywhere in the chain (createdAt === undefined). Both abort
      // a fresh replay with 42883 — on production the function happens to exist (created
      // by an extension, the platform, or an out-of-band/live-only definition), which is
      // exactly why this hides until a clean rebuild.
      if (createdAt === undefined || fileTs < createdAt) {
        problems.push({
          file,
          line: i + 1,
          fn,
          createdAt: createdAt ?? "(never created in chain)",
          stmt: m[1].toUpperCase(),
        });
      }
    }
  }

  const checked = files.length;
  if (problems.length === 0) {
    console.log(
      `✓ migration replay-order: CLEAN — ${checked} migrations, no too-early function references.`
    );
    process.exit(0);
  }

  console.error(
    `✗ migration replay-order: ${problems.length} too-early function reference(s) found.\n` +
      `  These abort a fresh replay (Supabase Preview / clean rebuild) with 42883 even though\n` +
      `  production is unaffected. Fix by hardening the function at its CREATE site instead, or\n` +
      `  guard the statement with a DO $$ ... to_regprocedure(...) IS NOT NULL ... $$ block.\n`
  );
  for (const p of problems) {
    console.error(
      `  ${p.file}:${p.line}  ${p.stmt} ${p.fn}()  but earliest CREATE is ${p.createdAt}`
    );
  }
  process.exit(1);
}

main();
