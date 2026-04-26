// =============================================================================
// useTeamHealth — Task 3.15
// Fetch team health scores, health snapshots history, filter by health status
// =============================================================================

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { queryKeys } from '@/lib/queryKeys';

export interface TeamHealthSummary {
  team_id: string;
  team_name: string;
  health_score: number;
  health_status: 'healthy' | 'needs_attention' | 'at_risk';
  cooperation_score: number;
  member_count: number;
}

export interface TeamHealthSnapshot {
  id: string;
  team_id: string;
  health_score: number;
  gini_coefficient: number;
  engagement_trend: 'rising' | 'stable' | 'declining';
  challenge_participation_rate: number;
  activity_overlap_rate: number;
  computed_at: string;
}

export const useTeamHealthList = (
  courseId: string | undefined,
  statusFilter?: 'healthy' | 'needs_attention' | 'at_risk',
) => {
  return useQuery({
    queryKey: queryKeys.teamHealth.list({ courseId, statusFilter }),
    queryFn: async (): Promise<TeamHealthSummary[]> => {
      let query = supabase
        .from('teams' as never)
        .select('id, name, health_score, health_status, cooperation_score')
        .eq('course_id', courseId!)
        .is('deleted_at', null)
        .order('health_score', { ascending: true });

      if (statusFilter) {
        query = query.eq('health_status', statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Get member counts
      const teamIds = ((data ?? []) as Array<{ id: string }>).map((t) => t.id);
      const { data: members } = await supabase
        .from('team_members' as never)
        .select('team_id')
        .in('team_id', teamIds)
        .is('left_at', null);

      const countMap = new Map<string, number>();
      for (const m of (members ?? []) as Array<{ team_id: string }>) {
        countMap.set(m.team_id, (countMap.get(m.team_id) ?? 0) + 1);
      }

      return ((data ?? []) as Array<Record<string, unknown>>).map((t) => ({
        team_id: t.id as string,
        team_name: t.name as string,
        health_score: (t.health_score as number) ?? 100,
        health_status: (t.health_status as TeamHealthSummary['health_status']) ?? 'healthy',
        cooperation_score: (t.cooperation_score as number) ?? 100,
        member_count: countMap.get(t.id as string) ?? 0,
      }));
    },
    enabled: !!courseId,
  });
};

export const useTeamHealthSnapshots = (teamId: string | undefined) => {
  return useQuery({
    queryKey: queryKeys.teamHealth.detail(teamId ?? ''),
    queryFn: async (): Promise<TeamHealthSnapshot[]> => {
      const { data, error } = await supabase
        .from('team_health_snapshots' as never)
        .select('*')
        .eq('team_id', teamId!)
        .order('computed_at', { ascending: false })
        .limit(12); // Last 12 weeks
      if (error) throw error;
      return (data ?? []) as TeamHealthSnapshot[];
    },
    enabled: !!teamId,
  });
};
