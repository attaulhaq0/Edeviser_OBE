import { useMutation } from "@tanstack/react-query";

import {
  decideIntelligenceProposal,
  requestEDeviserIntelligence,
} from "@/lib/edeviserIntelligence";

export const useEDeviserIntelligence = () =>
  useMutation({ mutationFn: requestEDeviserIntelligence });

export const useIntelligenceProposalDecision = () =>
  useMutation({ mutationFn: decideIntelligenceProposal });
