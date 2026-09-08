import type { AgentActionProposal, AuthenticatedRole } from "../contracts.ts";

export type ProtectedWriteToolName =
  | "create_goal"
  | "create_planner_session"
  | "create_cqi_action"
  | "create_learning_intervention"
  | "publish_official_content"
  | "ingest_curriculum"
  | "create_ilo"
  | "update_ilo"
  | "delete_ilo"
  | "reorder_ilos";
export type ProtectedWriteToolVersion = "1.0.0";
export type ProtectedWriteToolIdentifier =
  `${ProtectedWriteToolName}@${ProtectedWriteToolVersion}`;

export interface ProtectedWriteToolDefinition {
  name: ProtectedWriteToolName;
  version: ProtectedWriteToolVersion;
  risk: "protected";
  approvalRequired: true;
  allowedApproverRoles: readonly AuthenticatedRole[];
  validateInput(value: unknown): Record<string, unknown>;
  validateOutput(value: unknown): Record<string, unknown>;
}

export class ProtectedWriteBoundaryError extends Error {
  constructor(
    readonly kind:
      | "unknown_tool"
      | "feature_disabled"
      | "not_approved"
      | "expired"
      | "unauthorized_approver"
      | "unauthorized_scope"
      | "invalid_evidence"
      | "invalid_input"
      | "invalid_output"
      | "execution_failed",
    message: string
  ) {
    super(message);
    this.name = "ProtectedWriteBoundaryError";
  }
}

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const row = (
  value: unknown,
  kind: "invalid_input" | "invalid_output"
): Record<string, unknown> => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new ProtectedWriteBoundaryError(kind, "Value must be an object");
  }
  return value as Record<string, unknown>;
};

const exactKeys = (
  value: Record<string, unknown>,
  permitted: readonly string[]
): void => {
  if (Object.keys(value).some((key) => !permitted.includes(key))) {
    throw new ProtectedWriteBoundaryError(
      "invalid_input",
      "Protected write payload contains an unsupported field"
    );
  }
};

const textField = (
  value: Record<string, unknown>,
  field: string,
  maximum: number,
  required = true
): void => {
  const entry = value[field];
  if (!required && entry === undefined) return;
  if (
    typeof entry !== "string" ||
    entry.trim().length === 0 ||
    entry.length > maximum
  ) {
    throw new ProtectedWriteBoundaryError(
      "invalid_input",
      `${field} is invalid`
    );
  }
};

const dateField = (value: unknown, field: string): void => {
  const parsed =
    typeof value === "string"
      ? Date.parse(`${value}T00:00:00.000Z`)
      : Number.NaN;
  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
    Number.isNaN(parsed) ||
    new Date(parsed).toISOString().slice(0, 10) !== value
  ) {
    throw new ProtectedWriteBoundaryError(
      "invalid_input",
      `${field} must be an ISO date`
    );
  }
};

const validateGoal = (value: unknown): Record<string, unknown> => {
  const input = row(value, "invalid_input");
  exactKeys(input, ["title", "weekStart", "goalType", "targetValue"]);
  textField(input, "title", 500);
  if (input.weekStart !== undefined) dateField(input.weekStart, "weekStart");
  if (
    input.goalType !== undefined &&
    ![
      "study_hours",
      "sessions_completed",
      "tasks_completed",
      "custom",
      "mastery",
    ].includes(String(input.goalType))
  ) {
    throw new ProtectedWriteBoundaryError(
      "invalid_input",
      "goalType is invalid"
    );
  }
  if (
    input.targetValue !== undefined &&
    (typeof input.targetValue !== "number" ||
      !Number.isFinite(input.targetValue) ||
      input.targetValue <= 0 ||
      input.targetValue > 10_000)
  ) {
    throw new ProtectedWriteBoundaryError(
      "invalid_input",
      "targetValue is invalid"
    );
  }
  return input;
};

