// ── Onboarding Step Definitions ──────────────────────────────────────

export const ONBOARDING_STEPS = [
  'welcome',
  'personality',
  'self_efficacy',
  'learning_style',
  'study_strategy',
  'baseline_select',
  'baseline_test',
  'summary',
] as const;

export type OnboardingStepId = (typeof ONBOARDING_STEPS)[number];

export const DAY1_STEPS = [
  'welcome',
  'personality',
  'self_efficacy',
  'summary',
] as const;

export type Day1StepId = (typeof DAY1_STEPS)[number];

export const DAY1_PERSONALITY_COUNT = 3; // 1 openness, 1 conscientiousness, 1 extraversion
export const DAY1_SELF_EFFICACY_COUNT = 2; // 1 general_academic, 1 self_regulated_learning

// ── XP Awards ────────────────────────────────────────────────────────

export const ONBOARDING_XP = {
  personality: 25,
  learning_style: 25,
  self_efficacy: 25,
  study_strategy: 25,
  baseline_per_course: 20,
  complete: 50,
  micro_assessment: 10,
  profile_complete: 30,
  starter_session_complete: 15,
} as const;

// ── Cooldown ─────────────────────────────────────────────────────────

export const REASSESSMENT_COOLDOWN_DAYS = 90;

// ── Big Five Labels ──────────────────────────────────────────────────

export const BIG_FIVE_LABELS = {
  openness: 'Openness',
  conscientiousness: 'Conscientiousness',
  extraversion: 'Extraversion',
  agreeableness: 'Agreeableness',
  neuroticism: 'Neuroticism',
} as const;

// ── VARK Descriptions ────────────────────────────────────────────────

export const VARK_DESCRIPTIONS = {
  visual: {
    label: 'Visual Learner',
    description:
      'You learn best through diagrams, charts, and spatial understanding',
    icon: 'Eye',
  },
  auditory: {
    label: 'Auditory Learner',
    description:
      'You learn best through listening, discussions, and verbal explanations',
    icon: 'Headphones',
  },
  read_write: {
    label: 'Read/Write Learner',
    description:
      'You learn best through reading and writing activities',
    icon: 'BookOpen',
  },
  kinesthetic: {
    label: 'Kinesthetic Learner',
    description:
      'You learn best through hands-on experience and practice',
    icon: 'Hand',
  },
  multimodal: {
    label: 'Multimodal Learner',
    description:
      'You learn effectively through multiple modalities',
    icon: 'Layers',
  },
} as const;

// ── Micro-Assessment Schedule ────────────────────────────────────────

/** Maps day number (2–14) to the assessment type delivered that day. */
export const MICRO_ASSESSMENT_SCHEDULE: Record<number, string> = {
  2: 'personality',
  3: 'personality',
  4: 'self_efficacy',
  5: 'personality',
  6: 'study_strategy',
  7: 'study_strategy',
  8: 'personality',
  9: 'learning_style',
  10: 'learning_style',
  11: 'self_efficacy',
  12: 'learning_style',
  13: 'learning_style',
  14: 'personality',
};

export const MAX_MICRO_DISMISSALS = 3;

// ── Goal Difficulty Thresholds ───────────────────────────────────────

/** Cohort completion rate thresholds: >= 80% = easy, >= 50% = moderate, < 50% = ambitious */
export const GOAL_DIFFICULTY_THRESHOLDS = {
  easy: 80,
  moderate: 50,
} as const;

// ── Starter Session Duration Tiers ───────────────────────────────────

export const STARTER_SESSION_TIERS = {
  low: { sessions: 5, duration: 25 },
  moderate: { sessions: 4, duration: 35 },
  high: { sessions: 3, duration: 45 },
} as const;

export const SELF_EFFICACY_TIER_THRESHOLDS = {
  low: 40,
  moderate: 70,
} as const; // < 40 = low, 40-70 = moderate, > 70 = high

// ── Profiling Dimensions ─────────────────────────────────────────────

export const PROFILING_DIMENSIONS = [
  'personality',
  'self_efficacy',
  'study_strategy',
  'learning_style',
  'baseline',
] as const;

export type ProfilingDimension = (typeof PROFILING_DIMENSIONS)[number];
