// Feature: full-profile-audit-remediation, Property 2: Bug Condition — PDF generators query the live schema and fail loudly
// **Validates: Requirements 2.4, 2.5**
//
// CRITICAL: This test MUST FAIL on UNFIXED code — failure confirms the schema-drift bug exists.
// DO NOT fix the source code or this test when it fails. The failure is the SUCCESS criterion
// for this exploration task: it proves the two PDF edge functions (generate-accreditation-report /
// generate-course-file) query a PRE-MIGRATION vocabulary (dead columns/scopes) and never check the
// PostgREST `error`, so the affected sections render empty while the HTTP response is still 200.
//
// This test ENCODES the post-fix expectation (`isSchemaDriftBug` from design.md / bugfix.md):
// for every drift surface enumerated below the fixed function SHALL
//   • query the LIVE columns/scopes
//       (attainment_percent, source/target_outcome_id, graduate_attributes.name/description,
//        cqi_action_plans.action_description/root_cause by program_id,
//        live outcome_attainment scopes — NOT PLO/ILO/CLO),
//   • and guard each affected select with `if (error) throw` so a future drift fails loudly
// so that PLO/ILO/GA/CQI/sample-work sections are populated with real data.

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import * as fs from "fs";
import * as path from "path";

// Resolve the project root for fs-based source reading (mirrors roleGateBugCondition.property.test.ts).
const projectRoot = path.resolve(__dirname, "../../..");

const readFileSafe = (relPath: string): string => {
  const fullPath = path.join(projectRoot, relPath);
  return fs.readFileSync(fullPath, "utf-8");
};

const ACCRED_FILE = "supabase/functions/generate-accreditation-report/index.ts";
const COURSE_FILE = "supabase/functions/generate-course-file/index.ts";

// ─── The concrete schema-drift surfaces (the `isSchemaDriftBug` enumeration) ──
// Each surface pairs a DEAD token (the pre-migration vocabulary that must be gone after the fix)
// with the LIVE token (the post-migration column/scope the fixed query must use). A surface is
// "fixed" when the source no longer references the dead token AND does reference the live token.
interface DriftSurface {
  label: string;
  file: string;
  // A regex matching the dead column/scope/filter that must be ABSENT after the fix.
  deadPattern: RegExp;
  // A regex matching the live column/scope/filter that must be PRESENT after the fix.
  livePattern: RegExp;
}