const validatePlannerSession = (value: unknown): Record<string, unknown> => {
  const input = row(value, "invalid_input");
  exactKeys(input, [
    "title",
    "courseId",
    "plannedDate",
    "startTime",
    "durationMinutes",
    "sessionType",
    "intent",
  ]);
  textField(input, "title", 255);
  if (typeof input.courseId !== "string" || !uuidPattern.test(input.courseId)) {
    throw new ProtectedWriteBoundaryError(
      "invalid_input",
      "courseId must be a UUID"
    );
  }
  dateField(input.plannedDate, "plannedDate");
  if (
    input.startTime !== undefined &&
    (typeof input.startTime !== "string" ||
      !/^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(input.startTime))
  ) {
    throw new ProtectedWriteBoundaryError(
      "invalid_input",
      "startTime is invalid"
    );
  }
  if (
    typeof input.durationMinutes !== "number" ||
    !Number.isInteger(input.durationMinutes) ||
    input.durationMinutes < 15 ||
    input.durationMinutes > 240
  ) {
    throw new ProtectedWriteBoundaryError(
      "invalid_input",
      "durationMinutes must be an integer from 15 to 240"
    );
  }
  if (
    input.sessionType !== undefined &&
    !["focus", "pomodoro", "free", "review"].includes(String(input.sessionType))
  ) {
    throw new ProtectedWriteBoundaryError(
      "invalid_input",
      "sessionType is invalid"
    );
  }
  textField(input, "intent", 2000, false);
  return input;
};

const validateCqiAction = (value: unknown): Record<string, unknown> => {
  const input = row(value, "invalid_input");
  exactKeys(input, [
    "systemicPatternId",
    "semesterId",
    "targetAttainment",
    "actionDescription",
    "responsiblePerson",
  ]);
  for (const field of ["systemicPatternId", "semesterId"]) {
    if (typeof input[field] !== "string" || !uuidPattern.test(input[field])) {
      throw new ProtectedWriteBoundaryError(
        "invalid_input",
        `${field} must be a UUID`
      );
    }
  }
  if (
    typeof input.targetAttainment !== "number" ||
    !Number.isFinite(input.targetAttainment) ||
    input.targetAttainment < 0 ||
    input.targetAttainment > 100
  ) {
    throw new ProtectedWriteBoundaryError(
      "invalid_input",
      "targetAttainment is invalid"
    );
  }
  textField(input, "actionDescription", 4000);
  textField(input, "responsiblePerson", 500);
  return input;
};

const validateOutput = (value: unknown): Record<string, unknown> => {
  const output = row(value, "invalid_output");
  if (
    typeof output.executionId !== "string" ||
    !uuidPattern.test(output.executionId) ||
    typeof output.targetId !== "string" ||
    !uuidPattern.test(output.targetId) ||
    typeof output.learningStateVersion !== "number" ||
    !Number.isSafeInteger(output.learningStateVersion) ||
    output.learningStateVersion < 1 ||
    typeof output.alreadyExecuted !== "boolean"
  ) {
    throw new ProtectedWriteBoundaryError(
      "invalid_output",
      "Protected write returned an invalid receipt"
    );
  }
  return output;
};

const validateCqiOutput = (value: unknown): Record<string, unknown> => {
  const output = row(value, "invalid_output");
  if (
    typeof output.executionId !== "string" ||
    !uuidPattern.test(output.executionId) ||
    typeof output.targetId !== "string" ||
    !uuidPattern.test(output.targetId) ||
    typeof output.alreadyExecuted !== "boolean"
  ) {
    throw new ProtectedWriteBoundaryError(
      "invalid_output",
      "CQI execution returned an invalid receipt"
    );
  }
  return output;
};

