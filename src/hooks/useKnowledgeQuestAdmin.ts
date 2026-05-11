// =============================================================================
// useKnowledgeQuestAdmin — Admin quest CRUD mutations
// Task 20.3
// =============================================================================

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { queryKeys } from "@/lib/queryKeys";
import { toast } from "sonner";
import type { CreateKnowledgeQuestInput } from "@/lib/marketplaceSchemas";

export const useAdminKnowledgeQuests = () => {
  return useQuery({
    queryKey: queryKeys.quests.lists(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("knowledge_quests")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
};

export const useCreateKnowledgeQuest = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateKnowledgeQuestInput) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: profile } = await supabase
        .from("profiles")
        .select("institution_id")
        .eq("id", user.id)
        .single();

      const { data, error } = await supabase
        .from("knowledge_quests")
        .insert({
          ...input,
          institution_id: profile?.institution_id,
          created_by: user.id,
        } as never)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.quests.all });
      toast.success("Knowledge quest created");
    },
    onError: (err) => toast.error((err as Error).message),
  });
};

export const useUpdateKnowledgeQuest = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      ...input
    }: Partial<CreateKnowledgeQuestInput> & { id: string }) => {
      const { data, error } = await supabase
        .from("knowledge_quests")
        .update(input)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.quests.all });
      toast.success("Knowledge quest updated");
    },
    onError: (err) => toast.error((err as Error).message),
  });
};
