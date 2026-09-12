// useCreateInterventionProposal — calls create_learning_intervention_proposal_v1
// ==============================================================================
// Bridges the DecisionIntelligenceSection draft dialog to the agent_action_proposals
// table. Creates a pending proposal for coordinator approval.
// ==============================================================================

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";

interface ProposalInput {
  courseId: string;
  cloId: string;
  studentIds: string[];
  interventionType: string;
  plan: string;
  recommendedOwner: string;
}

interface ProposalResult {
  proposalId: string;
  status: string;
  approvalRequired: boolean;
  approverRole: string;
  studentCount: number;
}

export function useCreateInterventionProposal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: ProposalInput): Promise<ProposalResult> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.rpc as any)(
        "create_learning_intervention_proposal_v1",
        {
          p_course_id: input.courseId,
          p_clo_id: input.cloId,
          p_student_ids: input.studentIds,
          p_intervention_type: input.interventionType,
          p_plan: input.plan,
          p_recommended_owner: input.recommendedOwner,
        }
      );
      if (error) throw error;
      return data as unknown as ProposalResult;
    },
    onSuccess: (data) => {
      toast.success(
        `Proposal created for ${data.studentCount} student(s). Awaiting coordinator approval.`
      );
      queryClient.invalidateQueries({ queryKey: ["proposals"] });
      queryClient.invalidateQueries({ queryKey: ["problemClassification"] });
    },
    onError: (error: Error) => {
      toast.error(`Failed to create proposal: ${error.message}`);
    },
  });
}