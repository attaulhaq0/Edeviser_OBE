// =============================================================================
// useTeamLeaderboard — TanStack Query hooks for team leaderboard data
// Task 131.3: Team Leaderboard with Supabase Realtime subscription
// =============================================================================

import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { queryKeys } from '@/lib/queryKeys';
import { useRealtime } from '@/hooks/useRealtime';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface TeamLeaderboardEntry {
  team_id: string;
  team_name: string;
  avatar_letter: string;
  member_count: number;
  xp_total: number;
  xp_this_week: number;
  rank: number;
}

export type TeamLeaderboardView = 'weekly' | 'all_time';

// ─── useTeamLeaderboard ──────────────────────────────────────────────────────

export const useTeamLeaderboard = (
  courseId: string | undefined,
  view: TeamLeaderboardView = 'all_time',
) => {
  const queryClient = useQueryClient();

  // Polling fallback for when realtime is unavailable
  const pollingFn = useCallback(() => {
    queryClient.invalidateQueries({
      queryKey: queryKeys.teamLeaderboard.lists(),
    });
  }, [queryClient]);

  // Subscribe to realtime changes on team_gamification
  const { isLive, retryCount } = useRealtime({
    table: 'team_gamification',
    event: 'UPDATE',
    onPayload: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.teamLeaderboard.lists(),
      });
    },
    pollingFn,
    pollingInterval: 30_000,
  });

  const query = useQuery({
    queryKey: queryKeys.teamLeaderboard.list({ courseId, view }),
    queryFn: async (): Promise<TeamLeaderboardEntry[]> => {
      // Fetch teams for the course
      const { data: teams, error: teamsErr } = await supabase
        .from('teams' as never)
        .select('id, name, avatar_letter')
        .eq('course_id', courseId!);
      if (teamsErr) throw teamsErr;
      if (!teams || teams.length === 0) return [];

      const teamIds = (teams as Array<{ id: string }>).map((t) => t.id);

      // Fetch gamification data
      const { data: gamData, error: gamErr } = await supabase
        .from('team_gamification' as never)
        .select('team_id, xp_total, xp_this_week')
        .in('team_id', teamIds);
      if (gamErr) throw gamErr;

      const gamMap = new Map(
        ((gamData ?? []) as Array<{ team_id: string; xp_total: number; xp_this_week: number }>).map(
          (g) => [g.team_id, g],
        ),
      );

      // Fetch member counts
      const { data: members, error: memErr } = await supabase
        .from('team_members' as never)
        .select('team_id')
        .in('team_id', teamIds);
      if (memErr) throw memErr;

      const countMap = new Map<string, number>();
      for (const m of (members ?? []) as Array<{ team_id: string }>) {
        countMap.set(m.team_id, (countMap.get(m.team_id) ?? 0) + 1);
      }

      // Build entries
      const entries: TeamLeaderboardEntry[] = (
        teams as Array<{ id: string; name: string; avatar_letter: string }>
      ).map((t) => {
        const gam = gamMap.get(t.id);
        return {
          team_id: t.id,
          team_name: t.name,
          avatar_letter: t.avatar_letter,
          member_count: countMap.get(t.id) ?? 0,
          xp_total: gam?.xp_total ?? 0,
          xp_this_week: gam?.xp_this_week ?? 0,
          rank: 0,
        };
      });

      // Sort by selected view
      const sortKey = view === 'weekly' ? 'xp_this_week' : 'xp_total';
      entries.sort((a, b) => b[sortKey] - a[sortKey]);
      entries.forEach((e, i) => (e.rank = i + 1));

      return entries;
    },
    enabled: !!courseId,
  });

  return {
    ...query,
    isLive,
    retryCount,
  };
};

// ─── useMyTeamId ─────────────────────────────────────────────────────────────
// Resolves the current student's team ID for a given course

export const useMyTeamId = (studentId: string | undefined, courseId: string | undefined) => {
  return useQuery({
    queryKey: queryKeys.teamMembers.list({ studentId, courseId }),
    queryFn: async (): Promise<string | null> => {
      // Get all teams in the course
      const { data: teams, error: teamsErr } = await supabase
        .from('teams' as never)
        .select('id')
        .eq('course_id', courseId!);
      if (teamsErr) throw teamsErr;
      if (!teams || teams.length === 0) return null;

      const teamIds = (teams as Array<{ id: string }>).map((t) => t.id);

      // Find the student's membership
      const { data: membership, error: memErr } = await supabase
        .from('team_members' as never)
        .select('team_id')
        .eq('student_id', studentId!)
        .in('team_id', teamIds)
        .limit(1)
        .maybeSingle();
      if (memErr) throw memErr;

      return (membership as { team_id: string } | null)?.team_id ?? null;
    },
    enabled: !!studentId && !!courseId,
    staleTime: 60_000,
  });
};
