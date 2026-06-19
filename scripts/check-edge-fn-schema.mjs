#!/usr/bin/env node
// Edge Function ↔ database schema-contract checker (Req 19.5 / Req 22).
//
// WHY THIS EXISTS:
// Supabase Edge Functions run on Deno and are NOT type-checked against the
// generated DB types during `tsc`/`vite build`. That lets a query like
// `.from("assignments").select("clo_ids")` compile fine yet fail (or silently
// return wrong/empty data) at runtime because the real column is `clo_weights`.
// This is exactly the "compiles in Deno, wrong column at runtime" class that
// broke the OBE accreditation report and course-file generators (Req 19).
//
// This checker statically validates every `.from("<table>")` query in
// `supabase/functions/**` against the column list in `src/types/database.ts`
// (the committed, regenerated source of truth — never hand-edited), and fails
// the build on drift. It is deliberately PRAGMATIC (Req 22.3): it only flags
// references it can statically resolve to a real table + string-literal column,
// and skips anything dynamic (variable column names), storage-bucket `.from()`,
// relational embeds, JSON-path operators, and `.rpc()` calls.
//
// Usage:  node scripts/check-edge-fn-schema.mjs
// Exit 0 = clean; exit 1 = at least one column/table/enum drift found.

import {
  readFileSync,
  readdirSync,
  statSync,
  existsSync,
  writeFileSync,
} from "node:fs";
import { join, relative, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const DB_TYPES = join(ROOT, "src", "types", "database.ts");
const FUNCTIONS_DIR = join(ROOT, "supabase", "functions");
const BASELINE_FILE = join(ROOT, "scripts", "edge-fn-schema-baseline.json");

// ─── Ignore lists (Req 22.3 — never block on what we can't resolve) ──────────

// `supabase.storage.from("<bucket>")` looks like a table query but is storage.
// We detect `.storage.from(` positionally below; this set is a belt-and-braces
// backup so a bucket name is never mistaken for a table.
const STORAGE_BUCKETS = new Set([
  "reports",
  "avatars",
  "submissions",
  "session-evidence",
  "course-materials",
  "accreditation-reports",
  "transcripts",
  "exports",
]);

// Tables intentionally not resolved against database.ts (dynamic/known-phantom
// with runtime fallbacks). Add entries here WITH justification when needed.
const IGNORED_TABLES = new Set([]);

// Tokens that appear in a select list but are not columns.
const SELECT_FUNCTION_TOKENS = new Set([
  "count",
  "sum",
  "avg",
  "min",
  "max",
  "now",
  "*",
]);

// ─── database.ts parsing ─────────────────────────────────────────────────────

/**
 * Given `text` and the index of an opening `{`, return the inner content (excl.
 * braces) and the index of the matching `}`. Brace-balanced; safe for the
 * generated types because Row blocks contain only flat `col: Type;` members.
 */
function sliceBlock(text, openBraceIndex) {
  let depth = 0;
  for (let i = openBraceIndex; i < text.length; i++) {
    const ch = text[i];
    if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) {
        return { inner: text.slice(openBraceIndex + 1, i), end: i };
      }
    }
  }
  throw new Error("unbalanced braces while parsing database.ts");
}

/**
 * Return the top-level `name: { ... }` object entries of a block's inner text,
 * tracking brace depth so nested objects are not mistaken for entries.
 * @returns {{name:string, inner:string}[]}
 */
