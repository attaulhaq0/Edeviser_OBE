// =============================================================================
// useMysteryRewardBox — Mystery box state and reveal mutation
// Task 20.5
// =============================================================================

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { queryKeys } from "@/lib/queryKeys";

export interface MysteryRewardResult {
  success: boolean;
  outcome_type: "double_xp" | "cosmetic" | "boost";
  reward_details: Record<string, unknown>;
}

export const useResolveMysteryReward = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      studentId,
      institutionId,
    }: {
      studentId: string;
      institutionId: string;
    }): Promise<MysteryRewardResult> => {
      const { data, error } = await supabase.functions.invoke(
        "resolve-mystery-reward",
        {
          body: {
            student_id: studentId,
            institution_id: institutionId,
          },
        }
      );
      if (error) throw error;
      return data as MysteryRewardResult;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.marketplace.all });
    },
  });
};
