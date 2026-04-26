// =============================================================================
// usePeerTeaching — Task 3.13
// Create teaching moment, list moments by team/CLO, record view, submit rating
// =============================================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { queryKeys } from '@/lib/queryKeys';
import type { CreateTeachingMomentInput, RateTeachingMomentInput } from '@/lib/schemas/peerTeaching';

export interface PeerTeachingMoment {
  id: string;
  team_id: string;
  author_id: string;
  clo_id: string;
  title: string;
  explanation_text: string;
  media_url: string | null;
  status: 'active' | 'archived';
  created_at: string;
  author_name?: string;
  view_count?: number;
  avg_clarity?: number;
  avg_helpfulness?: number;
}

export const usePeerTeachingMoments = (teamId: string | undefined, cloId?: string) => {
  return useQuery({
    queryKey: queryKeys.peerTeachingMoments.list({ teamId, cloId }),
    queryFn: async (): Promise<PeerTeachingMoment[]> => {
      let query = supabase
        .from('peer_teaching_moments' as never)
        .select('*, profiles!inner(full_name)')
        .eq('team_id', teamId!)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (cloId) {
        query = query.eq('clo_id', cloId);
      }

      const { data, error } = await query;
      if (error) throw error;

      return ((data ?? []) as Array<Record<string, unknown>>).map((m) => ({
        id: m.id as string,
        team_id: m.team_id as string,
        author_id: m.author_id as string,
        clo_id: m.clo_id as string,
        title: m.title as string,
        explanation_text: m.explanation_text as string,
        media_url: m.media_url as string | null,
        status: m.status as 'active' | 'archived',
        created_at: m.created_at as string,
        author_name: (m.profiles as Record<string, unknown>)?.full_name as string,
      }));
    },
    enabled: !!teamId,
  });
};

export const useCreateTeachingMoment = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateTeachingMomentInput & { author_id: string }) => {
      const { data, error } = await supabase
        .from('peer_teaching_moments' as never)
        .insert(input as never)
        .select()
        .single();
      if (error) throw error;

      // Award 30 XP for creating a teaching moment
      await supabase.functions.invoke('award-xp', {
        body: {
          student_id: input.author_id,
          xp_amount: 30,
          source: 'peer_teaching',
          reference_id: `teaching_moment:${(data as Record<string, unknown>).id}`,
          note: 'Created a peer teaching moment',
        },
      });

      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.peerTeachingMoments.lists() });
    },
  });
};

export const useRecordTeachingMomentView = () => {
  return useMutation({
    mutationFn: async (input: {
      teaching_moment_id: string;
      viewer_id: string;
      pre_view_attainment?: number;
    }) => {
      const { error } = await supabase
        .from('teaching_moment_views' as never)
        .insert(input as never);
      if (error) throw error;
    },
  });
};

export const useRateTeachingMoment = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: RateTeachingMomentInput & { viewer_id: string }) => {
      const { data, error } = await supabase
        .from('teaching_moment_ratings' as never)
        .insert(input as never)
        .select()
        .single();
      if (error) throw error;

      // Award 10 XP to the viewer for engaging with peer teaching
      await supabase.functions.invoke('award-xp', {
        body: {
          student_id: input.viewer_id,
          xp_amount: 10,
          source: 'peer_learning',
          reference_id: `teaching_rating:${input.teaching_moment_id}:${input.viewer_id}`,
          note: 'Rated a peer teaching moment',
        },
      });

      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.teachingMomentRatings.lists() });
      qc.invalidateQueries({ queryKey: queryKeys.peerTeachingMoments.lists() });
    },
  });
};
