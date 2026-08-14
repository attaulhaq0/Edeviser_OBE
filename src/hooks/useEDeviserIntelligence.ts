import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";

import {
  decideIntelligenceProposal,
  executeIntelligenceProposal,
  requestEDeviserIntelligence,
} from "@/lib/edeviserIntelligence";
import { queryKeys } from "@/lib/queryKeys";
import { supabase } from "@/lib/supabase";

const proactiveItemSchema = z.object({
  id: z.uuid(),
  recipient_role: z.enum([
    "student",
    "teacher",
    "parent",
    "coordinator",
    "admin",
  ]),
  specialist: z.string(),
  student_id: z.uuid(),
  course_id: z.uuid().nullable(),
  program_id: z.uuid().nullable(),
  trigger_key: z.string(),
  evidence_packet: z.record(z.string(), z.unknown()),
  recommendation: z.string(),
  proposal_ids: z.array(
    z.object({
      id: z.uuid(),
      actionType: z.string(),
      status: z.enum([
        "pending",
        "approved",
        "rejected",
        "expired",
        "executed",
      ]),
      requiredApproverRole: z.enum([
        "student",
        "teacher",
        "parent",
        "coordinator",
        "admin",
      ]),
    })
  ),
  completed_at: z.string(),
});

export type ProactiveIntelligenceItem = z.infer<typeof proactiveItemSchema>;

export const useProactiveIntelligenceFeed = () =>
  useQuery({
    queryKey: queryKeys.proactiveIntelligence.lists(),
    queryFn: async (): Promise<ProactiveIntelligenceItem[]> => {
      const { data, error } = await supabase.rpc(
        "get_my_proactive_intelligence_v1" as never,
        { p_limit: 20 } as never
      );
      if (error) throw error;
      return z.array(proactiveItemSchema).parse(data ?? []);
    },
    staleTime: 60_000,
  });

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