function topLevelObjectEntries(inner) {
  const entries = [];
  let depth = 0;
  let i = 0;
  while (i < inner.length) {
    const ch = inner[i];
    if (ch === "{") {
      depth++;
      i++;
      continue;
    }
    if (ch === "}") {
      depth--;
      i++;
      continue;
    }
    if (depth === 0) {
      const m = /^([A-Za-z_][A-Za-z0-9_]*)\s*:\s*\{/.exec(inner.slice(i));
      if (m) {
        const braceIdx = i + m[0].length - 1;
        const block = sliceBlock(inner, braceIdx);
        entries.push({ name: m[1], inner: block.inner });
        i = block.end + 1;
        continue;
      }
    }
    i++;
  }
  return entries;
}

/**
 * Extract `{ column -> enumName | null }` from a `Row: { ... }` block. Each Row
 * member is a flat `col: Type;` line. When the type references
 * `Database["public"]["Enums"]["<name>"]`, the column is recorded as that enum.
 */
function rowColumnsWithEnums(rowInner) {
  /** @type {Map<string, string|null>} */
  const cols = new Map();
  for (const rawLine of rowInner.split("\n")) {
    const m = /^\s*([A-Za-z_][A-Za-z0-9_]*)\??\s*:\s*(.+?);?\s*$/.exec(rawLine);
    if (!m) continue;
    const col = m[1];
    const type = m[2];
    const enumMatch = /Enums"\]\["([A-Za-z0-9_]+)"\]/.exec(type);
    cols.set(col, enumMatch ? enumMatch[1] : null);
  }
  return cols;
}

/** Parse the `Enums: { name: "a" | "b"; ... }` block into name -> Set(values). */
function parseEnums(enumsInner) {
  /** @type {Map<string, Set<string>>} */
  const enums = new Map();
  const re =
    /([A-Za-z_][A-Za-z0-9_]*)\s*:\s*((?:"[^"]*"\s*\|\s*)*"[^"]*")\s*;/g;
  let m;
  while ((m = re.exec(enumsInner)) !== null) {
    const values = [...m[2].matchAll(/"([^"]*)"/g)].map((x) => x[1]);
    enums.set(m[1], new Set(values));
  }
  return enums;
}

/**
 * Build the schema model from database.ts:
 *   - tableCols:     table/view name -> Set(column)
 *   - tableEnumCols: table/view name -> Map(column -> enumName)
 *   - enums:         enumName -> Set(value)
 */
export function buildSchema() {
  const text = readFileSync(DB_TYPES, "utf8");
  if (!/export type Database/.test(text)) {
    throw new Error(
      "src/types/database.ts does not look like generated Supabase types " +
        "(missing `export type Database`). Regenerate via scripts/regen-types.ps1."
    );
  }
  // Scope strictly to the `public:` schema block (ignore graphql_public).
  const pubKey = "\n  public: {";
  const pubIdx = text.indexOf(pubKey);
  if (pubIdx < 0) throw new Error("could not locate `public:` block");
  const pubBraceIdx = text.indexOf("{", pubIdx + pubKey.length - 1);
  const pub = sliceBlock(text, pubBraceIdx).inner;
  const sections = new Map(
    topLevelObjectEntries(pub).map((e) => [e.name, e.inner])
  );

  /** @type {Map<string, Set<string>>} */
  const tableCols = new Map();
  /** @type {Map<string, Map<string,string>>} */
  const tableEnumCols = new Map();

  for (const sectionName of ["Tables", "Views"]) {
    const inner = sections.get(sectionName);
    if (!inner) continue;
    for (const entry of topLevelObjectEntries(inner)) {
      const rowEntry = topLevelObjectEntries(entry.inner).find(
        (e) => e.name === "Row"
      );
      if (!rowEntry) continue;
      const colMap = rowColumnsWithEnums(rowEntry.inner);
      tableCols.set(entry.name, new Set(colMap.keys()));
      const enumCols = new Map();
      for (const [col, enumName] of colMap) {
        if (enumName) enumCols.set(col, enumName);
      }
      if (enumCols.size > 0) tableEnumCols.set(entry.name, enumCols);
    }
  }

  const enums = sections.has("Enums")
    ? parseEnums(sections.get("Enums"))
    : new Map();

  return { tableCols, tableEnumCols, enums };
}

// ─── Edge-function scanning ──────────────────────────────────────────────────

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) {
      yield* walk(full);
    } else if (name.endsWith(".ts") && !name.endsWith(".d.ts")) {
      yield full;
    }
  }
}

function lineOf(content, idx) {
  return content.slice(0, idx).split("\n").length;
}

