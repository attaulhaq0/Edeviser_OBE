-- Migration: Add indexes to 68 unindexed foreign key columns
-- Defect 3 from Supabase Audit Report: FK columns without covering indexes
-- cause sequential scans on JOINs instead of efficient index lookups.
--
-- Naming convention: idx_{table}_{column}
-- Organized alphabetically by table for readability.
-- Uses IF NOT EXISTS for idempotent re-runs.

-- ─── academic_calendar_events ───────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_academic_calendar_events_institution_id
  ON academic_calendar_events (institution_id);

CREATE INDEX IF NOT EXISTS idx_academic_calendar_events_semester_id
  ON academic_calendar_events (semester_id);

-- ─── announcements ──────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_announcements_author_id
  ON announcements (author_id);

CREATE INDEX IF NOT EXISTS idx_announcements_course_id
  ON announcements (course_id);

-- ─── assignments ────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_assignments_course_id
  ON assignments (course_id);

CREATE INDEX IF NOT EXISTS idx_assignments_created_by
  ON assignments (created_by);

-- ─── attendance_records ─────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_attendance_records_marked_by
  ON attendance_records (marked_by);

-- ─── audit_logs ─────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_id
  ON audit_logs (actor_id);

-- ─── badges ─────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_badges_student_id
  ON badges (student_id);

-- ─── class_sessions ─────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_class_sessions_section_id
  ON class_sessions (section_id);

-- ─── course_materials ───────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_course_materials_module_id
  ON course_materials (module_id);

-- ─── course_modules ─────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_course_modules_course_id
  ON course_modules (course_id);

-- ─── course_sections ────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_course_sections_course_id
  ON course_sections (course_id);

CREATE INDEX IF NOT EXISTS idx_course_sections_teacher_id
  ON course_sections (teacher_id);

-- ─── courses ────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_courses_teacher_id
  ON courses (teacher_id);

CREATE INDEX IF NOT EXISTS idx_courses_program_id
  ON courses (program_id);

CREATE INDEX IF NOT EXISTS idx_courses_semester_id
  ON courses (semester_id);

-- ─── cqi_action_plans ───────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_cqi_action_plans_outcome_id
  ON cqi_action_plans (outcome_id);

CREATE INDEX IF NOT EXISTS idx_cqi_action_plans_program_id
  ON cqi_action_plans (program_id);

CREATE INDEX IF NOT EXISTS idx_cqi_action_plans_semester_id
  ON cqi_action_plans (semester_id);

-- ─── departments ────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_departments_institution_id
  ON departments (institution_id);

CREATE INDEX IF NOT EXISTS idx_departments_head_of_department_id
  ON departments (head_of_department_id);

-- ─── discussion_replies ─────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_discussion_replies_thread_id
  ON discussion_replies (thread_id);

CREATE INDEX IF NOT EXISTS idx_discussion_replies_author_id
  ON discussion_replies (author_id);

-- ─── discussion_threads ─────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_discussion_threads_course_id
  ON discussion_threads (course_id);

CREATE INDEX IF NOT EXISTS idx_discussion_threads_author_id
  ON discussion_threads (author_id);

-- ─── evidence ───────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_evidence_clo_id
  ON evidence (clo_id);

CREATE INDEX IF NOT EXISTS idx_evidence_submission_id
  ON evidence (submission_id);

CREATE INDEX IF NOT EXISTS idx_evidence_grade_id
  ON evidence (grade_id);

CREATE INDEX IF NOT EXISTS idx_evidence_ilo_id
  ON evidence (ilo_id);

CREATE INDEX IF NOT EXISTS idx_evidence_plo_id
  ON evidence (plo_id);

-- ─── fee_payments ───────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_fee_payments_fee_structure_id
  ON fee_payments (fee_structure_id);

-- ─── fee_structures ─────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_fee_structures_program_id
  ON fee_structures (program_id);

