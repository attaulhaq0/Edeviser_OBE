// =============================================================================
// useFlowCheckIns — Save flow check-in responses at Pomodoro breaks
// and fetch check-in history for a session.
// =============================================================================

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { queryKeys } from "@/lib/queryKeys";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import type { FlowCheckIn } from "@/types/planner";
import type { FlowCheckInInput } from "@/lib/schemas/planner";

// ─── Row → Domain Mapper ────────────────────────────────────────────────────

function mapFlowCheckIn(row: Record<string, unknown>): FlowCheckIn {
  return {
    id: row.id as string,
    sessionId: row.session_id as string,
    studentId: row.student_id as string,
    intervalNumber: row.interval_number as number,
    response: row.response as FlowCheckIn["response"],
    createdAt: (row.created_at as string) ?? "",
  };
}

// ─── useSaveFlowCheckIn ─────────────────────────────────────────────────────

export const useSaveFlowCheckIn = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: FlowCheckInInput): Promise<FlowCheckIn> => {
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("flow_check_ins" as never)
        .insert({
          session_id: input.sessionId,
          student_id: user.id,
          interval_number: input.intervalNumber,
          response: input.response,
        } as never)
        .select()
        .single();

      if (error) throw error;
      return mapFlowCheckIn(data as Record<string, unknown>);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.flowCheckIns.detail(data.sessionId),
      });
    },
    onError: (error: Error) => {
      toast.error(`Couldn't save check-in: ${error.message}`);
    },
  });
};

// ─── useSessionFlowCheckIns — fetch all check-ins for a session ─────────────

export const useSessionFlowCheckIns = (sessionId: string | undefined) => {
  return useQuery({
    queryKey: queryKeys.flowCheckIns.detail(sessionId ?? ""),
    enabled: !!sessionId,
    queryFn: async (): Promise<FlowCheckIn[]> => {
      if (!sessionId) return [];

      const { data, error } = await supabase
        .from("flow_check_ins" as never)
        .select("*")
        .eq("session_id", sessionId)
        .order("interval_number", { ascending: true });

      if (error) throw error;
      return (data as Record<string, unknown>[]).map(mapFlowCheckIn);
    },
  });
};
