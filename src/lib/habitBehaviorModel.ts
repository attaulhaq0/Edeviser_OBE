// =============================================================================
// habitBehaviorModel.ts — Phase 17: Full BJ Fogg Behavior Model
// B = MAP: Motivation + Ability + Prompt, all with observable tracking
// NEVER invents psychological states. Uses OBSERVED/INFERRED/CONFIGURED labels.
// =============================================================================

export type MotivationDriver = "sensation" | "anticipation" | "belonging";
export type AbilityFactor = "time" | "mental_effort" | "physical_effort" | "social_deviance" | "non_routine";
export type PromptType = "facilitator" | "spark" | "signal";
export type PromptTrigger = "time_of_day" | "after_login" | "after_submission" | "before_deadline" | "after_break" | "weekly_summary" | "streak_at_risk";
export type PromptChannel = "notification" | "email" | "in_app" | "calendar" | "teacher_nudge";
export type EvidenceSource = "observed" | "inferred" | "configured";

export type LearnerDimension =
  | "consistency" | "completion_rate" | "delay_pattern" | "recovery"
  | "goal_follow_through" | "engagement_frequency" | "session_regularization"
  | "reflection_depth" | "help_seeking" | "challenge_seeking";

export type AbilityIntervention =
  | "smaller_task" | "shorter_session" | "reduced_friction"
  | "guided_first_step" | "scaffold" | "provide_template" | "anchor_to_routine";

// ─── Behavior Definition ─────────────────────────────────────────────────────

export interface BehaviorDefinition {
  behaviorId: string; name: string; description: string;
  targetAction: string; triggerContext: string;
  frequency: "daily" | "weekly" | "per_session" | "per_assessment" | "on_demand";
  learnerDimension: LearnerDimension;
  outcomeRelevance: "direct" | "indirect" | "supportive" | "none";
  active: boolean; version: string;
  evidencePolicy: { eventType: string; countThreshold?: number; qualityScoring?: boolean };
}

// ─── Ability ─────────────────────────────────────────────────────────────────

export interface AbilityConfig {
  factors: AbilityFactor[];
  availableInterventions: AbilityIntervention[];
  activeIntervention?: AbilityIntervention;
}

export interface AbilityInterventionRecord {
  id: string; studentId: string; behaviorId: string;
  intervention: AbilityIntervention;
  appliedAt: string;
  /** Observable effect: did the student complete the behavior after intervention? */
  completedAfter: boolean;
  /** Time to completion after intervention (minutes) */
  completionLatencyMinutes?: number;
}

// ─── Prompt ──────────────────────────────────────────────────────────────────

export interface PromptConfig { type: PromptType; trigger: PromptTrigger; channel: PromptChannel; messageTemplate?: string; }

export interface PromptDeliveryRecord {
  id: string; behaviorId: string; studentId: string;
  config: PromptConfig;
  deliveredAt: string;
  responded: boolean; respondedAt?: string; latencyMinutes?: number;
}

// ─── Motivation ──────────────────────────────────────────────────────────────

export interface MotivationConfig {
  coreDrivers: MotivationDriver[];
  measurement: "engagement_frequency" | "completion_consistency" | "voluntary_extension" | "reflection_depth" | "goal_selection_ambition";
}

export interface MotivationProxy {
  studentId: string; behaviorId: string; source: EvidenceSource;
  engagementFrequency: number; voluntaryAttempts: number;
  followThroughRate: number; avgResponseMinutes: number; computedAt: string;
}

// ─── Full B=MAP Definition ──────────────────────────────────────────────────

export interface HabitBehaviorDefinition {
  behavior: BehaviorDefinition; motivation: MotivationConfig;
  ability: AbilityConfig; prompt: PromptConfig;
  measurement: "daily" | "weekly" | "per_session" | "per_assessment";
}

// ─── Default Behavior Catalog (Phase 17) ─────────────────────────────────────