CREATE INDEX IF NOT EXISTS idx_fee_structures_semester_id
  ON fee_structures (semester_id);

-- ─── grade_categories ───────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_grade_categories_course_id
  ON grade_categories (course_id);

-- ─── grades ─────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_grades_submission_id
  ON grades (submission_id);

CREATE INDEX IF NOT EXISTS idx_grades_graded_by
  ON grades (graded_by);

-- ─── habit_tracking ─────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_habit_tracking_student_id
  ON habit_tracking (student_id);

-- ─── journal_entries ────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_journal_entries_student_id
  ON journal_entries (student_id);

CREATE INDEX IF NOT EXISTS idx_journal_entries_course_id
  ON journal_entries (course_id);

CREATE INDEX IF NOT EXISTS idx_journal_entries_clo_id
  ON journal_entries (clo_id);

-- ─── learning_outcomes ──────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_learning_outcomes_course_id
  ON learning_outcomes (course_id);

CREATE INDEX IF NOT EXISTS idx_learning_outcomes_program_id
  ON learning_outcomes (program_id);

CREATE INDEX IF NOT EXISTS idx_learning_outcomes_institution_id
  ON learning_outcomes (institution_id);

CREATE INDEX IF NOT EXISTS idx_learning_outcomes_created_by
  ON learning_outcomes (created_by);

-- ─── learning_path_nodes ────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_learning_path_nodes_assignment_id
  ON learning_path_nodes (assignment_id);

CREATE INDEX IF NOT EXISTS idx_learning_path_nodes_course_id
  ON learning_path_nodes (course_id);

CREATE INDEX IF NOT EXISTS idx_learning_path_nodes_prerequisite_node_id
  ON learning_path_nodes (prerequisite_node_id);

-- ─── mastery_recovery_pathways ──────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_mastery_recovery_pathways_institution_id
  ON mastery_recovery_pathways (institution_id);

-- ─── notifications ──────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_notifications_user_id
  ON notifications (user_id);

-- ─── onboarding_questions ───────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_onboarding_questions_clo_id
  ON onboarding_questions (clo_id);

CREATE INDEX IF NOT EXISTS idx_onboarding_questions_course_id
  ON onboarding_questions (course_id);

-- ─── onboarding_responses ───────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_onboarding_responses_question_id
  ON onboarding_responses (question_id);

-- ─── outcome_mappings ───────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_outcome_mappings_source_outcome_id
  ON outcome_mappings (source_outcome_id);

CREATE INDEX IF NOT EXISTS idx_outcome_mappings_target_outcome_id
  ON outcome_mappings (target_outcome_id);

-- ─── programs ───────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_programs_department_id
  ON programs (department_id);

CREATE INDEX IF NOT EXISTS idx_programs_institution_id
  ON programs (institution_id);

CREATE INDEX IF NOT EXISTS idx_programs_coordinator_id
  ON programs (coordinator_id);

-- ─── question_bank ──────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_question_bank_created_by
  ON question_bank (created_by);

CREATE INDEX IF NOT EXISTS idx_question_bank_institution_id
  ON question_bank (institution_id);

CREATE INDEX IF NOT EXISTS idx_question_bank_parent_question_id
  ON question_bank (parent_question_id);

-- ─── quiz_generation_logs ───────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_quiz_generation_logs_teacher_id
  ON quiz_generation_logs (teacher_id);

-- ─── quiz_questions ─────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_quiz_questions_quiz_id
  ON quiz_questions (quiz_id);

-- ─── quizzes ────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_quizzes_course_id
  ON quizzes (course_id);

-- ─── rubric_criteria ────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_rubric_criteria_rubric_id
  ON rubric_criteria (rubric_id);

-- ─── rubrics ────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_rubrics_clo_id
  ON rubrics (clo_id);

CREATE INDEX IF NOT EXISTS idx_rubrics_created_by
  ON rubrics (created_by);

-- ─── social_challenges ──────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_social_challenges_course_id
  ON social_challenges (course_id);
