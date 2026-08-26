/**
 * Tasks 4.3-4.6, 5.1, 5.2, 6.1 (edeviser-agentic-intelligence).
 *
 * Per-specialist protocol blocks injected into the orchestrator system prompt,
 * plus STRICT deterministic output parsers for the specialists whose results
 * are consumed programmatically (mastery / habit / risk / intervention).
 *
 * Guardrails enforced here (PDF §26-§28):
 *   - Mastery Agent: ILO-level statements may ONLY use the exact label
 *     "derived alignment"; official ILO attainment is never claimed or
 *     modified by agent output.
 *   - Habit Agent: deterministic-evidence-based; every reported signal MUST
 *     cite at least one evidence id supplied by a read tool; the model never
 *     invents scores.
 *   - Risk Agent: structured findings with categorical levels only; numeric
 *     risk scores are forbidden in agent output (deterministic signals live
 *     server-side); escalation recommendations cite evidence.
 *   - Intervention Agent: every proposed action is a DRAFT that maps onto a
 *     protected action proposal requiring human approval per PROTECTED_ACTIONS.
 */
import type { JsonObject } from "../contracts.ts";

// ─── Protocol prompt blocks ─────────────────────────────────────────────────

export const SPECIALIST_PROTOCOLS: Readonly<Record<string, readonly string[]>> =
  {
    mastery: [
      "Mastery protocol: analyze CLO/PLO attainment evidence retrieved ONLY through authorized read tools.",
      "ILO-level statements MUST be labeled exactly 'derived alignment' — derived from PLO/CLO attainment through canonical mappings.",
      "Never present ILO attainment as official; never modify, recompute, or overwrite any official attainment value.",
      "Explain prerequisite gaps and trends using cited evidence ids only.",
    ],
    habit: [
      "Habit protocol: you are deterministic-evidence-based. Structure ONLY the habit signals present in the supplied learning-state/tool evidence (study consistency, streaks, session completion, effective duration, preferred study time, late-submission patterns, intervention acceptance).",
      "NEVER invent, estimate, or extrapolate a metric that is not present in cited evidence. Every reported signal MUST cite at least one evidence id.",
      "Support habit recovery with concrete next steps grounded in the same evidence.",
    ],
    risk: [
      "Risk protocol: report ONLY deterministic signals computed by server code (from OBE attainment + habit evidence).",
      "Output categorical levels (low|moderate|high) per finding; NEVER emit numeric risk scores — they are owned by deterministic calculations.",
      "Every finding MUST cite evidence ids and include an escalation recommendation (none|monitor|notify_teacher|notify_coordinator|intervene_now).",
    ],
    intervention: [
      "Intervention protocol: select the next SAFE action using measured_intervention_effects evidence.",
      "Every proposed action is a DRAFT. Each draft MUST map to a protected action type and become a human-approval proposal via propose_protected_action. Never claim execution.",
      "Prefer actions with positive measured effects; avoid repeating interventions with negative measured effects.",
    ],
    teacher: [
      "Teacher copilot protocol: work ONLY with students assigned to the authenticated teacher's courses.",
      "All outputs are DRAFTS: misconception explanations, feedback drafts, intervention drafts, question drafts, lesson adaptations.",
      "Publishing anything official (assignments, grades, deadlines, messages) requires a protected-action proposal approved by the teacher. Never claim publication.",
    ],
    parent: [
      "Parent protocol: summarize ONLY verified linked children's authorized data (progress summaries, upcoming deadlines, attendance patterns, support suggestions).",
      "Privacy-aware: never reveal other students, class rankings, or raw peer comparisons. Explanations must stay within the authorized summary scope.",
    ],
    admin: [
      "Admin governance protocol: institution-wide reads plus DRAFT governance artifacts only.",
      "ILO create/update/delete/reorder MUST go through the typed outcome-governance write tools, which always produce Admin-approval proposals. Never claim an ILO mutation was executed.",
      "Governance reports cite evidence ids from authorized read tools only.",
    ],
  };

