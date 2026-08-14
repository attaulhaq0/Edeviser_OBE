import { z } from "zod";

import { supabase } from "@/lib/supabase";

export const intelligenceRoleSchema = z.enum([
  "student",
  "teacher",
  "parent",
  "coordinator",
  "admin",
]);

export const intelligenceRequestSchema = z.object({
  requestId: z.uuid().optional(),
  sessionId: z.uuid().optional(),
  message: z.string().trim().min(1).max(8000),
  specialist: z.string().max(80).optional(),
  context: z.object({
    route: z.string().min(1).max(500),
    studentId: z.uuid().optional(),
    courseId: z.uuid().optional(),
    programId: z.uuid().optional(),
  }),
});

const evidenceSchema = z.object({
  tool: z.string(),
  data: z.record(z.string(), z.unknown()),
});

const proposalSchema = z.object({
  id: z.uuid(),
  actionType: z.string(),
  reason: z.string(),
  status: z.enum(["pending", "approved", "rejected", "expired", "executed"]),
  requiredApproverRole: intelligenceRoleSchema,
  expiresAt: z.string().optional(),
});

export const intelligenceResponseSchema = z.object({
  requestId: z.uuid(),
  runId: z.uuid(),
  sessionId: z.uuid(),
  response: z.string(),
  specialist: z.string(),
  evidence: z.array(evidenceSchema),
  proposals: z.array(proposalSchema),
  provider: z.literal("deepseek"),
  model: z.string(),
});

export type IntelligenceRequest = z.infer<typeof intelligenceRequestSchema>;
export type IntelligenceResponse = z.infer<typeof intelligenceResponseSchema>;

export const protectedWriteReceiptSchema = z.object({
  executionId: z.uuid(),
  targetId: z.uuid(),
  targetType: z.enum(["weekly_goal", "study_session"]),
  toolName: z.enum(["create_goal", "create_planner_session"]),
  toolVersion: z.literal("1.0.0"),
  studentId: z.uuid(),
  courseId: z.uuid().optional(),
  learningStateVersion: z.number().int().positive(),
  alreadyExecuted: z.boolean(),
});

export type ProtectedWriteReceipt = z.infer<typeof protectedWriteReceiptSchema>;

export const requestEDeviserIntelligence = async (
  input: IntelligenceRequest
): Promise<IntelligenceResponse> => {
  const request = intelligenceRequestSchema.parse(input);
  const { data, error } = await supabase.functions.invoke(
    "agent-orchestrator",
    { body: request }
  );
  if (error) throw error;
  return intelligenceResponseSchema.parse(data);
};

export const decideIntelligenceProposal = async (input: {
  proposalId: string;
  decision: "approve" | "reject";
  reason?: string;
}): Promise<{
  proposal: { id: string; status: string };
  protectedActionExecuted: false;
}> => {
  const proposalId = z.uuid().parse(input.proposalId);
  const { data, error } = await supabase.functions.invoke(
    "agent-orchestrator",
    {
      body: {
        action:
          input.decision === "approve" ? "approve_proposal" : "reject_proposal",
        proposalId,
        reason: input.reason,
      },
    }
  );
  if (error) throw error;
  return z
    .object({
      proposal: z.object({ id: z.uuid(), status: z.string() }),
      protectedActionExecuted: z.literal(false),
    })
    .parse(data);
};

export const executeIntelligenceProposal = async (input: {
  proposalId: string;
}): Promise<ProtectedWriteReceipt> => {
  const proposalId = z.uuid().parse(input.proposalId);
  const { data, error } = await supabase.functions.invoke(
    "agent-orchestrator",
    {
      body: { action: "execute_proposal", proposalId },
    }
  );
  if (error) throw error;
  return z.object({ receipt: protectedWriteReceiptSchema }).parse(data).receipt;
};
