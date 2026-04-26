/**
 * Hooks for Knowledge Quests — browsing, progress tracking, start/complete.
 * Task 20.2
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { queryKeys } from '@/lib/queryKeys';
import { toast } from 'sonner';

export interface KnowledgeQuest {
  id: string;
  title: string;
  description: string;
  quest_type: 'quiz_challenge' | 'content_creation' | 'peer_review';
  start_date: string;
  end_date: string;
  reward_type: 'item' | 'xp';
  reward_item_id: string | null;
  reward_xp_amount: number | null;
  target_clo_ids: string[];
}

export interface QuestProgress {
  id: string;
  quest_id: string;
  student_id: string;
  status: 'in_progress' | 'completed' | 'expired';
  started_at: string;
  completed_at: string | null;
}

export const useKnowledgeQuests = (status?: string) => {
  return useQuery({
    queryKey: queryKeys.quests.list(status),
    queryFn: async () => {
      let query = supabase.from('knowledge_quests').select('*').order('end_date', { ascending: true });
      if (status === 'active') {
        query = query.lte('start_date', new Date().toISOString()).gte('end_date', new Date().toISOString());
      }
      const { data, error } = await query;
      if (error) throw error;
      return data as KnowledgeQuest[];
    },
  });
};

export const useQuestProgress = (questId: string, studentId: string | undefined) => {
  return useQuery({
    queryKey: queryKeys.quests.progress(questId, studentId ?? ''),
    queryFn: async () => {
      if (!studentId) return null;
      const { data, error } = await supabase
        .from('student_quest_progress')
        .select('*')
        .eq('quest_id', questId)
        .eq('student_id', studentId)
        .maybeSingle();
      if (error) throw error;
      return data as QuestProgress | null;
    },
    enabled: !!studentId,
  });
};

export const useStartQuest = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ questId, studentId }: { questId: string; studentId: string }) => {
      const { data, error } = await supabase
        .from('student_quest_progress')
        .insert({ quest_id: questId, student_id: studentId, status: 'in_progress', started_at: new Date().toISOString() })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.quests.all });
      toast.success('Quest started!');
    },
  });
};

export const useCompleteQuest = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ progressId }: { progressId: string }) => {
      const { data, error } = await supabase
        .from('student_quest_progress')
        .update({ status: 'completed', completed_at: new Date().toISOString() })
        .eq('id', progressId)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.quests.all });
      toast.success('Quest completed! Reward earned.');
    },
  });
};