// ---------------------------------------------------------------------------
// Task 8.9 — decision-intelligence closed loop: an approved problem-case
// draft becomes official learning_interventions rows (one per struggling
// student). Payload mirrors src/lib/problemCaseActions.ts: the draft plan is
// deterministic; the proposal carries the cited plan for coordinator review.
// ---------------------------------------------------------------------------
const validateLearningIntervention = (
  value: unknown
): Record<string, unknown> => {
  const input = row(value, "invalid_input");
  exactKeys(input, [
    "courseId",
    "interventionType",
    "plan",
    "studentIds",
    "recommendedOwner",
  ]);
  if (
    typeof input.courseId !== "string" ||
    !uuidPattern.test(input.courseId)
  ) {
    throw new ProtectedWriteBoundaryError(
      "invalid_input",
      "courseId must be a UUID"
    );
  }
  textField(input, "interventionType", 100);
  textField(input, "plan", 4000);
  const studentIds = input.studentIds;
  if (
    !Array.isArray(studentIds) ||
    studentIds.length === 0 ||
    studentIds.length > 50 ||
    studentIds.some(
      (id) => typeof id !== "string" || !uuidPattern.test(id)
    )
  ) {
    throw new ProtectedWriteBoundaryError(
      "invalid_input",
      "studentIds must be 1-50 UUIDs"
    );
  }
  // Unique — the same student must never receive duplicate rows from one
  // proposal.
  if (new Set(studentIds as string[]).size !== (studentIds as string[]).length) {
    throw new ProtectedWriteBoundaryError(
      "invalid_input",
      "studentIds must not contain duplicates"
    );
  }
  if (input.recommendedOwner !== undefined) {
    textField(input, "recommendedOwner", 50);
  }
  return input;
};

const validateLearningInterventionOutput = (
  value: unknown
): Record<string, unknown> => {
  const output = row(value, "invalid_output");
  if (
    typeof output.executionId !== "string" ||
    !uuidPattern.test(output.executionId) ||
    !Array.isArray(output.interventionIds) ||
    (output.interventionIds as unknown[]).length === 0 ||
    !(output.interventionIds as unknown[]).every(
      (id) => typeof id === "string" && uuidPattern.test(id)
    ) ||
    typeof output.count !== "number" ||
    !Number.isSafeInteger(output.count) ||
    output.count < 1 ||
    output.count !== (output.interventionIds as unknown[]).length ||
    typeof output.alreadyExecuted !== "boolean"
  ) {
    throw new ProtectedWriteBoundaryError(
      "invalid_output",
      "Learning intervention execution returned an invalid receipt"
    );
  }
  return output;
};

// ---------------------------------------------------------------------------
// Task 7.10 — AI question drafts (QA OBE-14 root cause): the generator emits
// `publish_official_content` proposals whose payload carries the validated
// question drafts. Approval (assigned teacher) + execution persists them into
// `question_bank` (approved, generation_source='ai') via
// execute_approved_teacher_content_v1. Question shape mirrors the generator's
// ValidatedQuestion (generate-quiz-questions/index.ts).
// ---------------------------------------------------------------------------
const QUESTION_TYPES = ["mcq", "true_false", "short_answer", "fill_in_blank"];

const validateQuizQuestionDraft = (value: unknown): void => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new ProtectedWriteBoundaryError(
      "invalid_input",
      "questions[] entries must be objects"
    );
  }
  const q = value as Record<string, unknown>;
  const requiredStrings: ReadonlyArray<[string, number]> = [
    ["question_text", 2000],
  ];
  for (const [field, max] of requiredStrings) {
    if (typeof q[field] !== "string" || (q[field] as string).length === 0) {
      throw new ProtectedWriteBoundaryError(
        "invalid_input",
        `questions[].${field} is required`
      );
    }
    if ((q[field] as string).length > max) {
      throw new ProtectedWriteBoundaryError(
        "invalid_input",
        `questions[].${field} exceeds ${max} characters`
      );
    }
  }
  if (typeof q.clo_id !== "string" || !uuidPattern.test(q.clo_id)) {
    throw new ProtectedWriteBoundaryError(
      "invalid_input",
      "questions[].clo_id must be a UUID"
    );
  }
  if (typeof q.id !== "string" || !uuidPattern.test(q.id)) {
    throw new ProtectedWriteBoundaryError(
      "invalid_input",
      "questions[].id must be a UUID"
    );
  }
  if (
    typeof q.bloom_level !== "number" ||
    !Number.isInteger(q.bloom_level) ||
    q.bloom_level < 1 ||
    q.bloom_level > 6
  ) {
    throw new ProtectedWriteBoundaryError(
      "invalid_input",
      "questions[].bloom_level must be an integer 1-6"
    );
  }
  if (
    typeof q.question_type !== "string" ||
    !QUESTION_TYPES.includes(q.question_type)
  ) {
    throw new ProtectedWriteBoundaryError(
      "invalid_input",
      "questions[].question_type is invalid"
    );
  }
  if (
    typeof q.difficulty_rating !== "number" ||
    !Number.isFinite(q.difficulty_rating) ||
    q.difficulty_rating < 0 ||
    q.difficulty_rating > 5
  ) {
    throw new ProtectedWriteBoundaryError(
      "invalid_input",
      "questions[].difficulty_rating must be 0-5"
    );
  }
  if (q.options !== null && q.options !== undefined && !Array.isArray(q.options)) {
    throw new ProtectedWriteBoundaryError(
      "invalid_input",
      "questions[].options must be an array or null"
    );
  }
  if (!q.correct_answer || typeof q.correct_answer !== "object" || Array.isArray(q.correct_answer)) {
    throw new ProtectedWriteBoundaryError(
      "invalid_input",
      "questions[].correct_answer must be an object"
    );
  }
};

