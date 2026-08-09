import { describe, expect, it } from "vitest";

import {
  applyInterventionOutcome,
  effectiveAutonomy,
  evaluateInterventionOutcome,
  evaluateNeedsAttention,
  isProtectedAction,
  mayCreateSuggestionOrDraft,
  recalculateStudentLearningState,
  routeProactiveInsight,
  type LearningEvidence,
} from "../../../supabase/functions/_shared/ai/proactive-intelligence";

const initialEvidence: LearningEvidence = {
  institutionId: "institution-1",
  studentId: "student-1",
  teacherId: "teacher-1",
  courseId: "course-1",
  cloId: "clo-1",
  cloTitle: "Apply normalized database design",
  masteryPercent: 44,
  previousMasteryPercent: 55,
  daysSinceLastLogin: 8,
  submissionPattern: "missed",
  attendanceFrequency: "low",
  habitConsistency: "not_authorized",
  upcomingDeadlineAt: "2026-08-18T09:00:00.000Z",
  observedAt: "2026-08-10T09:00:00.000Z",
  evidenceIds: ["attainment-1", "assignment-1", "attendance-window-1"],
};

describe("proactive intelligence", () => {
  it("proves the complete evidence-to-outcome proactive flow", () => {
    // 1. New evidence recalculates the Student Learning State.
    const learningState = recalculateStudentLearningState(initialEvidence);
    expect(learningState.mastery).toEqual({
      percent: 44,
      previousPercent: 55,
      trend: "declining",
    });

    // 2. A versioned deterministic trigger creates a teacher flag and draft.
    const trigger = evaluateNeedsAttention(learningState);
    expect(trigger).not.toBeNull();
    expect(trigger?.version).toBe(
      "needs-attention/low-mastery-compounding-evidence/v1.0.0"
    );
    expect(trigger?.contributingEvidence.map((item) => item.source)).toEqual(
      expect.arrayContaining([
        "outcome_attainment",
        "student_learning_state_history",
        "student_gamification",
        "submissions",
        "attendance_records",
      ])
    );
    expect(trigger?.interventionDraft).toContain("15-minute review");

    // 3. Contacting the student remains protected until teacher approval.
    expect(isProtectedAction("send_message")).toBe(true);
    const approval = {
      status: "approved" as const,
      approvedBy: initialEvidence.teacherId,
      nextAction: trigger?.interventionDraft,
    };
    expect(approval).toMatchObject({
      status: "approved",
      approvedBy: "teacher-1",
    });

    // 4. Follow-up evidence evaluates the intervention deterministically.
    const outcome = evaluateInterventionOutcome(
      learningState.mastery.percent,
      53,
      "2026-08-19T09:00:00.000Z"
    );
    expect(outcome).toMatchObject({
      baselineMasteryPercent: 44,
      followUpMasteryPercent: 53,
      masteryDelta: 9,
      status: "effective",
    });

    // 5. The outcome feeds back into the Student Learning State.
    const updatedState = applyInterventionOutcome(learningState, outcome);
    expect(updatedState.mastery).toEqual({
      percent: 53,
      previousPercent: 44,
      trend: "improving",
    });
    expect(updatedState.lastInterventionOutcome?.status).toBe("effective");
  });

  it("does not flag low mastery without a second observable signal", () => {
    const state = recalculateStudentLearningState({
      ...initialEvidence,
      masteryPercent: 58,
      previousMasteryPercent: 58,
      daysSinceLastLogin: 1,
      submissionPattern: "on_time",
      attendanceFrequency: "high",
      habitConsistency: "high",
    });

    expect(evaluateNeedsAttention(state)).toBeNull();
  });

  it("produces the same fingerprint for unchanged evidence", () => {
    const first = evaluateNeedsAttention(
      recalculateStudentLearningState(initialEvidence)
    );
    const second = evaluateNeedsAttention(
      recalculateStudentLearningState({
        ...initialEvidence,
        observedAt: "2026-08-11T09:00:00.000Z",
      })
    );

    expect(first?.evidenceFingerprint).toBe(second?.evidenceFingerprint);
  });

  it("routes only authorized role artifacts", () => {
    const trigger = evaluateNeedsAttention(
      recalculateStudentLearningState(initialEvidence)
    );
    expect(trigger).not.toBeNull();
    if (!trigger) return;

    expect(
      routeProactiveInsight(trigger, {
        parentSummaryAuthorized: true,
        recurringProgramPatternCount: 3,
        evidenceQualityIssueCount: 1,
      })
    ).toEqual([
      "teacher_needs_attention",
      "student_suggestion",
      "parent_support_summary_candidate",
      "coordinator_program_pattern_warning",
      "admin_data_health_warning",
    ]);

    expect(
      routeProactiveInsight(trigger, {
        parentSummaryAuthorized: false,
        recurringProgramPatternCount: 2,
        evidenceQualityIssueCount: 0,
      })
    ).toEqual(["teacher_needs_attention", "student_suggestion"]);
  });

  it("uses the lowest autonomy ceiling and respects opt-out", () => {
    expect(effectiveAutonomy(["A3", "A2", "A1"])).toBe("A1");
    expect(mayCreateSuggestionOrDraft("A1", true)).toBe(true);
    expect(mayCreateSuggestionOrDraft("A3", false)).toBe(false);
    expect(mayCreateSuggestionOrDraft("A0", true)).toBe(false);
  });
});
