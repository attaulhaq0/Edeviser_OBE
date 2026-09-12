// =============================================================================
// useStudentInterventionActions — Phase 12 student intervention workflow
// Students can start and complete their own interventions via RPCs.
// =============================================================================

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";

interface InterventionActionResult {
  interventionId: string;
  status: string;
}

export function useStartIntervention() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (interventionId: string): Promise<InterventionActionResult> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.rpc as any)(
        "student_start_intervention_v1",
        { p_intervention_id: interventionId }
      );
      if (error) throw error;
      return data as unknown as InterventionActionResult;
    },
    onSuccess: (_data: InterventionActionResult) => {
      toast.success("Intervention started");
      queryClient.invalidateQueries({ queryKey: ["learning-interventions"] });
    },
    onError: (error: Error) => {
      toast.error(`Failed to start intervention: ${error.message}`);
    },
  });
}

export function useCompleteIntervention() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      interventionId,
      completionNote,
    }: {
      interventionId: string;
      completionNote?: string;
    }): Promise<InterventionActionResult> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.rpc as any)(
        "student_complete_intervention_v1",
        {
          p_intervention_id: interventionId,
          p_completion_note: completionNote ?? null,
        }
      );
      if (error) throw error;
      return data as unknown as InterventionActionResult;
    },
    onSuccess: (_data: InterventionActionResult) => {
      toast.success("Intervention completed");
      queryClient.invalidateQueries({ queryKey: ["learning-interventions"] });
    },
    onError: (error: Error) => {
      toast.error(`Failed to complete intervention: ${error.message}`);
    },
  });
}

export function useAdvanceInterventionStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      interventionId,
      newStatus,
    }: {
      interventionId: string;
      newStatus: string;
    }): Promise<InterventionActionResult> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.rpc as any)(
        "advance_intervention_status_v1",
        {
          p_intervention_id: interventionId,
          p_new_status: newStatus,
        }
      );
      if (error) throw error;
      return data as unknown as InterventionActionResult;
    },
    onSuccess: () => {
      toast.success("Intervention status updated");
      queryClient.invalidateQueries({ queryKey: ["learning-interventions"] });
    },
    onError: (error: Error) => {
      toast.error(`Status update failed: ${error.message}`);
    },
  });
}