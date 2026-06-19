// Feature: production-bug-fixes, Req 19.5 / Req 22 — Edge Function schema-contract guard.
//
// Rule: a `.from("table").select("col")` in supabase/functions/** must reference a real
// column of that table in src/types/database.ts. Edge Functions run on Deno and are NOT
// type-checked by `tsc`, so wrong-column drift (the class that broke the OBE accreditation
// report and course-file generators — e.g. `assignments.clo_ids` when the real column is
// `clo_weights`) compiles fine yet fails at runtime. This guard enforces the rule in CI +
// locally, and proves the detector can actually catch that class (so it is not vacuous).

import { describe, it, expect } from "vitest";
import { execFileSync } from "node:child_process";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const repoRoot = join(__dirname, "..", "..", "..");
const checker = join(repoRoot, "scripts", "check-edge-fn-schema.mjs");

describe("edge-fn schema-contract guard (Req 19.5 / Req 22)", () => {
  it("the real edge functions have NO un-baselined schema drift", () => {
    // Runs the committed checker against supabase/functions. Exit 0 => clean
    // (pre-existing drift is grandfathered in scripts/edge-fn-schema-baseline.json;
    // any NEW drift — or a regression of the fixed OBE-export columns — fails here).
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

  it("detector flags a synthetic wrong column and passes the real one (Req 22.2, non-vacuous)", async () => {
    // Import the pure pieces and prove that the exact Req-19 drift would be caught,
    // while the corrected column is accepted — i.e. the guard is meaningful.
    const mod = await import(pathToFileURL(checker).href);
    const schema = mod.buildSchema();

    // `assignments.clo_ids` does not exist (real column is `clo_weights`).
    const bad = mod.scanFunctionSource(
      "supabase/functions/__synthetic__/index.ts",
      `await supabase.from("assignments").select("id, title, clo_ids");`,
      schema
    );
    expect(bad.some((f: { name: string }) => f.name === "clo_ids")).toBe(true);

    // The corrected query (real column) produces no finding.
    const good = mod.scanFunctionSource(
      "supabase/functions/__synthetic__/index.ts",
      `await supabase.from("assignments").select("id, title, clo_weights");`,
      schema
    );
    expect(good).toEqual([]);

    // Storage `.from("reports")` must never be treated as a table reference.
    const storage = mod.scanFunctionSource(
      "supabase/functions/__synthetic__/index.ts",
      `await supabase.storage.from("reports").upload(name, bytes);`,
      schema
    );
    expect(storage).toEqual([]);
  });
});
