export const LEARNING_STATE_CALCULATION_VERSION =
  "student-learning-state/v1.0.0";
export const NEEDS_ATTENTION_TRIGGER_VERSION =
  "needs-attention/low-mastery-compounding-evidence/v1.0.0";
export const INTERVENTION_OUTCOME_VERSION =
  "intervention-outcome/mastery-delta/v1.0.0";

export type OperationalAutonomy = "A0" | "A1" | "A2" | "A3";
export type SubmissionPattern = "early" | "on_time" | "late" | "missed";
export type AttainmentTrend = "improving" | "declining" | "stagnant";
export type AttendanceFrequency = "low" | "medium" | "high" | "not_authorized";
export type HabitConsistency = "low" | "medium" | "high" | "not_authorized";

export interface LearningEvidence {
  institutionId: string;
  studentId: string;
  teacherId: string;
  courseId: string;
  cloId: string;
  cloTitle: string;
  masteryPercent: number;
  previousMasteryPercent: number | null;
  daysSinceLastLogin: number;
  submissionPattern: SubmissionPattern;
  attendanceFrequency: AttendanceFrequency;
  habitConsistency: HabitConsistency;
  upcomingDeadlineAt: string | null;
  observedAt: string;
  evidenceIds: string[];
}

export interface StudentLearningState {
  calculationVersion: typeof LEARNING_STATE_CALCULATION_VERSION;
  calculatedAt: string;
  institutionId: string;
  studentId: string;
  courseId: string;
  cloId: string;
  mastery: {
    percent: number;
    previousPercent: number | null;
    trend: AttainmentTrend;
  };
  behavior: {
    daysSinceLastLogin: number;
    submissionPattern: SubmissionPattern;
    attendanceFrequency: AttendanceFrequency;
    habitConsistency: HabitConsistency;
  };
  upcomingDeadlineAt: string | null;
  evidenceIds: string[];
  lastInterventionOutcome: InterventionOutcome | null;
}

export interface ContributingEvidence {
  key:
    | "mastery_below_target"
    | "mastery_declining"
    | "inactive_seven_days"
    | "late_or_missed_submissions"
    | "low_attendance"
    | "low_study_consistency";
  observedValue: string | number;
  threshold: string;
  source: string;
}

export interface NeedsAttentionTrigger {
  key: "low_mastery_with_compounding_evidence";
  version: typeof NEEDS_ATTENTION_TRIGGER_VERSION;
  triggeredAt: string;
  severity: "attention" | "urgent";
  contributingEvidence: ContributingEvidence[];
  recommendedNextAction: string;
  interventionDraft: string;
  evidenceFingerprint: string;
}

export interface InterventionOutcome {
  version: typeof INTERVENTION_OUTCOME_VERSION;
  evaluatedAt: string;
  baselineMasteryPercent: number;
  followUpMasteryPercent: number;
  masteryDelta: number;
  status: "effective" | "no_material_change" | "regressed";
  recommendedNextAction: string;
}

export interface RoleRoutingContext {
  parentSummaryAuthorized: boolean;
  recurringProgramPatternCount: number;
  evidenceQualityIssueCount: number;
}

export type ProactiveRoute =
  | "student_suggestion"
  | "teacher_needs_attention"
  | "parent_support_summary_candidate"
  | "coordinator_program_pattern_warning"
  | "admin_data_health_warning";

const autonomyRank: Record<OperationalAutonomy, number> = {
  A0: 0,
  A1: 1,
  A2: 2,
  A3: 3,
};

export function effectiveAutonomy(
  ceilings: OperationalAutonomy[]
): OperationalAutonomy {
  if (ceilings.length === 0) return "A0";
  return ceilings.reduce((lowest, level) =>
    autonomyRank[level] < autonomyRank[lowest] ? level : lowest
  );
}

export function mayCreateSuggestionOrDraft(
  autonomy: OperationalAutonomy,
  proactivePreferenceEnabled: boolean
): boolean {
  return proactivePreferenceEnabled && autonomyRank[autonomy] >= 1;
}

export function isProtectedAction(actionType: string): boolean {
  return new Set([
    "contact_person",
    "notify_parent_externally",
    "send_message",
    "send_email",
    "add_planner_session",
    "create_goal",
    "change_assignment",
    "change_deadline",
    "change_grade",
    "change_attendance",
    "change_outcome",
    "change_mapping",
    "assign_cqi",
    "modify_academic_record",
  ]).has(actionType);
}

function masteryTrend(
  current: number,
  previous: number | null
): AttainmentTrend {
  if (previous === null) return "stagnant";
  const delta = current - previous;
  if (delta >= 3) return "improving";
  if (delta <= -3) return "declining";
  return "stagnant";
}

export function recalculateStudentLearningState(
  evidence: LearningEvidence,
  lastInterventionOutcome: InterventionOutcome | null = null
): StudentLearningState {
  return {
    calculationVersion: LEARNING_STATE_CALCULATION_VERSION,
    calculatedAt: evidence.observedAt,
    institutionId: evidence.institutionId,
    studentId: evidence.studentId,
    courseId: evidence.courseId,
    cloId: evidence.cloId,
    mastery: {
      percent: evidence.masteryPercent,
      previousPercent: evidence.previousMasteryPercent,
      trend: masteryTrend(
        evidence.masteryPercent,
        evidence.previousMasteryPercent
      ),
    },
    behavior: {
      daysSinceLastLogin: evidence.daysSinceLastLogin,
      submissionPattern: evidence.submissionPattern,
      attendanceFrequency: evidence.attendanceFrequency,
      habitConsistency: evidence.habitConsistency,
    },
    upcomingDeadlineAt: evidence.upcomingDeadlineAt,
    evidenceIds: [...new Set(evidence.evidenceIds)].sort(),
    lastInterventionOutcome,
  };
}

