#!/usr/bin/env node

/**
 * Edeviser Design System Lint
 *
 * Source-text checks (including comments and fixtures, not a JSX semantic parser):
 *  1. Disallowed icon background utilities in .ts/.tsx, with canonical exemptions
 *  2. Legacy brand gradient utility pairs in .ts/.tsx/.css
 *  3. Physical spacing utilities in .tsx (use logical spacing instead)
 *  4. Raw var(--brand-gradient) in .tsx (use GradientCardHeader)
 *
 * Usage: node scripts/design-lint/check.mjs [--root <repository-directory>]
 * Exit codes: 0 = clean, 1 = violations, 2 = scan/I/O/argument error.
 * No subprocesses, cwd dependence, or import-time execution.
 */

import { lstatSync, readdirSync, readFileSync } from "node:fs";
import { extname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = fileURLToPath(new URL("../../", import.meta.url));
const SOURCE_EXTENSIONS = new Set([".ts", ".tsx", ".css"]);
const SEMANTIC_EXEMPT = new Set([
  "src/lib/attainmentClassifier.ts",
  "src/lib/bloomsVerbs.ts",
  "src/lib/leagueTier.ts",
  "src/lib/aiGovernancePolicy.ts",
  "src/pages/LoginPage.tsx",
]);
const BRAND_GRADIENT_EXEMPT = new Set(["src/pages/NotFoundPage.tsx"]);
const CHECKS = [
  ["icon-background", "Check 1 — Icon Wrapper Backgrounds"],
  ["legacy-gradient", "Check 2 — Legacy Gradient"],
  ["physical-css", "Check 3 — Physical CSS"],
  ["raw-brand-gradient", "Check 4 — Raw Brand Gradient"],
];

// Utility boundaries must not confuse a shade of 50 with 500, nor a custom
// prefixed/suffixed class with a Tailwind utility. Variants, important markers,
// negative spacing and opacity modifiers still contain the governed utility.
const ICON_BG = /(?<![\w-])bg-(?:blue|green|yellow|red|purple|indigo|orange|teal|pink|rose|amber|emerald|cyan|sky|violet|fuchsia)-50(?![\w-])/g;
const LEGACY_GRADIENT = /(?<![\w-])(?:from-teal-500\s+to-blue-600|bg-gradient-to-r\s+from-teal-500)(?![\w-])/;
// These four families are prohibited even when the value is built dynamically.
const PHYSICAL_CSS = /(?<![\w-])-?(?:ml|mr|pl|pr)-/;
const RAW_BRAND_GRADIENT = /var\(\s*--brand-gradient\s*\)/;

/** Pure source-text scanner; returns one finding per check/line (per icon color). */
export function scanSource(file, source) {
  const normalizedFile = file.replace(/\\/g, "/");
  const extension = extname(normalizedFile);
  if (!SOURCE_EXTENSIONS.has(extension)) return [];

  const violations = [];
  for (const [index, text] of source.split(/\r\n|\n|\r/).entries()) {
    const add = (check, match) => violations.push({
      check, file: normalizedFile, line: index + 1, match, text: text.trim(),
    });
    if (extension !== ".css" && !SEMANTIC_EXEMPT.has(normalizedFile)) {
      for (const color of new Set(Array.from(text.matchAll(ICON_BG), (match) => match[0]))) {
        add("icon-background", color);
      }
    }
    const legacy = text.match(LEGACY_GRADIENT);
    if (legacy) add("legacy-gradient", legacy[0]);
    if (extension === ".tsx") {
      const physical = text.match(PHYSICAL_CSS);
      if (physical) add("physical-css", physical[0]);
      const rawGradient = text.match(RAW_BRAND_GRADIENT);
      if (rawGradient && !BRAND_GRADIENT_EXEMPT.has(normalizedFile)) {
        add("raw-brand-gradient", rawGradient[0]);
      }
    }
  }
  return violations;
}

const filesystem = {
  lstat: (path) => lstatSync(path),
  readdir: (path) => readdirSync(path, { withFileTypes: true }),
  readFile: (path) => readFileSync(path, "utf8"),
};

function readOrThrow(operation, path, read) {
  try {
    return read(path);
  } catch (cause) {
    throw new Error(`Cannot ${operation} ${path}: ${cause instanceof Error ? cause.message : String(cause)}`, { cause });
  }
}

/** Read every nested source file, or throw. Never return a partial clean scan. */
export function scanDesignSystem(root = ROOT, io = filesystem) {
  const sourceRoot = join(resolve(root), "src");
  const stat = readOrThrow("inspect", sourceRoot, io.lstat);
  if (!stat.isDirectory() || stat.isSymbolicLink()) {
    throw new Error(`Source root must be a real directory: ${sourceRoot}`);
  }

  const files = [];
  const walk = (directory, relativeDirectory) => {
    const entries = readOrThrow("list directory", directory, io.readdir);
    // Code-unit ordering is independent of the host's locale and filesystem.
    entries.sort((a, b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0);
    for (const entry of entries) {
      const absolute = join(directory, entry.name);
      const relative = `${relativeDirectory}/${entry.name}`;
      if (entry.isSymbolicLink()) {
        // Do not silently omit linked source or follow cycles/out-of-root links.
        throw new Error(`Symbolic links are not supported in the source scan: ${relative}`);
      }
      if (entry.isDirectory()) walk(absolute, relative);
      else if (!entry.isFile()) throw new Error(`Unsupported source entry: ${relative}`);
      else if (SOURCE_EXTENSIONS.has(extname(entry.name))) files.push({ absolute, relative });
    }
  };
  walk(sourceRoot, "src");
  if (files.length === 0) throw new Error(`No .ts, .tsx or .css source files found in ${sourceRoot}`);
  files.sort((a, b) => a.relative < b.relative ? -1 : a.relative > b.relative ? 1 : 0);

  const violations = [];
  for (const file of files) {
    const source = readOrThrow("read file", file.absolute, io.readFile);
    violations.push(...scanSource(file.relative, source));
  }
  return { filesScanned: files.length, violations };
}

/** CLI runner with injectable output; importing this module never invokes it. */
export function run(argv = [], output = console, io = filesystem) {
  try {
    let root = ROOT;
    if (argv.length !== 0) {
      if (argv.length !== 2 || argv[0] !== "--root" || !argv[1] || argv[1].startsWith("--")) {
        throw new Error("Usage: node scripts/design-lint/check.mjs [--root <repository-directory>]");
      }
      root = resolve(argv[1]);
    }
    output.log("Edeviser Design System Lint\n============================");
    const { filesScanned, violations } = scanDesignSystem(root, io);
    output.log(`Scanned ${filesScanned} source file(s).`);
    for (const [check, label] of CHECKS) {
      const findings = violations.filter((violation) => violation.check === check);
      if (findings.length === 0) output.log(`[PASS] ${label}: 0 violations`);
      else {
        output.error(`[FAIL] ${label}: ${findings.length} violation(s)`);
        for (const finding of findings) {
          output.error(`  ${finding.file}:${finding.line}: [${finding.match}] ${finding.text}`);
        }
      }
    }
    if (violations.length === 0) {
      output.log("ALL CHECKS PASSED");
      return 0;
    }
    output.error(`${violations.length} TOTAL VIOLATION(S) FOUND`);
    return 1;
  } catch (error) {
    output.error(`[ERROR] Design lint scan failed: ${error instanceof Error ? error.message : String(error)}`);
    return 2;
  }
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  process.exitCode = run(process.argv.slice(2));
}
