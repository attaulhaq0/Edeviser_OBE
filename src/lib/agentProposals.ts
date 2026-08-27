// Feature: Agent approval flows (tasks.md 3.4 — Wave D3).
// Client-safe business logic for agent_action_proposals decision UX.
//
// LIVE-DB CONTRACT (verified via MCP pg_catalog/pg_constraint 2026-08-27):
// - table agent_action_proposals: RLS ENABLED with ZERO policies ⇒ direct
//   client SELECT returns nothing by design; ALL access flows through the
//   agent-orchestrator edge function (service-role server-side).
// - status CHECK: pending | approved | rejected | expired | executed
// - pending ⇔ decided_at IS NULL AND decided_by IS NULL (constraint-enforced)
// - required_approver_role ∈ student|teacher|parent|coordinator|admin
// Server remains authoritative for authorization (assertMayDecideProposal +
// scope revalidation); every client-side check here is DISPLAY/HINT ONLY.

import { z } from "zod";

// ─── Types ───────────────────────────────────────────────────────────────────

export type AgentRole =
  | "student"
  | "teacher"
  | "coordinator"
  | "admin"
  | "parent";

export type ProposalStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "expired"
  | "executed";

/** Client-safe projection of an agent_action_proposals row for the card. */
export interface AgentProposalView {
  readonly id: string;
  readonly actionType: string;
  readonly reason: string;
  /** Number of evidence references attached to the proposal. */
  readonly evidenceCount: number;
  readonly requiredApproverRole: AgentRole;
  /** When present, ONLY this user id may decide the proposal (server-verified). */
  readonly requiredApproverUserId?: string;
  readonly status: ProposalStatus;
  readonly createdAt: string;
  readonly expiresAt?: string;
}

/** Identity of the authenticated actor viewing/deciding a proposal. */
export interface ProposalViewer {
  readonly role: AgentRole;
  readonly userId: string;
}

// ─── Boundary validation ─────────────────────────────────────────────────────

const STATUS_VALUES: readonly ProposalStatus[] = [
  "pending",
  "approved",
  "rejected",
  "expired",
  "executed",
];

const ROLE_VALUES: readonly AgentRole[] = [
  "student",
  "teacher",
  "coordinator",
  "admin",
  "parent",
];

const isoDate = z
  .string()
  .refine((value) => !Number.isNaN(Date.parse(value)), {
    message: "must be an ISO timestamp",
  });

export const agentProposalViewSchema = z.object({
  id: z.string().uuid(),
  actionType: z.string().min(1),
  reason: z.string().min(1),
  evidenceCount: z.number().int().nonnegative(),
  requiredApproverRole: z.enum(ROLE_VALUES as [AgentRole, ...AgentRole[]]),
  requiredApproverUserId: z.string().uuid().optional(),
  status: z.enum(STATUS_VALUES as [ProposalStatus, ...ProposalStatus[]]),
  createdAt: isoDate,
  expiresAt: isoDate.optional(),
});

/**
 * Parses untrusted proposal-shaped data (rows/edge payloads) into a validated
 * {@link AgentProposalView}; returns null when the shape does not conform so
 * callers can skip bad entries instead of rendering garbage.
 */
export const parseAgentProposalView = (
  value: unknown,
): AgentProposalView | null => {
  const result = agentProposalViewSchema.safeParse(value);
  return result.success ? result.data : null;
};

// ─── Display-only decidability checks ────────────────────────────────────────

/** True when the proposal is still open AND its expiry has not passed. */
export const isOpenProposal = (
  proposal: AgentProposalView,
  now: Date = new Date(),
): boolean =>
  proposal.status === "pending" &&
  (!proposal.expiresAt || Date.parse(proposal.expiresAt) > now.getTime());

/**
 * True when the viewer passes the proposal's approver requirements.
 * HINT ONLY — the orchestrator re-verifies this server-side and fails closed.
 */
export const isViewerAllowedToDecide = (
  proposal: AgentProposalView,
  viewer: ProposalViewer,
): boolean =>
  viewer.role === proposal.requiredApproverRole &&
  (proposal.requiredApproverUserId === undefined ||
    proposal.requiredApproverUserId === viewer.userId);

/** Combined display gate: hide action buttons unless BOTH checks pass. */
export const canViewerDecideProposal = (
  proposal: AgentProposalView,
  viewer: ProposalViewer,
  now: Date = new Date(),
): boolean =>
  isOpenProposal(proposal, now) && isViewerAllowedToDecide(proposal, viewer);

// ─── Error surfacing ─────────────────────────────────────────────────────────

/** Error codes returned by the agent-orchestrator decision endpoints. */
export type ProposalDecisionErrorCode =
  | "unauthorized"
  | "invalid_proposal_id"
  | "proposal_not_found"
  | "unauthorized_approver"
  | "expired"
  | "already_decided"
  | "proposal_already_decided"
  | "proposal_scope_changed"
  | "unknown_error";

export class AgentDecisionError extends Error {
  constructor(readonly code: ProposalDecisionErrorCode) {
    super(`Agent decision failed: ${code}`);
    this.name = "AgentDecisionError";
  }
}

/** Maps any thrown value from the decision call onto a bounded error code. */
export const toProposalDecisionError = (error: unknown): AgentDecisionError => {
  if (error instanceof AgentDecisionError) return error;
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof (error as { code?: unknown }).code === "string"
  ) {
    return new AgentDecisionError(
      (error as { code: ProposalDecisionErrorCode }).code,
    );
  }
  return new AgentDecisionError("unknown_error");
};

// ─── Action-type presentation keys ───────────────────────────────────────────

/**
 * Known protected-action types → i18n keys under `ai.approvalCard.actions`.
 * Unknown types render their raw identifier (monospace) instead of guessing.
 */
const KNOWN_ACTION_TYPES: ReadonlySet<string> = new Set([
  "draft_ilo",
  "propose_create_ilo",
  "propose_update_ilo",
  "propose_delete_ilo",
  "propose_reorder_ilos",
  "draft_plo",
  "propose_plo_ilo_mapping",
  "draft_clo",
  "propose_clo_plo_mapping",
  "draft_cqi_action",
  "create_cqi_action",
]);

export const hasLocalizedActionType = (actionType: string): boolean =>
  KNOWN_ACTION_TYPES.has(actionType);

