// =============================================================================
// Team Badge Checker — Pure functions for team badge eligibility
// =============================================================================

export interface TeamBadgeState {
  xp_total: number;
  challenge_wins: number;
  all_members_perfect_day: boolean;
  team_streak_current: number;
}

export type TeamBadgeId = 'team_spirit' | 'unstoppable' | 'dream_team' | 'study_squad';

export interface TeamBadgeResult {
  badge_id: TeamBadgeId;
  eligible: boolean;
}

export const TEAM_BADGE_CONDITIONS: Record<TeamBadgeId, (state: TeamBadgeState) => boolean> = {
  team_spirit: (state) => state.xp_total >= 500,
  unstoppable: (state) => state.challenge_wins >= 3,
  dream_team: (state) => state.all_members_perfect_day,
  study_squad: (state) => state.team_streak_current >= 7,
};

/**
 * Check which team badges a team is eligible for, excluding already-earned badges.
 * Returns only NEW badges that should be awarded.
 */
export function checkTeamBadgeEligibility(
  state: TeamBadgeState,
  alreadyEarned: Set<string>,
): TeamBadgeResult[] {
  const results: TeamBadgeResult[] = [];

  for (const [badgeId, condition] of Object.entries(TEAM_BADGE_CONDITIONS)) {
    const id = badgeId as TeamBadgeId;
    const eligible = condition(state) && !alreadyEarned.has(id);
    results.push({ badge_id: id, eligible });
  }

  return results;
}

/**
 * Simulate awarding badges idempotently.
 * Given a set of already-earned badges and new eligible badges,
 * returns the final set of earned badges (union, no duplicates).
 */
export function awardTeamBadgesIdempotent(
  alreadyEarned: Set<string>,
  newEligible: TeamBadgeResult[],
): Set<string> {
  const result = new Set(alreadyEarned);
  for (const badge of newEligible) {
    if (badge.eligible) {
      result.add(badge.badge_id);
    }
  }
  return result;
}
