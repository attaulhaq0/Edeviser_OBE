import { useMutation, useQueryClient } from "@tanstack/react-query";

import {
  decideIntelligenceProposal,
  executeIntelligenceProposal,
  requestEDeviserIntelligence,
} from "@/lib/edeviserIntelligence";
import { queryKeys } from "@/lib/queryKeys";

export const useEDeviserIntelligence = () =>
  useMutation({ mutationFn: requestEDeviserIntelligence });

export const useIntelligenceProposalDecision = () =>
  useMutation({ mutationFn: decideIntelligenceProposal });

export const useIntelligenceProposalExecution = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: executeIntelligenceProposal,
    onSuccess: (receipt) => {
      const affectedLists =
        receipt.targetType === "weekly_goal"
          ? queryKeys.weeklyGoals.lists()
          : queryKeys.studySessions.lists();
      void queryClient.invalidateQueries({ queryKey: affectedLists });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.studentLearningState.detail(receipt.studentId),
      });
    },
  });
};