const validatePublishOfficialContent = (
  value: unknown
): Record<string, unknown> => {
  const input = row(value, "invalid_input");
  exactKeys(input, ["kind", "questions"]);
  if (input.kind !== "quiz_question_drafts") {
    throw new ProtectedWriteBoundaryError(
      "invalid_input",
      "kind must be quiz_question_drafts"
    );
  }
  const questions = input.questions;
  if (
    !Array.isArray(questions) ||
    questions.length === 0 ||
    questions.length > 50
  ) {
    throw new ProtectedWriteBoundaryError(
      "invalid_input",
      "questions must be 1-50 drafts"
    );
  }
  for (const draft of questions) {
    validateQuizQuestionDraft(draft);
  }
  return input;
};

const validateTeacherContentOutput = (
  value: unknown
): Record<string, unknown> => {
  const output = row(value, "invalid_output");
  if (
    typeof output.executionId !== "string" ||
    !uuidPattern.test(output.executionId) ||
    !Array.isArray(output.questionIds) ||
    (output.questionIds as unknown[]).length === 0 ||
    !(output.questionIds as unknown[]).every(
      (id) => typeof id === "string" && uuidPattern.test(id)
    ) ||
    typeof output.count !== "number" ||
    !Number.isSafeInteger(output.count) ||
    output.count < 1 ||
    output.count !== (output.questionIds as unknown[]).length ||
    typeof output.alreadyExecuted !== "boolean"
  ) {
    throw new ProtectedWriteBoundaryError(
      "invalid_output",
      "Teacher content execution returned an invalid receipt"
    );
  }
  return output;
};

