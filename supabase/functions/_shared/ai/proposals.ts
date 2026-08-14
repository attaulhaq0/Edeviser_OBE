import {
  isProtectedActionType,
  requiredApproverRole,
  type AgentActionProposal,
  type AgentExecutionContext,
  type AgentIdentity,
  type EvidenceReference,
  type JsonObject,
  type JsonValue,
  type ProtectedActionType,
} from "./contracts.ts";
import { hashEvidence } from "./hash.ts";

export interface ProposalRequest {
  actionType: ProtectedActionType;
  payload: JsonObject;
  reason: string;
  evidence: EvidenceReference[];
  studentId?: string;
  courseId?: string;
  programId?: string;
}

export interface ProposalStore {
  create(
    proposal: Omit<AgentActionProposal, "id"> & {
      studentId?: string;
      courseId?: string;
      programId?: string;
    }
  ): Promise<AgentActionProposal>;
}

export interface AuthorizedProposalScope {
  studentId?: string;
  courseId?: string;
  programId?: string;
  requiredApproverUserId: string;
}

export interface ProposalAuthorizer {
  authorizeProposal(
    request: ProposalRequest,
    context: AgentExecutionContext,
    approverRole: AgentIdentity["role"]
  ): Promise<AuthorizedProposalScope | null>;
}

export class ProposalBoundaryError extends Error {
  constructor(
    readonly kind:
      | "invalid_proposal"
      | "unauthorized_scope"
      | "unauthorized_approver"
      | "expired"
      | "already_decided",
    message: string
  ) {
    super(message);
    this.name = "ProposalBoundaryError";
  }
}

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const optionalUuid = (value: unknown, field: string): string | undefined => {
  if (value === undefined) return undefined;
  if (typeof value !== "string" || !uuidPattern.test(value)) {
    throw new ProposalBoundaryError(
      "invalid_proposal",
      `${field} must be a UUID`
    );
  }
  return value;
};

const parseJsonValue = (value: unknown, depth: number): JsonValue => {
  if (depth > 6) {
    throw new ProposalBoundaryError(
      "invalid_proposal",
      "Proposal payload exceeds the maximum nesting depth"
    );
  }
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "boolean"
  ) {
    if (typeof value === "string" && value.length > 8000) {
      throw new ProposalBoundaryError(
        "invalid_proposal",
        "Proposal payload string is too long"
      );
    }
    return value;
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new ProposalBoundaryError(
        "invalid_proposal",
        "Proposal payload numbers must be finite"
      );
    }
    return value;
  }
  if (Array.isArray(value)) {
    if (value.length > 100) {
      throw new ProposalBoundaryError(
        "invalid_proposal",
        "Proposal payload arrays may contain at most 100 items"
      );
    }
    return value.map((entry) => parseJsonValue(entry, depth + 1));
  }
  if (!value || typeof value !== "object") {
    throw new ProposalBoundaryError(
      "invalid_proposal",
      "Proposal payload must contain JSON values only"
    );
  }
  const entries = Object.entries(value as Record<string, unknown>);
  if (entries.length > 50) {
    throw new ProposalBoundaryError(
      "invalid_proposal",
      "Proposal payload objects may contain at most 50 fields"
    );
  }
  const result: Record<string, JsonValue> = {};
  for (const [key, entry] of entries) {
    if (
      key.length === 0 ||
      key.length > 100 ||
      ["__proto__", "prototype", "constructor"].includes(key)
    ) {
      throw new ProposalBoundaryError(
        "invalid_proposal",
        "Proposal payload contains an invalid field name"
      );
    }
    result[key] = parseJsonValue(entry, depth + 1);
  }
  return result;
};

const parsePayload = (value: unknown): JsonObject => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new ProposalBoundaryError(
      "invalid_proposal",
      "Proposal payload must be a JSON object"
    );
  }
  const payload = parseJsonValue(value, 0) as JsonObject;
  if (JSON.stringify(payload).length > 32_000) {
    throw new ProposalBoundaryError(
      "invalid_proposal",
      "Proposal payload exceeds 32000 serialized characters"
    );
  }
  return payload;
};

