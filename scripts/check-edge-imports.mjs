#!/usr/bin/env node
/**
 * check-edge-imports.mjs — static named-import verification for Edge Functions.
 *
 * WHY: vitest never loads function ENTRYPOINTS (agent-orchestrator/index.ts etc.)
 * and `tsc --noEmit` excludes Deno files, so a named import that does not exist
 * in its target module compiles clean locally and only fails at DENO BOOT in
 * production (503 on every request — agent-orchestrator incident 2026-09-02).
 *
 * This gate parses every relative import in supabase/functions/**\/*.ts, resolves
 * the target file, and verifies each named import is actually exported there.
 * URL/npm/jsr imports are skipped (resolved by the Deno runtime, not us).
 *
 * Exit 1 on the first missing export; exit 0 otherwise.
 */
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const FUNCTIONS_DIR = join(ROOT, "supabase", "functions");

const collectTsFiles = (dir) => {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...collectTsFiles(full));
    else if (entry.endsWith(".ts")) out.push(full);
  }
  return out;
};

// export const/let/var/function/class/enum X — plus abstract/async/declare forms.
const DECLARATION_RE =
  /^\s*export\s+(?:declare\s+)?(?:default\s+)?(?:abstract\s+)?(?:async\s+)?(?:const|let|var|function\*?|class|enum)\s+([A-Za-z_$][\w$]*)/;
// export type/interface X
const TYPE_RE =
  /^\s*export\s+(?:type|interface)\s+([A-Za-z_$][\w$]*)/;
// export { A, B as C } [from "..."] | export * from "..."
const BRACE_RE = /^\s*export\s*\{([^}]*)\}(?:\s*from\s*["']([^"']+)["'])?/;
const STAR_RE = /^\s*export\s*\*\s*from\s*["']([^"']+)["']/;

const exportsOf = (filePath) => {
  const source = readFileSync(filePath, "utf8");
  const names = new Set();
  names.add("__all__"); // present when `export *` re-exports are encountered
  for (const line of source.split("\n")) {
    const decl = line.match(DECLARATION_RE);
    if (decl) {
      names.add(decl[1]);
      continue;
    }
    const type = line.match(TYPE_RE);
    if (type) {
      names.add(type[1]);
      continue;
    }
    const star = line.match(STAR_RE);
    if (star) {
      names.add("__all__");
      continue;
    }
    const brace = line.match(BRACE_RE);
    if (brace) {
      for (const part of brace[1].split(",")) {
        const item = part.trim();
        if (!item) continue;
        const asMatch = item.match(/^(?:type\s+)?[\w$]+\s+as\s+([\w$]+)$/);
        const name = asMatch ? asMatch[1] : item.replace(/^type\s+/, "");
        if (/^[\w$]+$/.test(name)) names.add(name);
      }
    }
  }
  return names;
};

const resolveRelative = (fromFile, spec) => {
  const base = resolve(dirname(fromFile), spec);
  if (existsSync(base) && statSync(base).isFile()) return base;
  if (existsSync(`${base}.ts`)) return `${base}.ts`;
  if (existsSync(join(base, "index.ts"))) return join(base, "index.ts");
  return null;
};

let failures = 0;
const files = collectTsFiles(FUNCTIONS_DIR);
for (const file of files) {
  const source = readFileSync(file, "utf8");
  // Multi-line import blocks: capture `import {...} from "./x.ts"`.
  const importRe =
    /import\s*(?:type\s*)?\{([^}]*)\}\s*from\s*["'](\.[^"']+)["']/g;
  for (const match of source.matchAll(importRe)) {
    const spec = match[2];
    const target = resolveRelative(file, spec);
    if (!target) continue; // missing FILE is a Deno-compile error we can't fake
    const exported = exportsOf(target);
    for (const raw of match[1].split(",")) {
      const item = raw.trim();
      if (!item || item.startsWith("type ")) continue;
      const asMatch = item.match(/^[{\w$]+\s+as\s+([\w$]+)$/);
      const localName = asMatch ? asMatch[1] : item;
      if (!/^[\w$]+$/.test(localName)) continue;
      if (!exported.has(localName) && !exported.has("__all__")) {
        failures += 1;
        const rel = file.slice(ROOT.length + 1);
        console.error(
          `BROKEN IMPORT: ${rel} imports { ${localName} } from "${spec}" — ` +
            `but ${target.slice(ROOT.length + 1)} does not export it. ` +
            `This fails Deno boot in production (503).`
        );
      }
    }
  }
}

if (failures > 0) {
  console.error(`\ncheck:edge-imports FAILED — ${failures} broken named import(s).`);
  process.exit(1);
}
console.log(`check:edge-imports OK — ${files.length} files scanned, all named imports resolve.`);
