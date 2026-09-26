#!/usr/bin/env node
// Local no-new-candidates ratchet. Caller supplies TWO separate trustworthy
// checkouts; never auto-selects a Git revision or writes/approves a baseline.
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { compareRepositories, parseArguments } from "./repository.mjs";

const MAX_IDENTITIES = 5;
export function summarizeRepositories(baseRoot, currentRoot) {
  const report = compareRepositories(baseRoot, currentRoot);
  const introduced = report.comparison.introduced.map(
    ({ file, owner, rule, token, count }) => ({
      file,
      owner,
      rule,
      token,
      count,
    })
  );
  return {
    schemaVersion: 1,
    mode: "check-no-growth",
    verdict: report.verdict,
    scope: report.scope,
    baselineSourceCount: report.baselineSourceCount,
    currentSourceCount: report.currentSourceCount,
    totals: report.comparison.totals,
    introduced: introduced.slice(0, MAX_IDENTITIES),
    omittedIntroducedGroups: Math.max(0, introduced.length - MAX_IDENTITIES),
    excludedScopes: report.excludedScopes,
    limitations: report.limitations,
  };
}

if (
  process.argv[1] &&
  pathToFileURL(resolve(process.argv[1])).href === import.meta.url
) {
  try {
    const args = parseArguments([
      "--check-no-growth",
      ...process.argv.slice(2),
    ]);
    const result = summarizeRepositories(args.baseRoot, args.root);
    console.log(JSON.stringify(result, null, 2));
    if (result.verdict === "growth") process.exitCode = 1;
  } catch (error) {
    console.error(
      `Design policy comparison unavailable: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
    process.exitCode = 2;
  }
}
