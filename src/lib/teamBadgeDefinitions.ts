// =============================================================================
// Team Badge Definitions — All team badge definitions for the gamification engine
// Task 1.9: 6 team badges + "Team Player" badge
// =============================================================================

import type { BadgeDef } from '@/lib/badgeDefinitions';

export interface TeamBadgeDef {
  id: string;
  name: string;
  description: string;
  icon: string;
  condition: string;
  xpReward: number;
  /** Milestone value that triggers this badge (e.g., streak count, XP threshold) */
  threshold?: number;
}

/**
 * Team badge definitions — collective achievements earned by the team.
 * Stored in `team_badges` table with idempotent award logic (unique on team_id + badge_key).
 */
export const TEAM_BADGE_DEFINITIONS: TeamBadgeDef[] = [
  // ── XP milestone ────────────────────────────────────────────────────────
  {
    id: 'team_spirit',
    name: 'Team Spirit',
    description: 'Team earned 500 XP together',
    icon: '🤝',
    condition: 'Team earns 500 XP collectively',
    xpReward: 100,
    threshold: 500,
  },

  // ── Streak milestones ───────────────────────────────────────────────────
  {
    id: 'streak_squad',
    name: 'Streak Squad',
    description: 'Team maintained a 7-day streak',
    icon: '📚',
    condition: 'At least one team member completes a habit for 7 consecutive days',
    xpReward: 100,
    threshold: 7,
  },
  {
    id: 'streak_champions',
    name: 'Streak Champions',
    description: 'Team maintained a 14-day streak',
    icon: '🏅',
    condition: 'At least one team member completes a habit for 14 consecutive days',
    xpReward: 200,
    threshold: 14,
  },
  {
    id: 'streak_legends',
    name: 'Streak Legends',
    description: 'Team maintained a 30-day streak',
    icon: '👑',
    condition: 'At least one team member completes a habit for 30 consecutive days',
    xpReward: 400,
    threshold: 30,
  },

  // ── Perfect Day ─────────────────────────────────────────────────────────
  {
    id: 'full_house',
    name: 'Full House',
    description: 'All members completed a Perfect Day on the same day',
    icon: '⭐',
    condition: 'All active team members complete all 4 daily habits on the same calendar day',
    xpReward: 200,
  },

  // ── Challenge wins ──────────────────────────────────────────────────────
  {
    id: 'quest_conquerors',
    name: 'Quest Conquerors',
    description: 'Team completed 3 social challenges',
    icon: '🏆',
    condition: 'Team completes 3 social challenges (any type)',
    xpReward: 300,
    threshold: 3,
  },
];

/**
 * "Team Player" individual badge — awarded to students who maintain active
 * contribution status for 14+ consecutive days on their team.
 * This is an individual badge (stored in `badges` table), not a team badge.
 */
export const TEAM_PLAYER_BADGE: BadgeDef = {
  id: 'team_player',
  name: 'Team Player',
  description: 'Maintained active contribution status for 14+ consecutive days',
  icon: '🤝',
  category: 'team',
  isMystery: false,
  condition: 'Maintain "active" contribution status on your team for 14 or more consecutive days',
  xpReward: 100,
};

/** All team badge IDs */
export const TEAM_BADGE_IDS = TEAM_BADGE_DEFINITIONS.map((b) => b.id);

/** Streak milestone badge IDs mapped to their streak threshold */
export const STREAK_BADGE_MAP: Record<number, string> = {
  7: 'streak_squad',
  14: 'streak_champions',
  30: 'streak_legends',
};

/** Get a team badge definition by ID */
export function getTeamBadgeById(id: string): TeamBadgeDef | undefined {
  return TEAM_BADGE_DEFINITIONS.find((b) => b.id === id);
}
