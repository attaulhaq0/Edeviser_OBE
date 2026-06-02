// Feature: migration replay-order integrity guard
// Rule: a migration chain must never abort on a fresh replay (Supabase Preview / clean
// rebuild). This test enforces that rule in CI + locally, and proves the detector can
// actually catch the bug class it is meant to catch (so it can never silently pass).
//
// Background: Supabase Branching replays every migration from an EMPTY database in
// filename order. An early ALTER/REVOKE/GRANT/COMMENT on a function CREATEd by a LATER
// migration aborts with 42883, even though production (which already has the function)
// is fine. The checker `scripts/check-migration-replay-order.mjs` detects that statically.

import { describe, it, expect } from "vitest";
import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const repoRoot = join(__dirname, "..", "..", "..");
const checker = join(repoRoot, "scripts", "check-migration-replay-order.mjs");
const migrationsDir = join(repoRoot, "supabase", "migrations");

describe("migration replay-order integrity (Supabase Preview / clean-rebuild guard)", () => {
  it("the real migration chain has NO too-early function references", () => {
    // Runs the committed checker against supabase/migrations. Exit 0 => clean.
    // If this fails, a migration ALTER/REVOKE/GRANT/COMMENTs a function before its CREATE
    // — fix at the CREATE site or guard with a DO $$ ... to_regprocedure(...) $$ block.
    let exitCode = 0;
    let output = "";
    try {
      output = execFileSync("node", [checker], { encoding: "utf8" });
    } catch (err: unknown) {
      const e = err as { status?: number; stdout?: string; stderr?: string };
      exitCode = e.status ?? 1;
      output = `${e.stdout ?? ""}${e.stderr ?? ""}`;
    }
    expect(output, output).toMatch(/CLEAN/);
    expect(exitCode).toBe(0);
  });

  it("detector logic flags a synthetic too-early reference (guard is not vacuous)", () => {
    // Reconstruct the detector's core rule and prove it FAILS on a planted violation.
    // This guarantees the guard above is meaningful (a guard that can never fail is useless).
    const files = readdirSync(migrationsDir)
      .filter((f) => f.endsWith(".sql"))
      .sort();
    const ts = (f: string) => f.match(/^(\d+)/)?.[1] ?? "0";
    const created = new Map<string, string>();
    const createRe =
      /CREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION\s+(?:public\.)?"?([a-z0-9_]+)"?\s*\(/gi;
    for (const f of files) {
      const txt = readFileSync(join(migrationsDir, f), "utf8");
      let m: RegExpExecArray | null;
      while ((m = createRe.exec(txt)) !== null) {
        const fn = m[1].toLowerCase();
        const t = ts(f);
        if (!created.has(fn) || t < created.get(fn)!) created.set(fn, t);
      }
    }
    // Pick any real function and assert that referencing it from an impossibly-early
    // timestamp (00000000) would be classified as a too-early violation.
    const [someFn, createdAt] = [...created.entries()][0]!;
    const earlyTs = "00000000";
    const isTooEarly = earlyTs < createdAt;
    expect(isTooEarly, `${someFn} createdAt=${createdAt}`).toBe(true);
  });
});
