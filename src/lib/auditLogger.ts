import { supabase } from "@/lib/supabase";
import type { Json } from "@/types/database";

export interface AuditLogEntry {
  action: string;
  entity_type: string;
  entity_id: string;
  changes: Record<string, unknown> | null;
  performed_by: string;
}

/**
 * Allowlisted fields per entity type to prevent PII leakage into audit logs.
 * Only these fields will be recorded in the `diff` column.
 */
const AUDIT_FIELD_ALLOWLIST: Record<string, string[]> = {
  user: ["role", "is_active", "program_id"],
  grade: ["submission_id", "score_percent", "total_score"],
  assignment: ["title", "course_id", "due_date", "status"],
  course: ["name", "code", "program_id", "semester_id", "teacher_id"],
  program: ["name", "code", "institution_id", "coordinator_id"],
  ilo: ["title", "type", "institution_id"],
  plo: ["title", "type", "program_id"],
  clo: ["title", "type", "course_id", "blooms_level"],
  outcome_mapping: ["source_outcome_id", "target_outcome_id", "weight"],
  bonus_xp_event: ["name", "multiplier", "start_date", "end_date"],
  enrollment: ["student_id", "course_id", "status"],
  semester: [
    "name",
    "code",
    "start_date",
    "end_date",
    "is_active",
    "institution_id",
  ],
  department: ["name", "code", "head_of_department_id", "institution_id"],
  course_section: [
    "course_id",
    "section_code",
    "teacher_id",
    "capacity",
    "is_active",
  ],
  survey: ["title", "type", "is_active", "target_outcomes", "institution_id"],
  cqi_action_plan: [
    "program_id",
    "semester_id",
    "outcome_id",
    "outcome_type",
    "baseline_attainment",
    "target_attainment",
    "action_description",
    "responsible_person",
    "status",
    "result_attainment",
  ],
  institution_settings: [
    "attainment_thresholds",
    "success_threshold",
    "accreditation_body",
    "grade_scales",
    "default_language",
  ],
  program_accreditation: [
    "program_id",
    "accreditation_body",
    "framework_version",
    "accreditation_date",
    "next_review_date",
    "status",
  ],
  announcement: ["course_id", "title", "is_pinned"],
  course_module: ["course_id", "title", "sort_order", "is_published"],
  course_material: [
    "module_id",
    "title",
    "type",
    "sort_order",
    "is_published",
    "clo_ids",
  ],
  class_session: ["section_id", "session_date", "session_type", "topic"],
  attendance_record: ["session_id", "student_count"],
  quiz: [
    "course_id",
    "title",
    "clo_ids",
    "time_limit_minutes",
    "max_attempts",
    "is_published",
    "due_date",
  ],
  quiz_question: ["quiz_id", "question_type", "points", "sort_order"],
  grade_category: ["course_id", "name", "weight_percent", "sort_order"],
};

function filterChanges(
  entityType: string,
  changes: Record<string, unknown> | null
): Record<string, unknown> | null {
  if (!changes) return null;

  const allowlist = AUDIT_FIELD_ALLOWLIST[entityType];
  if (!allowlist) {
    // Unknown entity type: log only keys, not values, to be safe
    return Object.fromEntries(
      Object.keys(changes).map((key) => [key, "[redacted]"])
    );
  }

  const filtered: Record<string, unknown> = {};
  for (const key of allowlist) {
    if (key in changes) {
      filtered[key] = changes[key];
    }
  }
  return filtered;
}

export const logAuditEvent = async (entry: AuditLogEntry): Promise<void> => {
  try {
    const safeChanges = filterChanges(entry.entity_type, entry.changes);

    const { error } = await supabase.from("audit_logs").insert({
      action: entry.action,
      target_type: entry.entity_type,
      target_id: entry.entity_id,
      diff: safeChanges as Json,
      actor_id: entry.performed_by,
    });

    if (error) {
      console.error("[AuditLogger] Failed to log audit event:", error.message);
    }
  } catch (err) {
    console.error("[AuditLogger] Unexpected error:", err);
  }
};
