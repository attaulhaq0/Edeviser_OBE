// =============================================================================
// useTeamProfile — Task 3.4
// Fetch team profile data (stats, members, badges, active challenges, teaching moments)
// =============================================================================

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { queryKeys } from '@/lib/queryKeys';

export interface TeamProfileData {
  id: string;
  name: string;
  course_id: string;
  captain_id: string;
  xp_total: number;
  streak_count: number;
  cooperation_score: number;
  health_score: number;
  health_status: 'healthy' | 'needs_attention' | 'at_risk';
  created_at: string;
  members: TeamProfileMember[];
  badges: TeamProfileBadge[];
  activeChallenges: TeamProfileChallenge[];
}

export interface TeamProfileMember {
  id: string;
  student_id: string;
  role: 'captain' | 'member';
  joined_at: string;
  contribution_status: 'active' | 'warning' | 'inactive';
  student_name?: string;
  xp_contribution?: number;
}

export interface TeamProfileBadge {
  id: string;
  badge_key: string;
  earned_at: string;
}

export interface TeamProfileChallenge {
  id: string;
  title: string;
  challenge_type: string;
  goal_target: number;
  current_progress: number;
  status: string;
}

export const useTeamProfile = (teamId: string | undefined) => {
  return useQuery({
    queryKey: queryKeys.teams.detail(teamId ?? ''),
    queryFn: async (): Promise<TeamProfileData | null> => {
      // Fetch team base data
      const { data: team, error: teamErr } = await supabase
        .from('teams' as never)
        .select('*')
        .eq('id', teamId!)
        .is('deleted_at', null)
        .maybeSingle();
      if (teamErr) throw teamErr;
      if (!team) return null;

      const t = team as Record<string, unknown>;

      // Fetch members
      const { data: members, error: memErr } = await supabase
        .from('team_members' as never)
        .select('id, student_id, role, joined_at, contribution_status, profiles!inner(full_name)')
        .eq('team_id', teamId!)
        .is('left_at', null);
      if (memErr) throw memErr;

      // Fetch badges
      const { data: badges, error: badgeErr } = await supabase
        .from('team_badges' as never)
        .select('id, badge_key, earned_at')
        .eq('team_id', teamId!);
      if (badgeErr) throw badgeErr;

      // Fetch active challenge progress
      const { data: progress, error: progErr } = await supabase
        .from('challenge_progress' as never)
        .select('challenge_id, current_progress, social_challenges!inner(title, challenge_type, goal_target, status)')
        .eq('participant_id', teamId!)
        .eq('social_challenges.status', 'active');
      if (progErr) throw progErr;

      return {
        id: t.id as string,
        name: t.name as string,
        course_id: t.course_id as string,
        captain_id: t.captain_id as string,
        xp_total: (t.xp_total as number) ?? 0,
        streak_count: (t.streak_count as number) ?? 0,
        cooperation_score: (t.cooperation_score as number) ?? 100,
        health_score: (t.health_score as number) ?? 100,
        health_status: (t.health_status as TeamProfileData['health_status']) ?? 'healthy',
        created_at: t.created_at as string,
        members: ((members ?? []) as Array<Record<string, unknown>>).map((m) => ({
          id: m.id as string,
          student_id: m.student_id as string,
          role: m.role as 'captain' | 'member',
          joined_at: m.joined_at as string,
          contribution_status: (m.contribution_status as TeamProfileMember['contribution_status']) ?? 'active',
          student_name: (m.profiles as Record<string, unknown>)?.full_name as string,
        })),
        badges: ((badges ?? []) as Array<Record<string, unknown>>).map((b) => ({
          id: b.id as string,
          badge_key: b.badge_key as string,
          earned_at: b.earned_at as string,
        })),
        activeChallenges: ((progress ?? []) as Array<Record<string, unknown>>).map((p) => {
          const sc = p.social_challenges as Record<string, unknown>;
          return {
            id: p.challenge_id as string,
            title: sc?.title as string,
            challenge_type: sc?.challenge_type as string,
            goal_target: sc?.goal_target as number,
            current_progress: p.current_progress as number,
            status: sc?.status as string,
          };
        }),
      };
    },
    enabled: !!teamId,
  });
};
