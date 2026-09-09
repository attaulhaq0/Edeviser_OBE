import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

interface AiTestingStatus {
  active: boolean;
  sessionId?: string;
  startedAt?: string;
  expiresAt?: string;
  activatedBy?: string;
  maxCostUsd?: number;
  minutesRemaining?: number;
}

interface ActivateResult {
  sessionId: string;
  expiresAt: string;
  durationHours: number;
  maxCostUsd: number;
}

/** Reads the current AI testing session status for the caller's institution. */
export const useAiTestingStatus = () =>
  useQuery({
    queryKey: ["ai-testing", "status"] as const,
    queryFn: async (): Promise<AiTestingStatus> => {
      const { data, error } = await supabase.rpc(
        "get_ai_testing_status" as never,
        {} as never
      );
      if (error) throw error;
      return (data ?? { active: false }) as unknown as AiTestingStatus;
    },
    refetchInterval: 30_000, // poll every 30s while mounted
    staleTime: 15_000,
  });

/** Activates an AI testing session for the caller's institution. */
export const useActivateAiTesting = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ["ai-testing", "activate"] as const,
    mutationFn: async (params?: {
      durationHours?: number;
      maxCostUsd?: number;
    }): Promise<ActivateResult> => {
      const { data, error } = await supabase.rpc(
        "activate_ai_testing" as never,
        {
          p_duration_hours: params?.durationHours ?? 2,
          p_max_cost_usd: params?.maxCostUsd ?? 0.1,
        } as never
      );
      if (error) throw error;
      return data as unknown as ActivateResult;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai-testing", "status"] });
    },
  });
};

/** Deactivates all active AI testing sessions for the caller's institution. */
export const useDeactivateAiTesting = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ["ai-testing", "deactivate"] as const,
    mutationFn: async (): Promise<void> => {
      const { error } = await supabase.rpc(
        "deactivate_ai_testing" as never,
        {} as never
      );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai-testing", "status"] });
    },
  });
};