const DRIFT_SURFACES: readonly DriftSurface[] = [
  // ── generate-accreditation-report ──────────────────────────────────────
  {
    label:
      "accreditation: outcome_attainment.score_percent → attainment_percent",
    file: ACCRED_FILE,
    deadPattern: /score_percent/,
    livePattern: /attainment_percent/,
  },
  {
    label:
      "accreditation: scope === 'PLO'/'ILO' filters → live scopes (program/institution)",
    file: ACCRED_FILE,
    // Pre-migration: filters attainment by scope === "PLO" / "ILO".
    deadPattern: /scope\s*===\s*["'](?:PLO|ILO)["']/,
    livePattern: /["'](?:program|institution|student_course|course)["']/,
  },
  {
    label: "accreditation: graduate_attributes.title/code → name/description",
    file: ACCRED_FILE,
    // Pre-migration GA select: "id, title, code".
    deadPattern:
      /graduate_attributes[\s\S]{0,80}?\.select\(\s*["'][^"']*\btitle\b[^"']*\bcode\b[^"']*["']/,
    livePattern:
      /graduate_attributes[\s\S]{0,80}?\.select\(\s*["'][^"']*\bname\b[^"']*\bdescription\b[^"']*["']/,
  },
  // ── generate-course-file ───────────────────────────────────────────────
  {
    label:
      "course-file: outcome_mappings.child/parent_outcome_id → source/target_outcome_id",
    file: COURSE_FILE,
    deadPattern: /(?:child|parent)_outcome_id/,
    livePattern: /(?:source|target)_outcome_id/,
  },
  {
    label: "course-file: submissions.score_percent → scores from grades",
    file: COURSE_FILE,
    // Pre-migration: reads score_percent off the submissions select.
    deadPattern:
      /submissions[\s\S]{0,120}?\.select\(\s*["'][^"']*score_percent[^"']*["']/,
    // Post-fix: scores are read from the grades table.
    livePattern: /\.from\(\s*["']grades["']\s*\)/,
  },
  {
    label:
      "course-file: outcome_attainment scope === 'CLO' → live scope (student_course)",
    file: COURSE_FILE,
    deadPattern: /scope["']\s*,\s*["']CLO["']|scope\s*===\s*["']CLO["']/,
    livePattern: /["']student_course["']/,
  },
  {
    label:
      "course-file: cqi_action_plans.title/gap_description/corrective_actions → action_description/root_cause",
    file: COURSE_FILE,
    deadPattern: /gap_description|corrective_actions/,
    livePattern: /action_description|root_cause/,
  },
  {
    label: "course-file: cqi_action_plans filtered by course_id → program_id",
    file: COURSE_FILE,
    // Pre-migration: the CQI select chain filters .eq("course_id", ...).
    deadPattern: /cqi_action_plans[\s\S]{0,160}?\.eq\(\s*["']course_id["']/,
    livePattern: /cqi_action_plans[\s\S]{0,160}?\.eq\(\s*["']program_id["']/,
  },
] as const;

// ─── Source analysis helpers ─────────────────────────────────────────────────
const usesDeadToken = (source: string, surface: DriftSurface): boolean =>
  surface.deadPattern.test(source);

const usesLiveToken = (source: string, surface: DriftSurface): boolean =>
  surface.livePattern.test(source);

// A surface is repaired when the dead token is gone and the live token is present.
const isSurfaceFixed = (source: string, surface: DriftSurface): boolean =>
  !usesDeadToken(source, surface) && usesLiveToken(source, surface);

// ─── Error-guard analysis ────────────────────────────────────────────────────
// The fix adds `if (error) throw` (or `if (<name>Err) throw <name>Err`) guards so a future drift
// fails loudly instead of silently returning null/[]. On UNFIXED code the data selects destructure
// only `{ data: ... }` and never check the error — we detect the count of guarded throws as a proxy.
const countErrorThrowGuards = (source: string): number => {
  // Matches: if (error) throw error;  /  if (attainmentErr) throw attainmentErr;  / if (xErr) throw ...
  const matches = source.match(
    /if\s*\(\s*\w*[eE]rr(?:or)?\s*\)\s*(?:\{\s*)?throw\b/g
  );
  return matches ? matches.length : 0;
};

// The minimum number of data selects each function must guard once fixed (per design Class 2):
//  - accreditation: program, semester, courses, outcomes, survey, CQI, sections, GA, competency (≈9)
//  - course-file:   CLOs, PLOs, mappings, assignments, submissions, grades, attainment, reflections, CQI (≈9)
// We require a conservative floor of guards so the test is robust to minor select count changes.
const MIN_ERROR_GUARDS = 6;

// ─── Property 2: Bug Condition — every drift surface uses the live schema ─────
// On UNFIXED code each surface still references its dead token (and may also lack the live token),
// so `isSurfaceFixed` is false → these assertions FAIL. That failure is the expected outcome and
// proves the schema-drift bug exists.
describe("Property 2: Bug Condition — PDF generators query the live schema", () => {
  it.each(DRIFT_SURFACES.map((s) => [s.label, s] as const))(
    "%s",
    (_label, surface) => {
      const source = readFileSafe(surface.file);

      fc.assert(
        fc.property(fc.constant(surface), (s) => {
          // Post-fix expectation: the dead pre-migration token is gone …
          expect(usesDeadToken(source, s)).toBe(false);
          // … and the live column/scope is queried instead.
          expect(usesLiveToken(source, s)).toBe(true);
        }),
        { numRuns: 100 }
      );
    }
  );
});

// ─── Property 2 (continued): Bug Condition — selects fail loudly (`if (error) throw`) ──
// On UNFIXED code the data selects are unguarded (no error check), so the guard count is below the
// floor → FAILS today, which is expected and proves the "silent empty section" half of the bug.
describe("Property 2: Bug Condition — affected selects are guarded with if (error) throw", () => {
  it.each([
    ["generate-accreditation-report", ACCRED_FILE] as const,
    ["generate-course-file", COURSE_FILE] as const,
  ])("%s guards its data selects so a future drift throws", (_label, file) => {
    const source = readFileSafe(file);
    const guardCount = countErrorThrowGuards(source);
    expect(guardCount).toBeGreaterThanOrEqual(MIN_ERROR_GUARDS);
  });
});

// ─── Property 2 (summary): the whole drift surface is repaired ────────────────
// A single roll-up assertion encoding the post-fix expectation across all surfaces. FAILS today.
describe("Property 2: Bug Condition — all enumerated schema-drift surfaces are repaired", () => {
  it("every isSchemaDriftBug surface queries the live column/scope after the fix", () => {
    fc.assert(
      fc.property(fc.constantFrom(...DRIFT_SURFACES), (surface) => {
        const source = readFileSafe(surface.file);
        expect(isSurfaceFixed(source, surface)).toBe(true);
      }),
      { numRuns: 100 }
    );
  });
});
