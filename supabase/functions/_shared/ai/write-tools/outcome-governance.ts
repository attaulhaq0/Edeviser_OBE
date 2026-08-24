/**
 * Task 6.2 (edeviser-agentic-intelligence) — Admin ILO governance write tools.
 *
 * Typed, proposal-gated write tools per PDF §18/§25. NONE of these tools
 * executes anything: every call is validated, then routed through
 * createHumanApprovalProposal, producing an agent_action_proposals row that
 * requires ADMIN approval. A3 autonomy never bypasses this boundary.
 *
 * Tool surface (admin role only):
 *   - draft_ilo                    → read-only draft artifact (no proposal)
 *   - propose_create_ilo           → protected action create_ilo
 *   - propose_update_ilo           → protected action update_ilo
 *   - propose_delete_ilo           → protected action delete_ilo
 *   - propose_reorder_ilos         → protected action reorder_ilos
 *   - draft_ilo_governance_report  → read-only draft artifact (no proposal)
 */
import type { AgentExecutionContext, JsonObject } from "../contracts.ts";
import type { AIToolDefinition } from "../provider.ts";
import {
  createHumanApprovalProposal,
  type ProposalAuthorizer,
  type ProposalStore,
} from "../proposals.ts";

export type OutcomeGovernanceToolName =
  | "draft_ilo"
  | "propose_create_ilo"
  | "propose_update_ilo"
  | "propose_delete_ilo"
  | "propose_reorder_ilos"
  | "draft_ilo_governance_report";

export const OUTCOME_GOVERNANCE_VERSION = "1.0.0";

export const OUTCOME_GOVERNANCE_TOOL_NAMES: readonly OutcomeGovernanceToolName[] =
  [
    "draft_ilo",
    "propose_create_ilo",
    "propose_update_ilo",
    "propose_delete_ilo",
    "propose_reorder_ilos",
    "draft_ilo_governance_report",
  ];

export const isOutcomeGovernanceTool = (
  name: string
): name is OutcomeGovernanceToolName =>
  (OUTCOME_GOVERNANCE_TOOL_NAMES as readonly string[]).includes(name);

export class OutcomeGovernanceBoundaryError extends Error {
  constructor(
    readonly kind:
      | "unknown_tool"
      | "unauthorized_role"
      | "invalid_input"
      | "invalid_evidence",
    message: string
  ) {
    super(message);
    this.name = "OutcomeGovernanceBoundaryError";
  }
}

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const asObject = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new OutcomeGovernanceBoundaryError(
      "invalid_input",
      "Tool input must be a JSON object"
    );
  }
  return value as Record<string, unknown>;
};

const requireUuid = (value: unknown, field: string): string => {
  if (typeof value !== "string" || !uuidPattern.test(value)) {
    throw new OutcomeGovernanceBoundaryError(
      "invalid_input",
      `${field} must be a UUID`
    );
  }
  return value;
};

const requireText = (value: unknown, field: string, max: number): string => {
  if (
    typeof value !== "string" ||
    value.trim().length === 0 ||
    value.length > max
  ) {
    throw new OutcomeGovernanceBoundaryError(
      "invalid_input",
      `${field} must contain 1 to ${max} characters`
    );
  }
  return value.trim();
};

const requireEvidence = (
  value: unknown
): readonly Record<string, unknown>[] => {
  if (!Array.isArray(value) || value.length === 0 || value.length > 20) {
    throw new OutcomeGovernanceBoundaryError(
      "invalid_evidence",
      "evidence must be a non-empty array of at most 20 references"
    );
  }
  for (const entry of value) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      throw new OutcomeGovernanceBoundaryError(
        "invalid_evidence",
        "evidence references must be objects"
      );
    }
    const row = entry as Record<string, unknown>;
    if (
      !["record", "outcome", "material", "signal", "calculation"].includes(
        String(row.kind)
      ) ||
      typeof row.id !== "string" ||
      row.id.length === 0 ||
      row.id.length > 200
    ) {
      throw new OutcomeGovernanceBoundaryError(
        "invalid_evidence",
        "evidence reference is invalid"
      );
    }
  }
  return value as Record<string, unknown>[];
};

// ─── LLM-facing tool definitions ────────────────────────────────────────────

