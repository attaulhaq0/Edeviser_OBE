// =============================================================================
// useContributionStatus — Task 3.11
// Fetch contribution metrics for team members (teacher view)
// =============================================================================

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { queryKeys } from '@/lib/queryKeys';

export interface ContributionMetric {
  member_id: string;
  student_id: string;
  student_name: string;
  team_id: string;
  team_name: string;
  contribution_status: 'active' | 'warning' | 'inactive';
  contribution_status_since: string | null;
  consecutive_low_days: number;
}

export const useContributionStatus = (
  courseId: string | undefined,
  filters?: { hasInactiveOnly?: boolean },
) => {
  return useQuery({
    queryKey: queryKeys.contributionStatus.list({ courseId, ...filters }),
    queryFn: async (): Promise<ContributionMetric[]> => {
      let query = supabase
        .from('team_members' as never)
        .select(
          'id, student_id, team_id, contribution_status, contribution_status_since, consecutive_low_days, profiles!inner(full_name), teams!inner(name, course_id)',
        )
        .eq('teams.course_id', courseId!)
        .is('left_at', null);

      if (filters?.hasInactiveOnly) {
        query = query.eq('contribution_status', 'inactive');
      }

      const { data, error } = await query;
      if (error) throw error;

      return ((data ?? []) as Array<Record<string, unknown>>).map((m) => ({
        member_id: m.id as string,
        student_id: m.student_id as string,
        student_name:
          (m.profiles as Record<string, unknown>)?.full_name as string ?? 'Unknown',
        team_id: m.team_id as string,
        team_name: (m.teams as Record<string, unknown>)?.name as string ?? 'Unknown',
        contribution_status:
          (m.contribution_status as ContributionMetric['contribution_status']) ?? 'active',
        contribution_status_since: m.contribution_status_since as string | null,
        consecutive_low_days: (m.consecutive_low_days as number) ?? 0,
      }));
    },
    enabled: !!courseId,
  });
};
