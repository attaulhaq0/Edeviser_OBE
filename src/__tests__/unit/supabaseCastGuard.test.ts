// =============================================================================
// supabaseCastGuard.test.ts — Static_Cast_Guard (Req 17, Part C / C1)
// Feature: qa-partner-review-remediation
// -----------------------------------------------------------------------------
// Generalizes the narrower student-experience guards
// (`architectureGuards.test.ts`, `integration/studentArchitectureGuards.test.ts`)
// product-wide: it walks the ENTIRE `src/` tree and fails when a Supabase call
// defeats generated-type checking via an `as never` cast
// (`.from(... as never)`, `.insert(... as never)`, `.update(... as never)`,
// `.upsert(... as never)`) — the deeper root cause behind the challenge (B2) and
// team (B3) insert bugs.
//
// The pure detection + verdict logic lives in `src/lib/db/castGuard.ts` (no fs);
// this harness only supplies file I/O: it reads each source file, blanks its
// comments/strings with the shared `blankCommentsAndStrings` tokenizer (so hits
// inside comments, strings, and import paths are ignored — Req 17.6), runs the
// detector, then compares the result against the tracked Allowlist.
//
//   Req 17.1 — scan all of src/ for the four `as never` Supabase casts.
//   Req 17.2 — a violation not in the Allowlist fails CI.
//   Req 17.3 — the Allowlist is the MAXIMUM permitted set (+ maxCount baseline).
//   Req 17.4 — a new violation is reported with file + location and fails.
//   Req 17.6 — the same text inside a comment / string / import path is ignored.
// =============================================================================

import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";
import {
  blankCommentsAndStrings,
  findCastViolations,
  evaluateCastGuard,
  type Allowlist,
  type CastViolation,
} from "@/lib/db/castGuard";
import allowlistJson from "@/__tests__/fixtures/supabaseCastAllowlist.json";

const projectRoot = path.resolve(__dirname, "../../..");
const srcDir = path.join(projectRoot, "src");

const allowlist = allowlistJson as Allowlist;

// ─── File walking ──────────────────────────────────────────────────────────

/** Recursively collect `.ts`/`.tsx` files under an absolute directory. */
const collectSourceFiles = (absDir: string): string[] => {
  const out: string[] = [];
  for (const entry of fs.readdirSync(absDir, { withFileTypes: true })) {
    const abs = path.join(absDir, entry.name);
    if (entry.isDirectory()) out.push(...collectSourceFiles(abs));
    else if (/\.(ts|tsx)$/.test(entry.name)) out.push(abs);
  }
  return out;
};

const toRel = (abs: string): string =>
  path.relative(projectRoot, abs).replace(/\\/g, "/");

/** Scan the whole src/ tree once and accumulate every cast occurrence. */
const scanSrcTree = (): CastViolation[] => {
  const violations: CastViolation[] = [];
  for (const abs of collectSourceFiles(srcDir)) {
    const blanked = blankCommentsAndStrings(fs.readFileSync(abs, "utf-8"));
    violations.push(...findCastViolations(toRel(abs), blanked));
  }
  return violations;
};

// ─── Guard: src/ matches the baseline Allowlist ──────────────────────────────

describe("Static_Cast_Guard — src/ has no un-allowlisted `as never` Supabase casts (Req 17)", () => {
  const violations = scanSrcTree();

  it("scans a non-trivial number of source files", () => {
    expect(collectSourceFiles(srcDir).length).toBeGreaterThan(50);
  });

  it("passes the cast-guard verdict against the current baseline (Req 17.2, 17.3, 17.4, 17.5, 17.7)", () => {
    const verdict = evaluateCastGuard(violations, allowlist);
    expect(verdict.pass, verdict.reasons.join("\n")).toBe(true);
  });

  it("never exceeds the recorded baseline maxCount (Req 17.7)", () => {
    expect(violations.length).toBeLessThanOrEqual(allowlist.maxCount);
  });

  it("keeps the known current offenders in the baseline (Req 17.1, 17.3)", () => {
    // useChallenges (B2) and useTeams (B3) still carry their casts at this task;
    // they are removed later in tasks 10.1 / 11.1, which then shrink the allowlist.
    const has = (file: string, pattern: string): boolean =>
      violations.some((v) => v.file === file && v.pattern === pattern);

    expect(has("src/hooks/useChallenges.ts", "from-as-never")).toBe(true);
    expect(has("src/hooks/useChallenges.ts", "insert-as-never")).toBe(true);
    expect(has("src/hooks/useTeams.ts", "from-as-never")).toBe(true);
    expect(has("src/hooks/useTeams.ts", "insert-as-never")).toBe(true);
  });
});

// ─── Fixture-style detection assertions ──────────────────────────────────────

