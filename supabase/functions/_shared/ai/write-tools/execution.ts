import type { AgentActionProposal, AgentIdentity } from "../contracts.ts";
import {
  ProtectedWriteBoundaryError,
  protectedWriteForProposal,
} from "./registry.ts";

export interface CurrentExecutionAuthorizer {
  authorizeCurrentScope(
    proposal: AgentActionProposal,
    approver: AgentIdentity
  ): Promise<boolean>;
}

export interface ProtectedWriteExecutor {
  executeApprovedPersonalAction(proposalId: string): Promise<unknown>;
}

export interface ProtectedExecutionPolicy {
  featureEnabled: boolean;
  protectedWritesEnabled: boolean;
}

export const executeApprovedProposal = async (
  proposal: AgentActionProposal,
  approver: AgentIdentity,
  policy: ProtectedExecutionPolicy,
  authorizer: CurrentExecutionAuthorizer,
  executor: ProtectedWriteExecutor,
  now = new Date()
): Promise<Record<string, unknown>> => {
  if (!policy.featureEnabled || !policy.protectedWritesEnabled) {
    throw new ProtectedWriteBoundaryError(
      "feature_disabled",
      "Protected write execution is disabled"
    );
  }
  if (proposal.status !== "approved" && proposal.status !== "executed") {
    throw new ProtectedWriteBoundaryError(
      "not_approved",
      "Proposal must be approved before execution"
    );
  }
  if (
    proposal.status === "approved" &&
    proposal.expiresAt &&
    Date.parse(proposal.expiresAt) <= now.getTime()
  ) {
    throw new ProtectedWriteBoundaryError("expired", "Proposal has expired");
  }
  if (
    proposal.institutionId !== approver.institutionId ||
    proposal.requiredApproverRole !== approver.role ||
    proposal.requiredApproverUserId !== approver.userId
  ) {
    throw new ProtectedWriteBoundaryError(
      "unauthorized_approver",
      "Caller is not the exact approved executor"
    );
  }
  if (
    !proposal.evidenceHash ||
    !/^[0-9a-f]{64}$/i.test(proposal.evidenceHash)
  ) {
    throw new ProtectedWriteBoundaryError(
      "invalid_evidence",
      "Proposal evidence hash is invalid"
    );
  }

  const tool = protectedWriteForProposal(proposal);
  if (!tool) {
    throw new ProtectedWriteBoundaryError(
      "unknown_tool",
      "Proposal action has no registered write executor"
    );
  }
  if (!tool.allowedApproverRoles.includes(approver.role)) {
    throw new ProtectedWriteBoundaryError(
      "unauthorized_approver",
      "Approver role cannot execute this protected write"
    );
  }
  tool.validateInput(proposal.payload);
  if (!(await authorizer.authorizeCurrentScope(proposal, approver))) {
    throw new ProtectedWriteBoundaryError(
      "unauthorized_scope",
      "Proposal scope is no longer authorized"
    );
  }

  try {
    return tool.validateOutput(
      await executor.executeApprovedPersonalAction(proposal.id)
    );
  } catch (error) {
    if (error instanceof ProtectedWriteBoundaryError) throw error;
    throw new ProtectedWriteBoundaryError(
      "execution_failed",
      "Protected write could not be executed"
    );
  }
};
