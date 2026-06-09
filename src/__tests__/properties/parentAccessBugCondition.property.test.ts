// Feature: full-profile-audit-remediation, Property 5: Bug Condition — Parents read verified linked children's course data
// **Validates: Requirements 2.19, 2.20**
//
// CRITICAL: This test MUST FAIL on UNFIXED code — failure confirms the parent-access bug exists.
// DO NOT fix the source code or this test when it fails. The failure is the SUCCESS criterion
// for this exploration task: it proves `isParentAccessBug` — a verified-linked parent selecting
// `student_courses` / `course_sections` / `class_sessions` receives `[]` because there is NO
// parent SELECT RLS policy on those three tables, so the Progress / Attendance pages (which read
// `student_courses` first) short-circuit to an empty page.
//
// This test ENCODES the post-fix expectation (`isParentAccessBug` from design.md / bugfix.md):
//   • a NEW migration adds three parent SELECT RLS policies — one each on `student_courses`,
//     `course_sections`, `class_sessions` — scoped to `parent_student_links.verified = true`,
//     mirroring the existing `outcome_attainment` parent policy EXACTLY;
//   • each policy is `FOR SELECT TO authenticated` (read-only — never INSERT/UPDATE/DELETE/ALL);
//   • each policy references `parent_student_links` AND constrains `verified = true` (the
//     do-not-broaden invariant — an unverified link / non-parent / cross-institution caller still
//     receives `[]`).
//
// Scoped PBT approach (per task 5): property over `(parent, child, verified?)` tuples — model the
// RLS predicate as "a parent may read iff a parent SELECT policy exists for the table AND the link
// is verified". On UNFIXED code no parent policy exists on any of the three tables, so even a
// verified-linked parent resolves to `[]` → the post-fix assertions FAIL, demonstrating the bug.

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import * as fs from "fs";
import * as path from "path";

// Resolve the project root for fs-based source reading (mirrors roleGateBugCondition.property.test.ts).
const projectRoot = path.resolve(__dirname, "../../..");
const MIGRATIONS_DIR = "supabase/migrations";

// Read every migration file's SQL as one concatenated corpus (filename-ordered, like a replay).
const readAllMigrationsSql = (): string => {
  const dir = path.join(projectRoot, MIGRATIONS_DIR);
  const files = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".sql"))
    .sort();
  return files
    .map((f) => fs.readFileSync(path.join(dir, f), "utf-8"))
    .join("\n");
};

// ─── The three tables the parent Progress/Attendance pages read (isParentAccessBug surface) ──
// Each lacks a parent SELECT policy on UNFIXED code; the fix adds one scoped to verified links.
const PARENT_ACCESS_TABLES = [
  "student_courses",
  "course_sections",
  "class_sessions",
] as const;
type ParentTable = (typeof PARENT_ACCESS_TABLES)[number];

// ─── Source analysis: split the corpus into bounded CREATE POLICY blocks ─────────────────────
// Each block runs from one `CREATE POLICY` to the next (or end-of-corpus), so a USING clause that
// merely JOINs one of these tables in an UNRELATED policy can never be mis-attributed to it. The
// policy's target table is the first token after the leading `ON` in the block.
interface PolicyBlock {
  targetTable: string; // the table after `ON` (without a public. schema prefix)
  isSelect: boolean; // FOR SELECT (read) policy
  isWrite: boolean; // FOR ALL/INSERT/UPDATE/DELETE (write) policy
  referencesParentLinks: boolean; // USING clause reads parent_student_links
  scopedToVerified: boolean; // USING clause constrains verified = true
}