describe("Static_Cast_Guard — detection finds real casts but ignores comments/strings/imports (Req 17.1, 17.6)", () => {
  it("flags a real `.insert(payload as never)` in code", () => {
    const src = [
      "const run = async () => {",
      '  await supabase.from("teams").insert(payload as never);',
      "};",
    ].join("\n");
    const found = findCastViolations(
      "src/example.ts",
      blankCommentsAndStrings(src)
    );
    expect(found).toEqual([
      { file: "src/example.ts", pattern: "insert-as-never", line: 2 },
    ]);
  });

  it("flags each of the four dangerous methods", () => {
    const src = [
      'supabase.from("t" as never);',
      "supabase.insert(a as never);",
      "supabase.update(b as never);",
      "supabase.upsert(c as never);",
    ].join("\n");
    const patterns = findCastViolations(
      "src/four.ts",
      blankCommentsAndStrings(src)
    ).map((v) => v.pattern);
    expect(patterns).toEqual([
      "from-as-never",
      "insert-as-never",
      "update-as-never",
      "upsert-as-never",
    ]);
  });

  it("matches a multi-line `.insert({ ... } as never)` call (Req 17.1)", () => {
    const src = [
      "await supabase",
      '  .from("teams")',
      "  .insert({",
      "    name: row.name,",
      "    captain_id: row.captain,",
      "  } as never)",
      "  .select();",
    ].join("\n");
    const found = findCastViolations(
      "src/multiline.ts",
      blankCommentsAndStrings(src)
    );
    // `.from("teams")` has no cast; the `.insert(... as never)` spanning lines
    // 3–6 is the single violation, reported on the `.insert(` line.
    expect(found).toEqual([
      { file: "src/multiline.ts", pattern: "insert-as-never", line: 3 },
    ]);
  });

  it("does NOT flag `as never` inside a // line comment (Req 17.6)", () => {
    const src =
      '// legacy: supabase.from("t").insert(x as never)\nconst x = 1;';
    expect(
      findCastViolations("src/comment.ts", blankCommentsAndStrings(src))
    ).toEqual([]);
  });

  it("does NOT flag `as never` inside a /* block comment */ (Req 17.6)", () => {
    const src = "/* example: .insert(payload as never) */\nconst y = 2;";
    expect(
      findCastViolations("src/block.ts", blankCommentsAndStrings(src))
    ).toEqual([]);
  });

  it("does NOT flag `as never` inside a string literal (Req 17.6)", () => {
    const src = 'const doc = ".insert(payload as never)";';
    expect(
      findCastViolations("src/string.ts", blankCommentsAndStrings(src))
    ).toEqual([]);
  });

  it("does NOT flag a `.from(...)` mention inside an import path or string (Req 17.6)", () => {
    const src = [
      'import { thing } from "./from-as-never-helpers";',
      'const note = "call .from(x as never) to bypass types";',
      "const safe = 1;",
    ].join("\n");
    expect(
      findCastViolations("src/import.ts", blankCommentsAndStrings(src))
    ).toEqual([]);
  });

  it("does NOT flag a properly typed `.insert(row)` with no cast", () => {
    const src = 'await supabase.from("teams").insert(row).select();';
    expect(
      findCastViolations("src/typed.ts", blankCommentsAndStrings(src))
    ).toEqual([]);
  });
});

// ─── Verdict-logic assertions ────────────────────────────────────────────────

describe("Static_Cast_Guard — verdict logic (Req 17.2, 17.4, 17.5, 17.7)", () => {
  const base: Allowlist = {
    maxCount: 1,
    entries: [{ file: "src/hooks/useTeams.ts", pattern: "insert-as-never" }],
  };

  it("passes when live violations exactly match the allowlist", () => {
    const live: CastViolation[] = [
      { file: "src/hooks/useTeams.ts", pattern: "insert-as-never", line: 70 },
    ];
    const verdict = evaluateCastGuard(live, base);
    expect(verdict.pass).toBe(true);
    expect(verdict.reasons).toEqual([]);
  });

  it("fails and reports the file/location for a new violation (Req 17.2, 17.4)", () => {
    const live: CastViolation[] = [
      { file: "src/hooks/useTeams.ts", pattern: "insert-as-never", line: 70 },
      { file: "src/hooks/useNew.ts", pattern: "from-as-never", line: 12 },
    ];
    const verdict = evaluateCastGuard(live, { ...base, maxCount: 2 });
    expect(verdict.pass).toBe(false);
    expect(verdict.newViolations).toHaveLength(1);
    expect(verdict.reasons.join("\n")).toContain("src/hooks/useNew.ts:12");
  });

  it("fails on a stale allowlist entry that no longer matches code (Req 17.5)", () => {
    const verdict = evaluateCastGuard([], base);
    expect(verdict.pass).toBe(false);
    expect(verdict.staleEntries).toEqual([base.entries[0]]);
    expect(verdict.reasons.join("\n")).toContain("Stale allowlist entry");
  });

  it("fails when the live count exceeds maxCount (Req 17.7)", () => {
    const live: CastViolation[] = [
      { file: "src/hooks/useTeams.ts", pattern: "insert-as-never", line: 70 },
      { file: "src/hooks/useTeams.ts", pattern: "from-as-never", line: 40 },
    ];
    const allow: Allowlist = {
      maxCount: 1,
      entries: [
        { file: "src/hooks/useTeams.ts", pattern: "insert-as-never" },
        { file: "src/hooks/useTeams.ts", pattern: "from-as-never" },
      ],
    };
    const verdict = evaluateCastGuard(live, allow);
    expect(verdict.countExceeded).toBe(true);
    expect(verdict.pass).toBe(false);
  });
});