// ─── Shared parsing helpers ─────────────────────────────────────────────────

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

/** Extracts the first JSON object embedded in a model response. */
export const extractJsonObject = (content: string): unknown => {
  const start = content.indexOf("{");
  if (start < 0) return null;
  // Scan forward for the matching closing brace of the first object.
  let depth = 0;
  for (let i = start; i < content.length; i += 1) {
    const ch = content[i];
    if (ch === "{") depth += 1;
    else if (ch === "}") {
      depth -= 1;
      if (depth === 0) {
        try {
          return JSON.parse(content.slice(start, i + 1));
        } catch {
          return null;
        }
      }
    }
  }
  return null;
};

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

const citationsOf = (entry: Record<string, unknown>): string[] => {
  const raw = entry.evidenceIds ?? entry.citations;
  return Array.isArray(raw)
    ? raw.filter((id): id is string => isNonEmptyString(id))
    : [];
};

// ─── Mastery Agent (task 4.3) ───────────────────────────────────────────────

export interface MasteryOutcomeAlignment {
  outcomeId: string;
  outcomeType: string;
  attainmentPercent?: number;
  alignmentLabel: string;
  trend?: "improving" | "stable" | "declining";
  prerequisiteGaps: readonly string[];
  evidenceIds: readonly string[];
}

export interface MasteryAnalysis {
  outcomes: readonly MasteryOutcomeAlignment[];
  chainExplanation: string;
  prerequisiteGapSummary: string;
}

/**
 * Strict mastery parser. Enforces the "derived alignment" labeling rule for
 * ILO rows and rejects entries without evidence citations.
 */
export const parseMasteryAnalysis = (
  content: string
): MasteryAnalysis | null => {
  const parsed = asRecord(extractJsonObject(content));
  if (!parsed || !Array.isArray(parsed.outcomes)) return null;

  const outcomes: MasteryOutcomeAlignment[] = [];
  for (const raw of parsed.outcomes) {
    const entry = asRecord(raw);
    if (!entry) return null;
    const outcomeId = entry.outcomeId;
    const outcomeType = entry.outcomeType;
    const alignmentLabel = entry.alignmentLabel;
    if (!isNonEmptyString(outcomeId) || !isNonEmptyString(outcomeType)) {
      return null;
    }
    if (!isNonEmptyString(alignmentLabel)) return null;
    // GUARDRAIL: ILO rows must be explicitly labeled as derived alignment.
    if (
      outcomeType.toUpperCase() === "ILO" &&
      alignmentLabel.trim().toLowerCase() !== "derived alignment"
    ) {
      return null;
    }
    const evidenceIds = citationsOf(entry);
    if (evidenceIds.length === 0) return null;
    const gaps = Array.isArray(entry.prerequisiteGaps)
      ? entry.prerequisiteGaps.filter((g): g is string => isNonEmptyString(g))
      : [];
    const trendRaw = entry.trend;
    const trend =
      trendRaw === "improving" ||
      trendRaw === "stable" ||
      trendRaw === "declining"
        ? trendRaw
        : undefined;
    const attainment =
      typeof entry.attainmentPercent === "number" &&
      Number.isFinite(entry.attainmentPercent)
        ? entry.attainmentPercent
        : undefined;
    outcomes.push({
      outcomeId,
      outcomeType,
      ...(attainment !== undefined ? { attainmentPercent: attainment } : {}),
      alignmentLabel: alignmentLabel.trim(),
      ...(trend !== undefined ? { trend } : {}),
      prerequisiteGaps: gaps,
      evidenceIds,
    });
  }

  if (!isNonEmptyString(parsed.chainExplanation)) return null;
  if (!isNonEmptyString(parsed.prerequisiteGapSummary)) return null;
  return {
    outcomes,
    chainExplanation: parsed.chainExplanation.trim(),
    prerequisiteGapSummary: parsed.prerequisiteGapSummary.trim(),
  };
};

