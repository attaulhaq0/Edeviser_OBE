#!/usr/bin/env node
// Declared-object existence checker (Part C — "Declared_Object_Check", Req 20).
//
// WHY THIS EXISTS (rule: a task cannot be "done" without an applied migration):
// The migration replay-order gate proves the migration chain rebuilds cleanly, but it
// does NOT prove feature completeness. Spec task `125.1` was once checked off while the
// `mv_historical_evidence` materialized view it claimed to create never existed in the
// schema. This checker closes that gap: it reads a checked-in manifest of DB objects that
// specs/tasks declare as created (`scripts/declared-objects.json`) and verifies every one
// actually exists in the target (live/preview) schema. If any declared object is missing,
// it fails loudly, naming the object AND its declaring task so the gap is traceable to the
// task that was checked off prematurely (Req 20.1, 20.2).
//
// Modeled on `check-migration-replay-order.mjs` (same CLI / exit-code / output style):
//   Usage:  node scripts/check-declared-objects.mjs
//   Exit 0 = every declared object is present (or nothing is declared yet).
//   Exit 1 = at least one declared object is missing, or the schema could not be verified.
//
// CONNECTION: a direct Postgres connection string is read from the environment
// (`SUPABASE_DB_URL`, falling back to `DATABASE_URL` / `POSTGRES_URL` / `SUPABASE_DB_URL`).
// In CI this is the Supabase preview/branch DB URL; it is never pointed at production by
// this script (the CI job supplies the preview URL — Req 21). The actual catalog queries
// hit `pg_matviews` for materialized views and `pg_proc` (a.k.a. `information_schema.routines`)
// for functions (Req 20.3).
//
// EXTENSIBILITY (Req 20.4): object kinds are looked up in the TYPE_HANDLERS registry below
// — the idiomatic, data-driven form of a `switch`. Adding a new kind (table, view, index,
// …) is a single entry; the rest of the script is type-agnostic.

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  DEFAULT_SCHEMA,
  objectKey,
  findMissingObjects,
} from "./lib/declared-objects-verdict.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const MANIFEST_PATH = join(__dirname, "declared-objects.json");

// Ordered list of env vars that may hold the Postgres connection string. `SUPABASE_DB_URL`
// is the documented primary (matches the design); the rest are common equivalents so the
// script works against whatever the CI job / local shell exposes.
const CONNECTION_ENV_VARS = [
  "SUPABASE_DB_URL",
  "DATABASE_URL",
  "POSTGRES_URL",
  "SUPABASE_DATABASE_URL",
];

/**
 * Registry of supported declared-object kinds — the extensible "switch" (Req 20.4).
 * Each entry maps a manifest `type` to a human label and a catalog query that returns the
 * set of objects of that kind present in the requested schemas. The query MUST select two
 * columns aliased `schema` and `name`, and accept a single `$1` parameter: a text[] of
 * schema names to look in. To add a new kind (e.g. "sequence", "trigger"), add one entry.
 *
 * @type {Record<string, { label: string, catalog: string }>}
 */
const TYPE_HANDLERS = {
  materialized_view: {
    label: "materialized view",
    catalog:
      "SELECT schemaname AS schema, matviewname AS name FROM pg_matviews WHERE schemaname = ANY($1)",
  },
  function: {
    // pg_proc is authoritative (one row per overload); we match by bare name, consistent
    // with the replay checker. information_schema.routines exposes the same set.
    label: "function",
    catalog:
      "SELECT n.nspname AS schema, p.proname AS name FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = ANY($1)",
  },
  table: {
    label: "table",
    catalog:
      "SELECT schemaname AS schema, tablename AS name FROM pg_tables WHERE schemaname = ANY($1)",
  },
  view: {
    label: "view",
    catalog:
      "SELECT schemaname AS schema, viewname AS name FROM pg_views WHERE schemaname = ANY($1)",
  },
  index: {
    label: "index",
    catalog:
      "SELECT schemaname AS schema, indexname AS name FROM pg_indexes WHERE schemaname = ANY($1)",
  },
};

/** Read + parse the manifest, returning a validated array of declared objects. */
function readManifest() {
  let raw;
  try {
    raw = readFileSync(MANIFEST_PATH, "utf8");
  } catch (err) {
    fail(`could not read manifest ${MANIFEST_PATH}: ${err.message}`);
  }

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    fail(`manifest ${MANIFEST_PATH} is not valid JSON: ${err.message}`);
  }

  if (!parsed || !Array.isArray(parsed.objects)) {
    fail(
      `manifest ${MANIFEST_PATH} must be an object with an "objects" array ` +
        `(e.g. { "objects": [] }).`
    );
  }

  // Validate each entry up front so a malformed manifest fails loudly rather than silently
  // skipping an object (a silent skip would defeat the purpose of the gate).
  parsed.objects.forEach((obj, i) => {
    if (!obj || typeof obj !== "object")
      fail(`manifest objects[${i}] is not an object.`);
    if (!obj.type || !TYPE_HANDLERS[obj.type])
      fail(
        `manifest objects[${i}] has unsupported type "${obj.type}". ` +
          `Supported: ${Object.keys(TYPE_HANDLERS).join(", ")}.`
      );
    if (!obj.name || typeof obj.name !== "string")
      fail(`manifest objects[${i}] (${obj.type}) is missing a string "name".`);
    if (!obj.declaringTask || typeof obj.declaringTask !== "string")
      fail(
        `manifest objects[${i}] (${obj.type} "${obj.name}") is missing a string ` +
          `"declaringTask" — every declared object must be traceable to the task ` +
          `that claims to create it (Req 20.2).`
      );
  });

  return parsed.objects;
}

