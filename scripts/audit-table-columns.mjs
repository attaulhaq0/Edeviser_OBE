// Node-based scanner: cross-check every .from("table") + .select/.eq/.order/etc.
// in src/ against the canonical schema dumped from production.
// Outputs any table or column reference that doesn't match.
//
// Usage: node scripts/audit-table-columns.mjs
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

// ─── Canonical schema (loaded from JSON) ────────────────────────────────────
const schemaJson = JSON.parse(
  readFileSync("scripts/db-schema.json", "utf8")
);
const schema = new Map();
for (const row of schemaJson) {
  if (!schema.has(row.table_name)) schema.set(row.table_name, new Set());
  schema.get(row.table_name).add(row.column_name);
}

// Phantom tables that the codebase intentionally references with try/catch
// fallbacks (deliberate from a prior bug fix). These are NOT real bugs.
const ALLOWED_PHANTOM_TABLES = new Set([
  "student_habit_levels",
  "student_habit_level_history",
  "team_gamification",
]);

// Storage buckets that look like table calls but aren't
const STORAGE_BUCKETS = new Set([
  "avatars",
  "submissions",
  "session-evidence",
  "course-materials",
  "accreditation-reports",
  "reports",
  "transcripts",
]);

// PostgreSQL aggregate / function tokens that appear in select lists
const SELECT_FUNCTION_TOKENS = new Set([
  "count",
  "sum",
  "avg",
  "min",
  "max",
  "now",
  "*",
]);

// ─── Walk src/ ──────────────────────────────────────────────────────────────
function* walk(dir) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) {
      if (name === "node_modules" || name === "__tests__") continue;
      yield* walk(full);
    } else if (name.endsWith(".ts") || name.endsWith(".tsx")) {
      yield full;
    }
  }
}