// ─── Habit Agent (task 4.4) ─────────────────────────────────────────────────

export interface HabitSignalReport {
  signal: string;
  observation: string;
  evidenceIds: readonly string[];
}

export interface HabitAnalysis {
  windowDays: number;
  signals: readonly HabitSignalReport[];
  recoverySteps: readonly string[];
}

/** Deterministic-evidence parser: uncited signals are rejected outright. */
export const parseHabitAnalysis = (content: string): HabitAnalysis | null => {
  const parsed = asRecord(extractJsonObject(content));
  if (!parsed) return null;
  if (typeof parsed.windowDays !== "number" || parsed.windowDays <= 0) {
    return null;
  }
  if (!Array.isArray(parsed.signals)) return null;

  const signals: HabitSignalReport[] = [];
  for (const raw of parsed.signals) {
    const entry = asRecord(raw);
    if (!entry) return null;
    if (
      !isNonEmptyString(entry.signal) ||
      !isNonEmptyString(entry.observation)
    ) {
      return null;
    }
    const evidenceIds = citationsOf(entry);
    if (evidenceIds.length === 0) return null; // no invented observations
    signals.push({
      signal: entry.signal.trim(),
      observation: entry.observation.trim(),
      evidenceIds,
    });
  }

  const recoverySteps = Array.isArray(parsed.recoverySteps)
    ? parsed.recoverySteps.filter((s): s is string => isNonEmptyString(s))
    : [];
  return {
    windowDays: parsed.windowDays,
    signals,
    recoverySteps,
  };
};

// ─── Risk Agent (task 4.5) ──────────────────────────────────────────────────

export type RiskLevel = "low" | "moderate" | "high";
export type EscalationRecommendation =
  | "none"
  | "monitor"
  | "notify_teacher"
  | "notify_coordinator"
  | "intervene_now";

export interface RiskFinding {
  signal: string;
  level: RiskLevel;
  basis: string;
  evidenceIds: readonly string[];
  escalation: EscalationRecommendation;
}

export interface RiskAssessment {
  findings: readonly RiskFinding[];
  overallLevel: RiskLevel;
  summary: string;
}

const RISK_LEVELS: readonly string[] = ["low", "moderate", "high"];
const ESCALATIONS: readonly string[] = [
  "none",
  "monitor",
  "notify_teacher",
  "notify_coordinator",
  "intervene_now",
];

/** Structured-risk parser: numeric scores are FORBIDDEN in agent output. */
export const parseRiskAssessment = (content: string): RiskAssessment | null => {
  const parsed = asRecord(extractJsonObject(content));
  if (!parsed || !Array.isArray(parsed.findings)) return null;

  const findings: RiskFinding[] = [];
  for (const raw of parsed.findings) {
    const entry = asRecord(raw);
    if (!entry) return null;
    if (!isNonEmptyString(entry.signal) || !isNonEmptyString(entry.basis)) {
      return null;
    }
    // GUARDRAIL: deterministic scores live server-side; the model may not
    // emit any numeric score field.
    if ("score" in entry || "riskScore" in entry || "probability" in entry) {
      return null;
    }
    if (!RISK_LEVELS.includes(String(entry.level))) return null;
    if (!ESCALATIONS.includes(String(entry.escalation))) return null;
    const evidenceIds = citationsOf(entry);
    if (evidenceIds.length === 0) return null;
    findings.push({
      signal: entry.signal.trim(),
      level: entry.level as RiskLevel,
      basis: entry.basis.trim(),
      evidenceIds,
      escalation: entry.escalation as EscalationRecommendation,
    });
  }

  if (!RISK_LEVELS.includes(String(parsed.overallLevel))) return null;
  if (!isNonEmptyString(parsed.summary)) return null;
  return {
    findings,
    overallLevel: parsed.overallLevel as RiskLevel,
    summary: parsed.summary.trim(),
  };
};