export const outcomeGovernanceToolDefinitions =
  (): readonly AIToolDefinition[] =>
    [
      {
        name: "draft_ilo",
        description:
          "Draft a new institutional learning outcome (ILO). Produces a DRAFT artifact only — nothing is created.",
        inputJsonSchema: {
          type: "object",
          additionalProperties: false,
          properties: {
            title: { type: "string", maxLength: 300 },
            titleAr: { type: "string", maxLength: 300 },
            description: { type: "string", maxLength: 2000 },
            rationale: { type: "string", maxLength: 2000 },
          },
          required: ["title", "rationale"],
        },
      },
      {
        name: "propose_create_ilo",
        description:
          "Create an Admin-approval proposal to add a new ILO. Never executes the creation.",
        inputJsonSchema: {
          type: "object",
          additionalProperties: false,
          properties: {
            title: { type: "string", maxLength: 300 },
            titleAr: { type: "string", maxLength: 300 },
            description: { type: "string", maxLength: 2000 },
            reason: { type: "string", maxLength: 4000 },
            evidence: { type: "array", maxItems: 20 },
          },
          required: ["title", "reason", "evidence"],
        },
      },
      {
        name: "propose_update_ilo",
        description:
          "Create an Admin-approval proposal to update an existing ILO. Never executes the update.",
        inputJsonSchema: {
          type: "object",
          additionalProperties: false,
          properties: {
            iloId: { type: "string", format: "uuid" },
            title: { type: "string", maxLength: 300 },
            titleAr: { type: "string", maxLength: 300 },
            description: { type: "string", maxLength: 2000 },
            reason: { type: "string", maxLength: 4000 },
            evidence: { type: "array", maxItems: 20 },
          },
          required: ["iloId", "reason", "evidence"],
        },
      },
      {
        name: "propose_delete_ilo",
        description:
          "Create an Admin-approval proposal to delete an ILO. Deletion follows the canonical mapping direction: mapped PLO children must be unmapped first. Never executes the deletion.",
        inputJsonSchema: {
          type: "object",
          additionalProperties: false,
          properties: {
            iloId: { type: "string", format: "uuid" },
            reason: { type: "string", maxLength: 4000 },
            evidence: { type: "array", maxItems: 20 },
          },
          required: ["iloId", "reason", "evidence"],
        },
      },
      {
        name: "propose_reorder_ilos",
        description:
          "Create an Admin-approval proposal to reorder institutional ILOs. Execution uses the atomic validated reorder_learning_outcomes RPC. Never executes the reorder.",
        inputJsonSchema: {
          type: "object",
          additionalProperties: false,
          properties: {
            items: {
              type: "array",
              maxItems: 500,
              items: {
                type: "object",
                additionalProperties: false,
                properties: {
                  id: { type: "string", format: "uuid" },
                  sortOrder: { type: "integer", minimum: 0 },
                },
                required: ["id", "sortOrder"],
              },
            },
            reason: { type: "string", maxLength: 4000 },
            evidence: { type: "array", maxItems: 20 },
          },
          required: ["items", "reason", "evidence"],
        },
      },
      {
        name: "draft_ilo_governance_report",
        description:
          "Draft an ILO governance report (coverage, attainment trends, unmapped outcomes) from authorized read-tool evidence. Produces a DRAFT artifact only.",
        inputJsonSchema: {
          type: "object",
          additionalProperties: false,
          properties: {
            scope: { type: "string", enum: ["institution", "program"] },
            programId: { type: "string", format: "uuid" },
            focus: { type: "string", maxLength: 2000 },
          },
          required: ["scope"],
        },
      },
    ] as const;

// ─── Input validation + proposal routing ────────────────────────────────────

export interface OutcomeGovernanceDeps {
  proposalStore: ProposalStore;
  proposalAuthorizer: ProposalAuthorizer;
}

/**
 * Handles an outcome-governance tool call. Draft tools return a structured
 * draft artifact; propose_* tools create Admin-approval proposals through the
 * standard protected-action boundary. Nothing here mutates official records.
 */
