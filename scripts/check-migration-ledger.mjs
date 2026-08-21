#!/usr/bin/env node

import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(process.cwd());
const MIGRATION_FILE = /^(\d{8}|\d{14})_([^/\\]+)\.sql$/;

const uniqueSorted = (values) => [...new Set(values)].sort();

export const repositoryMigrationLedger = (files) => {
  const malformed = [];
  const versions = [];
  for (const file of files) {
    const match = file.match(MIGRATION_FILE);
    if (!match || !match[2].trim()) malformed.push(file);
    else versions.push(match[1]);
  }
  const duplicates = versions.filter(
    (version, index) => versions.indexOf(version) !== index
  );
  return {
    versions: uniqueSorted(versions),
    malformed: uniqueSorted(malformed),
    duplicates: uniqueSorted(duplicates),
  };
};

export const remoteMigrationLedger = (payload) => {
  const parsed = typeof payload === "string" ? JSON.parse(payload) : payload;
  const entries = Array.isArray(parsed)
    ? parsed
    : Array.isArray(parsed?.migrations)
    ? parsed.migrations
    : parsed?.rows;
  if (!Array.isArray(entries))
    throw new Error("migration payload has no migrations array");
  const malformed = [];
  const versions = [];
  for (const entry of entries) {
    const version =
      typeof entry?.version === "string" || typeof entry?.version === "number"
        ? String(entry.version)
        : "";
    if (!/^(?:\d{8}|\d{14})$/.test(version))
      malformed.push(JSON.stringify(entry));
    else versions.push(version);
  }
  const duplicates = versions.filter(
    (version, index) => versions.indexOf(version) !== index
  );
  return {
    versions: uniqueSorted(versions),
    malformed: uniqueSorted(malformed),
    duplicates: uniqueSorted(duplicates),
  };
};

export const compareMigrationLedgers = (expected, actual) => {
  const failures = [];
  if (expected.malformed.length > 0)
    failures.push(
      `malformed repository migration entries: ${expected.malformed.join(", ")}`
    );
  if (actual.malformed.length > 0)
    failures.push(
      `malformed remote migration entries: ${actual.malformed.join(", ")}`
    );
  if (expected.duplicates.length > 0)
    failures.push(
      `duplicate repository migration versions: ${expected.duplicates.join(
        ", "
      )}`
    );
  if (actual.duplicates.length > 0)
    failures.push(
      `duplicate remote migration versions: ${actual.duplicates.join(", ")}`
    );
  const missing = expected.versions.filter(
    (version) => !actual.versions.includes(version)
  );
  const unexpected = actual.versions.filter(
    (version) => !expected.versions.includes(version)
  );
  if (missing.length > 0)
    failures.push(`remote ledger is missing: ${missing.join(", ")}`);
  if (unexpected.length > 0)
    failures.push(
      `remote ledger has unexpected versions: ${unexpected.join(", ")}`
    );
  const expectedHead = expected.versions.at(-1);
  const actualHead = actual.versions.at(-1);
  if (expectedHead !== actualHead)
    failures.push(
      `migration head mismatch (repository ${expectedHead ?? "none"}; remote ${
        actualHead ?? "none"
      })`
    );
  return { failures, expectedHead, actualHead, missing, unexpected };
};

const main = () => {
  const path = process.argv[2];
  if (!path)
    throw new Error("a machine-readable migration ledger path is required");
  const expected = repositoryMigrationLedger(
    readdirSync(resolve(ROOT, "supabase/migrations"))
  );
  const actual = remoteMigrationLedger(
    readFileSync(resolve(ROOT, path), "utf8")
  );
  const result = compareMigrationLedgers(expected, actual);
  if (result.failures.length > 0) {
    console.error("Migration ledger parity: FAIL");
    for (const failure of result.failures) console.error(`- ${failure}`);
    process.exit(1);
  }
  console.log(`Migration ledger parity: PASS (${result.expectedHead})`);
};

if (process.argv[1]?.endsWith("check-migration-ledger.mjs")) main();