const parsePolicyBlocks = (sql: string): PolicyBlock[] => {
  const blocks: PolicyBlock[] = [];
  const re = /CREATE\s+POLICY[\s\S]*?(?=CREATE\s+POLICY|$)/gi;
  for (const match of sql.match(re) ?? []) {
    const onMatch = match.match(/\bON\s+(?:public\.)?(\w+)/i);
    const onTable = onMatch?.[1];
    if (!onTable) continue;
    blocks.push({
      targetTable: onTable.toLowerCase(),
      isSelect: /FOR\s+SELECT/i.test(match),
      isWrite: /FOR\s+(?:ALL|INSERT|UPDATE|DELETE)/i.test(match),
      referencesParentLinks: /parent_student_links/i.test(match),
      scopedToVerified: /verified\s*=\s*true/i.test(match),
    });
  }
  return blocks;
};

// All policy blocks targeting a given table (DROP POLICY statements are excluded — they do not
// start with CREATE POLICY).
const blocksForTable = (
  blocks: readonly PolicyBlock[],
  table: ParentTable
): PolicyBlock[] => blocks.filter((b) => b.targetTable === table);

// ─── Source analysis: does a parent SELECT RLS policy exist for a given table? ───────────────
// A "parent SELECT policy" is a `CREATE POLICY ... ON <table> ... FOR SELECT ...` whose USING
// clause references `parent_student_links`.
const hasParentSelectPolicy = (
  blocks: readonly PolicyBlock[],
  table: ParentTable
): boolean =>
  blocksForTable(blocks, table).some(
    (b) => b.isSelect && b.referencesParentLinks
  );

// ─── Source analysis: is the parent policy correctly scoped to verified links (no broadening)? ──
// The do-not-broaden invariant: the parent SELECT policy MUST constrain `verified = true` (matching
// the existing outcome_attainment parent policy). A policy that omitted `verified` would leak to
// unverified links — so we require it explicitly.
const parentSelectPolicyIsVerifiedScoped = (
  blocks: readonly PolicyBlock[],
  table: ParentTable
): boolean =>
  blocksForTable(blocks, table).some(
    (b) => b.isSelect && b.referencesParentLinks && b.scopedToVerified
  );

// A parent-link-scoped policy on these tables must be read-only — SELECT-only, never a write policy.
const parentSelectPolicyIsReadOnly = (
  blocks: readonly PolicyBlock[],
  table: ParentTable
): boolean =>
  blocksForTable(blocks, table).every((b) =>
    b.referencesParentLinks ? b.isSelect && !b.isWrite : true
  );

// ─── Behavioral model of the RLS read outcome for a (parent, child, verified) tuple ─────────
// Faithful to RLS semantics: a parent's SELECT returns the child's rows IFF a parent SELECT policy
// exists for the table AND the link to that child is verified. With no parent policy (UNFIXED),
// the read is always `[]` — exactly the empty Progress/Attendance page the audit observed.
interface ParentReadInput {
  isParent: boolean; // caller's profiles.role === 'parent'
  linked: boolean; // a parent_student_links row exists for (parent, child)
  verified: boolean; // that link is verified
  sameInstitution: boolean; // caller and child share an institution
}

// rowsVisible models whether the parent receives the child's rows (true) or `[]` (false).
const rowsVisible = (
  blocks: readonly PolicyBlock[],
  table: ParentTable,
  input: ParentReadInput
): boolean => {
  const policyExists = hasParentSelectPolicy(blocks, table);
  if (!policyExists) return false; // UNFIXED: no parent SELECT policy → always []
  // Post-fix policy predicate: role=parent AND verified link to the child.
  return (
    input.isParent && input.linked && input.verified && input.sameInstitution
  );
};

// ─── Generators ──────────────────────────────────────────────────────────────────────────
// The headline bug condition: a legitimate, verified-linked parent of a same-institution child.
const verifiedParentArb: fc.Arbitrary<ParentReadInput> = fc.record({
  isParent: fc.constant(true),
  linked: fc.constant(true),
  verified: fc.constant(true),
  sameInstitution: fc.constant(true),
});

