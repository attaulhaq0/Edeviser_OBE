import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { queryKeys } from "@/lib/queryKeys";
import type { Database } from "@/types/database";

type LearningIntervention =
  Database["public"]["Tables"]["learning_interventions"]["Row"];

export type { LearningIntervention };

// ─── Interventions — QA 2026-09-02 (V6): close the intervention loop ────────
// Sends go through the `send_teacher_nudge` RPC (see useTeacherDashboard),
// which now records a learning_interventions row server-side. RLS limits
// SELECT/UPDATE to the teacher's own courses (plus coordinator/admin).

/** Active (unresolved) interventions visible to the current user. */
export const useActiveInterventions = () => {
  return useQuery({
    queryKey: queryKeys.interventions.lists(),
    queryFn: async (): Promise<LearningIntervention[]> => {
      const { data, error } = await supabase
        .from("learning_interventions")
        .select("*")
        .eq("status", "active")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
};

/** Marks a follow-up intervention resolved (completed). */
export const useResolveIntervention = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("learning_interventions")
        .update({ status: "completed", completed_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.interventions.all,
      });
    },
  });
};
