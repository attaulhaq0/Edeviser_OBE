// =============================================================================
// useContributionStatus — TanStack Query hooks for contribution metrics
// Task 3.11: fetch contribution metrics for team members (teacher view),
//            filter by has-inactive-members
// =============================================================================

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { queryKeys } from '@/lib/queryKeys';
import type { ContributionStatus } from '@/lib/contributionThresholds';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ContributionMetric {
  member_id: string;
  team_id: string;
  student_id: string;
  contribution_status: ContributionStatus;
  contribution_status_since: string | null;
  consecutive_low_days: number;
}

export interface TeamContributionSummary {
  team_id: string;
  team_name: string;
  members: ContributionMetric[];
  has_inactive_members: boolean;
  has_warning_members: boolean;
}

// ─── useContributionStatus — fetch contribution metrics for a team ───────────

export const useContributionStatus = (teamId?: string) => {
  return useQuery({
    queryKey: queryKeys.contributionStatus.list({ teamId }),
    queryFn: async (): Promise<ContributionMetric[]> => {
      const { data, error } = await supabase
        .from('team_members' as never)
        .select('id, team_id, student_id, contribution_status, contribution_status_since, consecutive_low_days')
        .eq('team_id', teamId!)
        .is('left_at', null)
        .order('contribution_status', { ascending: true });
      if (error) throw error;
      return ((data ?? []) as Array<Record<string, unknown>>).map((row) => ({
        member_id: row.id as string,
        team_id: row.team_id as string,
        student_id: row.student_id as string,
        contribution_status: row.contribution_status as ContributionStatus,
        contribution_status_since: row.contribution_status_since as string | null,
        consecutive_low_days: row.consecutive_low_days as number,
      }));
    },
    enabled: !!teamId,
  });
};

// ─── useTeamsContributionSummary — teacher view: all teams with contribution ─

export const useTeamsContributionSummary = (
  courseId?: string,
  filterInactive?: boolean,
) => {
  return useQuery({
    queryKey: queryKeys.contributionStatus.list({ courseId, filterInactive }),
    queryFn: async (): Promise<TeamContributionSummary[]> => {
      // Fetch teams for the course
      const { data: teams, error: teamsError } = await supabase
        .from('teams' as never)
        .select('id, name')
        .eq('course_id', courseId!)
        .is('deleted_at', null)
        .order('name');
      if (teamsError) throw teamsError;
      if (!teams || teams.length === 0) return [];

      const teamIds = (teams as Array<{ id: string }>).map((t) => t.id);

      // Fetch all active members with contribution data
      const { data: members, error: membersError } = await supabase
        .from('team_members' as never)
        .select('id, team_id, student_id, contribution_status, contribution_status_since, consecutive_low_days')
        .in('team_id', teamIds)
        .is('left_at', null);
      if (membersError) throw membersError;

      // Group members by team
      const membersByTeam = new Map<string, ContributionMetric[]>();
      for (const row of (members ?? []) as Array<Record<string, unknown>>) {
        const teamId = row.team_id as string;
        const metric: ContributionMetric = {
          member_id: row.id as string,
          team_id: teamId,
          student_id: row.student_id as string,
          contribution_status: row.contribution_status as ContributionStatus,
          contribution_status_since: row.contribution_status_since as string | null,
          consecutive_low_days: row.consecutive_low_days as number,
        };
        const existing = membersByTeam.get(teamId) ?? [];
        existing.push(metric);
        membersByTeam.set(teamId, existing);
      }

      // Build summaries
      let summaries: TeamContributionSummary[] = (
        teams as Array<{ id: string; name: string }>
      ).map((t) => {
        const teamMembers = membersByTeam.get(t.id) ?? [];
        return {
          team_id: t.id,
          team_name: t.name,
          members: teamMembers,
          has_inactive_members: teamMembers.some((m) => m.contribution_status === 'inactive'),
          has_warning_members: teamMembers.some((m) => m.contribution_status === 'warning'),
        };
      });

      // Apply filter
      if (filterInactive) {
        summaries = summaries.filter((s) => s.has_inactive_members);
      }

      return summaries;
    },
    enabled: !!courseId,
  });
};
