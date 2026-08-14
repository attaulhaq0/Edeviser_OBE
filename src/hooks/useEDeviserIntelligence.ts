import { useMutation } from "@tanstack/react-query";

import {
  decideIntelligenceProposal,
  executeIntelligenceProposal,
  requestEDeviserIntelligence,
} from "@/lib/edeviserIntelligence";

export const useEDeviserIntelligence = () =>
  useMutation({ mutationFn: requestEDeviserIntelligence });

export const useIntelligenceProposalDecision = () =>
  useMutation({ mutationFn: decideIntelligenceProposal });

export const useIntelligenceProposalExecution = () =>
  useMutation({ mutationFn: executeIntelligenceProposal });
