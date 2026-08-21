// =============================================================================
// check-i18n-parity.mjs — assert en/ar locale key parity across all namespaces
// =============================================================================
//
// UI-migration guardrail (R7.1 / R7.5): every user-facing string must exist in
// BOTH `en` and `ar`. New chrome/nav/module copy added during the migration is
// easy to add to one locale and forget the other; this catches that drift.
//
// Exits 1 (with a per-namespace report of the offending keys) if any namespace's
// key set differs between locales; exits 0 when all namespaces are in parity.
//
// Run: `npm run i18n:check`  (also intended for CI).
// =============================================================================

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const LOCALES_DIR = resolve(scriptDir, "..", "src", "locales");

// Keep in sync with `namespaces` in src/lib/i18n.ts.
const NAMESPACES = [
  "common",
  "auth",
  "admin",
  "teacher",
  "student",
  "coordinator",
  "gamification",
  "ai",
];

/** Recursively collect leaf key paths (dot notation). Arrays count as leaves. */
const collectKeys = (obj, prefix = "", out = new Set()) => {
  for (const [key, value] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === "object" && !Array.isArray(value)) {
      collectKeys(value, path, out);
    } else {
      out.add(path);
    }
  }
  return out;
};

const load = (lang, ns) => {
  const file = resolve(LOCALES_DIR, lang, `${ns}.json`);
  try {
    // Strip a leading UTF-8 BOM (\uFEFF) before parsing — some locale files
    // carry one, which the app tolerates (Vite's JSON loader strips it on
    // import) but strict JSON.parse rejects.
    const raw = readFileSync(file, "utf-8").replace(/^\uFEFF/, "");
    return JSON.parse(raw);
  } catch (err) {
    console.error(`\u2716 Cannot read ${lang}/${ns}.json: ${err.message}`);
    return null;
  }
};

const onlyInFirst = (a, b) => [...a].filter((k) => !b.has(k)).sort();

let failed = false;

for (const ns of NAMESPACES) {
  const en = load("en", ns);
  const ar = load("ar", ns);
  if (!en || !ar) {
    failed = true;
    continue;
  }

  const enKeys = collectKeys(en);
  const arKeys = collectKeys(ar);
  const missingInAr = onlyInFirst(enKeys, arKeys);
  const missingInEn = onlyInFirst(arKeys, enKeys);

  if (missingInAr.length || missingInEn.length) {
    failed = true;
    console.error(`\n\u2716 Namespace "${ns}" key mismatch:`);
    if (missingInAr.length) {
      console.error(`  Present in en, MISSING in ar (${missingInAr.length}):`);
      for (const k of missingInAr) console.error(`    - ${k}`);
    }
    if (missingInEn.length) {
      console.error(`  Present in ar, MISSING in en (${missingInEn.length}):`);
      for (const k of missingInEn) console.error(`    - ${k}`);
    }
  } else {
    console.log(`\u2713 ${ns}: ${enKeys.size} keys in parity`);
  }
}

if (failed) {
  console.error(
    "\ni18n key-parity check FAILED \u2014 en and ar must have identical keys."
  );
  process.exit(1);
}

console.log("\n\u2713 i18n key parity OK across all namespaces.");
