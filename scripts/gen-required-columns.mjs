#!/usr/bin/env node
// Required-column manifest generator (Part C / C2 tooling for Req 18.3).
//
// WHY THIS EXISTS:
// The Schema_Contract_Test (src/__tests__/unit/schemaContract.test.ts) needs an
// authoritative list of every column that MUST be supplied on insert — i.e. columns
// that are NOT NULL, have NO database default, and are NOT generated. The generated
// `src/types/database.ts` cannot express this distinction: a pure TypeScript reflection
// of the Insert types cannot tell "nullable" from "has a default", so the live
// `information_schema` is the only authority. This script reflects that authority into a
// checked-in JSON manifest so the test stays hermetic (no DB access at test time).
//
// WHAT IT DOES:
// Queries `information_schema.columns` for `table_schema = 'public'`, selecting columns
// where `is_nullable = 'NO' AND column_default IS NULL AND is_generated = 'NEVER'`, then
// writes `src/__tests__/fixtures/requiredColumns.json` grouped by table. Table keys and
// the column arrays under each table are sorted alphabetically so the committed file
// diffs cleanly (stable, deterministic output) when the schema changes.
//
// WHEN TO RUN — alongside `scripts/regen-types.ps1`:
// `database.ts` and this manifest are two views of the SAME schema, so they must be
// regenerated together. After every migration run BOTH:
//     pwsh scripts/regen-types.ps1            # refreshes src/types/database.ts
//     node scripts/gen-required-columns.mjs   # refreshes requiredColumns.json
// (CI runs both after applying migrations; see .github/workflows/ci.yml.) The manifest is
// committed; the test reads it as the authority for Required_Columns (Req 18.3).
//
// CONNECTION:
// Connects with a Postgres connection string from `SUPABASE_DB_URL` (preferred) or
// `DATABASE_URL`, using the `pg` driver — `information_schema` is NOT reachable through
// PostgREST / @supabase/supabase-js, so a direct SQL connection is required. This mirrors
// the direct-connection approach used by the sibling declared-objects checker
// (scripts/check-declared-objects.mjs) for the same reason. The connection string for the
// project (`cdlgtbvxlxjpcddjazzx`) is the Supabase pooler/session URL from
// Dashboard → Project Settings → Database → Connection string (URI). Example:
//     $env:SUPABASE_DB_URL = "postgresql://postgres.cdlgtbvxlxjpcddjazzx:<pw>@aws-0-<region>.pooler.supabase.com:5432/postgres"
//
// SAFETY (mirrors regen-types.ps1 — refuse to write garbage):
// If no connection string is set, the `pg` driver is unavailable, or the query returns no
// public columns, the script prints actionable guidance and exits NON-ZERO WITHOUT
// touching the committed manifest. It never overwrites a good baseline with an empty file.
//
// Usage:  node scripts/gen-required-columns.mjs
// Exit 0 = manifest written; non-zero = nothing written (see message).

import { writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT = join(
  __dirname,
  "..",
  "src",
  "__tests__",
  "fixtures",
  "requiredColumns.json"
);

const REQUIRED_COLUMNS_QUERY = `
  SELECT table_name, column_name
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND is_nullable = 'NO'
    AND column_default IS NULL
    AND is_generated = 'NEVER'
  ORDER BY table_name, column_name;
`;

function fail(message) {
  console.error(`✗ gen-required-columns: ${message}`);
  process.exit(1);
}

/** Group flat {table_name, column_name} rows into a sorted { [table]: string[] } map. */
function buildManifest(rows) {
  /** @type {Record<string, string[]>} */
  const byTable = {};
  for (const { table_name, column_name } of rows) {
    (byTable[table_name] ??= []).push(column_name);
  }
  // Sort table keys and the columns within each table for stable diffs.
  /** @type {Record<string, string[]>} */
  const sorted = {};
  for (const table of Object.keys(byTable).sort()) {
    sorted[table] = byTable[table].slice().sort();
  }
  return sorted;
}

async function main() {
  const connectionString =
    process.env.SUPABASE_DB_URL || process.env.DATABASE_URL;

  if (!connectionString) {
    fail(
      "no connection string. Set SUPABASE_DB_URL (preferred) or DATABASE_URL to the\n" +
        "  Postgres URI from Supabase Dashboard → Project Settings → Database → Connection\n" +
        "  string (URI). information_schema is not reachable via the Supabase JS client, so a\n" +
        "  direct Postgres connection is required. The committed manifest was left untouched."
    );
  }

  let Client;
  try {
    ({ Client } = await import("pg"));
  } catch {
    fail(
      "the 'pg' driver is not available. Install it where this script runs (CI installs\n" +
        "  dev dependencies): `npm i -D pg`. The committed manifest was left untouched."
    );
  }

  const client = new Client({ connectionString });
  let rows;
  try {
    await client.connect();
    ({ rows } = await client.query(REQUIRED_COLUMNS_QUERY));
  } catch (err) {
    fail(
      `query failed: ${err instanceof Error ? err.message : String(err)}.\n` +
        "  The committed manifest was left untouched."
    );
  } finally {
    await client.end().catch(() => {});
  }

  if (!rows || rows.length === 0) {
    fail(
      "query returned no public required columns — refusing to overwrite the manifest with\n" +
        "  an empty object. Check the connection string points at the right database."
    );
  }

  const manifest = buildManifest(rows);
  mkdirSync(dirname(OUTPUT), { recursive: true });
  // Trailing newline keeps the file POSIX-friendly and diff-stable.
  writeFileSync(OUTPUT, JSON.stringify(manifest, null, 2) + "\n", "utf8");

  const tableCount = Object.keys(manifest).length;
  const columnCount = rows.length;
  console.log(
    `✓ gen-required-columns: wrote ${OUTPUT}\n` +
      `  ${tableCount} tables, ${columnCount} required columns.`
  );
  process.exit(0);
}

main().catch((err) => fail(err instanceof Error ? err.message : String(err)));
