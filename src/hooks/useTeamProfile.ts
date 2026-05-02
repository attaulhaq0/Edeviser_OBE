// =============================================================================
// useTeamProfile — TanStack Query hook for team profile data
// Task 3.4: fetch team profile (stats, members, badges, active challenges
//           with progress, teaching moments)
// =============================================================================

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { queryKeys } from '@/lib/queryKeys';
import type { Team } from '@/hooks/useTeams';
import type { TeamMember } from '@/hooks/useTeamMembers';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface TeamBadgeRecord {
  id: string;
  team_id: string;
  badge_key: string;
  earned_at: string;
}

export interface ChallengeWithProgress {
  id: string;
  title: string;
  challenge_type: string;
  goal_target: number;
  start_date: string;
  end_date: string;
  status: string;
  current_progress: number;
  completed_at: string | null;
}

export interface TeachingMoment {
  id: string;
  author_id: string;
  clo_id: string;
  title: string;
  explanation_text: string;
  media_url: string | null;
  status: string;
  created_at: string;
}

export interface TeamProfile {
  team: Team;
  members: TeamMember[];
  badges: TeamBadgeRecord[];
  activeChallenges: ChallengeWithProgress[];
  teachingMoments: TeachingMoment[];
}

// ─── useTeamProfile ──────────────────────────────────────────────────────────

export const useTeamProfile = (teamId?: string) => {
  return useQuery({
    queryKey: queryKeys.teams.detail(teamId ?? ''),
    queryFn: async (): Promise<TeamProfile> => {
      // Fetch team data
      const { data: team, error: teamError } = await supabase
        .from('teams' as never)
        .select('*')
        .eq('id', teamId!)
        .single();
      if (teamError) throw teamError;

      // Fetch active members
      const { data: members, error: membersError } = await supabase
        .from('team_members' as never)
        .select('*')
        .eq('team_id', teamId!)
        .is('left_at', null)
        .order('role')
        .order('joined_at');
      if (membersError) throw membersError;

      // Fetch team badges
      const { data: badges, error: badgesError } = await supabase
        .from('team_badges' as never)
        .select('*')
        .eq('team_id', teamId!)
        .order('earned_at', { ascending: false });
      if (badgesError) throw badgesError;

      // Fetch active challenges with progress for this team
      const { data: progressRows, error: progressError } = await supabase
        .from('challenge_progress' as never)
        .select('challenge_id, current_progress, completed_at')
        .eq('participant_id', teamId!)
        .eq('participant_type', 'team');
      if (progressError) throw progressError;

      const challengeIds = ((progressRows ?? []) as Array<{ challenge_id: string }>).map(
        (r) => r.challenge_id,
      );

      let activeChallenges: ChallengeWithProgress[] = [];
      if (challengeIds.length > 0) {
        const { data: challenges, error: challengesError } = await supabase
          .from('social_challenges' as never)
          .select('id, title, challenge_type, goal_target, start_date, end_date, status')
          .in('id', challengeIds)
          .in('status', ['active', 'draft']);
        if (challengesError) throw challengesError;

        const progressMap = new Map(
          ((progressRows ?? []) as Array<{
            challenge_id: string;
            current_progress: number;
            completed_at: string | null;
          }>).map((r) => [r.challenge_id, r]),
        );

        activeChallenges = (
          (challenges ?? []) as Array<{
            id: string;
            title: string;
            challenge_type: string;
            goal_target: number;
            start_date: string;
            end_date: string;
            status: string;
          }>
        ).map((c) => {
          const progress = progressMap.get(c.id);
          return {
            ...c,
            current_progress: progress?.current_progress ?? 0,
            completed_at: progress?.completed_at ?? null,
          };
        });
      }

      // Fetch teaching moments for this team
      const { data: teachingMoments, error: tmError } = await supabase
        .from('peer_teaching_moments' as never)
        .select('*')
        .eq('team_id', teamId!)
        .eq('status', 'active')
        .order('created_at', { ascending: false });
      if (tmError) throw tmError;

      return {
        team: team as Team,
        members: (members ?? []) as TeamMember[],
        badges: (badges ?? []) as TeamBadgeRecord[],
        activeChallenges,
        teachingMoments: (teachingMoments ?? []) as TeachingMoment[],
      };
    },
    enabled: !!teamId,
  });
};