function stateFingerprint(state: StudentLearningState): string {
  return [
    NEEDS_ATTENTION_TRIGGER_VERSION,
    state.institutionId,
    state.studentId,
    state.courseId,
    state.cloId,
    state.mastery.percent.toFixed(2),
    state.mastery.trend,
    state.behavior.daysSinceLastLogin,
    state.behavior.submissionPattern,
    state.behavior.attendanceFrequency,
    state.behavior.habitConsistency,
    state.upcomingDeadlineAt ?? "no-deadline",
    state.evidenceIds.join(","),
  ].join("|");
}

export function evaluateNeedsAttention(
  state: StudentLearningState
): NeedsAttentionTrigger | null {
  if (state.mastery.percent >= 60) return null;

  const contributingEvidence: ContributingEvidence[] = [
    {
      key: "mastery_below_target",
      observedValue: state.mastery.percent,
      threshold: "CLO mastery < 60%",
      source: "outcome_attainment",
    },
  ];

  if (state.mastery.trend === "declining") {
    contributingEvidence.push({
      key: "mastery_declining",
      observedValue: state.mastery.trend,
      threshold: "mastery delta <= -3 percentage points",
      source: "student_learning_state_history",
    });
  }
  if (state.behavior.daysSinceLastLogin >= 7) {
    contributingEvidence.push({
      key: "inactive_seven_days",
      observedValue: state.behavior.daysSinceLastLogin,
      threshold: "days since last login >= 7",
      source: "student_gamification",
    });
  }
  if (["late", "missed"].includes(state.behavior.submissionPattern)) {
    contributingEvidence.push({
      key: "late_or_missed_submissions",
      observedValue: state.behavior.submissionPattern,
      threshold: "recent submission pattern is late or missed",
      source: "submissions",
    });
  }
  if (state.behavior.attendanceFrequency === "low") {
    contributingEvidence.push({
      key: "low_attendance",
      observedValue: state.behavior.attendanceFrequency,
      threshold: "authorized attendance frequency < 65%",
      source: "attendance_records",
    });
  }
  if (state.behavior.habitConsistency === "low") {
    contributingEvidence.push({
      key: "low_study_consistency",
      observedValue: state.behavior.habitConsistency,
      threshold: "authorized study consistency is low",
      source: "habit_tracking",
    });
  }

  // Low mastery alone is not enough to escalate. A second observable signal is
  // required, which keeps the trigger deterministic and explainable.
  if (contributingEvidence.length < 2) return null;

  const severity =
    state.mastery.percent < 50 && contributingEvidence.length >= 3
      ? "urgent"
      : "attention";

  return {
    key: "low_mastery_with_compounding_evidence",
    version: NEEDS_ATTENTION_TRIGGER_VERSION,
    triggeredAt: state.calculatedAt,
    severity,
    contributingEvidence,
    recommendedNextAction:
      "Review the cited CLO evidence, then approve or revise the short recovery check-in.",
    interventionDraft:
      "Complete a focused 15-minute review of the weakest CLO concept, then answer one diagnostic question before the next deadline.",
    evidenceFingerprint: stateFingerprint(state),
  };
}

export function routeProactiveInsight(
  trigger: NeedsAttentionTrigger,
  context: RoleRoutingContext
): ProactiveRoute[] {
  const routes: ProactiveRoute[] = ["teacher_needs_attention"];

  // The student action is released only after the protected teacher contact is
  // approved. The route here describes the eventual approved destination.
  routes.push("student_suggestion");

  if (context.parentSummaryAuthorized && trigger.severity === "urgent") {
    routes.push("parent_support_summary_candidate");
  }
  if (context.recurringProgramPatternCount >= 3) {
    routes.push("coordinator_program_pattern_warning");
  }
  if (context.evidenceQualityIssueCount > 0) {
    routes.push("admin_data_health_warning");
  }
  return routes;
}

export function evaluateInterventionOutcome(
  baselineMasteryPercent: number,
  followUpMasteryPercent: number,
  evaluatedAt: string
): InterventionOutcome {
  const masteryDelta = Number(
    (followUpMasteryPercent - baselineMasteryPercent).toFixed(2)
  );
  const status =
    masteryDelta >= 5
      ? "effective"
      : masteryDelta <= -3
      ? "regressed"
      : "no_material_change";

  const recommendedNextAction =
    status === "effective"
      ? "Keep the successful support pattern and check retention at the next evidence point."
      : status === "regressed"
      ? "Teacher review is recommended before another student action is proposed."
      : "Revise the intervention draft using the latest evidence before repeating support.";

  return {
    version: INTERVENTION_OUTCOME_VERSION,
    evaluatedAt,
    baselineMasteryPercent,
    followUpMasteryPercent,
    masteryDelta,
    status,
    recommendedNextAction,
  };
}

export function applyInterventionOutcome(
  state: StudentLearningState,
  outcome: InterventionOutcome
): StudentLearningState {
  return {
    ...state,
    calculatedAt: outcome.evaluatedAt,
    mastery: {
      percent: outcome.followUpMasteryPercent,
      previousPercent: outcome.baselineMasteryPercent,
      trend: masteryTrend(
        outcome.followUpMasteryPercent,
        outcome.baselineMasteryPercent
      ),
    },
    lastInterventionOutcome: outcome,
  };
}
