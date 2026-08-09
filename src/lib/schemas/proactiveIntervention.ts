import { z } from "zod";

export const proactiveInterventionApprovalSchema = z.object({
  proposalAuditId: z.uuid(),
  approvedMessage: z.string().trim().min(1).max(1_000),
});

export type ProactiveInterventionApprovalInput = z.infer<
  typeof proactiveInterventionApprovalSchema
>;
