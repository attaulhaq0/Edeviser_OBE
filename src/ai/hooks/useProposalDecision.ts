// Feature: Agent approval flows (tasks.md 3.4 — Wave D3).
// TanStack Query mutation wrapping the agent-orchestrator decision endpoints.
//
// Authorization: the browser only ever sends {action, proposalId, reason?}
// with the caller's JWT. The function loads the proposal via service-role,
// runs assertMayDecideProposal (status/expiry/institution/role/user), then
// REVALIDATES target scope before the race-guarded conditional UPDATE. The
// client performs no authorization logic.

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import {
  AgentDecisionError,
  type ProposalDecisionErrorCode,
  toProposalDecisionError,
} from "@/lib/agentProposals";

// ─── Types ───────────────────────────────────────────────────────────────────

export type ProposalDecision = "approve" | "reject";

export interface DecideProposalInput {
  readonly proposalId: string;
  readonly decision: ProposalDecision;
  /** Optional free-text rationale recorded on the proposal (max 2000 chars). */
  readonly reason?: string;
}

export interface DecisionProposalReceipt {
  readonly id: string;
  readonly status: "approved" | "rejected";
  readonly decided_at: string | null;
}

export interface DecideProposalResult {
  readonly proposal: DecisionProposalReceipt;
  protectedActionExecuted: false;
}

const DECISION_ACTION: Record<ProposalDecision, "approve_proposal" | "reject_proposal"> =
  { approve: "approve_proposal", reject: "reject_proposal" };

// ─── Edge-call plumbing ──────────────────────────────────────────────────────

/** Extracts the bounded error code from a FunctionsHttpError-style failure. */
const extractErrorCode = async (error: unknown): Promise<ProposalDecisionErrorCode> => {
  if (
    typeof error === "object" &&
    error !== null &&
    "context" in error &&
    typeof (error as { context?: unknown }).context === "object" &&
    (error as { context?: { json?: unknown } }).context !== null &&
    typeof ((error as { context: { json?: unknown } }).context.json) === "function"
  ) {
    try {
      const body = await (
        error as { context: { json: () => Promise<unknown> } }
      ).context.json();
      const code = (body as { error?: { code?: unknown } })?.error?.code;
      if (typeof code === "string") return code as ProposalDecisionErrorCode;
    } catch {
      // fall through to unknown
    }
  }
  return "unknown_error";
};

const decideProposal = async ({
  proposalId,
  decision,
  reason,
}: DecideProposalInput): Promise<DecideProposalResult> => {
  let data: unknown;
  let error: unknown;
  try {
    ({ data, error } = await supabase.functions.invoke("agent-orchestrator", {
      body: {
        action: DECISION_ACTION[decision],
        proposalId,
        ...(reason ? { reason } : {}),
      },
    }));
  } catch (thrown) {
    // BOUND every failure onto the fixed error-code set before it escapes.
    // HTTP-shaped failures carry { context: { json } } → bounded server code.
    throw new AgentDecisionError(await extractErrorCode(thrown));
  }
  if (error) {
    throw new AgentDecisionError(await extractErrorCode(error));
  }
  const receipt = (
    data as { proposal?: Partial<DecisionProposalReceipt> } | null
  )?.proposal;
  if (
    !receipt ||
    typeof receipt.id !== "string" ||
    (receipt.status !== "approved" && receipt.status !== "rejected")
  ) {
    throw new AgentDecisionError("unknown_error");
  }
  return {
    proposal: receipt as DecisionProposalReceipt,
    protectedActionExecuted: false,
  };
};

// ─── Hook ────────────────────────────────────────────────────────────────────

/**
 * Approve/reject mutation for a pending agent action proposal. Decisions are
 * ALWAYS explicit human actions — nothing here auto-executes; execution is a
 * separate server-side step with its own re-validation.
 */
export const useProposalDecision = (
  options: {
    /** Query keys invalidated after a successful decision (e.g. inbox lists). */
    readonly invalidateOnSuccess?: readonly (readonly unknown[])[];
    readonly onError?: (error: AgentDecisionError) => void;
    readonly onSuccess?: (result: DecideProposalResult) => void;
  } = {},
) => {
  const queryClient = useQueryClient();

  return useMutation<DecideProposalResult, AgentDecisionError, DecideProposalInput>({
    mutationFn: decideProposal,
    onSuccess: (result) => {
      for (const key of options.invalidateOnSuccess ?? []) {
        void queryClient.invalidateQueries({ queryKey: [...key] });
      }
      options.onSuccess?.(result);
    },
    onError: (error) => {
      options.onError?.(error);
    },
  });
};

export { toProposalDecisionError };
