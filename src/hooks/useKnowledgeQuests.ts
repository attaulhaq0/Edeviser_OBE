// =============================================================================
// useKnowledgeQuests — Quest browsing, progress tracking, start/complete
// Task 20.2
// =============================================================================

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { queryKeys } from "@/lib/queryKeys";
import { toast } from "sonner";

export interface KnowledgeQuest {
  id: string;
  title: string;
  description: string;
  quest_type: "quiz_challenge" | "content_creation" | "peer_review";
  start_date: string;
  end_date: string;
  reward_type: "item" | "xp";
  reward_item_id: string | null;
  reward_xp_amount: number | null;
  created_at: string;
}

export interface QuestProgress {
  id: string;
  student_id: string;
  quest_id: string;
  status: "in_progress" | "completed";
  started_at: string;
  completed_at: string | null;
}

export const useKnowledgeQuests = (status?: string) => {
  return useQuery({
    queryKey: queryKeys.quests.list({ status }),
    queryFn: async (): Promise<KnowledgeQuest[]> => {
      let query = supabase
        .from("knowledge_quests")
        .select("*")
        .order("start_date", { ascending: false });

      if (status === "active") {
        const now = new Date().toISOString();
        query = query.lte("start_date", now).gte("end_date", now);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as KnowledgeQuest[];
    },
  });
};

export const useQuestProgress = (questId: string, studentId?: string) => {
  return useQuery({
    queryKey: queryKeys.quests.detail(questId),
    queryFn: async (): Promise<QuestProgress | null> => {
      const { data, error } = await supabase
        .from("student_quest_progress")
        .select("*")
        .eq("quest_id", questId)
        .eq("student_id", studentId!)
        .maybeSingle();
      if (error) throw error;
      return data as QuestProgress | null;
    },
    enabled: !!questId && !!studentId,
  });
};

export const useStartQuest = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      questId,
      studentId,
    }: {
      questId: string;
      studentId: string;
    }) => {
      const { data, error } = await supabase
        .from("student_quest_progress")
        .insert({
          student_id: studentId,
          quest_id: questId,
          status: "in_progress",
          started_at: new Date().toISOString(),
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.quests.all });
      toast.success("Quest started!");
    },
    onError: (err) => toast.error((err as Error).message),
  });
};

export const useCompleteQuest = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      questId,
      studentId,
    }: {
      questId: string;
      studentId: string;
    }) => {
      const { data, error } = await supabase
        .from("student_quest_progress")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
        })
        .eq("quest_id", questId)
        .eq("student_id", studentId)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.quests.all });
      toast.success("Quest completed! Reward earned!");
    },
    onError: (err) => toast.error((err as Error).message),
  });
};
