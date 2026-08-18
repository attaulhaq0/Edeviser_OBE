#!/usr/bin/env node

import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
const ROOT = resolve(process.cwd());
const expectedHead = () =>
  readdirSync(resolve(ROOT, "supabase/migrations"))
    .filter((file) => /^\d+_.*\.sql$/.test(file))
    .map((file) => file.match(/^(\d+)/)[1])
    .sort()
    .at(-1);

export const remoteMigrationHead = (payload) => {
  const parsed = typeof payload === "string" ? JSON.parse(payload) : payload;
  const entries = Array.isArray(parsed) ? parsed : parsed.migrations;
  if (!Array.isArray(entries))
    throw new Error("migration payload has no migrations array");
  return entries
    .map((entry) => String(entry.version ?? entry.name ?? ""))
    .filter(Boolean)
    .sort()
    .at(-1);
};

const path = process.argv[2];
if (path) {
  const expected = expectedHead();
  const actual = remoteMigrationHead(readFileSync(resolve(ROOT, path), "utf8"));
  if (expected !== actual) {
    console.error(
      `Migration ledger parity: FAIL (repository ${expected}; remote ${
        actual ?? "none"
      })`
    );
    process.exit(1);
  }
  console.log(`Migration ledger parity: PASS (${expected})`);
}
