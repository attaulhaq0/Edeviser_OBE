#!/usr/bin/env node
// Read-only repository adapter. A no-growth result is NOT a clean-design verdict.
import { lstatSync, readdirSync, readFileSync, realpathSync } from "node:fs";
import { isAbsolute, join, relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { analyzeSources, compareFindings, RULES } from "./analyze.mjs";

export const EXCLUDED_SCOPES = Object.freeze([
  { path: "src/components/ui/", reason: "Generated primitive custody; separate generation/rendered verification is required." },
  { path: "src/__tests__/", reason: "Test sources are not part of this authored-source policy scope." },
  { path: "*.test.ts(x), *.spec.ts(x), *.d.ts", reason: "Colocated tests and type declarations are excluded explicitly." },
]);
const slash = (value) => value.replaceAll("\\", "/");
const inside = (root, target) => {
  const path = relative(root, target);
  return path !== "" && !isAbsolute(path) && path !== ".." && !path.startsWith(`..${process.platform === "win32" ? "\\" : "/"}`);
};
const excluded = (path) => path === "src/components/ui" || path.startsWith("src/components/ui/")
  || path === "src/__tests__" || path.startsWith("src/__tests__/")
  || /(?:\.(?:test|spec)\.tsx?|\.d\.ts)$/.test(path);

export function analyzeRepository(root) {
  const base = realpathSync(resolve(root));
  const sourceRoot = join(base, "src");
  const sources = [];
  function walk(directory) {
    const info = lstatSync(directory);
    if (info.isSymbolicLink() || !info.isDirectory() || !inside(base, realpathSync(directory))) throw new Error("Unsupported or escaping source directory");
    for (const entry of readdirSync(directory).sort()) {
      const absolute = join(directory, entry);
      const path = slash(relative(base, absolute));
      if (excluded(path)) continue;
      const stat = lstatSync(absolute);
      if (stat.isSymbolicLink()) throw new Error(`Source links require an explicit ownership policy: ${path}`);
      if (stat.isDirectory()) walk(absolute);
      else if (/\.tsx?$/.test(path)) {
        if (!stat.isFile() || !inside(base, realpathSync(absolute))) throw new Error(`Unsafe source file: ${path}`);
        sources.push({ file: path, source: readFileSync(absolute, "utf8") });
      }
    }
  }
  walk(sourceRoot);
  if (sources.length === 0) throw new Error("No authored TypeScript sources found; cannot report a successful empty scan");
  const result = analyzeSources(sources);
  return {
    schemaVersion: 1,
    scope: "authored-src-typescript; runtime reachability is not inferred",
    sourceCount: sources.length,
    excludedScopes: EXCLUDED_SCOPES,
    rules: RULES,
    ...result,
  };
}

export function compareRepositories(baseRoot, currentRoot) {
  if (realpathSync(resolve(baseRoot)) === realpathSync(resolve(currentRoot))) throw new Error("Baseline and current roots must be distinct checkouts");
  const baseline = analyzeRepository(baseRoot);
  const current = analyzeRepository(currentRoot);
  const comparison = compareFindings(baseline.findings, current.findings);
  return {
    schemaVersion: 1,
    mode: "check-no-growth",
    verdict: comparison.hasGrowth ? "growth" : "no-growth",
    baselineSourceCount: baseline.sourceCount,
    currentSourceCount: current.sourceCount,
    scope: current.scope,
    excludedScopes: current.excludedScopes,
    rules: current.rules,
    comparison,
    limitations: [...current.limitations,
      "No-growth preserves visible pre-existing debt; it is not clean design, computed accessibility or approval of excluded/unresolved source.",
      "The caller must provide a trustworthy baseline checkout. This adapter does not create, approve or update baselines, execute Git, or write files."],
  };
}

export function parseArguments(args) {
  if (!Array.isArray(args) || !["--report", "--check-no-growth"].includes(args[0])) throw new Error("Choose --report or --check-no-growth");
  const mode = args[0]; const values = new Map();
  for (let i = 1; i < args.length; i += 2) {
    const key = args[i], value = args[i + 1];
    if (!["--root", "--base-root"].includes(key) || !value || value.startsWith("--") || values.has(key)) throw new Error("Invalid, missing or duplicate design-policy argument");
    values.set(key, value);
  }
  if (!values.has("--root")) throw new Error("An explicit --root is required");
  if (mode === "--report" && values.has("--base-root")) throw new Error("Report mode does not accept a baseline");
  if (mode === "--check-no-growth" && !values.has("--base-root")) throw new Error("A trustworthy --base-root is required for no-growth comparison");
  return { mode, root: values.get("--root"), baseRoot: values.get("--base-root") };
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  try {
    const args = parseArguments(process.argv.slice(2));
    if (args.mode === "--report") console.log(JSON.stringify({ mode: "report", verdict: "not-evaluated", ...analyzeRepository(args.root) }, null, 2));
    else {
      const result = compareRepositories(args.baseRoot, args.root);
      console.log(JSON.stringify(result, null, 2));
      if (result.comparison.hasGrowth) process.exitCode = 1;
    }
  } catch (error) { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 2; }
}
