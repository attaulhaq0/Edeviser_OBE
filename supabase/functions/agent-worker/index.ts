import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

import {
  applyInterventionOutcome,
  effectiveAutonomy,
  evaluateInterventionOutcome,
  evaluateNeedsAttention,
  mayCreateSuggestionOrDraft,
  recalculateStudentLearningState,
  type AttendanceFrequency,
  type HabitConsistency,
  type LearningEvidence,
  type NeedsAttentionTrigger,
  type OperationalAutonomy,
  type StudentLearningState,
  type SubmissionPattern,
} from "../_shared/ai/proactive-intelligence.ts";
import { getManagedServerKey } from "../_shared/serverSecret.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const COOLDOWN_DAYS = 7;
const DEFAULT_BATCH_SIZE = 50;
const MAX_BATCH_SIZE = 100;
const MAX_FLAGS_PER_TEACHER_PER_RUN = 3;
const MAX_STATE_UPDATES_PER_RUN = 200;
const FOLLOW_UP_DELAY_DAYS = 7;

interface ScheduledScanRequest {
  action?: "scheduled_scan";
  institutionId?: string;
  batchSize?: number;
}

interface ApprovalRequest {
  action: "approve_protected_action";
  proposalAuditId: string;
  approvedMessage: string;
}

type WorkerRequest = ScheduledScanRequest | ApprovalRequest;

interface ProfileRow {
  id: string;
  institution_id: string;
  notification_preferences: unknown;
  role: string;
}

interface GamificationRow {
  student_id: string;
  last_login_date: string | null;
}

interface EnrollmentRow {
  student_id: string;
  course_id: string;
  section_id: string | null;
}

interface CourseRow {
  id: string;
  teacher_id: string | null;
  program_id: string;
}

interface AttainmentRow {
  id: string;
  student_id: string | null;
  course_id: string | null;
  outcome_id: string;
  attainment_percent: number;
  last_calculated_at: string;
}

interface OutcomeRow {
  id: string;
  title: string;
}

interface AssignmentRow {
  id: string;
  course_id: string;
  due_date: string;
  clo_weights: unknown;
}

interface AuditRow {
  id: string;
  action: string;
  actor_id: string;
  institution_id: string | null;
  target_id: string | null;
  diff: unknown;
  created_at: string;
}

interface FeedbackRow {
  id: string;
  student_id: string;
  suggestion_data: unknown;
  created_at: string;
}

interface TriggeredSubject {
  profile: ProfileRow;
  course: CourseRow;
  state: StudentLearningState;
  trigger: NeedsAttentionTrigger;
}

interface ParentLinkRow {
  parent_id: string;
  student_id: string;
}

interface ProgramRow {
  id: string;
  institution_id: string;
  coordinator_id: string | null;
}

interface SubmissionRow {
  id: string;
  student_id: string;
  assignment_id: string;
  submitted_at: string;
  is_late: boolean;
}

interface HabitRow {
  id: string;
  student_id: string;
  is_perfect_day: boolean;
  login: boolean;
  read_content: boolean;
  submit: boolean;
  journal: boolean;
}

interface SessionRow {
  id: string;
  section_id: string;
}

interface AttendanceRow {
  id: string;
  student_id: string;
  session_id: string;
  status: string;
}

interface InstitutionRow {
  id: string;
  settings: unknown;
}

interface InstitutionPolicy {
  institutionId: string;
  enabled: boolean;
  autonomy: OperationalAutonomy;
}

interface ProgramPatternEvidence {
  institutionId: string;
  programId: string;
  cloId: string;
  studentId: string;
  triggerVersion: string;
  contributingEvidence: unknown;
}