/** Resolve the Postgres connection string from the environment, or undefined. */
function resolveConnectionString() {
  for (const key of CONNECTION_ENV_VARS) {
    const val = process.env[key];
    if (val && val.trim()) return val.trim();
  }
  return undefined;
}

/** Local connections don't use SSL; managed Supabase requires it. */
function sslFor(connectionString) {
  return /localhost|127\.0\.0\.1/.test(connectionString)
    ? false
    : { rejectUnauthorized: false };
}

/**
 * Query the live schema and return a Set of present objects keyed via `key(...)`,
 * running exactly one catalog query per declared type (no N+1 across objects).
 * @param {import("pg").Client} client
 * @param {{type:string, name:string, schema?:string, declaringTask:string}[]} objects
 * @returns {Promise<Set<string>>}
 */
async function fetchPresent(client, objects) {
  /** @type {Set<string>} */
  const present = new Set();

  // Group the schemas we need to look in, per object type, so we run exactly one catalog
  // query per type regardless of how many objects share it.
  /** @type {Map<string, Set<string>>} */
  const schemasByType = new Map();
  for (const obj of objects) {
    const schema = obj.schema || DEFAULT_SCHEMA;
    if (!schemasByType.has(obj.type)) schemasByType.set(obj.type, new Set());
    schemasByType.get(obj.type).add(schema);
  }

  for (const [type, schemas] of schemasByType) {
    const { catalog } = TYPE_HANDLERS[type];
    const res = await client.query(catalog, [[...schemas]]);
    for (const row of res.rows) {
      present.add(objectKey(type, row.schema, row.name));
    }
  }
  return present;
}

/** Print an error in the checker's house style and exit 1. */
function fail(message) {
  console.error(`✗ declared-objects: ${message}`);
  process.exit(1);
}

async function main() {
  const objects = readManifest();

  // Nothing declared yet → nothing to verify. Exit cleanly WITHOUT requiring a DB
  // connection or the pg driver (the seeded state, and the state in environments that
  // have no DB access). Part A migration tasks append their objects here to prove
  // completeness, at which point a live connection is required.
  if (objects.length === 0) {
    console.log(
      "✓ declared-objects: CLEAN — manifest declares 0 objects, nothing to check."
    );
    process.exit(0);
  }

  const connectionString = resolveConnectionString();
  if (!connectionString) {
    fail(
      `${objects.length} object(s) are declared but no DB connection string was found ` +
        `in the environment (looked for: ${CONNECTION_ENV_VARS.join(", ")}). ` +
        `Cannot verify declared objects exist — set SUPABASE_DB_URL to the preview/CI database.`
    );
  }

  // pg is imported dynamically so this script loads (and the empty-manifest fast path
  // above works) even where the driver isn't installed. It is only needed for live checks.
  let pg;
  try {
    ({ default: pg } = await import("pg"));
  } catch {
    fail(
      `the "pg" Postgres driver is required to verify ${objects.length} declared object(s) ` +
        `but is not installed. Install it (npm i -D pg) in the environment that runs this check.`
    );
  }

  const client = new pg.Client({
    connectionString,
    ssl: sslFor(connectionString),
  });

  let present;
  try {
    await client.connect();
    present = await fetchPresent(client, objects);
  } catch (err) {
    await client.end().catch(() => {});
    fail(`could not query the target schema: ${err.message}`);
  }
  await client.end().catch(() => {});

  /** @type {{type:string, label:string, name:string, schema:string, declaringTask:string}[]} */
  const missing = findMissingObjects(objects, present, DEFAULT_SCHEMA).map(
    (m) => ({ ...m, label: TYPE_HANDLERS[m.type].label })
  );

  const checked = objects.length;
  if (missing.length === 0) {
    console.log(
      `✓ declared-objects: CLEAN — all ${checked} declared object(s) exist in the target schema.`
    );
    process.exit(0);
  }

  console.error(
    `✗ declared-objects: ${missing.length} of ${checked} declared object(s) are MISSING ` +
      `from the target schema.\n` +
      `  A spec/task declared each object as created, but it does not exist. Either the\n` +
      `  migration that creates it was never applied, or the task was checked off too early.\n`
  );
  for (const m of missing) {
    console.error(
      `  [${m.label}] ${m.schema}.${m.name}  — declared by: ${m.declaringTask}`
    );
  }
  process.exit(1);
}

main().catch((err) => {
  // Last-resort guard: never exit 0 on an unexpected error (the gate must fail closed).
  fail(`unexpected error: ${err && err.stack ? err.stack : err}`);
});