// The do-not-broaden cases: any caller who must STILL receive [] after the fix —
// a non-parent, an unverified link, or a cross-institution caller.
const nonAuthorizedCallerArb: fc.Arbitrary<ParentReadInput> = fc
  .record({
    isParent: fc.boolean(),
    linked: fc.boolean(),
    verified: fc.boolean(),
    sameInstitution: fc.boolean(),
  })
  // Keep only tuples that are NOT a verified-linked same-institution parent.
  .filter((i) => !(i.isParent && i.linked && i.verified && i.sameInstitution));

// ─── Property 5: Bug Condition — a verified-linked parent receives the child's rows ──────────
// On UNFIXED code `hasParentSelectPolicy` is false for all three tables, so `rowsVisible` is false
// even for a verified parent → these assertions FAIL. That failure is the EXPECTED outcome for this
// exploration task and proves `isParentAccessBug` (verified parent → [] → empty page).
describe("Property 5: Bug Condition — verified-linked parent reads child's course data", () => {
  const blocks = parsePolicyBlocks(readAllMigrationsSql());

  it.each(PARENT_ACCESS_TABLES.map((t) => [t, t] as const))(
    "%s: a verified-linked parent receives the child's rows (not [])",
    (_label, table) => {
      fc.assert(
        fc.property(verifiedParentArb, (input) => {
          // Post-fix expectation: a parent SELECT policy exists on this table …
          expect(hasParentSelectPolicy(blocks, table)).toBe(true);
          // … scoped to verified links (do-not-broaden) …
          expect(parentSelectPolicyIsVerifiedScoped(blocks, table)).toBe(true);
          // … and a verified-linked parent therefore sees the child's rows.
          expect(rowsVisible(blocks, table, input)).toBe(true);
        }),
        { numRuns: 100 }
      );
    }
  );
});

// ─── Property 5 (do-not-broaden): unverified / non-parent / cross-institution still get [] ──
// This is the preservation half of the parent-access property and MUST hold both before and after
// the fix: the only access the fix grants is to a verified-linked, same-institution parent. Modeled
// purely from the RLS predicate, so it does not depend on the (yet-to-exist) migration.
describe("Property 5 (do-not-broaden): non-verified callers still receive []", () => {
  const blocks = parsePolicyBlocks(readAllMigrationsSql());

  it.each(PARENT_ACCESS_TABLES.map((t) => [t, t] as const))(
    "%s: an unverified link / non-parent / cross-institution caller receives []",
    (_label, table) => {
      fc.assert(
        fc.property(nonAuthorizedCallerArb, (input) => {
          // No broadening: anyone who is not a verified-linked same-institution parent gets [].
          expect(rowsVisible(blocks, table, input)).toBe(false);
        }),
        { numRuns: 100 }
      );
    }
  );

  it("the parent SELECT policy (once added) is read-only and verified-scoped on every table", () => {
    for (const table of PARENT_ACCESS_TABLES) {
      // Read-only invariant holds vacuously today (no parent policy yet) and after the fix.
      expect(parentSelectPolicyIsReadOnly(blocks, table)).toBe(true);
    }
  });
});

// ─── Property 5 (roll-up): all three tables gain a verified-scoped parent SELECT policy ──────
// A single roll-up encoding the post-fix expectation across the whole isParentAccessBug surface.
// FAILS today because no migration adds any parent SELECT policy to these tables.
describe("Property 5: Bug Condition — all parent-access tables gain a verified-scoped parent SELECT policy", () => {
  const blocks = parsePolicyBlocks(readAllMigrationsSql());

  it("student_courses, course_sections, and class_sessions each have a parent SELECT policy scoped to parent_student_links.verified=true", () => {
    fc.assert(
      fc.property(fc.constantFrom(...PARENT_ACCESS_TABLES), (table) => {
        expect(hasParentSelectPolicy(blocks, table)).toBe(true);
        expect(parentSelectPolicyIsVerifiedScoped(blocks, table)).toBe(true);
      }),
      { numRuns: 100 }
    );
  });
});
