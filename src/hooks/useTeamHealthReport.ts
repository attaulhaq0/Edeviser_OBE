// =============================================================================
// useTeamHealthReport — Task 3.16
// Fetch weekly team health report with recommendations
// =============================================================================

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { queryKeys } from '@/lib/queryKeys';

export interface TeamHealthReportData {
  total_teams: number;
  healthy_count: number;
  needs_attention_count: number;
  at_risk_count: number;
  flagged_teams: FlaggedTeam[];
}

export interface FlaggedTeam {
  team_id: string;
  team_name: string;
  health_score: number;
  health_status: 'needs_attention' | 'at_risk';
  issues: string[];
  recommendations: string[];
  inactive_member_count: number;
  health_snapshots?: import('@/hooks/useTeamHealth').TeamHealthSnapshot[];
}

export const useTeamHealthReport = (courseId: string | undefined) => {
  return useQuery({
    queryKey: queryKeys.teamHealthReport.list({ courseId }),
    queryFn: async (): Promise<TeamHealthReportData> => {
      // Fetch all teams for the course
      const { data: teams, error } = await supabase
        .from('teams' as never)
        .select('id, name, health_score, health_status, cooperation_score')
        .eq('course_id', courseId!)
        .is('deleted_at', null);

      if (error) throw error;
      if (!teams || teams.length === 0) {
        return {
          total_teams: 0,
          healthy_count: 0,
          needs_attention_count: 0,
          at_risk_count: 0,
          flagged_teams: [],
        };
      }

      const typedTeams = teams as Array<{
        id: string;
        name: string;
        health_score: number;
        health_status: string;
        cooperation_score: number;
      }>;

      const healthy = typedTeams.filter((t) => t.health_status === 'healthy');
      const needsAttention = typedTeams.filter((t) => t.health_status === 'needs_attention');
      const atRisk = typedTeams.filter((t) => t.health_status === 'at_risk');

      // Get inactive member counts for flagged teams
      const flaggedIds = [...needsAttention, ...atRisk].map((t) => t.id);
      const { data: inactiveMembers } = await supabase
        .from('team_members' as never)
        .select('team_id')
        .in('team_id', flaggedIds)
        .eq('contribution_status', 'inactive')
        .is('left_at', null);

      const inactiveCountMap = new Map<string, number>();
      for (const m of (inactiveMembers ?? []) as Array<{ team_id: string }>) {
        inactiveCountMap.set(m.team_id, (inactiveCountMap.get(m.team_id) ?? 0) + 1);
      }

      const flaggedTeams: FlaggedTeam[] = [...needsAttention, ...atRisk].map((t) => {
        const issues: string[] = [];
        const recommendations: string[] = [];
        const inactiveCount = inactiveCountMap.get(t.id) ?? 0;

        if (t.health_score < 40) {
          issues.push('Team health score is critically low');
          recommendations.push('Consider restructuring team composition');
        }
        if (t.cooperation_score < 50) {
          issues.push('Low cooperation score — unequal participation');
          recommendations.push('Schedule a team check-in to discuss workload distribution');
        }
        if (inactiveCount > 0) {
          issues.push(`${inactiveCount} inactive member(s)`);
          recommendations.push('Reassign inactive members or initiate replacement vote');
        }
        if (issues.length === 0) {
          issues.push('Borderline health indicators');
          recommendations.push('Monitor closely over the next week');
        }

        return {
          team_id: t.id,
          team_name: t.name,
          health_score: t.health_score,
          health_status: t.health_status as 'needs_attention' | 'at_risk',
          issues,
          recommendations,
          inactive_member_count: inactiveCount,
        };
      });

      return {
        total_teams: typedTeams.length,
        healthy_count: healthy.length,
        needs_attention_count: needsAttention.length,
        at_risk_count: atRisk.length,
        flagged_teams: flaggedTeams,
      };
    },
    enabled: !!courseId,
  });
};
