// =============================================================================
// useTeamLeaderboard — TanStack Query hooks for team leaderboard
// Task 3.8: fetch team leaderboard by course/program, sorted by xp_total desc,
//           with Cooperation Score sort option
// =============================================================================

import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { queryKeys } from "@/lib/queryKeys";
import { useRealtime } from "@/hooks/useRealtime";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface TeamLeaderboardEntry {
  team_id: string;
  team_name: string;
  avatar_letter: string;
  xp_total: number;
  xp_this_week: number;
  streak_count: number;
  cooperation_score: number;
  health_score: number;
  member_count: number;
  rank: number;
}

export type TeamLeaderboardSort = "xp_total" | "cooperation_score";
export type TeamLeaderboardScope = "course" | "program";

/** @deprecated Use TeamLeaderboardScope instead */
export type TeamLeaderboardView = "weekly" | "all_time";

// ─── useTeamLeaderboard ──────────────────────────────────────────────────────

export const useTeamLeaderboard = (
  options: {
    courseId?: string;
    programId?: string;
    scope?: TeamLeaderboardScope;
    sortBy?: TeamLeaderboardSort;
  } = {}
) => {
  const {
    courseId,
    programId,
    scope = "course",
    sortBy = "xp_total",
  } = options;
  const queryClient = useQueryClient();

  const pollingFn = useCallback(() => {
    queryClient.invalidateQueries({
      queryKey: queryKeys.teamLeaderboard.lists(),
    });
  }, [queryClient]);

  // Scope realtime subscription to the same course the query is scoped to
  // (Req 12.4 — no unfiltered subscriptions). When scope is 'program' or
  // 'global' we can't express the set of course_ids in a realtime filter;
  // fall back to unfiltered and accept the extra invalidations because
  // those views are intentionally cross-course. The scanner suppression
  // baseline at audit/baselines/realtime-filter-exceptions.json documents
  // this carve-out.
  const realtimeFilter =
    scope === "course" && courseId ? `course_id=eq.${courseId}` : undefined;

  const { isLive, retryCount } = useRealtime({
    table: "teams",
    event: "UPDATE",
    filter: realtimeFilter,
    onPayload: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.teamLeaderboard.lists(),
      });
    },
    pollingFn,
    pollingInterval: 30_000,
    // Only subscribe when courseId is available for course scope — an
    // undefined filter would create an unfiltered subscription (Req 12.4).
    enabled: scope !== "course" || !!courseId,
  });

  const query = useQuery({
    queryKey: queryKeys.teamLeaderboard.list({
      courseId,
      programId,
      scope,
      sortBy,
    }),
    queryFn: async (): Promise<TeamLeaderboardEntry[]> => {
      let teamQuery = supabase
        .from("teams")
        .select(
          "id, name, xp_total, streak_count, cooperation_score, health_score, course_id, avatar_letter"
        )
        .is("deleted_at", null);

      if (scope === "course" && courseId) {
        teamQuery = teamQuery.eq("course_id", courseId);
      } else if (scope === "program" && programId) {
        // Fetch course IDs for the program first
        const { data: courses, error: coursesError } = await supabase
          .from("courses")
          .select("id")
          .eq("program_id", programId);
        if (coursesError) throw coursesError;
        const courseIds = (courses ?? []).map((c) => c.id);
        if (courseIds.length === 0) return [];
        teamQuery = teamQuery.in("course_id", courseIds);
      }

      const { data: teams, error: teamsError } = await teamQuery;
      if (teamsError) throw teamsError;
      if (!teams || teams.length === 0) return [];

      const teamIds = teams.map((t) => t.id);

      // Fetch member counts (active members only)
      const { data: members, error: memError } = await supabase
        .from("team_members")
        .select("team_id")
        .in("team_id", teamIds)
        .is("left_at", null);
      if (memError) throw memError;

      const countMap = new Map<string, number>();
      for (const m of members ?? []) {
        countMap.set(m.team_id, (countMap.get(m.team_id) ?? 0) + 1);
      }

      // Build entries
      const entries: TeamLeaderboardEntry[] = teams.map((t) => ({
        team_id: t.id,
        team_name: t.name,
        avatar_letter: t.avatar_letter ?? t.name.charAt(0).toUpperCase(),
        xp_total: t.xp_total,
        xp_this_week: 0,
        streak_count: t.streak_count,
        cooperation_score: t.cooperation_score,
        health_score: t.health_score,
        member_count: countMap.get(t.id) ?? 0,
        rank: 0,
      }));

      // Sort by selected field
      entries.sort((a, b) => b[sortBy] - a[sortBy]);
      entries.forEach((e, i) => (e.rank = i + 1));

      return entries;
    },
    enabled: !!(courseId || programId),
  });

  return { ...query, isLive, retryCount };
};

// ─── useMyTeamId — resolve current student's team for a course ───────────────

export const useMyTeamId = (studentId?: string, courseId?: string) => {
  return useQuery({
    queryKey: queryKeys.teamMembers.list({ studentId, courseId }),
    queryFn: async (): Promise<string | null> => {
      const { data: teams, error: teamsErr } = await supabase
        .from("teams")
        .select("id")
        .eq("course_id", courseId!)
        .is("deleted_at", null);
      if (teamsErr) throw teamsErr;
      if (!teams || teams.length === 0) return null;

      const teamIds = teams.map((t) => t.id);

      const { data: membership, error: memErr } = await supabase
        .from("team_members")
        .select("team_id")
        .eq("student_id", studentId!)
        .in("team_id", teamIds)
        .is("left_at", null)
        .limit(1)
        .maybeSingle();
      if (memErr) throw memErr;

      return membership?.team_id ?? null;
    },
    enabled: !!studentId && !!courseId,
    staleTime: 60_000,
  });
};