// ---------------------------------------------------------------------------
// Task 7.8 — curriculum ingestion: the payload mirrors the curriculum-ingest
// edge function's extraction (candidate CLOs with bilingual titles, Bloom's
// level 1-6, tentative PLO/ILO mapping references into EXISTING outcomes).
// Execution inserts CLO rows + outcome_mappings through the existing
// validated hierarchy/weight-sum constraints.
// ---------------------------------------------------------------------------
const validateIngestCurriculum = (value: unknown): Record<string, unknown> => {
  const input = row(value, "invalid_input");
  exactKeys(input, ["kind", "course_id", "program_id", "syllabus_name", "clos"]);
  if (input.kind !== "curriculum_ingest") {
    throw new ProtectedWriteBoundaryError(
      "invalid_input",
      "kind must be curriculum_ingest"
    );
  }
  for (const field of ["course_id", "program_id"]) {
    if (typeof input[field] !== "string" || !uuidPattern.test(input[field])) {
      throw new ProtectedWriteBoundaryError(
        "invalid_input",
        `${field} must be a UUID`
      );
    }
  }
  textField(input, "syllabus_name", 200);
  const clos = input.clos;
  if (
    !Array.isArray(clos) ||
    clos.length === 0 ||
    clos.length > 30 ||
    clos.some((c) => !c || typeof c !== "object" || Array.isArray(c))
  ) {
    throw new ProtectedWriteBoundaryError(
      "invalid_input",
      "clos must be 1-30 candidate objects"
    );
  }
  for (const c of clos as Record<string, unknown>[]) {
    if (
      Object.keys(c).some(
        (key) =>
          ![
            "title_en",
            "title_ar",
            "description_en",
            "blooms",
            "plo_id",
            "plo_weight",
            "ilo_id",
            "ilo_weight",
          ].includes(key)
      )
    ) {
      throw new ProtectedWriteBoundaryError(
        "invalid_input",
        "clos[] entries contain unsupported fields"
      );
    }
    if (
      typeof c.title_en !== "string" ||
      c.title_en.trim().length === 0 ||
      c.title_en.length > 300
    ) {
      throw new ProtectedWriteBoundaryError(
        "invalid_input",
        "clos[].title_en must be 1-300 characters"
      );
    }
    if (
      c.title_ar !== null &&
      c.title_ar !== undefined &&
      (typeof c.title_ar !== "string" || c.title_ar.length > 300)
    ) {
      throw new ProtectedWriteBoundaryError(
        "invalid_input",
        "clos[].title_ar must be at most 300 characters"
      );
    }
    if (
      typeof c.blooms !== "number" ||
      !Number.isInteger(c.blooms) ||
      c.blooms < 1 ||
      c.blooms > 6
    ) {
      throw new ProtectedWriteBoundaryError(
        "invalid_input",
        "clos[].blooms must be an integer 1-6"
      );
    }
    for (const field of ["plo_id", "ilo_id"]) {
      if (
        c[field] !== null &&
        c[field] !== undefined &&
        (typeof c[field] !== "string" || !uuidPattern.test(c[field]))
      ) {
        throw new ProtectedWriteBoundaryError(
          "invalid_input",
          `clos[].${field} must be a UUID or null`
        );
      }
    }
    for (const field of ["plo_weight", "ilo_weight"]) {
      if (
        c[field] !== null &&
        c[field] !== undefined &&
        (typeof c[field] !== "number" ||
          !Number.isFinite(c[field]) ||
          c[field] <= 0 ||
          c[field] > 1)
      ) {
        throw new ProtectedWriteBoundaryError(
          "invalid_input",
          `clos[].${field} must be within (0, 1]`
        );
      }
    }
    if (c.ilo_id !== null && c.ilo_id !== undefined && c.plo_id === null) {
      throw new ProtectedWriteBoundaryError(
        "invalid_input",
        "clos[].ilo_id requires plo_id (ILO maps through the PLO)"
      );
    }
    // 7.8 execution rule mirrored at the boundary: a newly ingested CLO has a
    // single parent chain (PLO weight 1.0; first ILO mapping weight 1.0) so the
    // deferred weight-sum trigger cannot reject at commit time.
    if (c.plo_id !== null && c.plo_id !== undefined && c.plo_weight !== 1) {
      throw new ProtectedWriteBoundaryError(
        "invalid_input",
        "clos[].plo_weight must be 1.0 for a newly ingested CLO"
      );
    }
    if (
      c.ilo_id !== null &&
      c.ilo_id !== undefined &&
      c.ilo_weight !== 1
    ) {
      throw new ProtectedWriteBoundaryError(
        "invalid_input",
        "clos[].ilo_weight must be 1.0 for a newly mapped ILO"
      );
    }
  }
  return input;
};

const validateIngestOutput = (value: unknown): Record<string, unknown> => {
  const output = row(value, "invalid_output");
  if (
    typeof output.executionId !== "string" ||
    !uuidPattern.test(output.executionId) ||
    !Array.isArray(output.cloIds) ||
    (output.cloIds as unknown[]).length === 0 ||
    !(output.cloIds as unknown[]).every(
      (id) => typeof id === "string" && uuidPattern.test(id)
    ) ||
    typeof output.count !== "number" ||
    !Number.isSafeInteger(output.count) ||
    output.count < 1 ||
    output.count !== (output.cloIds as unknown[]).length ||
    typeof output.alreadyExecuted !== "boolean"
  ) {
    throw new ProtectedWriteBoundaryError(
      "invalid_output",
      "Curriculum ingestion returned an invalid receipt"
    );
  }
  return output;
};

