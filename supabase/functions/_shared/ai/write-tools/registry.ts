import type { AgentActionProposal, AuthenticatedRole } from "../contracts.ts";

export type ProtectedWriteToolName =
  | "create_goal"
  | "create_planner_session"
  | "create_cqi_action";
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
};

export const protectedWriteVersionForAction = (
  actionType: string
): ProtectedWriteToolVersion | undefined =>
  actionType === "create_goal" ||
  actionType === "create_planner_session" ||
  actionType === "create_cqi_action"
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
