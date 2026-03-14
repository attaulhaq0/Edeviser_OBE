// =============================================================================
// XP Schedule Constants — Base XP amounts per source
// =============================================================================

import type { XPSource } from '@/types/app';

/**
 * Base XP amounts awarded per trigger source.
 * The Edge Function applies bonus multipliers server-side.
 * Sources with 0 XP have variable amounts set at call time.
 */
export const XP_SCHEDULE: Record<XPSource, number> = {
  login: 10,
  submission: 25,
  grade: 15,
  journal: 20,
  streak_milestone: 50,
  perfect_day: 50,
  first_attempt_bonus: 10,
  perfect_rubric: 75,
  badge_earned: 0,
  level_up: 0,
  streak_freeze_purchase: 0,
  discussion_question: 10,
  discussion_answer: 15,
  survey_completion: 15,
  quiz_completion: 50,
  onboarding_personality: 25,
  onboarding_learning_style: 25,
  onboarding_baseline: 20,
  onboarding_complete: 50,
  onboarding_self_efficacy: 25,
  onboarding_study_strategy: 25,
  micro_assessment: 10,
  profile_complete: 30,
  starter_session_complete: 15,
};

/** XP awarded for late submissions (assignment or quiz) */
export const LATE_SUBMISSION_XP = 15;

/** XP awarded for late quiz completion */
export const LATE_QUIZ_XP = 15;