// ---------------------------------------------------------------------------
// Task 6.2 — Admin ILO governance protected writes. Payloads mirror the
// proposal shapes produced by write-tools/outcome-governance.ts so an approved
// proposal resolves through the registry instead of failing unknown_tool.
// ---------------------------------------------------------------------------
const optionalIloTextField = (
  input: Record<string, unknown>,
  field: string,
  maximum: number
): void => {
  if (input[field] !== undefined) textField(input, field, maximum);
};

const validateCreateIlo = (value: unknown): Record<string, unknown> => {
  const input = row(value, "invalid_input");
  exactKeys(input, ["title", "title_ar", "description"]);
  textField(input, "title", 300);
  optionalIloTextField(input, "title_ar", 300);
  optionalIloTextField(input, "description", 2000);
  return input;
};

const validateUpdateIlo = (value: unknown): Record<string, unknown> => {
  const input = row(value, "invalid_input");
  exactKeys(input, ["ilo_id", "title", "title_ar", "description"]);
  if (typeof input.ilo_id !== "string" || !uuidPattern.test(input.ilo_id)) {
    throw new ProtectedWriteBoundaryError("invalid_input", "ilo_id must be a UUID");
  }
  optionalIloTextField(input, "title", 300);
  optionalIloTextField(input, "title_ar", 300);
  optionalIloTextField(input, "description", 2000);
  return input;
};

const validateDeleteIlo = (value: unknown): Record<string, unknown> => {
  const input = row(value, "invalid_input");
  exactKeys(input, ["ilo_id"]);
  if (typeof input.ilo_id !== "string" || !uuidPattern.test(input.ilo_id)) {
    throw new ProtectedWriteBoundaryError("invalid_input", "ilo_id must be a UUID");
  }
  return input;
};

const validateReorderIlos = (value: unknown): Record<string, unknown> => {
  const input = row(value, "invalid_input");
  exactKeys(input, ["items"]);
  const items = input.items;
  if (!Array.isArray(items) || items.length === 0 || items.length > 500) {
    throw new ProtectedWriteBoundaryError(
      "invalid_input",
      "items must be a non-empty array of at most 500 entries"
    );
  }
  for (const entry of items) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      throw new ProtectedWriteBoundaryError(
        "invalid_input",
        "items[] entries must be objects"
      );
    }
    const item = entry as Record<string, unknown>;
    if (
      Object.keys(item).some((key) => !["id", "sort_order"].includes(key)) ||
      typeof item.id !== "string" ||
      !uuidPattern.test(item.id) ||
      typeof item.sort_order !== "number" ||
      !Number.isSafeInteger(item.sort_order)
    ) {
      throw new ProtectedWriteBoundaryError(
        "invalid_input",
        "items[] entries require a UUID id and integer sort_order"
      );
    }
  }
  return input;
};

export const PROTECTED_WRITE_REGISTRY: Readonly<
  Record<ProtectedWriteToolIdentifier, ProtectedWriteToolDefinition>