const parseEvidence = (value: unknown): EvidenceReference[] => {
  if (!Array.isArray(value) || value.length > 20) {
    throw new ProposalBoundaryError(
      "invalid_proposal",
      "evidence must be an array of at most 20 references"
    );
  }
  return value.map((entry) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      throw new ProposalBoundaryError(
        "invalid_proposal",
        "evidence references must be objects"
      );
    }
    const row = entry as Record<string, unknown>;
    if (
      !["record", "outcome", "material", "signal", "calculation"].includes(
        String(row.kind)
      ) ||
      typeof row.id !== "string" ||
      row.id.length > 200
    ) {
      throw new ProposalBoundaryError(
        "invalid_proposal",
        "evidence reference is invalid"
      );
    }
    return {
      kind: row.kind as EvidenceReference["kind"],
      id: row.id,
      ...(typeof row.label === "string"
        ? { label: row.label.slice(0, 200) }
        : {}),
      ...(typeof row.observedAt === "string"
        ? { observedAt: row.observedAt }
        : {}),
    };
  });
};

export const parseProposalRequest = (value: unknown): ProposalRequest => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new ProposalBoundaryError(
      "invalid_proposal",
      "Proposal must be a JSON object"
    );
  }
  const row = value as Record<string, unknown>;
  if (!isProtectedActionType(row.actionType)) {
    throw new ProposalBoundaryError(
      "invalid_proposal",
      "Action is not in the protected-action registry"
    );
  }
  if (
    typeof row.reason !== "string" ||
    row.reason.trim().length === 0 ||
    row.reason.length > 4000
  ) {
    throw new ProposalBoundaryError(
      "invalid_proposal",
      "Proposal reason must contain 1 to 4000 characters"
    );
  }
  return {
    actionType: row.actionType,
    payload: parsePayload(row.payload),
    reason: row.reason.trim(),
    evidence: parseEvidence(row.evidence ?? []),
    studentId: optionalUuid(row.studentId, "studentId"),
    courseId: optionalUuid(row.courseId, "courseId"),
    programId: optionalUuid(row.programId, "programId"),
  };
};

export const createHumanApprovalProposal = async (
  raw: unknown,
  context: AgentExecutionContext,
  store: ProposalStore,
  authorizer: ProposalAuthorizer,
  now = new Date()
): Promise<AgentActionProposal> => {
  const request = parseProposalRequest(raw);
  const approverRole = requiredApproverRole(request.actionType);
  const authorizedScope = await authorizer.authorizeProposal(
    request,
    context,
    approverRole
  );
  if (!authorizedScope) {
    throw new ProposalBoundaryError(
      "unauthorized_scope",
      "Proposal scope or required approver is not authorized"
    );
  }
  const evidenceHash = await hashEvidence(request.evidence);
  const idempotencyKey = await hashEvidence({
    institutionId: context.identity.institutionId,
    actorUserId: context.identity.userId,
    actionType: request.actionType,
    studentId: authorizedScope.studentId,
    courseId: authorizedScope.courseId,
    programId: authorizedScope.programId,
    payload: request.payload,
    evidenceHash,
  });
  return store.create({
    runId: context.runId,
    actorUserId: context.identity.userId,
    institutionId: context.identity.institutionId,
    actionType: request.actionType,
    payload: request.payload,
    reason: request.reason,
    evidence: request.evidence,
    evidenceHash,
    risk: "protected",
    requiredApproverRole: approverRole,
    requiredApproverUserId: authorizedScope.requiredApproverUserId,
    status: "pending",
    idempotencyKey,
    createdAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + 7 * 86_400_000).toISOString(),
    studentId: authorizedScope.studentId,
    courseId: authorizedScope.courseId,
    programId: authorizedScope.programId,
  });
};

export const assertMayDecideProposal = (
  proposal: AgentActionProposal,
  approver: AgentIdentity,
  now = new Date()
): void => {
  if (proposal.status !== "pending") {
    throw new ProposalBoundaryError(
      "already_decided",
      "Proposal is no longer pending"
    );
  }
  if (proposal.expiresAt && Date.parse(proposal.expiresAt) <= now.getTime()) {
    throw new ProposalBoundaryError("expired", "Proposal has expired");
  }
  if (
    approver.institutionId !== proposal.institutionId ||
    approver.role !== proposal.requiredApproverRole ||
    (proposal.requiredApproverUserId !== undefined &&
      proposal.requiredApproverUserId !== approver.userId)
  ) {
    throw new ProposalBoundaryError(
      "unauthorized_approver",
      "Caller is not the required proposal approver"
    );
  }
};
