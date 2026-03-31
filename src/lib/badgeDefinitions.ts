// Badge definitions for the Edeviser gamification engine.
// All badge conditions are defined here as a single source of truth.
// Mystery badge conditions are checked server-side only — never expose to client.

export type BadgeCategory = 'streak' | 'academic' | 'engagement' | 'mystery' | 'habit' | 'blooms' | 'team';

export interface BadgeDef {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: BadgeCategory;
  isMystery: boolean;
  condition: string; // human-readable condition description (hidden for mystery badges)
  xpReward: number; // XP awarded when badge is earned
}

export const BADGE_DEFINITIONS: BadgeDef[] = [
  // ── Streak badges ───────────────────────────────────────────────────────
  {
    id: 'streak_7',
    name: '7-Day Warrior',
    description: '7-day login streak',
    icon: '🔥',
    category: 'streak',
    isMystery: false,
    condition: 'Login for 7 consecutive days',
    xpReward: 50,
  },
  {
    id: 'streak_14',
    name: 'Fortnight Fighter',
    description: '14-day login streak',
    icon: '🔥',
    category: 'streak',
    isMystery: false,
    condition: 'Login for 14 consecutive days',
    xpReward: 75,
  },
  {
    id: 'streak_30',
    name: '30-Day Legend',
    description: '30-day login streak',
    icon: '🔥',
    category: 'streak',
    isMystery: false,
    condition: 'Login for 30 consecutive days',
    xpReward: 100,
  },
  {
    id: 'streak_60',
    name: 'Dedication King',
    description: '60-day login streak',
    icon: '👑',
    category: 'streak',
    isMystery: false,
    condition: 'Login for 60 consecutive days',
    xpReward: 150,
  },
  {
    id: 'streak_100',
    name: 'Century Legend',
    description: '100-day login streak',
    icon: '🏆',
    category: 'streak',
    isMystery: false,
    condition: 'Login for 100 consecutive days',
    xpReward: 250,
  },

  // ── Academic badges ─────────────────────────────────────────────────────
  {
    id: 'first_submission',
    name: 'First Steps',
    description: 'Submit your first assignment',
    icon: '📝',
    category: 'academic',
    isMystery: false,
    condition: 'Submit 1 assignment',
    xpReward: 25,
  },
  {
    id: 'perfect_score',
    name: 'Flawless',
    description: 'Score 100% on a rubric',
    icon: '💯',
    category: 'academic',
    isMystery: false,
    condition: 'Score 100% on all rubric criteria',
    xpReward: 75,
  },
  {
    id: 'all_clos_met',
    name: 'Outcome Achiever',
    description: 'Meet all CLOs in a course',
    icon: '🎯',
    category: 'academic',
    isMystery: false,
    condition: 'Achieve ≥70% on all CLOs in a course',
    xpReward: 100,
  },

  // ── Engagement badges ───────────────────────────────────────────────────
  {
    id: 'journal_10',
    name: 'Reflective Mind',
    description: 'Write 10 journal entries',
    icon: '📖',
    category: 'engagement',
    isMystery: false,
    condition: 'Write 10 journal entries',
    xpReward: 50,
  },
  {
    id: 'perfect_week',
    name: 'Perfect Week',
    description: 'Complete all habits for 7 days',
    icon: '⭐',
    category: 'engagement',
    isMystery: false,
    condition: 'Complete all 4 daily habits for 7 consecutive days',
    xpReward: 100,
  },
  {
    id: 'perfect_attendance_week',
    name: 'Perfect Attendance Week',
    description: 'Present for all sessions in a 7-day period',
    icon: '📋',
    category: 'engagement',
    isMystery: false,
    condition: 'Marked present for all class sessions within a 7-day period',
    xpReward: 75,
  },
  {
    id: 'quiz_master',
    name: 'Quiz Master',
    description: 'Complete 10 quizzes',
    icon: '🧠',
    category: 'engagement',
    isMystery: false,
    condition: 'Complete 10 quiz attempts',
    xpReward: 100,
  },
  {
    id: 'discussion_helper',
    name: 'Discussion Helper',
    description: 'Have 5 answers marked correct in discussions',
    icon: '💬',
    category: 'engagement',
    isMystery: false,
    condition: '5 discussion replies marked as correct answer by teacher',
    xpReward: 75,
  },
  {
    id: 'survey_completer',
    name: 'Survey Completer',
    description: 'Complete 3 surveys',
    icon: '📊',
    category: 'engagement',
    isMystery: false,
    condition: 'Submit responses to 3 different surveys',
    xpReward: 50,
  },

  // ── Onboarding badges ────────────────────────────────────────────────────
  {
    id: 'self_aware_scholar',
    name: 'Self-Aware Scholar',
    description: 'Complete personality, learning style, and baseline assessments',
    icon: '🔬',
    category: 'engagement',
    isMystery: false,
    condition: 'Complete all three assessment sections (personality, learning style, and at least one baseline test)',
    xpReward: 50,
  },
  {
    id: 'thorough_explorer',
    name: 'Thorough Explorer',
    description: 'Complete onboarding without skipping any section',
    icon: '🧭',
    category: 'engagement',
    isMystery: false,
    condition: 'Complete onboarding without skipping any assessment section',
    xpReward: 75,
  },

  // ── Habit badges ──────────────────────────────────────────────────────────
  {
    id: 'habit_master',
    name: 'Habit Master',
    description: 'Completed at least one habit on 30+ days this semester',
    icon: '🏆',
    category: 'habit',
    isMystery: false,
    condition: '30+ active habit days in a semester',
    xpReward: 100,
  },
  {
    id: 'wellness_warrior',
    name: 'Wellness Warrior',
    description: 'Logged wellness habits for 14 consecutive days',
    icon: '🧘',
    category: 'habit',
    isMystery: false,
    condition: '14 consecutive days with ≥1 wellness habit',
    xpReward: 75,
  },
  {
    id: 'full_spectrum',
    name: 'Full Spectrum',
    description: 'Completed all academic and wellness habits on 7 days',
    icon: '🌈',
    category: 'habit',
    isMystery: false,
    condition: '7 days with all 4 academic + ≥1 wellness habit',
    xpReward: 150,
  },

  // ── Bloom's Progression badges ──────────────────────────────────────────
  {
    id: 'bloom_explorer',
    name: "Bloom's Explorer",
    description: 'Reached Bloom\'s level 4 (Analyzing) on any CLO',
    icon: '🌱',
    category: 'blooms',
    isMystery: false,
    condition: 'Reach highest_bloom_level >= 4 on any CLO via adaptive quiz',
    xpReward: 75,
  },
  {
    id: 'bloom_challenger',
    name: "Bloom's Challenger",
    description: 'Reached Bloom\'s level 5 (Evaluating) on any CLO',
    icon: '🌿',
    category: 'blooms',
    isMystery: false,
    condition: 'Reach highest_bloom_level >= 5 on any CLO via adaptive quiz',
    xpReward: 100,
  },
  {
    id: 'bloom_pioneer',
    name: "Bloom's Pioneer",
    description: 'Reached Bloom\'s level 6 (Creating) on any CLO',
    icon: '🌳',
    category: 'blooms',
    isMystery: false,
    condition: 'Reach highest_bloom_level >= 6 on any CLO via adaptive quiz',
    xpReward: 150,
  },

  // ── Team badges ────────────────────────────────────────────────────────
  {
    id: 'team_spirit',
    name: 'Team Spirit',
    description: 'Team earned 500 XP together',
    icon: '🤝',
    category: 'team',
    isMystery: false,
    condition: 'Team earns 500 XP collectively',
    xpReward: 100,
  },
  {
    id: 'unstoppable',
    name: 'Unstoppable',
    description: 'Team won 3 challenges',
    icon: '💪',
    category: 'team',
    isMystery: false,
    condition: 'Team wins 3 challenges',
    xpReward: 150,
  },
  {
    id: 'dream_team',
    name: 'Dream Team',
    description: 'All members completed a Perfect Day on the same day',
    icon: '⭐',
    category: 'team',
    isMystery: false,
    condition: 'All team members complete all 4 daily habits on the same day',
    xpReward: 200,
  },
  {
    id: 'study_squad',
    name: 'Study Squad',
    description: 'Team maintained a 7-day streak',
    icon: '📚',
    category: 'team',
    isMystery: false,
    condition: 'Team maintains a 7-day team streak',
    xpReward: 100,
  },

  // ── Mystery badges (hidden conditions) ──────────────────────────────────
  {
    id: 'speed_demon',
    name: 'Speed Demon',
    description: '???',
    icon: '⚡',
    category: 'mystery',
    isMystery: true,
    condition: 'Submit an assignment within 1 hour of it being published',
    xpReward: 75,
  },
  {
    id: 'night_owl',
    name: 'Night Owl',
    description: '???',
    icon: '🦉',
    category: 'mystery',
    isMystery: true,
    condition: 'Submit 3 assignments between midnight and 5 AM',
    xpReward: 75,
  },
  {
    id: 'perfectionist',
    name: 'Perfectionist',
    description: '???',
    icon: '💎',
    category: 'mystery',
    isMystery: true,
    condition: 'Score 100% on 5 different assignments',
    xpReward: 100,
  },
];

/** Get a badge definition by ID */
export function getBadgeById(id: string): BadgeDef | undefined {
  return BADGE_DEFINITIONS.find((b) => b.id === id);
}

/** Get all badge IDs */
export function getAllBadgeIds(): string[] {
  return BADGE_DEFINITIONS.map((b) => b.id);
}

/** Get badges by category */
export function getBadgesByCategory(category: BadgeCategory): BadgeDef[] {
  return BADGE_DEFINITIONS.filter((b) => b.category === category);
}

/** Get only mystery badges */
export function getMysteryBadges(): BadgeDef[] {
  return BADGE_DEFINITIONS.filter((b) => b.isMystery);
}

/** Get only visible (non-mystery) badges */
export function getVisibleBadges(): BadgeDef[] {
  return BADGE_DEFINITIONS.filter((b) => !b.isMystery);
}
