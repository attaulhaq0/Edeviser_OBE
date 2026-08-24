#!/usr/bin/env node
/**
 * Dependency-audit CI gate (security-checklist.md — vulnerable dependencies).
 *
 * Runs `npm audit --json` and fails on high/critical advisories that are not
 * in the reviewed allowlist (scripts/audit-allowlist.json). The allowlist is
 * for unpatchable, dev-only advisories only — each entry needs a reason and
 * a review-by date. Production advisories are NEVER allowlistable.
 *
 * Usage: node scripts/check-audit.cjs
 * Exit codes: 0 = clean (or only allowlisted findings), 1 = blocking findings.
 */
const { execSync } = require("child_process");
const fs = require("fs");

const ALLOWLIST_PATH = "scripts/audit-allowlist.json";

let allowlist = { advisories: [], _comment: "" };
try {
  const parsed = JSON.parse(fs.readFileSync(ALLOWLIST_PATH, "utf8"));
  if (Array.isArray(parsed?.advisories)) allowlist = parsed;
} catch {
  // Missing allowlist = strict mode (fail-closed).
}

let report;
try {
  report = JSON.parse(execSync("npm audit --json", { maxBuffer: 33554432 }).toString());
} catch (error) {
  // npm audit exits non-zero when vulnerabilities exist; stdout still has JSON.
  try {
    report = JSON.parse(error.stdout?.toString() ?? "{}");
  } catch {
    console.error("::error::Could not parse npm audit output:", error.message);
    process.exit(1);
  }
}

const vulns = report?.vulnerabilities ?? {};
const allowlistedGhsas = new Set(allowlist.advisories);
const isBlockingSeverity = (v) => ["high", "critical"].includes(v.severity ?? "unknown");

/**
 * Structural dev-only proof: a package counts as production-reachable only if
 * `npm ls <pkg> --omit=dev` resolves it in the production dependency tree.
 * Allowlisted advisories may never hide a production-reachable vulnerability.
 */
const prodReachableCache = new Map();
function isProductionReachable(pkg) {
  if (prodReachableCache.has(pkg)) return prodReachableCache.get(pkg);
  let reachable = false;
  try {
    const tree = JSON.parse(
      execSync(`npm ls ${pkg} --omit=dev --json --long`, { maxBuffer: 33554432, stdio: ["ignore", "pipe", "ignore"] }).toString()
    );
    reachable = JSON.stringify(tree).includes(`"${pkg}"`);
  } catch (error) {
    // npm ls exits non-zero when the package is NOT found — that's the good case.
    reachable = JSON.parse(error.stdout?.toString() ?? "{}")?.dependencies?.[pkg] != null;
  }
  prodReachableCache.set(pkg, reachable);
  return reachable;
}

// Pass 1 — direct advisory matches: every advisory `via` must have its GHSA id
// in the reviewed allowlist.
const allowed = new Set();
const rootCauses = new Map(); // pkg -> ghsa ids (for reporting)
for (const [name, v] of Object.entries(vulns)) {
  const advisoryVias = (v.via ?? []).filter((via) => typeof via === "object");
  if (advisoryVias.length === 0) continue;
  const ghsaIds = advisoryVias
    .map((via) => via.url?.split("/").pop() ?? "")
    .filter(Boolean);
  rootCauses.set(name, ghsaIds);
  if (ghsaIds.length > 0 && ghsaIds.every((id) => allowlistedGhsas.has(id))) {
    allowed.add(name);
  }
}

// Pass 2 — fixpoint: a package is satisfied when every `via` is either an
// allowlisted advisory, an already-allowed package, or a package that is not
// itself a blocking-severity finding (e.g. a moderate advisory mixed into a
// high-severity chain).
let changed = true;
while (changed) {
  changed = false;
  for (const [name, v] of Object.entries(vulns)) {
    if (allowed.has(name)) continue;
    const vias = v.via ?? [];
    if (vias.length === 0) continue;
    const allSatisfied = vias.every((via) => {
      if (typeof via === "object") {
        const id = via.url?.split("/").pop() ?? "";
        return allowlistedGhsas.has(id) || allowed.has(via.name ?? "");
      }
      const viaVuln = vulns[via];
      return allowed.has(via) || viaVuln == null || !isBlockingSeverity(viaVuln);
    });
    if (allSatisfied) {
      allowed.add(name);
      changed = true;
    }
  }
}

const blocking = [];
const allowedOut = [];
for (const [name, v] of Object.entries(vulns)) {
  if (!isBlockingSeverity(v)) continue;
  if (isProductionReachable(name)) {
    // Production-reachable findings are NEVER allowlistable.
    blocking.push(`${name} (${v.severity}, PRODUCTION-REACHABLE) ${rootCauses.get(name)?.join(",") ?? ""}`);
  } else if (allowed.has(name)) {
    allowedOut.push(`${name} (${v.severity}, dev-only, via ${rootCauses.get(name)?.join(",") ?? "transitive"})`);
  } else {
    const ghsaIds = (v.via ?? [])
      .filter((via) => typeof via === "object")
      .map((via) => via.url?.split("/").pop() ?? via.name ?? "")
      .filter(Boolean);
    blocking.push(`${name} (${v.severity}) ${ghsaIds.join(",")}`);
  }
}

if (allowed.length > 0) {
  console.log(`Allowlisted dev-only advisories (reviewed): ${allowed.join("; ")}`);
}

if (blocking.length > 0) {
  for (const b of blocking) console.error(`::error::${b}`);
  console.error(
    `::error::${blocking.length} blocking dependency vulnerabilit(ies). ` +
      "Fix via version overrides; dev-only unpatched advisories require a documented allowlist entry in scripts/audit-allowlist.json."
  );
  process.exit(1);
}

console.log("Dependency audit clean (no blocking high/critical advisories).");