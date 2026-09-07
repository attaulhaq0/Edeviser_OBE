// =============================================================================
// 8.9-QA decision-stack contract tests — Q2 / Q3 / Q6 / Q7 (SQL contracts)
//
// Feature: continuous-verification — 8.9-QA (ONE test per decision question)
// These pin the DETERMINISTIC SQL contracts of the decision stack, following
// the established migration-contract pattern (agenticMigrationContracts.test.ts):
//   Q2 why-is-it-failing:  the classifier's 5-class rules + thresholds
//   Q3 who-is-affected:    per-section variance scoping in the classifier
//   Q5 who-performs:       the exact cause → owner routing CASE map
//   Q6 did-it-work:        intervention measurement delta thresholds
//   Q7 change-curriculum:  CQI pattern reopen/resolved feedback loop
// Live verification of these behaviors is recorded in the spec README
// (session L/M) per the Live-State Verification Rule; these tests pin the
// replayed chain so drift fails fast.
// =============================================================================

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// The canonical (replay-winning) classifier definition — the forward fix
// migration re-asserts the full function including ownership routing.
const classifierSql = readFileSync(
  "supabase/migrations/20260907180347_fix_problem_case_section_spread_alias.sql",
  "utf8"
);
const measurementSql = readFileSync(
  "supabase/migrations/20260830000001_create_intervention_measurements.sql",
  "utf8"
);
const cqiFeedbackSql = readFileSync(
  "supabase/migrations/20260830000005_cqi_deterministic_measurement_feedback.sql",
  "utf8"
);

describe("8.9-QA Q2 — why is it failing (classification rules)", () => {
  it("classifies whole-cohort failure (<50) as curriculum-design", () => {
    expect(classifierSql).toMatch(
      /ELSIF v_case\.clo_avg < 50 THEN[\s\S]*curriculum-design-signal/
    );
  });

  it("classifies missing assessment coverage as assessment-signal (0.9)", () => {
    expect(classifierSql).toMatch(
      /IF NOT v_case\.has_assessment THEN[\s\S]*'assessment-signal'[\s\S]*v_confidence := 0\.9/
    );
  });

  it("checks teacher/prerequisite/student sub-signals in the <70 band", () => {
    const belowBand = classifierSql.match(
      /ELSIF v_case\.clo_avg < 70 THEN([\s\S]*?)v_dominant := v_problem_types\[1\];/
    );
    expect(belowBand).toBeTruthy();
    const band = belowBand![1];
    expect(band).toContain("'teacher-signal'");
    expect(band).toContain("'prerequisite-signal'");
    expect(band).toContain("'student-signal'");
  });

  it("emits an early-warning student-signal for strong CLOs with strugglers", () => {
    expect(classifierSql).toMatch(
      /ELSE[\s\S]*CLO performing well[\s\S]*'student-signal'[\s\S]*v_confidence := 0\.5/
    );
  });
});

describe("8.9-QA Q3 — who is affected (section scoping)", () => {
  it("scopes variance detection per section (min/max section averages)", () => {
    expect(classifierSql).toContain("max_section_avg");
    expect(classifierSql).toContain("min_section_avg");
    expect(classifierSql).toMatch(/GROUP BY sc2\.section_id/);
  });

  it("flags teacher-signal only above the 20pp cross-section spread", () => {
    expect(classifierSql).toMatch(
      /max_section_avg - v_case\.min_section_avg\) > 20/
    );
  });

  it("computes the course-level section spread", () => {
    expect(classifierSql).toMatch(
      /SELECT max\(sec_avg\) - min\(sec_avg\) INTO v_section_spread/
    );
  });
});

describe("8.9-QA Q5 — who performs it (routing contract)", () => {
  it("routes each dominant cause to exactly one owner", () => {
    expect(classifierSql).toMatch(
      /WHEN 'student-signal' THEN 'student_support'/
    );
    expect(classifierSql).toMatch(/WHEN 'teacher-signal' THEN 'coordinator'/);
    expect(classifierSql).toMatch(/WHEN 'assessment-signal' THEN 'teacher'/);
    expect(classifierSql).toMatch(/WHEN 'prerequisite-signal' THEN 'teacher'/);
    expect(classifierSql).toMatch(
      /WHEN 'curriculum-design-signal' THEN 'coordinator'/
    );
  });

  it("routing derives from the dominant cause only — never from AI", () => {
    expect(classifierSql).toMatch(
      /Routed from the DOMINANT cause only; never from AI output\./
    );
  });
});

describe("8.9-QA Q6 — did it work (deterministic delta)", () => {
  it("uses the ±5pp material-change thresholds", () => {
    expect(measurementSql).toMatch(
      /WHEN p_post_action_metric - baseline_metric >= 5 THEN 'IMPROVED'/
    );
    expect(measurementSql).toMatch(
      /WHEN p_post_action_metric - baseline_metric <= -5 THEN 'DECLINED'/
    );
    expect(measurementSql).toMatch(/ELSE 'NO_MATERIAL_CHANGE'/);
  });

  it("gates on evidence sufficiency (INSUFFICIENT_EVIDENCE state exists)", () => {
    expect(measurementSql).toContain("'INSUFFICIENT_EVIDENCE'");
    expect(measurementSql).toMatch(
      /evidence_sufficiency text NOT NULL DEFAULT 'pending'/
    );
  });
});

describe("8.9-QA Q7 — should we change the curriculum (CQI feedback)", () => {
  it("reopens CQI patterns on DECLINED / NO_MATERIAL_CHANGE, resolves on IMPROVED", () => {
    expect(cqiFeedbackSql).toMatch(/WHEN v_state = 'IMPROVED' THEN 'resolved'/);
    expect(cqiFeedbackSql).toMatch(
      /WHEN v_state IN \('DECLINED', 'NO_MATERIAL_CHANGE'\) THEN 'reopened'/
    );
  });
});
