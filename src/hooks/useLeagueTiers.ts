// =============================================================================
// useLeagueTiers — League tier query, league-scoped leaderboard
// Task 20.10 — Re-exports from useLeagueLeaderboard
// =============================================================================

export {
  useLeagueLeaderboard,
  useStudentLeagueTier,
  useStudentPercentileBand,
} from '@/hooks/useLeagueLeaderboard';

export type { LeagueLeaderboardEntry } from '@/hooks/useLeagueLeaderboard';