// ─── Intervention Agent (task 4.6) ──────────────────────────────────────────

export interface InterventionDraftAction {
  actionType: string;
  payload: JsonObject;
  rationale: string;
  expectedEffectBasis: string;
  evidenceIds: readonly string[];
  approvalRequired: true;
}

export interface InterventionPlan {
  studentId?: string;
  selectedBecause: string;
  avoidedBecause: readonly string[];
  draftActions: readonly InterventionDraftAction[];
}

/**
 * Intervention parser: every draft action MUST declare approvalRequired=true
 * and cite the measured-effect evidence that motivated it.
 */
export const parseInterventionPlan = (
  content: string
): InterventionPlan | null => {
  const parsed = asRecord(extractJsonObject(content));
  if (!parsed || !Array.isArray(parsed.draftActions)) return null;
  if (!isNonEmptyString(parsed.selectedBecause)) return null;

  const draftActions: InterventionDraftAction[] = [];
  for (const raw of parsed.draftActions) {
    const entry = asRecord(raw);
    if (!entry) return null;
    if (
      !isNonEmptyString(entry.actionType) ||
      !isNonEmptyString(entry.rationale)
    ) {
      return null;
    }
    if (!isNonEmptyString(entry.expectedEffectBasis)) return null;
    if (entry.approvalRequired !== true) return null; // GUARDRAIL
    const payload = asRecord(entry.payload);
    if (!payload) return null;
    const evidenceIds = citationsOf(entry);
    if (evidenceIds.length === 0) return null;
    draftActions.push({
      actionType: entry.actionType.trim(),
      payload: payload as JsonObject,
      rationale: entry.rationale.trim(),
      expectedEffectBasis: entry.expectedEffectBasis.trim(),
      evidenceIds,
      approvalRequired: true,
    });
  }

  const avoided = Array.isArray(parsed.avoidedBecause)
    ? parsed.avoidedBecause.filter((s): s is string => isNonEmptyString(s))
    : [];
  const studentId =
    isNonEmptyString(parsed.studentId) && typeof parsed.studentId === "string"
      ? parsed.studentId
      : undefined;
  return {
    ...(studentId !== undefined ? { studentId } : {}),
    selectedBecause: parsed.selectedBecause.trim(),
    avoidedBecause: avoided,
    draftActions,
  };
};

// —— Teacher copilot & parent summary specialists (Tasks 5.1 + 6.1) ————————

const cappedText = (value: unknown, maximum: number): string | null =>
  typeof value === "string" &&
  value.trim().length > 0 &&
  value.length <= maximum
    ? value.trim()
    : null;

/** Strict citation list: 1..100 non-empty string ids, deduplicated. */
const requiredCitationIds = (value: unknown): string[] | null => {
  if (!Array.isArray(value) || value.length === 0 || value.length > 100)
    return null;
  if (
    !value.every(
      (id) => typeof id === "string" && id.length > 0 && id.length <= 200
    )
  )
    return null;
  return [...new Set(value as string[])];
};

export interface TeacherCopilotItem {
  topic: string;
  content: string;
  evidenceIds: string[];
}

export interface TeacherCopilotOutput {
  misconceptions?: TeacherCopilotItem[];
  feedbackDrafts?: TeacherCopilotItem[];
  questionDrafts?: TeacherCopilotItem[];
  lessonAdaptations?: TeacherCopilotItem[];
}

const TEACHER_SECTIONS: readonly string[] = [
  "misconceptions",
  "feedbackDrafts",
  "questionDrafts",
  "lessonAdaptations",
];