// ─── Patterns ───────────────────────────────────────────────────────────────
const fromRe = /\.from\(\s*["'`]([a-z_][a-z0-9_]+)["'`]/g;
const selectRe = /\.select\(\s*["'`]([^"'`]+)["'`]/g;
const filterRe =
  /\.(eq|neq|gt|gte|lt|lte|like|ilike|is|in|contains|order|match)\(\s*["'`]([a-z_][a-z0-9_]+)["'`]/g;
const insertRe = /\.(insert|upsert|update)\(\s*\{([^}]*)\}/g;
const objectKeyRe = /(\b[a-z_][a-z0-9_]+)\s*:/g;

const findings = [];
const phantomTables = [];

function lineOf(content, idx) {
  return content.slice(0, idx).split("\n").length;
}

// ─── Scan ───────────────────────────────────────────────────────────────────
for (const file of walk("src")) {
  // Skip generated database types
  if (file.endsWith("database.ts")) continue;
  let content = readFileSync(file, "utf8");
  const rel = relative(".", file);

  // Strip block comments (which can contain JSDoc code examples that would
  // otherwise be flagged as phantom-table .from() calls).
  content = content
    .replace(/\/\*[\s\S]*?\*\//g, (m) => " ".repeat(m.length))
    .replace(/^[ \t]*\/\/.*$/gm, (m) => " ".repeat(m.length));

  // For each .from("table") block, look at the immediate following 800 chars
  // and check select/filter/insert against the schema.
  const fromMatches = [...content.matchAll(fromRe)];
  for (let i = 0; i < fromMatches.length; i++) {
    const m = fromMatches[i];
    const tableName = m[1];
    const start = m.index;
    const end = i + 1 < fromMatches.length ? fromMatches[i + 1].index : content.length;
    const block = content.slice(start, Math.min(end, start + 1000));

    if (STORAGE_BUCKETS.has(tableName)) continue;

    if (!schema.has(tableName)) {
      if (ALLOWED_PHANTOM_TABLES.has(tableName)) continue;
      phantomTables.push({ file: rel, table: tableName, line: lineOf(content, start) });
      continue;
    }

    const cols = schema.get(tableName);

    // .select("a, b, foo:bar(...)") — check each non-relational name
    // Need to handle nested parens for embeds like "courses!inner(id, name)"
    for (const sm of block.matchAll(selectRe)) {
      const list = sm[1];
      // Strip out everything inside parens (relational embed columns)
      let stripped = list;
      let depth = 0;
      let buf = "";
      for (const ch of list) {
        if (ch === "(") {
          depth++;
          continue;
        }
        if (ch === ")") {
          depth--;
          continue;
        }
        if (depth === 0) buf += ch;
      }
      stripped = buf;
      const allTables = new Set(schema.keys());
      for (const part of stripped.split(",")) {
        let name = part.trim();
        if (!name || name === "*") continue;
        // Skip relational expansions: "course:courses!inner" (no parens left after strip)
        if (name.includes(":")) continue;
        if (name.includes("!")) continue;
        // Strip cast
        if (name.includes("::")) name = name.split("::")[0].trim();
        // Strip alias suffix
        if (name.includes(" ")) name = name.split(" ")[0].trim();
        if (!/^[a-z_][a-z0-9_]+$/.test(name)) continue;
        if (SELECT_FUNCTION_TOKENS.has(name)) continue;
        // If the "missing column" is actually another real table name, it's
        // a relational embed where the parens were on a different line.
        // Skip those — they're not column refs.
        if (allTables.has(name)) continue;
        if (!cols.has(name)) {
          findings.push({
            file: rel,
            table: tableName,
            column: name,
            kind: "select",
            line: lineOf(content, start + sm.index),
          });
        }
      }
    }

    // .eq("col"), .order("col"), etc.
    for (const fm of block.matchAll(filterRe)) {
      const name = fm[2];
      if (!cols.has(name)) {
        findings.push({
          file: rel,
          table: tableName,
          column: name,
          kind: fm[1],
          line: lineOf(content, start + fm.index),
        });
      }
    }

    // .insert({...}) / .upsert({...}) / .update({...}) — check object keys
    // Only top-level keys — skip nested objects (those are JSONB values, not columns).
    for (const im of block.matchAll(insertRe)) {
      const objBody = im[2];
      // Track brace depth — only emit findings for keys at depth 0.
      let depth = 0;
      let cursor = 0;
      // Build a mask of which characters are at depth 0
      const atDepthZero = new Array(objBody.length).fill(false);
      for (let i = 0; i < objBody.length; i++) {
        if (depth === 0) atDepthZero[i] = true;
        const ch = objBody[i];
        if (ch === "{" || ch === "[") depth++;
        else if (ch === "}" || ch === "]") depth = Math.max(0, depth - 1);
      }
      for (const km of objBody.matchAll(objectKeyRe)) {
        if (!atDepthZero[km.index]) continue;
        const name = km[1];
        if (!cols.has(name)) {
          findings.push({
            file: rel,
            table: tableName,
            column: name,
            kind: im[1],
            line: lineOf(content, start + im.index),
          });
        }
      }
    }
  }
}

// ─── Report ─────────────────────────────────────────────────────────────────
console.log("=== Phantom tables (.from() to a table that does not exist) ===");
if (phantomTables.length === 0) {
  console.log("  none");
} else {
  for (const p of phantomTables) {
    console.log(`  ${p.table} -- ${p.file}:${p.line}`);
  }
}

console.log("");
console.log("=== Column reference findings ===");
const byTable = new Map();
for (const f of findings) {
  const key = `${f.table}.${f.column}`;
  if (!byTable.has(key)) byTable.set(key, []);
  byTable.get(key).push(f);
}

const sorted = [...byTable.entries()].sort((a, b) => b[1].length - a[1].length);
console.log(`Total distinct missing columns: ${sorted.length}`);
console.log(`Total findings: ${findings.length}`);
console.log("");
for (const [key, hits] of sorted) {
  console.log(`  [${hits.length}x] ${key}  (kinds: ${[...new Set(hits.map(h => h.kind))].join(",")})`);
  for (const h of hits.slice(0, 3)) {
    console.log(`      ${h.file}:${h.line}`);
  }
}

// Save full report
const out = {
  schema_table_count: schema.size,
  phantom_tables: phantomTables,
  findings_total: findings.length,
  by_table_column: Object.fromEntries(sorted),
};
import { writeFileSync } from "node:fs";
writeFileSync("scripts/audit-findings.json", JSON.stringify(out, null, 2));
console.log("");
console.log("Full report: scripts/audit-findings.json");