function jsonObject(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function stringValue(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function numberValue(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function isAutonomy(value: unknown): value is OperationalAutonomy {
  return ["A0", "A1", "A2", "A3"].includes(String(value));
}

function parseDate(value: string | null): number | null {
  if (!value) return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function daysSince(value: string | null, now: Date): number {
  const parsed = parseDate(value);
  if (parsed === null) return 999;
  return Math.max(0, Math.floor((now.getTime() - parsed) / 86_400_000));
}

function parsePreferences(profile: ProfileRow): {
  enabled: boolean;
  autonomy: OperationalAutonomy;
} {
  const preferences = jsonObject(profile.notification_preferences);
  const configuredAutonomy = preferences?.ai_autonomy;
  return {
    enabled: preferences?.ai_proactive_enabled !== false,
    autonomy: isAutonomy(configuredAutonomy) ? configuredAutonomy : "A1",
  };
}

function profileMayReceiveDraft(
  profile: ProfileRow,
  institutionPolicies: InstitutionPolicy[]
): boolean {
  const preferences = parsePreferences(profile);
  const institutionPolicy = institutionPolicies.find(
    (policy) => policy.institutionId === profile.institution_id
  );
  if (institutionPolicy?.enabled === false) return false;
  const autonomy = effectiveAutonomy([
    "A1",
    "A1",
    preferences.autonomy,
    institutionPolicy?.autonomy ?? "A1",
  ]);
  return mayCreateSuggestionOrDraft(autonomy, preferences.enabled);
}

function parseInstitutionPolicy(row: InstitutionRow): InstitutionPolicy {
  const settings = jsonObject(row.settings);
  const proactive = jsonObject(settings?.ai_proactive);
  const configuredAutonomy =
    proactive?.autonomy ?? settings?.ai_operational_autonomy;
  return {
    institutionId: row.id,
    enabled:
      proactive?.enabled !== false && settings?.ai_proactive_enabled !== false,
    autonomy: isAutonomy(configuredAutonomy) ? configuredAutonomy : "A1",
  };
}

function assignmentCloIds(assignment: AssignmentRow): string[] {
  if (Array.isArray(assignment.clo_weights)) {
    return assignment.clo_weights.flatMap((entry) => {
      if (typeof entry === "string") return [entry];
      const row = jsonObject(entry);
      const id = row?.clo_id ?? row?.outcome_id ?? row?.id;
      return typeof id === "string" ? [id] : [];
    });
  }
  const weights = jsonObject(assignment.clo_weights);
  return weights ? Object.keys(weights) : [];
}

function computeSubmissionPattern(
  assignments: AssignmentRow[],
  submissions: SubmissionRow[]
): SubmissionPattern {
  if (assignments.length === 0) return "on_time";
  const assignmentIds = new Set(assignments.map((assignment) => assignment.id));
  const relevant = submissions.filter((submission) =>
    assignmentIds.has(submission.assignment_id)
  );
  if (relevant.length === 0 || relevant.length / assignments.length < 0.5) {
    return "missed";
  }
  const lateRatio =
    relevant.filter((submission) => submission.is_late).length /
    relevant.length;
  if (lateRatio > 0.5) return "late";
  if (lateRatio < 0.1) return "early";
  return "on_time";
}

function computeAttendanceFrequency(
  totalSessions: number,
  attendance: AttendanceRow[]
): AttendanceFrequency {
  if (totalSessions === 0) return "not_authorized";
  const present = attendance.filter((row) =>
    ["present", "late"].includes(row.status)
  ).length;
  const ratio = present / totalSessions;
  if (ratio >= 0.85) return "high";
  if (ratio >= 0.65) return "medium";
  return "low";
}

function computeHabitConsistency(rows: HabitRow[]): HabitConsistency {
  if (rows.length === 0) return "not_authorized";
  const activeDays = rows.filter(
    (row) =>
      row.is_perfect_day ||
      row.login ||
      row.read_content ||
      row.submit ||
      row.journal
  ).length;
  const ratio = activeDays / 14;
  if (ratio >= 0.7) return "high";
  if (ratio >= 0.35) return "medium";
  return "low";
}

function learningStateEvidenceSignature(state: StudentLearningState): string {
  return JSON.stringify({
    calculationVersion: state.calculationVersion,
    institutionId: state.institutionId,
    studentId: state.studentId,
    courseId: state.courseId,
    cloId: state.cloId,
    mastery: state.mastery,
    behavior: state.behavior,
    upcomingDeadlineAt: state.upcomingDeadlineAt,
    evidenceIds: state.evidenceIds,
    lastInterventionOutcome: state.lastInterventionOutcome,
  });
}

function isLearningState(value: unknown): value is StudentLearningState {
  const row = jsonObject(value);
  return (
    row !== null &&
    typeof row.studentId === "string" &&
    typeof row.courseId === "string" &&
    typeof row.cloId === "string" &&
    jsonObject(row.mastery) !== null
  );
}

function response(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function readRequest(req: Request): Promise<WorkerRequest> {
  if (req.method !== "POST") return { action: "scheduled_scan" };
  const body: unknown = await req.json().catch(() => ({}));
  const object = jsonObject(body);
  if (object?.action === "approve_protected_action") {
    return {
      action: "approve_protected_action",
      proposalAuditId: stringValue(object.proposalAuditId) ?? "",
      approvedMessage: stringValue(object.approvedMessage) ?? "",
    };
  }
  return {
    action: "scheduled_scan",
    institutionId: stringValue(object?.institutionId) ?? undefined,
    batchSize: numberValue(object?.batchSize) ?? undefined,
  };
}

function isSystemCaller(req: Request): boolean {
  const authHeader = req.headers.get("Authorization") ?? "";
  const serverKey = getManagedServerKey();
  const cronSecret = Deno.env.get("CRON_SECRET");
  return (
    authHeader.replace("Bearer ", "") === serverKey ||
    (Boolean(cronSecret) && req.headers.get("x-cron-secret") === cronSecret)
  );
}

async function fetchGamification(
  supabase: ReturnType<typeof createClient>,
  studentIds: string[]
): Promise<GamificationRow[]> {
  const { data, error } = await supabase
    .from("student_gamification")
    .select("student_id,last_login_date")
    .in("student_id", studentIds);
  if (error) throw error;
  return (data ?? []) as GamificationRow[];
}

async function insertAudit(
  supabase: ReturnType<typeof createClient>,
  payload: {
    action: string;
    actorId: string;
    institutionId: string;
    targetId: string;
    targetType: string;
    diff: Record<string, unknown>;
  }
): Promise<string> {
  const { data, error } = await supabase
    .from("audit_logs")
    .insert({
      action: payload.action,
      actor_id: payload.actorId,
      institution_id: payload.institutionId,
      target_id: payload.targetId,
      target_type: payload.targetType,
      diff: payload.diff,
    })
    .select("id")
    .single();
  if (error) throw error;
  return String(data.id);
}

async function createRoleArtifact(
  supabase: ReturnType<typeof createClient>,
  payload: {
    action: string;
    actorId: string;
    institutionId: string;
    targetId: string;
    targetType: string;
    fingerprint: string;
    title: string;
    body: string;
    notificationType: string;
    diff: Record<string, unknown>;
    now: Date;
  }
): Promise<boolean> {
  const cooldownStart = new Date(
    payload.now.getTime() - COOLDOWN_DAYS * 86_400_000
  ).toISOString();
  const { data: existing, error: existingError } = await supabase
    .from("audit_logs")
    .select("id")
    .eq("action", payload.action)
    .eq("target_id", payload.targetId)
    .gte("created_at", cooldownStart)
    .contains("diff", { evidence_fingerprint: payload.fingerprint })
    .limit(1);
  if (existingError) throw existingError;
  const existingAuditId = existing?.[0]?.id;
  const auditId = existingAuditId
    ? String(existingAuditId)
    : await insertAudit(supabase, {
        action: payload.action,
        actorId: payload.actorId,
        institutionId: payload.institutionId,
        targetId: payload.targetId,
        targetType: payload.targetType,
        diff: {
          ...payload.diff,
          system_actor: true,
          evidence_fingerprint: payload.fingerprint,
        },
      });
  const { data: delivered, error: deliveredError } = await supabase
    .from("notifications")
    .select("id")
    .eq("user_id", payload.actorId)
    .contains("metadata", { audit_id: auditId })
    .limit(1);
  if (deliveredError) throw deliveredError;
  if (delivered?.length) return false;

  const { error: notificationError } = await supabase
    .from("notifications")
    .insert({
      user_id: payload.actorId,
      type: payload.notificationType,
      title: payload.title,
      body: payload.body,
      is_read: false,
      metadata: {
        audit_id: auditId,
        evidence_fingerprint: payload.fingerprint,
        ...payload.diff,
      },
    });
  if (notificationError) throw notificationError;
  return true;
}

async function routeSecondaryRoleArtifacts(
  supabase: ReturnType<typeof createClient>,
  subjects: TriggeredSubject[],
  missingSignalsByInstitution: Map<string, Set<string>>,
  institutionPolicies: InstitutionPolicy[],
  now: Date
): Promise<{
  parentCandidates: number;
  coordinatorWarnings: number;
  adminWarnings: number;
}> {
  let parentCandidates = 0;
  let coordinatorWarnings = 0;
  let adminWarnings = 0;
  const parentCounts = new Map<string, number>();
  const coordinatorCounts = new Map<string, number>();

  const urgentSubjects = subjects.filter(
    (subject) => subject.trigger.severity === "urgent"
  );
  if (urgentSubjects.length > 0) {
    const urgentStudentIds = [
      ...new Set(urgentSubjects.map((subject) => subject.state.studentId)),
    ];
    const { data: linkData, error: linkError } = await supabase
      .from("parent_student_links")
      .select("parent_id,student_id")
      .in("student_id", urgentStudentIds)
      .eq("verified", true);
    if (linkError) throw linkError;
    const links = (linkData ?? []) as ParentLinkRow[];
    const parentIds = [...new Set(links.map((link) => link.parent_id))];
    if (parentIds.length > 0) {
      const { data: parentData, error: parentError } = await supabase
        .from("profiles")
        .select("id,institution_id,notification_preferences,role")
        .in("id", parentIds)
        .eq("role", "parent")
        .eq("is_active", true);
      if (parentError) throw parentError;
      const parentsById = new Map(
        ((parentData ?? []) as ProfileRow[]).map((parent) => [
          parent.id,
          parent,
        ])
      );

      for (const subject of urgentSubjects) {
        for (const link of links.filter(
          (candidate) => candidate.student_id === subject.state.studentId
        )) {
          const parent = parentsById.get(link.parent_id);
          if (
            !parent ||
            parent.institution_id !== subject.profile.institution_id
          ) {
            continue;
          }
          if (!profileMayReceiveDraft(parent, institutionPolicies)) {
            continue;
          }
          if ((parentCounts.get(parent.id) ?? 0) >= 3) continue;
          const created = await createRoleArtifact(supabase, {
            action: "agent.proactive.parent_support_summary_candidate",
            actorId: parent.id,
            institutionId: parent.institution_id,
            targetId: subject.state.studentId,
            targetType: "parent_support_summary_candidate",
            fingerprint: `${subject.trigger.evidenceFingerprint}|parent|${parent.id}`,
            title: "Support summary candidate",
            body: "Authorized course evidence suggests a routine support check-in may help. Review the in-app summary before taking action.",
            notificationType: "parent_support_summary_candidate",
            diff: {
              status: "draft",
              student_id: subject.state.studentId,
              course_id: subject.state.courseId,
              clo_id: subject.state.cloId,
              calculation_version: subject.state.calculationVersion,
              trigger_version: subject.trigger.version,
              contributing_evidence: subject.trigger.contributingEvidence,
              recommended_next_action:
                "Offer routine encouragement and review the next authorized deadline; no external contact was sent.",
            },
            now,
          });
          if (created) {
            parentCandidates += 1;
            parentCounts.set(parent.id, (parentCounts.get(parent.id) ?? 0) + 1);
          }
        }
      }
    }
  }

  const patternEvidence: ProgramPatternEvidence[] = subjects.map((subject) => ({
    institutionId: subject.profile.institution_id,
    programId: subject.course.program_id,
    cloId: subject.state.cloId,
    studentId: subject.state.studentId,
    triggerVersion: subject.trigger.version,
    contributingEvidence: subject.trigger.contributingEvidence,
  }));
  const patternInstitutionIds = [
    ...new Set(subjects.map((subject) => subject.profile.institution_id)),
  ];
  const patternWindowStart = new Date(
    now.getTime() - COOLDOWN_DAYS * 86_400_000
  ).toISOString();
  for (const institutionId of patternInstitutionIds) {
    const { data: auditData, error: auditError } = await supabase
      .from("audit_logs")
      .select("target_id,diff")
      .eq("action", "agent.proactive.teacher_needs_attention")
      .eq("institution_id", institutionId)
      .gte("created_at", patternWindowStart)
      .limit(1_000);
    if (auditError) throw auditError;
    for (const audit of auditData ?? []) {
      const payload = jsonObject(audit.diff);
      const state = payload?.learning_state;
      const trigger = jsonObject(payload?.trigger);
      const programId = stringValue(payload?.program_id);
      const triggerVersion = stringValue(trigger?.version);
      if (
        !audit.target_id ||
        !programId ||
        !triggerVersion ||
        !isLearningState(state)
      ) {
        continue;
      }
      patternEvidence.push({
        institutionId,
        programId,
        cloId: state.cloId,
        studentId: audit.target_id,
        triggerVersion,
        contributingEvidence: trigger?.contributingEvidence ?? [],
      });
    }
  }

  const patterns = new Map<string, ProgramPatternEvidence[]>();
  for (const evidence of patternEvidence) {
    const key = `${evidence.programId}:${evidence.cloId}`;
    const group = patterns.get(key) ?? [];
    if (!group.some((item) => item.studentId === evidence.studentId)) {
      group.push(evidence);
    }
    patterns.set(key, group);
  }
  const recurringPatterns = [...patterns.entries()].filter(
    ([, group]) => group.length >= 3
  );
  if (recurringPatterns.length > 0) {
    const programIds = [
      ...new Set(recurringPatterns.map(([, group]) => group[0]!.programId)),
    ];
    const { data: programData, error: programError } = await supabase
      .from("programs")
      .select("id,institution_id,coordinator_id")
      .in("id", programIds);
    if (programError) throw programError;
    const programsById = new Map(
      ((programData ?? []) as ProgramRow[]).map((program) => [
        program.id,
        program,
      ])
    );
    const coordinatorIds = [
      ...new Set(
        ((programData ?? []) as ProgramRow[])
          .map((program) => program.coordinator_id)
          .filter((id): id is string => Boolean(id))
      ),
    ];
    const { data: coordinatorData, error: coordinatorError } = await supabase
      .from("profiles")
      .select("id,institution_id,notification_preferences,role")
      .in("id", coordinatorIds)
      .eq("role", "coordinator")
      .eq("is_active", true);
    if (coordinatorError) throw coordinatorError;
    const coordinatorsById = new Map(
      ((coordinatorData ?? []) as ProfileRow[]).map((coordinator) => [
        coordinator.id,
        coordinator,
      ])
    );

    for (const [, group] of recurringPatterns) {
      const first = group[0]!;
      const program = programsById.get(first.programId);
      if (!program?.coordinator_id) continue;
      const coordinator = coordinatorsById.get(program.coordinator_id);
      if (
        !coordinator ||
        coordinator.institution_id !== program.institution_id
      ) {
        continue;
      }
      if (!profileMayReceiveDraft(coordinator, institutionPolicies)) {
        continue;
      }
      if ((coordinatorCounts.get(coordinator.id) ?? 0) >= 3) continue;
      const fingerprint = [
        "coordinator-program-pattern/v1.0.0",
        program.id,
        first.cloId,
        ...group.map((item) => item.studentId).sort(),
      ].join("|");
      const created = await createRoleArtifact(supabase, {
        action: "agent.proactive.coordinator_program_pattern_warning",
        actorId: program.coordinator_id,
        institutionId: program.institution_id,
        targetId: program.id,
        targetType: "program_pattern",
        fingerprint,
        title: "Recurring CLO pattern - CQI draft ready",
        body: `${group.length} students cross the same versioned CLO trigger. Review the evidence-backed CQI draft.`,
        notificationType: "coordinator_program_pattern_warning",
        diff: {
          status: "draft",
          program_id: program.id,
          clo_id: first.cloId,
          affected_student_count: group.length,
          trigger_version: first.triggerVersion,
          contributing_evidence: group.map((item) => ({
            student_id: item.studentId,
            evidence: item.contributingEvidence,
          })),
          cqi_draft:
            "Review assessment alignment and teaching support for the recurring CLO pattern, then define a measurable follow-up evidence window.",
          recommended_next_action:
            "Coordinator review is required before assigning any CQI action.",
        },
        now,
      });
      if (created) {
        coordinatorWarnings += 1;
        coordinatorCounts.set(
          coordinator.id,
          (coordinatorCounts.get(coordinator.id) ?? 0) + 1
        );
      }
    }
  }

  const institutionIds = [...missingSignalsByInstitution.keys()];
  if (institutionIds.length > 0) {
    const { data: adminData, error: adminError } = await supabase
      .from("profiles")
      .select("id,institution_id,notification_preferences,role")
      .in("institution_id", institutionIds)
      .eq("role", "admin")
      .eq("is_active", true);
    if (adminError) throw adminError;
    for (const admin of (adminData ?? []) as ProfileRow[]) {
      const affectedStudents = [
        ...(missingSignalsByInstitution.get(admin.institution_id) ?? []),
      ].sort();
      if (affectedStudents.length === 0) continue;
      if (!profileMayReceiveDraft(admin, institutionPolicies)) {
        continue;
      }
      const fingerprint = [
        "admin-evidence-health/v1.0.0",
        admin.institution_id,
        ...affectedStudents,
      ].join("|");
      const created = await createRoleArtifact(supabase, {
        action: "agent.proactive.admin_data_health_warning",
        actorId: admin.id,
        institutionId: admin.institution_id,
        targetId: admin.institution_id,
        targetType: "institution_data_health",
        fingerprint,
        title: "Proactive evidence-quality warning",
        body: `${affectedStudents.length} evaluated students lack structured submission, attendance, or habit signals. Mastery-only escalation remains disabled.`,
        notificationType: "admin_data_health_warning",
        diff: {
          status: "informational",
          warning_version: "admin-evidence-health/v1.0.0",
          affected_student_count: affectedStudents.length,
          affected_student_ids: affectedStudents,
          recommended_next_action:
            "Verify the authorized evidence pipelines and the at-risk signal calculation before expanding autonomy.",
        },
        now,
      });
      if (created) adminWarnings += 1;
    }
  }

  return { parentCandidates, coordinatorWarnings, adminWarnings };
}

async function evaluateApprovedInterventions(
  supabase: ReturnType<typeof createClient>,
  currentAttainment: Map<string, AttainmentRow>,
  now: Date
): Promise<number> {
  const { data, error } = await supabase
    .from("ai_feedback")
    .select("id,student_id,suggestion_data,created_at")
    .eq("suggestion_type", "at_risk_prediction")
    .contains("suggestion_data", { status: "approved" })
    .limit(MAX_BATCH_SIZE);
  if (error) throw error;

  let evaluated = 0;
  for (const row of (data ?? []) as FeedbackRow[]) {
    const payload = jsonObject(row.suggestion_data);
    const learningState = payload?.learning_state;
    const approvedAt = stringValue(payload?.approved_at);
    if (!isLearningState(learningState) || !approvedAt) continue;

    const followUpDueAt = stringValue(payload?.follow_up_due_at);
    if (followUpDueAt && Date.parse(followUpDueAt) > now.getTime()) continue;

    const attainment = currentAttainment.get(
      `${row.student_id}:${learningState.courseId}:${learningState.cloId}`
    );
    if (
      !attainment ||
      Date.parse(attainment.last_calculated_at) <= Date.parse(approvedAt)
    ) {
      continue;
    }

    const outcome = evaluateInterventionOutcome(
      learningState.mastery.percent,
      attainment.attainment_percent,
      now.toISOString()
    );
    const updatedState = applyInterventionOutcome(learningState, outcome);
    const teacherId = stringValue(payload?.required_approver_id);
    const institutionId = stringValue(payload?.institution_id);
    if (!teacherId || !institutionId) continue;

    const updatedPayload = {
      ...payload,
      status: "outcome_evaluated",
      intervention_outcome: outcome,
      learning_state: updatedState,
    };
    const { error: updateError } = await supabase
      .from("ai_feedback")
      .update({ suggestion_data: updatedPayload })
      .eq("id", row.id);
    if (updateError) throw updateError;

    await insertAudit(supabase, {
      action: "agent.intervention.outcome_evaluated",
      actorId: teacherId,
      institutionId,
      targetId: row.student_id,
      targetType: "student_learning_state",
      diff: {
        system_actor: true,
        feedback_id: row.id,
        intervention_outcome: outcome,
        learning_state: updatedState,
      },
    });
    evaluated += 1;
  }
  return evaluated;
}

async function runScheduledScan(
  supabase: ReturnType<typeof createClient>,
  request: ScheduledScanRequest
): Promise<Record<string, unknown>> {
  if (Deno.env.get("AI_PROACTIVE_AGENTS_ENABLED") !== "true") {
    return { success: true, disabled: true, reason: "feature_flag" };
  }

  const now = new Date();
  const autoLowRiskEnabled =
    Deno.env.get("AI_AUTO_LOW_RISK_ENABLED") === "true";
  const batchSize = Math.min(
    MAX_BATCH_SIZE,
    Math.max(1, Math.floor(request.batchSize ?? DEFAULT_BATCH_SIZE))
  );

  let countQuery = supabase
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("role", "student")
    .eq("is_active", true);
  if (request.institutionId) {
    countQuery = countQuery.eq("institution_id", request.institutionId);
  }
  const { count: studentCount, error: countError } = await countQuery;
  if (countError) throw countError;
  const totalStudents = studentCount ?? 0;
  const utcDayNumber = Math.floor(now.getTime() / 86_400_000);
  const batchOffset =
    totalStudents > batchSize ? (utcDayNumber * batchSize) % totalStudents : 0;

  let profileQuery = supabase
    .from("profiles")
    .select("id,institution_id,notification_preferences,role")
    .eq("role", "student")
    .eq("is_active", true)
    .order("id")
    .range(batchOffset, batchOffset + batchSize - 1);
  if (request.institutionId) {
    profileQuery = profileQuery.eq("institution_id", request.institutionId);
  }
  const { data: profileData, error: profileError } = await profileQuery;
  if (profileError) throw profileError;
  const profiles = (profileData ?? []) as ProfileRow[];
  if (profiles.length === 0) {
    return { success: true, studentsEvaluated: 0, flagsCreated: 0 };
  }

  const studentIds = profiles.map((profile) => profile.id);
  const institutionIds = [
    ...new Set(profiles.map((profile) => profile.institution_id)),
  ];
  const { data: institutionData, error: institutionError } = await supabase
    .from("institutions")
    .select("id,settings")
    .in("id", institutionIds);
  if (institutionError) throw institutionError;
  const institutionPolicies = ((institutionData ?? []) as InstitutionRow[]).map(
    parseInstitutionPolicy
  );
  const gamification = await fetchGamification(supabase, studentIds);
  const gamificationByStudent = new Map(
    gamification.map((row) => [row.student_id, row])
  );
  const missingSignalsByInstitution = new Map<string, Set<string>>();
  for (const profile of profiles) {
    if (gamificationByStudent.has(profile.id)) continue;
    const affected =
      missingSignalsByInstitution.get(profile.institution_id) ??
      new Set<string>();
    affected.add(profile.id);
    missingSignalsByInstitution.set(profile.institution_id, affected);
  }

  const { data: enrollmentData, error: enrollmentError } = await supabase
    .from("student_courses")
    .select("student_id,course_id,section_id")
    .in("student_id", studentIds)
    .eq("status", "active");
  if (enrollmentError) throw enrollmentError;
  const enrollments = (enrollmentData ?? []) as EnrollmentRow[];
  const courseIds = [...new Set(enrollments.map((row) => row.course_id))];
  if (courseIds.length === 0) {
    return {
      success: true,
      studentsEvaluated: profiles.length,
      flagsCreated: 0,
    };
  }

  const [coursesResult, attainmentResult, assignmentResult] = await Promise.all(
    [
      supabase
        .from("courses")
        .select("id,teacher_id,program_id")
        .in("id", courseIds)
        .eq("is_active", true),
      supabase
        .from("outcome_attainment")
        .select(
          "id,student_id,course_id,outcome_id,attainment_percent,last_calculated_at"
        )
        .in("student_id", studentIds)
        .in("course_id", courseIds)
        .eq("scope", "student_course"),
      supabase
        .from("assignments")
        .select("id,course_id,due_date,clo_weights")
        .in("course_id", courseIds)
        .gte(
          "due_date",
          new Date(now.getTime() - 60 * 86_400_000).toISOString()
        )
        .lte(
          "due_date",
          new Date(now.getTime() + 14 * 86_400_000).toISOString()
        ),
    ]
  );
  if (coursesResult.error) throw coursesResult.error;
  if (attainmentResult.error) throw attainmentResult.error;
  if (assignmentResult.error) throw assignmentResult.error;

  const courses = (coursesResult.data ?? []) as CourseRow[];
  const attainments = (attainmentResult.data ?? []) as AttainmentRow[];
  const assignments = (assignmentResult.data ?? []) as AssignmentRow[];
  const assignmentIds = assignments.map((assignment) => assignment.id);
  const recentStart = new Date(now.getTime() - 60 * 86_400_000).toISOString();
  const habitStart = new Date(now.getTime() - 13 * 86_400_000)
    .toISOString()
    .slice(0, 10);

  let submissions: SubmissionRow[] = [];
  if (assignmentIds.length > 0) {
    const { data: submissionData, error: submissionError } = await supabase
      .from("submissions")
      .select("id,student_id,assignment_id,submitted_at,is_late")
      .in("student_id", studentIds)
      .in("assignment_id", assignmentIds)
      .gte("submitted_at", recentStart);
    if (submissionError) throw submissionError;
    submissions = (submissionData ?? []) as SubmissionRow[];
  }

  const { data: habitData, error: habitError } = await supabase
    .from("habit_tracking")
    .select("id,student_id,is_perfect_day,login,read_content,submit,journal")
    .in("student_id", studentIds)
    .gte("habit_date", habitStart);
  if (habitError) throw habitError;
  const habits = (habitData ?? []) as HabitRow[];

  const sectionIds = [
    ...new Set(
      enrollments
        .map((enrollment) => enrollment.section_id)
        .filter((id): id is string => Boolean(id))
    ),
  ];
  let sessions: SessionRow[] = [];
  let attendance: AttendanceRow[] = [];
  if (sectionIds.length > 0) {
    const { data: sessionData, error: sessionError } = await supabase
      .from("class_sessions")
      .select("id,section_id")
      .in("section_id", sectionIds)
      .gte("session_date", recentStart.slice(0, 10))
      .lte("session_date", now.toISOString().slice(0, 10));
    if (sessionError) throw sessionError;
    sessions = (sessionData ?? []) as SessionRow[];
    const sessionIds = sessions.map((session) => session.id);
    if (sessionIds.length > 0) {
      const { data: attendanceData, error: attendanceError } = await supabase
        .from("attendance_records")
        .select("id,student_id,session_id,status")
        .in("student_id", studentIds)
        .in("session_id", sessionIds);
      if (attendanceError) throw attendanceError;
      attendance = (attendanceData ?? []) as AttendanceRow[];
    }
  }

  const outcomeIds = [...new Set(attainments.map((row) => row.outcome_id))];
  const { data: outcomeData, error: outcomeError } = await supabase
    .from("learning_outcomes")
    .select("id,title")
    .in("id", outcomeIds)
    .eq("type", "CLO");
  if (outcomeError) throw outcomeError;

  const cooldownStart = new Date(
    now.getTime() - COOLDOWN_DAYS * 86_400_000
  ).toISOString();
  const [feedbackResult, auditResult] = await Promise.all([
    supabase
      .from("ai_feedback")
      .select("id,student_id,suggestion_data,created_at")
      .eq("suggestion_type", "at_risk_prediction")
      .in("student_id", studentIds)
      .order("created_at", { ascending: false })
      .limit(1_000),
    supabase
      .from("audit_logs")
      .select("id,action,actor_id,institution_id,target_id,diff,created_at")
      .in("action", [
        "agent.learning_state.recalculated",
        "agent.proactive.teacher_needs_attention",
        "agent.intervention.outcome_evaluated",
      ])
      .in("target_id", studentIds)
      .order("created_at", { ascending: false })
      .limit(500),
  ]);
  if (feedbackResult.error) throw feedbackResult.error;
  if (auditResult.error) throw auditResult.error;

  const coursesById = new Map(courses.map((row) => [row.id, row]));
  const profilesById = new Map(profiles.map((row) => [row.id, row]));
  const titlesById = new Map(
    ((outcomeData ?? []) as OutcomeRow[]).map((row) => [row.id, row.title])
  );
  const assignmentsByCourse = new Map<string, AssignmentRow[]>();
  for (const assignment of assignments) {
    const list = assignmentsByCourse.get(assignment.course_id) ?? [];
    list.push(assignment);
    assignmentsByCourse.set(assignment.course_id, list);
  }

  const latestStateBySubject = new Map<string, StudentLearningState>();
  for (const audit of (auditResult.data ?? []) as AuditRow[]) {
    const diff = jsonObject(audit.diff);
    const state = diff?.learning_state;
    if (!isLearningState(state)) continue;
    const key = `${state.studentId}:${state.courseId}:${state.cloId}`;
    if (!latestStateBySubject.has(key)) latestStateBySubject.set(key, state);
  }

  const recentFingerprints = new Set<string>();
  const cooldownSubjects = new Set<string>();
  for (const feedback of (feedbackResult.data ?? []) as FeedbackRow[]) {
    const feedbackPayload = jsonObject(feedback.suggestion_data);
    const fingerprint = stringValue(feedbackPayload?.evidence_fingerprint);
    if (fingerprint) recentFingerprints.add(fingerprint);
    const cloId = stringValue(feedbackPayload?.clo_id);
    if (cloId && feedback.created_at >= cooldownStart) {
      cooldownSubjects.add(`${feedback.student_id}:${cloId}`);
    }
  }

  const currentAttainment = new Map<string, AttainmentRow>();
  for (const attainment of attainments) {
    if (!attainment.student_id || !attainment.course_id) continue;
    currentAttainment.set(
      `${attainment.student_id}:${attainment.course_id}:${attainment.outcome_id}`,
      attainment
    );
  }

  const teacherFlagCount = new Map<string, number>();
  const flaggedStudents = new Set<string>();
  const triggeredSubjects: TriggeredSubject[] = [];
  let statesRecalculated = 0;
  let statesPersisted = 0;
  let flagsCreated = 0;
  let duplicatesSuppressed = 0;
  let cooldownSuppressed = 0;
  let policySuppressed = 0;

  for (const attainment of attainments) {
    if (!attainment.student_id || !attainment.course_id) continue;
    const profile = profilesById.get(attainment.student_id);
    const course = coursesById.get(attainment.course_id);
    if (!profile || !course?.teacher_id) continue;

    if (!profileMayReceiveDraft(profile, institutionPolicies)) {
      policySuppressed += 1;
      continue;
    }

    const signalsRow = gamificationByStudent.get(attainment.student_id);
    const stateKey = `${attainment.student_id}:${attainment.course_id}:${attainment.outcome_id}`;
    const previousState = latestStateBySubject.get(stateKey);
    const courseAssignments =
      assignmentsByCourse.get(attainment.course_id) ?? [];
    const upcomingAssignment = courseAssignments
      .filter(
        (assignment) =>
          Date.parse(assignment.due_date) >= now.getTime() &&
          assignmentCloIds(assignment).includes(attainment.outcome_id)
      )
      .sort((left, right) => left.due_date.localeCompare(right.due_date))[0];
    const recentDueAssignments = courseAssignments.filter(
      (assignment) => Date.parse(assignment.due_date) < now.getTime()
    );
    const studentSubmissions = submissions.filter(
      (submission) => submission.student_id === attainment.student_id
    );
    const submissionPattern = computeSubmissionPattern(
      recentDueAssignments,
      studentSubmissions
    );
    const enrollment = enrollments.find(
      (row) =>
        row.student_id === attainment.student_id &&
        row.course_id === attainment.course_id
    );
    const sectionSessions = enrollment?.section_id
      ? sessions.filter(
          (session) => session.section_id === enrollment.section_id
        )
      : [];
    const sectionSessionIds = new Set(
      sectionSessions.map((session) => session.id)
    );
    const studentAttendance = attendance.filter(
      (row) =>
        row.student_id === attainment.student_id &&
        sectionSessionIds.has(row.session_id)
    );
    const preferenceObject = jsonObject(profile.notification_preferences);
    const attendanceFrequency =
      preferenceObject?.ai_attendance_enabled === false
        ? "not_authorized"
        : computeAttendanceFrequency(sectionSessions.length, studentAttendance);
    const habitConsistency =
      preferenceObject?.ai_habits_enabled === false
        ? "not_authorized"
        : computeHabitConsistency(
            habits.filter((habit) => habit.student_id === attainment.student_id)
          );

    const evidence: LearningEvidence = {
      institutionId: profile.institution_id,
      studentId: attainment.student_id,
      teacherId: course.teacher_id,
      courseId: attainment.course_id,
      cloId: attainment.outcome_id,
      cloTitle: titlesById.get(attainment.outcome_id) ?? "Course outcome",
      masteryPercent: attainment.attainment_percent,
      previousMasteryPercent: previousState?.mastery.percent ?? null,
      daysSinceLastLogin: signalsRow
        ? daysSince(signalsRow.last_login_date, now)
        : 0,
      submissionPattern,
      attendanceFrequency,
      habitConsistency,
      upcomingDeadlineAt: upcomingAssignment?.due_date ?? null,
      observedAt: now.toISOString(),
      evidenceIds: [
        attainment.id,
        ...(upcomingAssignment ? [upcomingAssignment.id] : []),
        ...(["late", "missed"].includes(submissionPattern)
          ? recentDueAssignments.map((assignment) => assignment.id)
          : []),
        ...(attendanceFrequency === "low"
          ? studentAttendance.map((row) => row.id)
          : []),
        ...(habitConsistency === "low"
          ? habits
              .filter((habit) => habit.student_id === attainment.student_id)
              .map((habit) => habit.id)
          : []),
      ],
    };
    const state = recalculateStudentLearningState(evidence);
    statesRecalculated += 1;
    const stateChanged =
      !previousState ||
      learningStateEvidenceSignature(previousState) !==
        learningStateEvidenceSignature(state);
    if (stateChanged && statesPersisted < MAX_STATE_UPDATES_PER_RUN) {
      await insertAudit(supabase, {
        action: "agent.learning_state.recalculated",
        actorId: course.teacher_id,
        institutionId: profile.institution_id,
        targetId: attainment.student_id,
        targetType: "student_learning_state",
        diff: {
          system_actor: true,
          policy_version: "proactive-autonomy/v1.0.0",
          calculation_version: state.calculationVersion,
          learning_state: state,
          evidence_signature: learningStateEvidenceSignature(state),
          recommended_next_action:
            "Evaluate documented deterministic triggers using this updated state.",
        },
      });
      statesPersisted += 1;
    }

    const trigger = evaluateNeedsAttention(state);
    if (!trigger) continue;
    if (!autoLowRiskEnabled) {
      policySuppressed += 1;
      continue;
    }
    triggeredSubjects.push({ profile, course, state, trigger });
    if (
      flaggedStudents.has(attainment.student_id) ||
      (teacherFlagCount.get(course.teacher_id) ?? 0) >=
        MAX_FLAGS_PER_TEACHER_PER_RUN
    ) {
      continue;
    }
    if (recentFingerprints.has(trigger.evidenceFingerprint)) {
      duplicatesSuppressed += 1;
      continue;
    }
    const cooldownSubject = `${attainment.student_id}:${attainment.outcome_id}`;
    if (cooldownSubjects.has(cooldownSubject)) {
      cooldownSuppressed += 1;
      continue;
    }

    const proposalAuditId = await insertAudit(supabase, {
      action: "agent.proactive.teacher_needs_attention",
      actorId: course.teacher_id,
      institutionId: profile.institution_id,
      targetId: attainment.student_id,
      targetType: "student_learning_state",
      diff: {
        system_actor: true,
        status: "pending_approval",
        action_type: "send_message",
        required_approver_role: "teacher",
        required_approver_id: course.teacher_id,
        program_id: course.program_id,
        learning_state: state,
        trigger,
        evidence_fingerprint: trigger.evidenceFingerprint,
        recommended_next_action: trigger.recommendedNextAction,
        intervention_draft: trigger.interventionDraft,
      },
    });

    const followUpDueAt = new Date(
      now.getTime() + FOLLOW_UP_DELAY_DAYS * 86_400_000
    ).toISOString();
    const suggestionData = {
      status: "pending_approval",
      institution_id: profile.institution_id,
      course_id: course.id,
      program_id: course.program_id,
      clo_id: attainment.outcome_id,
      clo_title: evidence.cloTitle,
      required_approver_id: course.teacher_id,
      proposal_audit_id: proposalAuditId,
      action_type: "send_message",
      learning_state: state,
      trigger,
      calculation_version: state.calculationVersion,
      trigger_version: trigger.version,
      evidence_fingerprint: trigger.evidenceFingerprint,
      contributing_evidence: trigger.contributingEvidence,
      recommended_next_action: trigger.recommendedNextAction,
      intervention_draft: trigger.interventionDraft,
      follow_up_due_at: followUpDueAt,
      created_by: "agent-worker",
    };
    const { data: feedback, error: feedbackError } = await supabase
      .from("ai_feedback")
      .insert({
        student_id: attainment.student_id,
        suggestion_type: "at_risk_prediction",
        suggestion_text: `${
          evidence.cloTitle
        } needs attention: ${trigger.contributingEvidence
          .map((item) => item.key.replaceAll("_", " "))
          .join(", ")}.`,
        suggestion_data: suggestionData,
      })
      .select("id")
      .single();
    if (feedbackError) throw feedbackError;

    const { error: notificationError } = await supabase
      .from("notifications")
      .insert({
        user_id: course.teacher_id,
        type: "agent_approval_required",
        title: "Needs Attention - intervention draft ready",
        body: `${evidence.cloTitle}: review the cited evidence and approve or revise the student next action.`,
        is_read: false,
        metadata: {
          proposal_audit_id: proposalAuditId,
          feedback_id: feedback.id,
          student_id: attainment.student_id,
          course_id: course.id,
          trigger_version: trigger.version,
          status: "pending_approval",
        },
      });
    if (notificationError) throw notificationError;

    recentFingerprints.add(trigger.evidenceFingerprint);
    cooldownSubjects.add(cooldownSubject);
    flaggedStudents.add(attainment.student_id);
    teacherFlagCount.set(
      course.teacher_id,
      (teacherFlagCount.get(course.teacher_id) ?? 0) + 1
    );
    flagsCreated += 1;
  }

  const outcomesEvaluated = await evaluateApprovedInterventions(
    supabase,
    currentAttainment,
    now
  );
  const secondaryRoutes = autoLowRiskEnabled
    ? await routeSecondaryRoleArtifacts(
        supabase,
        triggeredSubjects,
        missingSignalsByInstitution,
        institutionPolicies,
        now
      )
    : { parentCandidates: 0, coordinatorWarnings: 0, adminWarnings: 0 };

  return {
    success: true,
    studentsEvaluated: profiles.length,
    statesRecalculated,
    statesPersisted,
    flagsCreated,
    outcomesEvaluated,
    ...secondaryRoutes,
    duplicatesSuppressed,
    cooldownSuppressed,
    policySuppressed,
    batchOffset,
    totalStudents,
    calculationVersion: "student-learning-state/v1.0.0",
    triggerVersion: "needs-attention/low-mastery-compounding-evidence/v1.0.0",
  };
}

async function approveProtectedAction(
  supabase: ReturnType<typeof createClient>,
  req: Request,
  request: ApprovalRequest
): Promise<Response> {
  if (Deno.env.get("AI_PROACTIVE_AGENTS_ENABLED") !== "true") {
    return response(409, { error: "Proactive intelligence is disabled" });
  }
  if (!request.proposalAuditId || !request.approvedMessage.trim()) {
    return response(400, {
      error: "proposalAuditId and approvedMessage are required",
    });
  }
  if (request.approvedMessage.trim().length > 1_000) {
    return response(400, { error: "approvedMessage exceeds 1000 characters" });
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace("Bearer ", "");
  const { data: userData, error: userError } = await supabase.auth.getUser(
    token
  );
  if (userError || !userData.user)
    return response(401, { error: "Unauthorized" });

  const { data: actorData, error: actorError } = await supabase
    .from("profiles")
    .select("id,institution_id,notification_preferences,role")
    .eq("id", userData.user.id)
    .single();
  if (actorError || actorData?.role !== "teacher") {
    return response(403, { error: "Teacher approval is required" });
  }
  const actorPreferences = jsonObject(actorData.notification_preferences);
  const configuredAutonomy = actorPreferences?.ai_autonomy;
  const userAutonomy = isAutonomy(configuredAutonomy)
    ? configuredAutonomy
    : "A2";
  const { data: institutionData, error: institutionError } = await supabase
    .from("institutions")
    .select("id,settings")
    .eq("id", actorData.institution_id)
    .single();
  if (institutionError) {
    return response(403, { error: "Institution policy is unavailable" });
  }
  const institutionSettings = jsonObject(institutionData.settings);
  const proactiveSettings = jsonObject(institutionSettings?.ai_proactive);
  const configuredInstitutionAutonomy =
    proactiveSettings?.autonomy ?? institutionSettings?.ai_operational_autonomy;
  const institutionAutonomy = isAutonomy(configuredInstitutionAutonomy)
    ? configuredInstitutionAutonomy
    : "A2";
  const approvalAutonomy = effectiveAutonomy([
    "A2",
    "A2",
    userAutonomy,
    institutionAutonomy,
  ]);
  if (
    proactiveSettings?.enabled === false ||
    institutionSettings?.ai_proactive_enabled === false ||
    actorPreferences?.ai_proactive_enabled === false ||
    approvalAutonomy !== "A2"
  ) {
    return response(403, {
      error: "Current autonomy or user preference does not permit execution",
    });
  }

  const { data: proposalData, error: proposalError } = await supabase
    .from("audit_logs")
    .select("id,action,actor_id,institution_id,target_id,diff,created_at")
    .eq("id", request.proposalAuditId)
    .single();
  if (proposalError) return response(404, { error: "Proposal not found" });
  const proposal = proposalData as AuditRow;
  const diff = jsonObject(proposal.diff);
  const state = diff?.learning_state;
  if (
    proposal.action !== "agent.proactive.teacher_needs_attention" ||
    proposal.actor_id !== actorData.id ||
    proposal.institution_id !== actorData.institution_id ||
    !proposal.target_id ||
    !isLearningState(state)
  ) {
    return response(403, { error: "Proposal is outside the teacher scope" });
  }

  const { data: courseData, error: courseError } = await supabase
    .from("courses")
    .select("id,teacher_id")
    .eq("id", state.courseId)
    .single();
  if (courseError || courseData?.teacher_id !== actorData.id) {
    return response(403, { error: "Teacher no longer owns this course" });
  }

  const { data: attainmentData, error: attainmentError } = await supabase
    .from("outcome_attainment")
    .select("attainment_percent,last_calculated_at")
    .eq("student_id", state.studentId)
    .eq("course_id", state.courseId)
    .eq("outcome_id", state.cloId)
    .eq("scope", "student_course")
    .single();
  if (attainmentError)
    return response(409, { error: "Evidence is no longer available" });

  const revalidatedState: StudentLearningState = {
    ...state,
    calculatedAt: new Date().toISOString(),
    mastery: {
      percent: attainmentData.attainment_percent,
      previousPercent: state.mastery.previousPercent,
      trend: state.mastery.trend,
    },
    evidenceIds: [...new Set([...state.evidenceIds])],
  };
  if (!evaluateNeedsAttention(revalidatedState)) {
    return response(409, {
      error: "The evidence no longer crosses the documented trigger",
    });
  }

  const { data: priorExecutions, error: priorExecutionError } = await supabase
    .from("audit_logs")
    .select("id")
    .eq("action", "agent.protected_action.approved_and_executed")
    .contains("diff", { proposal_audit_id: proposal.id })
    .limit(1);
  if (priorExecutionError) throw priorExecutionError;
  if (priorExecutions?.length) {
    return response(409, { error: "Proposal was already executed" });
  }

  const { data: feedbackData, error: feedbackError } = await supabase
    .from("ai_feedback")
    .select("id,suggestion_data")
    .eq("student_id", proposal.target_id)
    .eq("suggestion_type", "at_risk_prediction")
    .contains("suggestion_data", { proposal_audit_id: proposal.id })
    .single();
  if (feedbackError)
    return response(409, { error: "Pending flag is unavailable" });
  const feedbackPayload = jsonObject(feedbackData.suggestion_data);
  if (feedbackPayload?.status !== "pending_approval") {
    return response(409, { error: "Proposal is not pending approval" });
  }

  const approvedAt = new Date().toISOString();
  const executingFeedback = {
    ...feedbackPayload,
    status: "executing",
    approved_at: approvedAt,
    approved_message: request.approvedMessage.trim(),
    approved_by: actorData.id,
  };
  const { data: claimedFeedback, error: claimError } = await supabase
    .from("ai_feedback")
    .update({ suggestion_data: executingFeedback })
    .eq("id", feedbackData.id)
    .contains("suggestion_data", { status: "pending_approval" })
    .select("id")
    .maybeSingle();
  if (claimError) throw claimError;
  if (!claimedFeedback) {
    return response(409, { error: "Proposal is already being processed" });
  }

  const { error: studentNotificationError } = await supabase
    .from("notifications")
    .insert({
      user_id: proposal.target_id,
      type: "proactive_next_action",
      title: "Your teacher approved a next action",
      body: request.approvedMessage.trim(),
      is_read: false,
      metadata: {
        proposal_audit_id: proposal.id,
        feedback_id: feedbackData.id,
        course_id: state.courseId,
        clo_id: state.cloId,
        approved_by: actorData.id,
        approved_at: approvedAt,
        priority: "high",
      },
    });
  if (studentNotificationError) {
    await supabase
      .from("ai_feedback")
      .update({
        suggestion_data: {
          ...feedbackPayload,
          status: "pending_approval",
          last_execution_error_at: approvedAt,
        },
      })
      .eq("id", feedbackData.id)
      .contains("suggestion_data", { status: "executing" });
    throw studentNotificationError;
  }

  const updatedFeedback = {
    ...feedbackPayload,
    status: "approved",
    approved_at: approvedAt,
    approved_message: request.approvedMessage.trim(),
    approved_by: actorData.id,
  };
  const { error: updateError } = await supabase
    .from("ai_feedback")
    .update({ suggestion_data: updatedFeedback })
    .eq("id", feedbackData.id);
  if (updateError) throw updateError;

  const { data: approvalNotifications, error: approvalNotificationError } =
    await supabase
      .from("notifications")
      .select("id,metadata")
      .eq("user_id", actorData.id)
      .eq("type", "agent_approval_required")
      .contains("metadata", { proposal_audit_id: proposal.id });
  if (approvalNotificationError) throw approvalNotificationError;
  for (const notification of approvalNotifications ?? []) {
    const metadata = jsonObject(notification.metadata) ?? {};
    const { error: notificationUpdateError } = await supabase
      .from("notifications")
      .update({
        is_read: true,
        metadata: { ...metadata, status: "approved", approved_at: approvedAt },
      })
      .eq("id", notification.id);
    if (notificationUpdateError) throw notificationUpdateError;
  }

  const executionAuditId = await insertAudit(supabase, {
    action: "agent.protected_action.approved_and_executed",
    actorId: actorData.id,
    institutionId: actorData.institution_id,
    targetId: proposal.target_id,
    targetType: "student_next_action",
    diff: {
      proposal_audit_id: proposal.id,
      feedback_id: feedbackData.id,
      action_type: "send_message",
      authorization_result: "authorized",
      approval_result: "approved",
      execution_result: "completed",
      approved_at: approvedAt,
      calculation_version: state.calculationVersion,
    },
  });

  return response(200, {
    success: true,
    status: "completed",
    proposalAuditId: proposal.id,
    executionAuditId,
    followUpDueAt: updatedFeedback.follow_up_due_at,
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response("ok", { headers: corsHeaders });

  try {
    const body = await readRequest(req);
    const serverKey = getManagedServerKey();
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, serverKey);

    if (body.action === "approve_protected_action") {
      return await approveProtectedAction(supabase, req, body);
    }
    if (!isSystemCaller(req)) return response(401, { error: "Unauthorized" });

    return response(200, await runScheduledScan(supabase, body));
  } catch (error) {
    console.error(
      "agent-worker failed",
      error instanceof Error ? error.message : error
    );
    return response(500, { error: "Agent worker failed" });
  }
});
