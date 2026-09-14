// Canonical PostHog event taxonomy for Edeviser.
// Every event name and property shape is defined here — never use raw strings.
// Events are captured through captureAnalyticsEvent() which enforces consent gating.
//
// Convention: snake_case event names, grouped by domain.
// Properties: always include role, institution_id where available.

// ─── Auth & Session ─────────────────────────────────────────────────
export const AnalyticsEvents = {
  // Auth
  LOGIN_SUCCEEDED: "login_succeeded",
  LOGIN_FAILED: "login_failed",
  SIGNUP_COMPLETED: "signup_completed",
  LOGOUT: "logout",

  // Onboarding
  ONBOARDING_COMPLETED: "onboarding_completed",
  TEACHER_ONBOARDING_STARTED: "teacher_onboarding_started",
  TEACHER_ONBOARDING_COMPLETED: "teacher_onboarding_completed",

  // ─── OBE / Outcomes ───────────────────────────────────────────────
  OUTCOME_CREATED: "outcome_created",
  OUTCOME_UPDATED: "outcome_updated",
  OUTCOME_DELETED: "outcome_deleted",
  OUTCOME_MAPPING_CREATED: "outcome_mapping_created",

  // ─── Assessment / Grading ─────────────────────────────────────────
  ASSIGNMENT_CREATED: "assignment_created",
  ASSIGNMENT_SUBMITTED: "assignment_submitted",
  GRADE_SUBMITTED: "grade_submitted",
  GRADE_VIEWED: "grade_viewed",
  QUIZ_CREATED: "quiz_created",
  QUIZ_STARTED: "adaptive_quiz_started",
  QUIZ_SUBMITTED: "adaptive_quiz_submitted",
  QUIZ_ATTEMPT_SUBMITTED: "quiz_attempt_submitted",

  // ─── Evidence / Attainment ────────────────────────────────────────
  EVIDENCE_CREATED: "evidence_created",
  ATTAINMENT_UPDATED: "attainment_updated",
  ACCREDITATION_PACK_GENERATED: "accreditation_pack_generated",

  // ─── AI / Intelligence ────────────────────────────────────────────
  AI_CALL_STARTED: "ai_call_started",
  AI_CALL_COMPLETED: "ai_call_completed",
  AI_CALL_FAILED: "ai_call_failed",
  TUTOR_MESSAGE_SENT: "tutor_message_sent",
  TUTOR_RESPONSE_RATED: "tutor_response_rated",
  AGENT_PROPOSAL_CREATED: "agent_proposal_created",
  AGENT_PROPOSAL_APPROVED: "agent_proposal_approved",
  AGENT_PROPOSAL_EXECUTED: "agent_proposal_executed",

  // ─── Habit / Learner State ────────────────────────────────────────
  HABIT_SIGNAL_RECORDED: "habit_signal_recorded",
  LEARNER_STATE_UPDATED: "learner_state_updated",
  STREAK_MILESTONE_SEEN: "streak_milestone_seen",

  // ─── Intervention ─────────────────────────────────────────────────
  INTERVENTION_PROPOSED: "intervention_proposed",
  INTERVENTION_APPROVED: "intervention_approved",
  INTERVENTION_STARTED: "intervention_started",
  INTERVENTION_COMPLETED: "intervention_completed",
  INTERVENTION_MEASURED: "intervention_measured",

  // ─── Gamification ─────────────────────────────────────────────────
  XP_AWARDED: "xp_awarded",
  BADGE_EARNED: "badge_earned",
  BADGE_VIEWED: "badge_viewed",
  LEADERBOARD_VIEWED: "leaderboard_viewed",
  PLANNER_TASK_COMPLETED: "planner_task_completed",

  // ─── Institution ──────────────────────────────────────────────────
  INSTITUTION_CREATED: "institution_created",
  INSTITUTION_CONFIGURED: "institution_configured",
  CURRICULUM_IMPORTED: "curriculum_imported",
  COURSE_CONFIGURED: "course_configured",

  // ─── Adoption / Engagement ────────────────────────────────────────
  TEACHER_FIRST_COURSE: "teacher_first_course",
  TEACHER_FIRST_GRADE: "teacher_first_grade",
  TEACHER_RETURNED: "teacher_returned",
  STUDENT_ACTIVATED: "student_activated",
  STUDENT_RETURNED: "student_returned",

  // ─── Chain Health ─────────────────────────────────────────────────
  CHAIN_LINK_BROKEN: "chain_link_broken",
  CHAIN_LINK_HEALTHY: "chain_link_healthy",

  // ─── Technical ────────────────────────────────────────────────────
  ROUTE_ERROR_SHOWN: "route_error_shown",
} as const;

export type AnalyticsEventName = (typeof AnalyticsEvents)[keyof typeof AnalyticsEvents];

// ─── Canonical event properties ─────────────────────────────────────
export interface AnalyticsEventProperties {
  // Standard context (added automatically where available)
  role?: string;
  institution_id?: string;
  course_id?: string;
  student_id?: string;
  program_id?: string;
  outcome_id?: string;
  assessment_id?: string;
  submission_id?: string;
  intervention_id?: string;
  agent_run_id?: string;

  // Event-specific
  score_percent?: number;
  outcome_type?: "ILO" | "PLO" | "CLO" | "SUB_CLO";
  ai_provider?: string;
  ai_model?: string;
  tokens_used?: number;
  latency_ms?: number;
  is_late?: boolean;
  is_published?: boolean;
  is_adaptive?: boolean;
  answer_count?: number;
  badge_count?: number;
  milestone_days?: number;
  eligible_count?: number;
  xp_awarded?: number;
  verification_required?: boolean;
  rating?: number;
  path?: string;

  [key: string]: string | number | boolean | undefined;
}