const citedTeacherItems = (
  value: unknown,
  authorizedEvidenceIds: ReadonlySet<string>
): TeacherCopilotItem[] | null => {
  if (!Array.isArray(value) || value.length === 0 || value.length > 50)
    return null;
  const items: TeacherCopilotItem[] = [];
  for (const entry of value) {
    const row = asRecord(entry);
    if (!row) return null;
    if (
      Object.keys(row).some(
        (key) => !["topic", "content", "evidenceIds"].includes(key)
      )
    )
      return null;
    const topic = cappedText(row.topic, 300);
    const content = cappedText(row.content, 4000);
    const ids = requiredCitationIds(row.evidenceIds);
    if (!topic || !content || !ids) return null;
    // Citations must reference the authorized evidence packet - invented
    // ids are rejected so unsupported claims cannot pose as cited drafts.
    if (!ids.every((id) => authorizedEvidenceIds.has(id))) return null;
    items.push({ topic, content, evidenceIds: ids });
  }
  return items;
};

/**
 * Task 5.1 — fail-closed teacher copilot parser. Draft-only sections; every
 * item must cite only ids from the authorized evidence packet; unknown
 * sections/fields rejected.
 */
export const parseTeacherCopilotOutput = (
  content: string,
  authorizedEvidenceIds: ReadonlySet<string>
): TeacherCopilotOutput | null => {
  let value: unknown;
  try {
    value = JSON.parse(content);
  } catch {
    return null;
  }
  const row = asRecord(value);
  if (!row) return null;
  if (Object.keys(row).some((key) => !TEACHER_SECTIONS.includes(key)))
    return null;
  const output: TeacherCopilotOutput = {};
  let anySection = false;
  for (const section of TEACHER_SECTIONS) {
    const raw = row[section];
    if (raw === undefined) continue;
    const items = citedTeacherItems(raw, authorizedEvidenceIds);
    if (!items) return null;
    output[section as keyof TeacherCopilotOutput] = items;
    anySection = true;
  }
  return anySection ? output : null;
};

export interface ParentChildSummaryEntry {
  childId: string;
  progressSummary: string;
  citations: string[];
}

export interface ParentChildSummary {
  summaries: ParentChildSummaryEntry[];
}

const PRIVACY_BLOCKED_KEY = /rank|percentile|peer|compar/i;

/**
 * Task 6.1 — fail-closed parent summary parser. Only verified child ids
 * (supplied by the caller from server-side scope data) may appear; privacy
 * violating keys (rankings, peer comparisons) are rejected anywhere in the
 * structure; every summary must cite evidence.
 */
export const parseParentChildSummary = (
  content: string,
  authorizedChildIds: ReadonlySet<string>,
  authorizedEvidenceIds: ReadonlySet<string>
): ParentChildSummary | null => {
  let value: unknown;
  try {
    value = JSON.parse(content);
  } catch {
    return null;
  }
  const row = asRecord(value);
  if (!row) return null;
  const topKeys = Object.keys(row);
  if (topKeys.some((key) => key !== "summaries")) return null;
  if (topKeys.some((key) => PRIVACY_BLOCKED_KEY.test(key))) return null;
  const list = row.summaries;
  if (!Array.isArray(list) || list.length === 0 || list.length > 20)
    return null;
  const summaries: ParentChildSummaryEntry[] = [];
  for (const entry of list) {
    const item = asRecord(entry);
    if (!item) return null;
    const itemKeys = Object.keys(item);
    if (
      itemKeys.some(
        (key) => !["childId", "progressSummary", "citations"].includes(key)
      ) ||
      itemKeys.some((key) => PRIVACY_BLOCKED_KEY.test(key))
    )
      return null;
    const childId =
      isNonEmptyString(item.childId) && item.childId.length <= 100
        ? item.childId
        : null;
    const progressSummary = cappedText(item.progressSummary, 4000);
    const citations = requiredCitationIds(item.citations);
    if (
      !childId ||
      !authorizedChildIds.has(childId) ||
      !progressSummary ||
      !citations ||
      !citations.every((id) => authorizedEvidenceIds.has(id))
    )
      return null;
    summaries.push({ childId, progressSummary, citations });
  }
  return summaries.length > 0 ? { summaries } : null;
};
