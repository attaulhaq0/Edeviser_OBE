export const AUTHENTICATED_ROLES = [
  "student",
  "teacher",
  "parent",
  "coordinator",
  "admin",
] as const;

export type AuthenticatedRole = (typeof AUTHENTICATED_ROLES)[number];
export type AgentSpecialist =
  | "tutor"
  | "mastery"
  | "habit"
  | "risk"
  | "intervention"
  | "teacher"
  | "parent"
  | "coordinator"
  | "admin"
  | "evaluator";
export type OperationalAutonomy = "A0" | "A1" | "A2" | "A3";
export type AgentRisk = "read" | "low" | "protected";
export type ApprovalState =
  | "not_required"
  | "pending"
  | "approved"
  | "rejected"
  | "expired"
  | "executed";

export interface AgentIdentity {
  userId: string;
  role: AuthenticatedRole;
  institutionId: string;
}

export interface AgentPageContext {
  route: string;
  studentId?: string;
  courseId?: string;
  programId?: string;
}

export interface AgentExecutionContext {
  requestId: string;
  runId: string;
  sessionId: string;
  identity: AgentIdentity;
  page: AgentPageContext;
  specialist: AgentSpecialist;
}

export interface EvidenceReference {
  kind: "record" | "outcome" | "material" | "signal" | "calculation";
  id: string;
  label?: string;
  observedAt?: string;
}

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonObject | readonly JsonValue[];
export interface JsonObject {
  readonly [key: string]: JsonValue;
}

export interface AgentActionProposal {
  id: string;
  runId: string;
  actorUserId: string;
  institutionId: string;
  actionType: string;
  payload: JsonObject;
  reason: string;
  evidence: readonly EvidenceReference[];
  risk: "protected";
  requiredApproverRole: AuthenticatedRole;
  requiredApproverUserId?: string;
  status: Exclude<ApprovalState, "not_required">;
  idempotencyKey: string;
  createdAt: string;
  expiresAt?: string;
}

export interface StudentLearningStateContract {
  version: 1;
  studentId: string;
  institutionId: string;
  calculatedAt: string;
  mastery: Readonly<Record<string, number>>;
  outcomeAttainment: Readonly<Record<string, number>>;
  habitSignals: readonly EvidenceReference[];
  riskSignals: readonly EvidenceReference[];
  strengths: readonly string[];
  interventions: readonly string[];
  goals: readonly string[];
  recentEvidence: readonly EvidenceReference[];
  engagement: Readonly<Record<string, number | string>>;
  recommendationHistory: readonly string[];
  approvedActions: readonly string[];
  measuredEffects: readonly string[];
}

export const isAuthenticatedRole = (
  value: unknown
): value is AuthenticatedRole =>
  typeof value === "string" &&
  (AUTHENTICATED_ROLES as readonly string[]).includes(value);

export const SPECIALISTS_BY_ROLE: Readonly<
  Record<AuthenticatedRole, readonly AgentSpecialist[]>
> = {
  student: ["tutor", "mastery", "habit", "evaluator"],
  teacher: ["teacher", "mastery", "risk", "intervention", "evaluator"],
  parent: ["parent", "evaluator"],
  coordinator: ["coordinator", "mastery", "risk", "evaluator"],
  admin: ["admin", "coordinator", "risk", "evaluator"],
};

export const PROTECTED_ACTIONS = [
  "create_planner_session",
  "create_goal",
  "send_teacher_message",
  "notify_parent",
  "send_external_message",
  "publish_assignment",
  "publish_official_content",
  "change_outcome_mapping",
  "create_cqi_action",
  "change_deadline",
  "change_grade",
  "change_attendance",
  "change_student_record",
  "change_role_permission",
  "change_institution_policy",
  "financial_action",
  "institution_communication",
] as const;

export type ProtectedActionType = (typeof PROTECTED_ACTIONS)[number];

export const isProtectedActionType = (
  value: unknown
): value is ProtectedActionType =>
  typeof value === "string" &&
  (PROTECTED_ACTIONS as readonly string[]).includes(value);

export const requiredApproverRole = (
  action: ProtectedActionType
): AuthenticatedRole => {
  if (["create_planner_session", "create_goal"].includes(action)) {
    return "student";
  }
  if (
    [
      "send_teacher_message",
      "notify_parent",
      "publish_assignment",
      "publish_official_content",
      "change_deadline",
      "change_grade",
      "change_attendance",
      "change_student_record",
    ].includes(action)
  ) {
    return "teacher";
  }
  if (["change_outcome_mapping", "create_cqi_action"].includes(action)) {
    return "coordinator";
  }
  return "admin";
};

/** A3 never changes whether an action is protected. */
export const requiresHumanApproval = (
  action: string,
  _autonomy: OperationalAutonomy
): boolean => isProtectedActionType(action);
