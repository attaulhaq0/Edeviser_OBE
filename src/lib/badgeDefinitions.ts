// Badge definitions for the Edeviser gamification engine.
// All badge conditions are defined here as a single source of truth.
// Mystery badge conditions are checked server-side only — never expose to client.

export type BadgeCategory = 'streak' | 'academic' | 'engagement' | 'mystery';

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
