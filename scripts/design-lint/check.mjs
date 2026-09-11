#!/usr/bin/env node

/**
 * Edeviser Design System Lint
 * ===========================
 * Automated compliance checks for canonical design-system rules.
 *
 * Checks performed:
 *  1. Icon wrapper backgrounds — no solid colored fills on decorative wrappers
 *  2. Brand gradient usage — no legacy `from-teal-500 to-blue-600`
 *  3. Physical CSS properties — no ml-/mr-/pl-/pr- (must use logical)
 *  4. Semantic color registry — verify semantic color sources are canonical
 *
 * Usage:
 *   node scripts/design-lint/check.mjs
 *
 * Exit code 0 = all checks pass, 1 = violations found.
 */

import { execSync } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const ROOT = resolve(__dirname, "..", "..");

function runCheck(label, powershellCmd, exemptFiles = []) {
  try {
    const result = execSync(powershellCmd, {
      cwd: ROOT,
      encoding: "utf8",
      maxBuffer: 10 * 1024 * 1024,
      shell: "powershell.exe",
    });
    if (!result.trim()) {
      console.log(`[PASS] ${label}: 0 violations`);
      return [];
    }
    const lines = result.trim().split("\n").filter(Boolean);
    const violations = [];
    for (const line of lines) {
      const fileMatch = line.match(/^(src[/\\][^:]+)/);
      const file = fileMatch ? fileMatch[1].replace(/\\/g, "/") : "";
      if (file && exemptFiles.some((f) => file.startsWith(f))) continue;
      violations.push(line.trim());
    }
    if (violations.length > 0) {
      console.error(`\n[FAIL] ${label}: ${violations.length} violation(s)`);
      for (const v of violations) console.error(`  ${v}`);
    } else {
      console.log(`[PASS] ${label}: 0 violations`);
    }
    return violations;
  } catch (e) {
    if (e.status === 1 && !e.stdout) {
// ---------------------------------------------------------------------------
// Check 1: Icon wrapper backgrounds — no solid colored fills
// ---------------------------------------------------------------------------
const DISALLOWED_ICON_BG = [
  "bg-blue-50", "bg-green-50", "bg-yellow-50", "bg-red-50",
  "bg-purple-50", "bg-indigo-50", "bg-orange-50", "bg-teal-50",
  "bg-pink-50", "bg-rose-50", "bg-amber-50", "bg-emerald-50",
  "bg-cyan-50", "bg-sky-50", "bg-violet-50", "bg-fuchsia-50",
];

const SEMANTIC_EXEMPT = [
  "src/lib/attainmentClassifier.ts",
  "src/lib/bloomsVerbs.ts",
  "src/lib/leagueTier.ts",
  "src/lib/aiGovernancePolicy.ts",
  "src/pages/LoginPage.tsx",
];

function checkIconWrappers() {
  const allViolations = [];
  for (const color of DISALLOWED_ICON_BG) {
    const cmd = `Select-String -Path 'src/**/*.tsx','src/**/*.ts' -Pattern '${color}' | ForEach-Object { $_.Path -replace '.*\\\\src\\\\','src/' + ':' + $_.LineNumber + ': ' + $_.Line.Trim() }`;
    const v = runCheck(`Icon BG: ${color}`, cmd, SEMANTIC_EXEMPT);
    allViolations.push(...v);
  }
  if (allViolations.length === 0) {
    console.log("[PASS] Check 1 — Icon Wrapper Backgrounds: 0 violations total");
  }
  return allViolations;
}
// ---------------------------------------------------------------------------
// Check 2: Legacy brand gradient utilities
// ---------------------------------------------------------------------------
function checkLegacyGradient() {
  return runCheck(
    "Check 2 — Legacy Gradient",
    "Select-String -Path 'src/**/*.tsx','src/**/*.ts','src/**/*.css' -Pattern 'from-teal-500 to-blue-600|bg-gradient-to-r from-teal-500' | ForEach-Object { $_.Path -replace '.*\\\\src\\\\','src/' + ':' + $_.LineNumber }"
  );
}

// ---------------------------------------------------------------------------
// Check 3: Physical CSS properties (ml-/mr-/pl-/pr-)
// ---------------------------------------------------------------------------
function checkPhysicalCSS() {
  return runCheck(
    "Check 3 — Physical CSS",
    "Select-String -Path 'src/**/*.tsx' -Pattern '\\bml-|\\bmr-|\\bpl-|\\bpr-' | ForEach-Object { $_.Path -replace '.*\\\\src\\\\','src/' + ':' + $_.LineNumber + ': ' + $_.Line.Trim() }"
  );
}

// ---------------------------------------------------------------------------
// Check 4: Raw brand gradient (must use GradientCardHeader)
// ---------------------------------------------------------------------------
const BRAND_GRADIENT_EXEMPT = ["src/pages/NotFoundPage.tsx"];

function checkRawBrandGradient() {
  return runCheck(
    "Check 4 — Raw Brand Gradient",
    "Select-String -Path 'src/**/*.tsx' -Pattern 'var\\\\(--brand-gradient\\\\)' | ForEach-Object { $_.Path -replace '.*\\\\src\\\\','src/' + ':' + $_.LineNumber + ': ' + $_.Line.Trim() }",
    BRAND_GRADIENT_EXEMPT
  );
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
console.log("Edeviser Design System Lint");
console.log("============================\n");

const allViolations = [
  ...checkIconWrappers(),
  ...checkLegacyGradient(),
  ...checkPhysicalCSS(),
  ...checkRawBrandGradient(),
];

if (allViolations.length === 0) {
  console.log("\nALL CHECKS PASSED");
  process.exit(0);
} else {
  console.error(`\n${allViolations.length} TOTAL VIOLATION(S) FOUND`);
  process.exit(1);
}
      console.log(`[PASS] ${label}: 0 violations`);
      return [];
    }
    throw e;
  }
}