export const handleOutcomeGovernanceToolCall = async (
  toolName: OutcomeGovernanceToolName,
  rawArgs: unknown,
  context: AgentExecutionContext,
  deps: OutcomeGovernanceDeps
): Promise<Record<string, unknown>> => {
  if (context.identity.role !== "admin") {
    throw new OutcomeGovernanceBoundaryError(
      "unauthorized_role",
      "Outcome governance tools are restricted to the admin role"
    );
  }
  const args = asObject(rawArgs);

  switch (toolName) {
    case "draft_ilo": {
      const title = requireText(args.title, "title", 300);
      const rationale = requireText(args.rationale, "rationale", 2000);
      return {
        draft: true,
        artifact: "ilo",
        ilo: {
          title,
          ...(typeof args.titleAr === "string"
            ? { titleAr: args.titleAr.slice(0, 300) }
            : {}),
          ...(typeof args.description === "string"
            ? { description: args.description.slice(0, 2000) }
            : {}),
        },
        rationale,
        executed: false,
      };
    }

    case "draft_ilo_governance_report": {
      const scope = args.scope === "program" ? "program" : "institution";
      if (scope === "program") requireUuid(args.programId, "programId");
      return {
        draft: true,
        artifact: "ilo_governance_report",
        scope,
        ...(typeof args.programId === "string"
          ? { programId: args.programId }
          : {}),
        ...(typeof args.focus === "string"
          ? { focus: args.focus.slice(0, 2000) }
          : {}),
        executed: false,
      };
    }

    case "propose_create_ilo": {
      const title = requireText(args.title, "title", 300);
      const reason = requireText(args.reason, "reason", 4000);
      const evidence = requireEvidence(args.evidence);
      const payload: JsonObject = {
        title,
        ...(typeof args.titleAr === "string"
          ? { title_ar: args.titleAr.slice(0, 300) }
          : {}),
        ...(typeof args.description === "string"
          ? { description: args.description.slice(0, 2000) }
          : {}),
      };
      const proposal = await createHumanApprovalProposal(
        { actionType: "create_ilo", payload, reason, evidence },
        context,
        deps.proposalStore,
        deps.proposalAuthorizer
      );
      return {
        proposalId: proposal.id,
        status: proposal.status,
        requiredApproverRole: proposal.requiredApproverRole,
        protectedActionExecuted: false,
      };
    }

    case "propose_update_ilo": {
      const iloId = requireUuid(args.iloId, "iloId");
      const reason = requireText(args.reason, "reason", 4000);
      const evidence = requireEvidence(args.evidence);
      const payloadRecord: Record<string, unknown> = { ilo_id: iloId };
      if (typeof args.title === "string") {
        payloadRecord.title = requireText(args.title, "title", 300);
      }
      if (typeof args.titleAr === "string") {
        payloadRecord.title_ar = args.titleAr.slice(0, 300);
      }
      if (typeof args.description === "string") {
        payloadRecord.description = args.description.slice(0, 2000);
      }
      const payload = payloadRecord as JsonObject;
      const proposal = await createHumanApprovalProposal(
        { actionType: "update_ilo", payload, reason, evidence },
        context,
        deps.proposalStore,
        deps.proposalAuthorizer
      );
      return {
        proposalId: proposal.id,
        status: proposal.status,
        requiredApproverRole: proposal.requiredApproverRole,
        protectedActionExecuted: false,
      };
    }

    case "propose_delete_ilo": {
      const iloId = requireUuid(args.iloId, "iloId");
      const reason = requireText(args.reason, "reason", 4000);
      const evidence = requireEvidence(args.evidence);
      const proposal = await createHumanApprovalProposal(
        {
          actionType: "delete_ilo",
          payload: { ilo_id: iloId } as JsonObject,
          reason,
          evidence,
        },
        context,
        deps.proposalStore,
        deps.proposalAuthorizer
      );
      return {
        proposalId: proposal.id,
        status: proposal.status,
        requiredApproverRole: proposal.requiredApproverRole,
        protectedActionExecuted: false,
      };
    }

    case "propose_reorder_ilos": {
      if (
        !Array.isArray(args.items) ||
        args.items.length === 0 ||
        args.items.length > 500
      ) {
        throw new OutcomeGovernanceBoundaryError(
          "invalid_input",
          "items must be a non-empty array of at most 500 entries"
        );
      }
      const items = args.items.map((entry) => {
        const row = asObject(entry);
        return {
          id: requireUuid(row.id, "items[].id"),
          sort_order:
            typeof row.sortOrder === "number" ? row.sortOrder : undefined,
        };
      });
      if (items.some((item) => typeof item.sort_order !== "number")) {
        throw new OutcomeGovernanceBoundaryError(
          "invalid_input",
          "every item requires a numeric sortOrder"
        );
      }
      const reason = requireText(args.reason, "reason", 4000);
      const evidence = requireEvidence(args.evidence);
      const proposal = await createHumanApprovalProposal(
        {
          actionType: "reorder_ilos",
          payload: { items } as JsonObject,
          reason,
          evidence,
        },
        context,
        deps.proposalStore,
        deps.proposalAuthorizer
      );
      return {
        proposalId: proposal.id,
        status: proposal.status,
        requiredApproverRole: proposal.requiredApproverRole,
        protectedActionExecuted: false,
      };
    }

    default:
      throw new OutcomeGovernanceBoundaryError(
        "unknown_tool",
        `Unknown outcome governance tool: ${toolName}`
      );
  }
};