const fromRe = /\.from\(\s*["'`]([a-z_][a-z0-9_]+)["'`]/g;
const selectRe = /\.select\(\s*["'`]([^"'`]+)["'`]/g;
const filterColRe =
  /\.(eq|neq|gt|gte|lt|lte|like|ilike|is|in|contains|order|match)\(\s*["'`]([a-z_][a-z0-9_]+)["'`]/g;
// Single string-literal value for enum membership checks (eq/neq only).
const eqEnumRe =
  /\.(eq|neq)\(\s*["'`]([a-z_][a-z0-9_]+)["'`]\s*,\s*["'`]([^"'`]*)["'`]/g;

/** Strip the contents of parentheses (relational embeds) from a select list. */
function stripEmbeds(list) {
  let depth = 0;
  let buf = "";
  for (const ch of list) {
    if (ch === "(") {
      depth++;
      continue;
    }
    if (ch === ")") {
      depth = Math.max(0, depth - 1);
      continue;
    }
    if (depth === 0) buf += ch;
  }
  return buf;
}

/**
 * A stable, line-independent key for a finding: a specific bad table/column (or
 * enum literal) reference in a specific edge-function file. Used to match
 * against the known-drift baseline so the gate fails only on NEW drift.
 */
export function findingKey(f) {
  return `${f.file}::${f.table}::${f.name}`;
}

/**
 * Scan ONE edge-function source string against the schema model and return all
 * drift findings (pure; no I/O). Exported so tests can prove the detector is
 * non-vacuous on synthetic input (e.g. `.from("assignments").select("clo_ids")`).
 *
 * @param {string} rel   relative file path, used only in finding records
 * @param {string} raw   the raw source text
 * @param {{tableCols:Map<string,Set<string>>, tableEnumCols:Map<string,Map<string,string>>, enums:Map<string,Set<string>>}} schema
 * @returns {{file:string,line:number,table:string,name:string,kind:string,detail:string}[]}
 */
export function scanFunctionSource(rel, raw, schema) {
  const { tableCols, tableEnumCols, enums } = schema;
  const allTables = new Set(tableCols.keys());
  const findings = [];

  // Strip block + line comments so doc examples are not scanned.
  const content = raw
    .replace(/\/\*[\s\S]*?\*\//g, (m) => " ".repeat(m.length))
    .replace(/^[ \t]*\/\/.*$/gm, (m) => " ".repeat(m.length));

  const fromMatches = [...content.matchAll(fromRe)];
  for (let i = 0; i < fromMatches.length; i++) {
    const m = fromMatches[i];
    const table = m[1];
    const start = m.index;

    // Skip storage-bucket queries: `supabase.storage.from("bucket")`.
    const before = content.slice(Math.max(0, start - 40), start).trimEnd();
    if (before.endsWith(".storage")) continue;
    if (STORAGE_BUCKETS.has(table)) continue;
    if (IGNORED_TABLES.has(table)) continue;

    if (!allTables.has(table)) {
      findings.push({
        file: rel,
        line: lineOf(content, start),
        table,
        name: table,
        kind: "unknown-table",
        detail: `table "${table}" does not exist in database.ts`,
      });
      continue;
    }

    const cols = tableCols.get(table);
    const enumCols = tableEnumCols.get(table);
    const end =
      i + 1 < fromMatches.length ? fromMatches[i + 1].index : content.length;
    const block = content.slice(start, Math.min(end, start + 1200));

    // ── .select("a, b, rel(c)") ──
    for (const sm of block.matchAll(selectRe)) {
      const stripped = stripEmbeds(sm[1]);
      for (const part of stripped.split(",")) {
        let nm = part.trim();
        if (!nm || nm === "*") continue;
        if (nm.includes(":") || nm.includes("!")) continue; // alias / embed
        if (nm.includes("::")) nm = nm.split("::")[0].trim(); // cast
        if (nm.includes(" ")) nm = nm.split(" ")[0].trim();
        if (!/^[a-z_][a-z0-9_]+$/.test(nm)) continue; // skip json-path etc.
        if (SELECT_FUNCTION_TOKENS.has(nm)) continue;
        if (allTables.has(nm)) continue; // embed whose parens were elsewhere
        if (!cols.has(nm)) {
          findings.push({
            file: rel,
            line: lineOf(content, start + sm.index),
            table,
            name: nm,
            kind: "select",
            detail: `column "${nm}" not in table "${table}"`,
          });
        }
      }
    }

    // ── .eq/.in/.order/... ("col") ──
    for (const fm of block.matchAll(filterColRe)) {
      const nm = fm[2];
      if (!cols.has(nm)) {
        findings.push({
          file: rel,
          line: lineOf(content, start + fm.index),
          table,
          name: nm,
          kind: fm[1],
          detail: `column "${nm}" not in table "${table}"`,
        });
      }
    }

    // ── enum literal membership: .eq/.neq("enumCol", "literal") ──
    if (enumCols) {
      for (const em of block.matchAll(eqEnumRe)) {
        const col = em[2];
        const value = em[3];
        const enumName = enumCols.get(col);
        if (!enumName) continue;
        const valid = enums.get(enumName);
        if (valid && !valid.has(value)) {
          findings.push({
            file: rel,
            line: lineOf(content, start + em.index),
            table,
            name: `${col}="${value}"`,
            kind: "enum-value",
            detail: `"${value}" is not a valid ${enumName} value {${[
              ...valid,
            ].join(", ")}}`,
          });
        }
      }
    }
  }

  return findings;
}

/** Load the known-drift baseline (set of finding keys), or empty if absent. */
function loadBaseline() {
  if (!existsSync(BASELINE_FILE)) return new Set();
  try {
    const json = JSON.parse(readFileSync(BASELINE_FILE, "utf8"));
    return new Set(Array.isArray(json.entries) ? json.entries : []);
  } catch {
    throw new Error(
      `could not parse ${relative(ROOT, BASELINE_FILE)} — fix or delete it`
    );
  }
}

function main() {
  const updateBaseline = process.argv.includes("--update-baseline");

  if (!existsSync(FUNCTIONS_DIR)) {
    console.log(
      "✓ edge-fn schema-contract: no supabase/functions directory — nothing to check."
    );
    process.exit(0);
  }

  const schema = buildSchema();
  const allTables = new Set(schema.tableCols.keys());

  /** @type {{file:string,line:number,table:string,name:string,kind:string,detail:string}[]} */
  let findings = [];
  let fileCount = 0;

  for (const file of walk(FUNCTIONS_DIR)) {
    fileCount++;
    const rel = relative(ROOT, file).replace(/\\/g, "/");
    const content = readFileSync(file, "utf8");
    findings = findings.concat(scanFunctionSource(rel, content, schema));
  }

  // ── --update-baseline: snapshot the current drift as the known backlog ──
  if (updateBaseline) {
    const entries = [...new Set(findings.map(findingKey))].sort();
    const payload = {
      version: 1,
      note:
        "Known pre-existing edge-function schema drift, grandfathered so the " +
        "gate fails only on NEW drift (and on any Req-19 OBE-export regression, " +
        "which is intentionally NOT baselined). Each entry is a real bug to be " +
        "remediated per function in follow-up; remove entries as they are fixed. " +
        "Regenerate with: node scripts/check-edge-fn-schema.mjs --update-baseline",
      entries,
    };
    writeFileSync(BASELINE_FILE, JSON.stringify(payload, null, 2) + "\n");
    console.log(
      `✓ edge-fn schema-contract: wrote ${entries.length} baseline entrie(s) to ` +
        `${relative(ROOT, BASELINE_FILE).replace(/\\/g, "/")}.`
    );
    process.exit(0);
  }

  const baseline = loadBaseline();
  const newFindings = findings.filter((f) => !baseline.has(findingKey(f)));
  const baselinedCount = findings.length - newFindings.length;

  if (newFindings.length === 0) {
    const suffix =
      baselinedCount > 0
        ? ` (${baselinedCount} known-drift finding(s) grandfathered via baseline — see ` +
          `${relative(ROOT, BASELINE_FILE).replace(/\\/g, "/")})`
        : "";
    console.log(
      `✓ edge-fn schema-contract: CLEAN — validated ${fileCount} edge-function ` +
        `files against ${allTables.size} tables/views.${suffix}`
    );
    process.exit(0);
  }

  console.error(
    `✗ edge-fn schema-contract: ${newFindings.length} NEW drift finding(s) in supabase/functions/**.\n` +
      `  These compile in Deno but fail (or silently return wrong/empty data) at runtime\n` +
      `  because the referenced table/column/enum value does not exist in database.ts.\n` +
      `  Fix the query. If a ref is genuinely dynamic and unresolvable, add it to the\n` +
      `  ignore list in scripts/check-edge-fn-schema.mjs with a justification.\n`
  );
  for (const f of newFindings) {
    console.error(
      `  [${f.kind}] ${f.file}:${f.line}  ${f.table} — ${f.detail}`
    );
  }
  process.exit(1);
}

// Run as a script only when invoked directly (not when imported by tests).
if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  main();
}
