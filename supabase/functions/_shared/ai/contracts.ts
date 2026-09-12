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

// ─── v2: Assessment Model & Framework Context ────────────────────────────────
// Accreditation-native foundation: every agent receives scoped framework
// semantics so that IB ≠ IGCSE ≠ QNSA in actual agent reasoning.

export const ASSESSMENT_MODELS = [
  "percent",
  "criterion",
  "band_grade",
  "component",
] as const;
export type AssessmentModel = (typeof ASSESSMENT_MODELS)[number];

export interface FrameworkContext {
  /** Accreditation bodies active for this institution (e.g. ["IB","CIS"]). */
  readonly accreditationBodies?: readonly string[];
  /** Primary accreditation body (e.g. "IB"). */
  readonly primaryAccreditation?: string;
  /** competency_frameworks.id — the curriculum framework. */
  readonly frameworkId?: string;
  /** Framework code (e.g. "MYP","IGCSE","MOEHE"). */
  readonly frameworkCode?: string;
  /** curriculum_code from course (e.g. "0580","MYP-SCI-7"). */
  readonly curriculumCode?: string;
  /** Key stage (e.g. "KS3","KS4","MYP"). */
  readonly keyStage?: string;
  /** How this course assesses students. */
  readonly assessmentModel?: AssessmentModel;
  /** grade_scales.id — the active grade scale for this course/institution. */
  readonly gradeScaleId?: string;
  /** Versioned assessment policy — increments when grade boundaries change. */
  readonly assessmentPolicyVersion?: string;
  /** Versioned attainment policy — increments when thresholds change. */
  readonly attainmentPolicyVersion?: string;
  /** Default language for the institution (en/ar). */
  readonly defaultLanguage?: string;
}

// ─── Agent identity & context (v2: +framework) ───────────────────────────────

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
  /** v2: framework-aware context. Populated when course/institution data is available. */
  framework?: FrameworkContext;
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
  toolVersion?: string;
  payload: JsonObject;
  reason: string;
  evidence: readonly EvidenceReference[];
  evidenceHash?: string;
  risk: "protected";
  requiredApproverRole: AuthenticatedRole;
  requiredApproverUserId?: string;
  status: Exclude<ApprovalState, "not_required">;
  idempotencyKey: string;
  createdAt: string;
  expiresAt?: string;
  studentId?: string;
  courseId?: string;
  programId?: string;
}

export interface StudentLearningStateContract {
  version: number;
  studentId: string;
  institutionId: string;
  calculatedAt: string;
  freshUntil: string;
  freshness: JsonObject;
  mastery: {
    outcomes: readonly JsonObject[];
    subClos: readonly JsonObject[];
  };
  habits: {
    windowDays: number;
    signals: JsonObject;
  };
  riskSignals: readonly JsonObject[];
  strengths: readonly JsonObject[];
  opportunities: readonly JsonObject[];
  goals: readonly JsonObject[];
  activeInterventions: readonly JsonObject[];
  recentEvidence: readonly JsonObject[];
  recommendationHistory: readonly JsonObject[];
  approvedExecutedActions: readonly JsonObject[];
  measuredInterventionEffects: readonly JsonObject[];
  stateHash: string;
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
  "acknowledge_child_support_plan",
  // Task 6.2 — Admin ILO governance (PDF §18/§25): every official outcome
  // mutation is a protected action requiring Admin approval. A3 NEVER
  // bypasses these.
  "create_ilo",
  "update_ilo",
  "delete_ilo",
  "reorder_ilos",
  // Task 8.9 — decision-intelligence closed loop: an approved intervention
  // draft becomes an official learning_interventions record. Coordinator
  // approval is ALWAYS required (A3 never bypasses).
  "create_learning_intervention",
  // Task 7.8 — curriculum ingestion: extracted CLO candidates + tentative
  // mappings become official outcomes ONLY after coordinator approval.
  "ingest_curriculum",
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
  if (
    ["create_ilo", "update_ilo", "delete_ilo", "reorder_ilos"].includes(action)
  ) {
    return "admin";
  }
  if (action === "acknowledge_child_support_plan") {
    return "parent";
  }
  // Task 8.9: official intervention records are coordinator-approved — the
  // routed owner performs the work, the coordinator owns the record.
  if (action === "create_learning_intervention") {
    return "coordinator";
  }
  // Task 7.8: curriculum ingestion writes program outcomes — coordinator-owned.
  if (action === "ingest_curriculum") {
    return "coordinator";
  }
  return "admin";
};

/** A3 never changes whether an action is protected. */
export const requiresHumanApproval = (
  action: string,
  _autonomy: OperationalAutonomy
): boolean => isProtectedActionType(action);
