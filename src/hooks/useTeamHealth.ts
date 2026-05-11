// =============================================================================
// useTeamHealth — TanStack Query hooks for team health monitoring
// Task 3.15: fetch team health scores, health snapshots history,
//            filter by health status
// =============================================================================

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { queryKeys } from "@/lib/queryKeys";

// ─── Types ───────────────────────────────────────────────────────────────────

export type HealthStatus = "healthy" | "needs_attention" | "at_risk";
export type EngagementTrend = "rising" | "stable" | "declining";

export interface TeamHealthSummary {
  team_id: string;
  team_name: string;
  health_score: number;
  health_status: HealthStatus;
  cooperation_score: number;
}

export interface TeamHealthSnapshot {
  id: string;
  team_id: string;
  health_score: number;
  gini_coefficient: number;
  engagement_trend: EngagementTrend;
  challenge_participation_rate: number;
  activity_overlap_rate: number;
  computed_at: string;
}

// ─── useTeamHealthScores — fetch health scores for all teams in a course ─────

export const useTeamHealthScores = (
  courseId?: string,
  statusFilter?: HealthStatus
) => {
  return useQuery({
    queryKey: queryKeys.teamHealth.list({ courseId, statusFilter }),
    queryFn: async (): Promise<TeamHealthSummary[]> => {
      let query = supabase
        .from("teams" as never)
        .select("id, name, health_score, health_status, cooperation_score")
        .eq("course_id", courseId!)
        .is("deleted_at", null)
        .order("health_score", { ascending: true });

      if (statusFilter) {
        query = query.eq("health_status", statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;

      return (
        (data ?? []) as Array<{
          id: string;
          name: string;
          health_score: number;
          health_status: HealthStatus;
          cooperation_score: number;
        }>
      ).map((t) => ({
        team_id: t.id,
        team_name: t.name,
        health_score: t.health_score,
        health_status: t.health_status,
        cooperation_score: t.cooperation_score,
      }));
    },
    enabled: !!courseId,
  });
};

// ─── useTeamHealthSnapshots — fetch health snapshot history for a team ────────

export const useTeamHealthSnapshots = (teamId?: string, limit = 12) => {
  return useQuery({
    queryKey: queryKeys.teamHealth.detail(teamId ?? ""),
    queryFn: async (): Promise<TeamHealthSnapshot[]> => {
      const { data, error } = await supabase
        .from("team_health_snapshots" as never)
        .select("*")
        .eq("team_id", teamId!)
        .order("computed_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      // Return in chronological order for charting
      return ((data ?? []) as TeamHealthSnapshot[]).reverse();
    },
    enabled: !!teamId,
  });
};