export const DEFAULT_BEHAVIOR_CATALOG: HabitBehaviorDefinition[] = [
  {
    behavior: { behaviorId: "daily_login", name: "Daily Login", description: "Student logs in", targetAction: "Open Edeviser and sign in", triggerContext: "Start of study day", frequency: "daily", learnerDimension: "consistency", outcomeRelevance: "supportive", active: true, version: "2.0", evidencePolicy: { eventType: "login" } },
    motivation: { coreDrivers: ["anticipation"], measurement: "engagement_frequency" },
    ability: { factors: ["time", "mental_effort"], availableInterventions: ["reduced_friction", "anchor_to_routine"], activeIntervention: "anchor_to_routine" },
    prompt: { type: "signal", trigger: "time_of_day", channel: "notification", messageTemplate: "Good morning! Ready to learn today?" },
    measurement: "daily",
  },
  {
    behavior: { behaviorId: "complete_assessment", name: "Complete Assessment", description: "Submit assignments/quizzes", targetAction: "Work through and submit the assigned assessment", triggerContext: "Assessment deadline approaching", frequency: "per_assessment", learnerDimension: "completion_rate", outcomeRelevance: "direct", active: true, version: "2.0", evidencePolicy: { eventType: "submit" } },
    motivation: { coreDrivers: ["sensation", "anticipation"], measurement: "completion_consistency" },
    ability: { factors: ["mental_effort", "time"], availableInterventions: ["scaffold", "smaller_task", "guided_first_step"], activeIntervention: "scaffold" },
    prompt: { type: "facilitator", trigger: "before_deadline", channel: "in_app", messageTemplate: "Your assignment is due soon. Need help getting started?" },
    measurement: "per_assessment",
  },
  {
    behavior: { behaviorId: "journal_reflection", name: "Journal Reflection", description: "Write learning reflections", targetAction: "Open journal and write a brief reflection", triggerContext: "After completing an assessment or study session", frequency: "daily", learnerDimension: "reflection_depth", outcomeRelevance: "indirect", active: true, version: "2.0", evidencePolicy: { eventType: "journal", qualityScoring: true } },
    motivation: { coreDrivers: ["belonging"], measurement: "reflection_depth" },
    ability: { factors: ["mental_effort"], availableInterventions: ["provide_template", "guided_first_step"], activeIntervention: "provide_template" },
    prompt: { type: "spark", trigger: "after_submission", channel: "in_app", messageTemplate: "Great work! What did you learn from this?" },
    measurement: "daily",
  },
  {
    behavior: { behaviorId: "read_material", name: "Read Material", description: "Read assigned course content", targetAction: "Open and read the assigned material", triggerContext: "New material available", frequency: "daily", learnerDimension: "engagement_frequency", outcomeRelevance: "supportive", active: true, version: "2.0", evidencePolicy: { eventType: "read" } },
    motivation: { coreDrivers: ["anticipation"], measurement: "engagement_frequency" },
    ability: { factors: ["time", "mental_effort"], availableInterventions: ["shorter_session", "reduced_friction"], activeIntervention: "shorter_session" },
    prompt: { type: "signal", trigger: "weekly_summary", channel: "notification", messageTemplate: "New material is ready for you to explore!" },
    measurement: "daily",
  },
  {
    behavior: { behaviorId: "study_session", name: "Focused Study", description: "Complete a focused study session", targetAction: "Start a focus timer and study without interruption", triggerContext: "Planned study time", frequency: "per_session", learnerDimension: "session_regularization", outcomeRelevance: "indirect", active: true, version: "2.0", evidencePolicy: { eventType: "study_session" } },
    motivation: { coreDrivers: ["anticipation"], measurement: "engagement_frequency" },
    ability: { factors: ["time", "mental_effort"], availableInterventions: ["shorter_session", "anchor_to_routine"], activeIntervention: "shorter_session" },
    prompt: { type: "facilitator", trigger: "time_of_day", channel: "calendar", messageTemplate: "Time for your study session!" },
    measurement: "per_session",
  },
  {
    behavior: { behaviorId: "goal_setting", name: "Set Goals", description: "Set weekly learning goals", targetAction: "Define 1-3 learning goals for the week", triggerContext: "Start of week", frequency: "weekly", learnerDimension: "goal_follow_through", outcomeRelevance: "supportive", active: true, version: "2.0", evidencePolicy: { eventType: "weekly_goal", countThreshold: 1 } },
    motivation: { coreDrivers: ["sensation", "anticipation"], measurement: "goal_selection_ambition" },
    ability: { factors: ["mental_effort"], availableInterventions: ["provide_template", "guided_first_step"], activeIntervention: "provide_template" },
    prompt: { type: "spark", trigger: "weekly_summary", channel: "in_app", messageTemplate: "What do you want to achieve this week?" },
    measurement: "weekly",
  },
];

// ─── Gamification Separation Boundary ────────────────────────────────────────
// XP, badges, streaks, leaderboards, rewards = GAMIFICATION (separate domain)
// Habit signals, dimensions, motivation proxies = HABIT INTELLIGENCE (this module)
// Gamification encourages behavior; Habit Intelligence diagnoses it.
// NEVER conflate XP/streaks with academic evidence or attainment.