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
};

/** XP awarded for late submissions (assignment or quiz) */
export const LATE_SUBMISSION_XP = 15;

/** XP awarded for late quiz completion */
export const LATE_QUIZ_XP = 15;
