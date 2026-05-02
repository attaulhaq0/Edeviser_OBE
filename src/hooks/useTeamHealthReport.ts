// =============================================================================
// useTeamHealthReport — TanStack Query hook for weekly team health report
// Task 3.16: fetch weekly team health report with recommendations
// =============================================================================

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { queryKeys } from '@/lib/queryKeys';
import type { HealthStatus, EngagementTrend } from '@/hooks/useTeamHealth';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface FlaggedTeam {
  team_id: string;
  team_name: string;
  health_score: number;
  health_status: HealthStatus;
  engagement_trend: EngagementTrend;
  gini_coefficient: number;
  issues: string[];
  recommendations: string[];
}

export interface TeamHealthReport {
  report_date: string;
  course_id: string;
  total_teams: number;
  healthy_count: number;
  needs_attention_count: number;
  at_risk_count: number;
  flagged_teams: FlaggedTeam[];
}

// ─── Helper: generate recommendations based on health indicators ─────────────

function generateRecommendations(
  healthScore: number,
  giniCoefficient: number,
  engagementTrend: EngagementTrend,
): { issues: string[]; recommendations: string[] } {
  const issues: string[] = [];
  const recommendations: string[] = [];

  if (giniCoefficient > 0.4) {
    issues.push('High inequality in member contributions');
    recommendations.push('Consider redistributing tasks to balance workload across team members');
  }

  if (engagementTrend === 'declining') {
    issues.push('Declining engagement trend');
    recommendations.push('Schedule a team check-in to identify and address disengagement factors');
  }

  if (healthScore < 40) {
    issues.push('Team health score is critically low');
    recommendations.push('Consider team restructuring or targeted intervention');
  } else if (healthScore < 70) {
    issues.push('Team health score needs attention');
    recommendations.push('Monitor team closely and encourage collaborative activities');
  }

  return { issues, recommendations };
}

// ─── useTeamHealthReport ─────────────────────────────────────────────────────

export const useTeamHealthReport = (courseId?: string) => {
  return useQuery({
    queryKey: queryKeys.teamHealthReport.list({ courseId }),
    queryFn: async (): Promise<TeamHealthReport> => {
      // Fetch all teams for the course
      const { data: teams, error: teamsError } = await supabase
        .from('teams' as never)
        .select('id, name, health_score, health_status')
        .eq('course_id', courseId!)
        .is('deleted_at', null);
      if (teamsError) throw teamsError;

      const teamList = (teams ?? []) as Array<{
        id: string;
        name: string;
        health_score: number;
        health_status: HealthStatus;
      }>;

      // Count by status
      let healthyCount = 0;
      let needsAttentionCount = 0;
      let atRiskCount = 0;

      for (const t of teamList) {
        if (t.health_status === 'healthy') healthyCount++;
        else if (t.health_status === 'needs_attention') needsAttentionCount++;
        else if (t.health_status === 'at_risk') atRiskCount++;
      }

      // Fetch latest snapshots for flagged teams (needs_attention or at_risk)
      const flaggedTeamIds = teamList
        .filter((t) => t.health_status !== 'healthy')
        .map((t) => t.id);

      const flaggedTeams: FlaggedTeam[] = [];

      if (flaggedTeamIds.length > 0) {
        // Get latest snapshot for each flagged team
        const { data: snapshots, error: snapshotsError } = await supabase
          .from('team_health_snapshots' as never)
          .select('team_id, health_score, gini_coefficient, engagement_trend, computed_at')
          .in('team_id', flaggedTeamIds)
          .order('computed_at', { ascending: false });
        if (snapshotsError) throw snapshotsError;

        // Get latest snapshot per team
        const latestSnapshots = new Map<string, {
          health_score: number;
          gini_coefficient: number;
          engagement_trend: EngagementTrend;
        }>();

        for (const s of (snapshots ?? []) as Array<{
          team_id: string;
          health_score: number;
          gini_coefficient: number;
          engagement_trend: EngagementTrend;
        }>) {
          if (!latestSnapshots.has(s.team_id)) {
            latestSnapshots.set(s.team_id, {
              health_score: s.health_score,
              gini_coefficient: s.gini_coefficient,
              engagement_trend: s.engagement_trend,
            });
          }
        }

        for (const t of teamList.filter((t) => t.health_status !== 'healthy')) {
          const snapshot = latestSnapshots.get(t.id);
          const gini = snapshot?.gini_coefficient ?? 0;
          const trend = snapshot?.engagement_trend ?? 'stable';
          const { issues, recommendations } = generateRecommendations(
            t.health_score,
            gini,
            trend,
          );

          flaggedTeams.push({
            team_id: t.id,
            team_name: t.name,
            health_score: t.health_score,
            health_status: t.health_status,
            engagement_trend: trend,
            gini_coefficient: gini,
            issues,
            recommendations,
          });
        }

        // Sort: at_risk first, then needs_attention
        flaggedTeams.sort((a, b) => {
          const statusOrder: Record<HealthStatus, number> = { at_risk: 0, needs_attention: 1, healthy: 2 };
          return statusOrder[a.health_status] - statusOrder[b.health_status];
        });
      }

      return {
        report_date: new Date().toISOString(),
        course_id: courseId!,
        total_teams: teamList.length,
        healthy_count: healthyCount,
        needs_attention_count: needsAttentionCount,
        at_risk_count: atRiskCount,
        flagged_teams: flaggedTeams,
      };
    },
    enabled: !!courseId,
  });
};