> = {
  "create_goal@1.0.0": {
    name: "create_goal",
    version: "1.0.0",
    risk: "protected",
    approvalRequired: true,
    allowedApproverRoles: ["student"],
    validateInput: validateGoal,
    validateOutput,
  },
  "create_planner_session@1.0.0": {
    name: "create_planner_session",
    version: "1.0.0",
    risk: "protected",
    approvalRequired: true,
    allowedApproverRoles: ["student"],
    validateInput: validatePlannerSession,
    validateOutput,
  },
  "create_cqi_action@1.0.0": {
    name: "create_cqi_action",
    version: "1.0.0",
    risk: "protected",
    approvalRequired: true,
    allowedApproverRoles: ["coordinator"],
    validateInput: validateCqiAction,
    validateOutput: validateCqiOutput,
  },
  // Task 7.10 — AI question drafts: the assigned teacher approves; execution
  // persists the drafts into question_bank (approved) via
  // execute_approved_teacher_content_v1.
  "publish_official_content@1.0.0": {
    name: "publish_official_content",
    version: "1.0.0",
    risk: "protected",
    approvalRequired: true,
    allowedApproverRoles: ["teacher"],
    validateInput: validatePublishOfficialContent,
    validateOutput: validateTeacherContentOutput,
  },
  // Task 7.8 — curriculum ingestion: coordinator approves; execution inserts
  // CLO rows + mappings through the validated hierarchy/weight constraints.
  "ingest_curriculum@1.0.0": {
    name: "ingest_curriculum",
    version: "1.0.0",
    risk: "protected",
    approvalRequired: true,
    allowedApproverRoles: ["coordinator"],
    validateInput: validateIngestCurriculum,
    validateOutput: validateIngestOutput,
  },
  // Task 8.9 — decision-intelligence closed loop: coordinator-approved,
  // one official learning_interventions row per struggling student.
  "create_learning_intervention@1.0.0": {
    name: "create_learning_intervention",
    version: "1.0.0",
    risk: "protected",
    approvalRequired: true,
    allowedApproverRoles: ["coordinator"],
    validateInput: validateLearningIntervention,
    validateOutput: validateLearningInterventionOutput,
  },
  // Task 6.2 — Admin ILO governance: approval is ALWAYS required and the only
  // permitted approver role is admin (platform spec guardrails).
  "create_ilo@1.0.0": {
    name: "create_ilo",
    version: "1.0.0",
    risk: "protected",
    approvalRequired: true,
    allowedApproverRoles: ["admin"],
    validateInput: validateCreateIlo,
    validateOutput: validateCqiOutput,
  },
  "update_ilo@1.0.0": {
    name: "update_ilo",
    version: "1.0.0",
    risk: "protected",
    approvalRequired: true,
    allowedApproverRoles: ["admin"],
    validateInput: validateUpdateIlo,
    validateOutput: validateCqiOutput,
  },
  "delete_ilo@1.0.0": {
    name: "delete_ilo",
    version: "1.0.0",
    risk: "protected",
    approvalRequired: true,
    allowedApproverRoles: ["admin"],
    validateInput: validateDeleteIlo,
    validateOutput: validateCqiOutput,
  },
  "reorder_ilos@1.0.0": {
    name: "reorder_ilos",
    version: "1.0.0",
    risk: "protected",
    approvalRequired: true,
    allowedApproverRoles: ["admin"],
    validateInput: validateReorderIlos,
    validateOutput: validateCqiOutput,
  },
};

export const protectedWriteVersionForAction = (
  actionType: string
): ProtectedWriteToolVersion | undefined =>
  actionType === "create_goal" ||
  actionType === "create_planner_session" ||
  actionType === "create_cqi_action" ||
  // Task 7.8 — curriculum-ingest proposals share the 1.0.0 boundary version;
  // execution inserts outcomes/mappings via the typed ingestion RPC.
  actionType === "ingest_curriculum" ||
  // Task 7.10 — AI question drafts share the 1.0.0 boundary version;
  // execution persists approved drafts into question_bank.
  actionType === "publish_official_content" ||
  // Task 8.9 — decision-intervention proposals share the 1.0.0 boundary
  // version; execution routes through the typed learning-intervention RPC.
  actionType === "create_learning_intervention" ||
  // Task 6.2 — Admin ILO governance proposals share the 1.0.0 boundary
  // version; execution is routed through typed outcome-governance handlers.
  actionType === "create_ilo" ||
  actionType === "update_ilo" ||
  actionType === "delete_ilo" ||
  actionType === "reorder_ilos"
    ? "1.0.0"
    : undefined;

export const protectedWriteForProposal = (
  proposal: AgentActionProposal
): ProtectedWriteToolDefinition | undefined => {
  const identifier = `${proposal.actionType}@${proposal.toolVersion ?? ""}`;
  return Object.prototype.hasOwnProperty.call(
    PROTECTED_WRITE_REGISTRY,
    identifier
  )
    ? PROTECTED_WRITE_REGISTRY[identifier as ProtectedWriteToolIdentifier]
    : undefined;
};
