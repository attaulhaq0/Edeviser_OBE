-- =============================================================================
-- Migration: Optimize RLS Policies — (select auth.uid()) Pattern
-- =============================================================================
-- Supabase best practice: wrap auth.uid(), auth_user_role(), and
-- auth_institution_id() in subselects so Postgres evaluates them once per
-- query (as an InitPlan) instead of once per row.
--
-- This migration DROPs and recreates all RLS policies that use bare function
-- calls. The logic is identical — only the evaluation strategy changes.
-- =============================================================================

-- ─── PROFILES ────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "profiles_read_own" ON profiles;
CREATE POLICY "profiles_read_own" ON profiles
  FOR SELECT USING (id = (select auth.uid()));

DROP POLICY IF EXISTS "profiles_admin_read_institution" ON profiles;
CREATE POLICY "profiles_admin_read_institution" ON profiles
  FOR SELECT USING (
    (select auth_user_role()) = 'admin'
    AND institution_id = (select auth_institution_id())
  );

DROP POLICY IF EXISTS "profiles_admin_write" ON profiles;
CREATE POLICY "profiles_admin_write" ON profiles
  FOR ALL USING (
    (select auth_user_role()) = 'admin'
    AND institution_id = (select auth_institution_id())
  );

DROP POLICY IF EXISTS "profiles_teacher_read_students" ON profiles;
CREATE POLICY "profiles_teacher_read_students" ON profiles
  FOR SELECT USING (
    (select auth_user_role()) = 'teacher'
    AND id IN (
      SELECT sc.student_id FROM student_courses sc
      JOIN courses c ON c.id = sc.course_id
      WHERE c.teacher_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "profiles_coordinator_read" ON profiles;
CREATE POLICY "profiles_coordinator_read" ON profiles
  FOR SELECT USING (
    (select auth_user_role()) = 'coordinator'
    AND institution_id = (select auth_institution_id())
  );

-- ─── INSTITUTIONS ────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "institutions_read_own" ON institutions;
CREATE POLICY "institutions_read_own" ON institutions
  FOR SELECT USING (id = (select auth_institution_id()));

DROP POLICY IF EXISTS "institutions_admin_write" ON institutions;
CREATE POLICY "institutions_admin_write" ON institutions
  FOR ALL USING (
    (select auth_user_role()) = 'admin'
    AND id = (select auth_institution_id())
  );

-- ─── PROGRAMS ────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "programs_institution_read" ON programs;
CREATE POLICY "programs_institution_read" ON programs
  FOR SELECT USING (institution_id = (select auth_institution_id()));

DROP POLICY IF EXISTS "programs_admin_write" ON programs;
CREATE POLICY "programs_admin_write" ON programs
  FOR ALL USING (
    (select auth_user_role()) = 'admin'
    AND institution_id = (select auth_institution_id())
  );

-- ─── COURSES ─────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "courses_institution_read" ON courses;
CREATE POLICY "courses_institution_read" ON courses
  FOR SELECT USING (
    program_id IN (SELECT id FROM programs WHERE institution_id = (select auth_institution_id()))
  );

DROP POLICY IF EXISTS "courses_coordinator_write" ON courses;
CREATE POLICY "courses_coordinator_write" ON courses
  FOR ALL USING (
    (select auth_user_role()) = 'coordinator'
    AND program_id IN (SELECT id FROM programs WHERE coordinator_id = (select auth.uid()))
  );

DROP POLICY IF EXISTS "courses_admin_write" ON courses;
CREATE POLICY "courses_admin_write" ON courses
  FOR ALL USING (
    (select auth_user_role()) = 'admin'
    AND program_id IN (SELECT id FROM programs WHERE institution_id = (select auth_institution_id()))
  );

-- ─── STUDENT_COURSES ─────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "student_courses_student_read" ON student_courses;
CREATE POLICY "student_courses_student_read" ON student_courses
  FOR SELECT USING (student_id = (select auth.uid()));

DROP POLICY IF EXISTS "student_courses_teacher_manage" ON student_courses;
CREATE POLICY "student_courses_teacher_manage" ON student_courses
  FOR ALL USING (
    (select auth_user_role()) = 'teacher'
    AND course_id IN (SELECT id FROM courses WHERE teacher_id = (select auth.uid()))
  );

DROP POLICY IF EXISTS "student_courses_admin_read" ON student_courses;
CREATE POLICY "student_courses_admin_read" ON student_courses
  FOR SELECT USING (
    (select auth_user_role()) IN ('admin', 'coordinator')
  );

-- ─── OUTCOME_MAPPINGS ────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "outcome_mappings_institution_read" ON outcome_mappings;
CREATE POLICY "outcome_mappings_institution_read" ON outcome_mappings
  FOR SELECT USING (
    source_outcome_id IN (SELECT id FROM learning_outcomes WHERE institution_id = (select auth_institution_id()))
  );

DROP POLICY IF EXISTS "outcome_mappings_admin_write" ON outcome_mappings;
DROP POLICY IF EXISTS "outcome_mappings_coordinator_write" ON outcome_mappings;
DROP POLICY IF EXISTS "outcome_mappings_teacher_write" ON outcome_mappings;
CREATE POLICY "outcome_mappings_staff_write" ON outcome_mappings
  FOR ALL USING (
    (select auth_user_role()) IN ('admin', 'coordinator', 'teacher')
  );

-- ─── RUBRICS ─────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "rubrics_institution_read" ON rubrics;
CREATE POLICY "rubrics_institution_read" ON rubrics
  FOR SELECT USING (
    clo_id IN (SELECT id FROM learning_outcomes WHERE institution_id = (select auth_institution_id()))
    OR is_template = true
  );

DROP POLICY IF EXISTS "rubrics_teacher_write" ON rubrics;
CREATE POLICY "rubrics_teacher_write" ON rubrics
  FOR ALL USING (
    (select auth_user_role()) = 'teacher'
    AND (created_by = (select auth.uid()) OR is_template = true)
  );

-- ─── RUBRIC_CRITERIA ─────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "rubric_criteria_read" ON rubric_criteria;
CREATE POLICY "rubric_criteria_read" ON rubric_criteria
  FOR SELECT USING (
    rubric_id IN (SELECT id FROM rubrics)
  );

DROP POLICY IF EXISTS "rubric_criteria_teacher_write" ON rubric_criteria;
CREATE POLICY "rubric_criteria_teacher_write" ON rubric_criteria
  FOR ALL USING (
    (select auth_user_role()) = 'teacher'
    AND rubric_id IN (SELECT id FROM rubrics WHERE created_by = (select auth.uid()))
  );

-- ─── ASSIGNMENTS ─────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "assignments_teacher_write" ON assignments;
CREATE POLICY "assignments_teacher_write" ON assignments
  FOR ALL USING (
    (select auth_user_role()) = 'teacher'
    AND course_id IN (SELECT id FROM courses WHERE teacher_id = (select auth.uid()))
  );

DROP POLICY IF EXISTS "assignments_student_read" ON assignments;
CREATE POLICY "assignments_student_read" ON assignments
  FOR SELECT USING (
    course_id IN (SELECT course_id FROM student_courses WHERE student_id = (select auth.uid()) AND status = 'active')
  );

DROP POLICY IF EXISTS "assignments_staff_read" ON assignments;
CREATE POLICY "assignments_staff_read" ON assignments
  FOR SELECT USING (
    (select auth_user_role()) IN ('admin', 'coordinator')
  );

-- ─── GRADES ──────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "grades_teacher_write" ON grades;
CREATE POLICY "grades_teacher_write" ON grades
  FOR ALL USING (
    (select auth_user_role()) = 'teacher'
    AND graded_by = (select auth.uid())
  );

DROP POLICY IF EXISTS "grades_student_read" ON grades;
CREATE POLICY "grades_student_read" ON grades
  FOR SELECT USING (
    submission_id IN (SELECT id FROM submissions WHERE student_id = (select auth.uid()))
  );

DROP POLICY IF EXISTS "grades_teacher_read" ON grades;
CREATE POLICY "grades_teacher_read" ON grades
  FOR SELECT USING (
    (select auth_user_role()) = 'teacher'
    AND submission_id IN (
      SELECT s.id FROM submissions s
      JOIN assignments a ON a.id = s.assignment_id
      JOIN courses c ON c.id = a.course_id
      WHERE c.teacher_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "parent_read_student_grades" ON grades;
CREATE POLICY "parent_read_student_grades" ON grades
  FOR SELECT USING (
    (select auth_user_role()) = 'parent'
    AND EXISTS (
      SELECT 1 FROM submissions s
      JOIN parent_student_links psl ON psl.student_id = s.student_id
      WHERE s.id = grades.submission_id
      AND psl.parent_id = (select auth.uid())
      AND psl.verified = true
    )
  );

-- ─── OUTCOME_ATTAINMENT ─────────────────────────────────────────────────────

DROP POLICY IF EXISTS "attainment_student_read" ON outcome_attainment;
CREATE POLICY "attainment_student_read" ON outcome_attainment
  FOR SELECT USING (student_id = (select auth.uid()));

DROP POLICY IF EXISTS "attainment_staff_read" ON outcome_attainment;
CREATE POLICY "attainment_staff_read" ON outcome_attainment
  FOR SELECT USING (
    (select auth_user_role()) IN ('teacher', 'coordinator', 'admin')
  );

DROP POLICY IF EXISTS "parent_read_student_attainment" ON outcome_attainment;
CREATE POLICY "parent_read_student_attainment" ON outcome_attainment
  FOR SELECT USING (
    (select auth_user_role()) = 'parent'
    AND student_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM parent_student_links psl
      WHERE psl.student_id = outcome_attainment.student_id
      AND psl.parent_id = (select auth.uid())
      AND psl.verified = true
    )
  );

-- ─── BADGES ──────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "badges_student_read" ON badges;
CREATE POLICY "badges_student_read" ON badges
  FOR SELECT USING (student_id = (select auth.uid()));

-- badges_public_read has no auth calls — leave as-is

-- ─── XP_TRANSACTIONS ────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "xp_transactions_student_read" ON xp_transactions;
CREATE POLICY "xp_transactions_student_read" ON xp_transactions
  FOR SELECT USING (student_id = (select auth.uid()));

DROP POLICY IF EXISTS "xp_transactions_admin_read" ON xp_transactions;
CREATE POLICY "xp_transactions_admin_read" ON xp_transactions
  FOR SELECT USING ((select auth_user_role()) = 'admin');

-- ─── JOURNAL_ENTRIES ─────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "journal_student_own" ON journal_entries;
CREATE POLICY "journal_student_own" ON journal_entries
  FOR ALL USING (student_id = (select auth.uid()));

DROP POLICY IF EXISTS "journal_teacher_read_shared" ON journal_entries;
CREATE POLICY "journal_teacher_read_shared" ON journal_entries
  FOR SELECT USING (
    (select auth_user_role()) = 'teacher'
    AND is_shared = true
    AND course_id IN (SELECT id FROM courses WHERE teacher_id = (select auth.uid()))
  );

-- ─── NOTIFICATIONS ───────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "notifications_own" ON notifications;
CREATE POLICY "notifications_own" ON notifications
  FOR ALL USING (user_id = (select auth.uid()));

-- ─── AUDIT_LOGS ──────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "audit_logs_admin_insert" ON audit_logs;
CREATE POLICY "audit_logs_admin_insert" ON audit_logs
  FOR INSERT WITH CHECK ((select auth_user_role()) = 'admin');

-- ─── STUDENT_ACTIVITY_LOG ────────────────────────────────────────────────────

DROP POLICY IF EXISTS "activity_log_student_insert" ON student_activity_log;
CREATE POLICY "activity_log_student_insert" ON student_activity_log
  FOR INSERT WITH CHECK (student_id = (select auth.uid()));

DROP POLICY IF EXISTS "activity_log_admin_read" ON student_activity_log;
CREATE POLICY "activity_log_admin_read" ON student_activity_log
  FOR SELECT USING ((select auth_user_role()) = 'admin');

-- ─── AI_FEEDBACK ─────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "ai_feedback_student_read" ON ai_feedback;
CREATE POLICY "ai_feedback_student_read" ON ai_feedback
  FOR SELECT USING (student_id = (select auth.uid()));

DROP POLICY IF EXISTS "ai_feedback_student_update" ON ai_feedback;
CREATE POLICY "ai_feedback_student_update" ON ai_feedback
  FOR UPDATE USING (student_id = (select auth.uid()));

DROP POLICY IF EXISTS "ai_feedback_teacher_read" ON ai_feedback;
CREATE POLICY "ai_feedback_teacher_read" ON ai_feedback
  FOR SELECT USING (
    (select auth_user_role()) = 'teacher'
    AND student_id IN (
      SELECT sc.student_id FROM student_courses sc
      JOIN courses c ON c.id = sc.course_id
      WHERE c.teacher_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "ai_feedback_admin_read" ON ai_feedback;
CREATE POLICY "ai_feedback_admin_read" ON ai_feedback
  FOR SELECT USING ((select auth_user_role()) = 'admin');

-- ─── SEMESTERS ───────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "semesters_institution_read" ON semesters;
CREATE POLICY "semesters_institution_read" ON semesters
  FOR SELECT USING (institution_id = (select auth_institution_id()));

DROP POLICY IF EXISTS "semesters_admin_write" ON semesters;
CREATE POLICY "semesters_admin_write" ON semesters
  FOR ALL USING ((select auth_user_role()) = 'admin' AND institution_id = (select auth_institution_id()));

-- ─── DEPARTMENTS ─────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "departments_institution_read" ON departments;
CREATE POLICY "departments_institution_read" ON departments
  FOR SELECT USING (institution_id = (select auth_institution_id()));

DROP POLICY IF EXISTS "departments_admin_write" ON departments;
CREATE POLICY "departments_admin_write" ON departments
  FOR ALL USING ((select auth_user_role()) = 'admin' AND institution_id = (select auth_institution_id()));

-- ─── COURSE_SECTIONS ─────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "sections_read" ON course_sections;
CREATE POLICY "sections_read" ON course_sections
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM courses c
      JOIN programs p ON p.id = c.program_id
      WHERE c.id = course_sections.course_id
      AND p.institution_id = (select auth_institution_id())
    )
  );

DROP POLICY IF EXISTS "sections_admin_write" ON course_sections;
CREATE POLICY "sections_admin_write" ON course_sections
  FOR ALL USING (
    (select auth_user_role()) = 'admin'
    AND EXISTS (
      SELECT 1 FROM courses c
      JOIN programs p ON p.id = c.program_id
      WHERE c.id = course_sections.course_id
      AND p.institution_id = (select auth_institution_id())
    )
  );

DROP POLICY IF EXISTS "sections_coordinator_write" ON course_sections;
CREATE POLICY "sections_coordinator_write" ON course_sections
  FOR ALL USING (
    (select auth_user_role()) = 'coordinator'
    AND EXISTS (
      SELECT 1 FROM courses c
      JOIN programs p ON p.id = c.program_id
      WHERE c.id = course_sections.course_id
      AND p.coordinator_id = (select auth.uid())
    )
  );

-- ─── SURVEYS ─────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "surveys_institution_read" ON surveys;
CREATE POLICY "surveys_institution_read" ON surveys
  FOR SELECT USING (institution_id = (select auth_institution_id()));

DROP POLICY IF EXISTS "surveys_admin_write" ON surveys;
CREATE POLICY "surveys_admin_write" ON surveys
  FOR ALL USING ((select auth_user_role()) = 'admin' AND institution_id = (select auth_institution_id()));

DROP POLICY IF EXISTS "surveys_coordinator_write" ON surveys;
CREATE POLICY "surveys_coordinator_write" ON surveys
  FOR ALL USING ((select auth_user_role()) = 'coordinator' AND institution_id = (select auth_institution_id()));

-- ─── SURVEY_QUESTIONS ────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "survey_questions_read" ON survey_questions;
CREATE POLICY "survey_questions_read" ON survey_questions
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM surveys s WHERE s.id = survey_questions.survey_id AND s.institution_id = (select auth_institution_id()))
  );

DROP POLICY IF EXISTS "survey_questions_admin_write" ON survey_questions;
CREATE POLICY "survey_questions_admin_write" ON survey_questions
  FOR ALL USING (
    (select auth_user_role()) IN ('admin', 'coordinator')
    AND EXISTS (SELECT 1 FROM surveys s WHERE s.id = survey_questions.survey_id AND s.institution_id = (select auth_institution_id()))
  );

-- ─── SURVEY_RESPONSES ────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "survey_responses_own_read" ON survey_responses;
CREATE POLICY "survey_responses_own_read" ON survey_responses
  FOR SELECT USING (respondent_id = (select auth.uid()));

DROP POLICY IF EXISTS "survey_responses_own_insert" ON survey_responses;
CREATE POLICY "survey_responses_own_insert" ON survey_responses
  FOR INSERT WITH CHECK (respondent_id = (select auth.uid()));

DROP POLICY IF EXISTS "survey_responses_admin_read" ON survey_responses;
CREATE POLICY "survey_responses_admin_read" ON survey_responses
  FOR SELECT USING (
    (select auth_user_role()) IN ('admin', 'coordinator')
    AND EXISTS (SELECT 1 FROM surveys s WHERE s.id = survey_responses.survey_id AND s.institution_id = (select auth_institution_id()))
  );

-- ─── CQI_ACTION_PLANS ───────────────────────────────────────────────────────

DROP POLICY IF EXISTS "cqi_plans_read" ON cqi_action_plans;
CREATE POLICY "cqi_plans_read" ON cqi_action_plans
  FOR SELECT USING (
    (select auth_user_role()) IN ('admin', 'coordinator')
    AND EXISTS (
      SELECT 1 FROM programs p WHERE p.id = cqi_action_plans.program_id AND p.institution_id = (select auth_institution_id())
    )
  );

DROP POLICY IF EXISTS "cqi_plans_coordinator_write" ON cqi_action_plans;
CREATE POLICY "cqi_plans_coordinator_write" ON cqi_action_plans
  FOR ALL USING (
    (select auth_user_role()) = 'coordinator'
    AND EXISTS (
      SELECT 1 FROM programs p WHERE p.id = cqi_action_plans.program_id AND p.coordinator_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "cqi_plans_admin_write" ON cqi_action_plans;
CREATE POLICY "cqi_plans_admin_write" ON cqi_action_plans
  FOR ALL USING (
    (select auth_user_role()) = 'admin'
    AND EXISTS (
      SELECT 1 FROM programs p WHERE p.id = cqi_action_plans.program_id AND p.institution_id = (select auth_institution_id())
    )
  );

-- ─── INSTITUTION_SETTINGS ────────────────────────────────────────────────────

DROP POLICY IF EXISTS "institution_settings_read" ON institution_settings;
CREATE POLICY "institution_settings_read" ON institution_settings
  FOR SELECT USING (institution_id = (select auth_institution_id()));

DROP POLICY IF EXISTS "institution_settings_admin_write" ON institution_settings;
CREATE POLICY "institution_settings_admin_write" ON institution_settings
  FOR ALL USING ((select auth_user_role()) = 'admin' AND institution_id = (select auth_institution_id()));

-- ─── PROGRAM_ACCREDITATIONS ─────────────────────────────────────────────────

DROP POLICY IF EXISTS "program_accreditations_read" ON program_accreditations;
CREATE POLICY "program_accreditations_read" ON program_accreditations
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM programs p WHERE p.id = program_accreditations.program_id AND p.institution_id = (select auth_institution_id()))
  );

DROP POLICY IF EXISTS "program_accreditations_admin_write" ON program_accreditations;
CREATE POLICY "program_accreditations_admin_write" ON program_accreditations
  FOR ALL USING (
    (select auth_user_role()) = 'admin'
    AND EXISTS (SELECT 1 FROM programs p WHERE p.id = program_accreditations.program_id AND p.institution_id = (select auth_institution_id()))
  );

DROP POLICY IF EXISTS "program_accreditations_coordinator_write" ON program_accreditations;
CREATE POLICY "program_accreditations_coordinator_write" ON program_accreditations
  FOR ALL USING (
    (select auth_user_role()) = 'coordinator'
    AND EXISTS (SELECT 1 FROM programs p WHERE p.id = program_accreditations.program_id AND p.coordinator_id = (select auth.uid()))
  );

-- ─── ANNOUNCEMENTS ───────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "announcements_course_read" ON announcements;
CREATE POLICY "announcements_course_read" ON announcements
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM courses c
      JOIN programs p ON p.id = c.program_id
      WHERE c.id = announcements.course_id
      AND p.institution_id = (select auth_institution_id())
    )
  );

DROP POLICY IF EXISTS "announcements_teacher_write" ON announcements;
CREATE POLICY "announcements_teacher_write" ON announcements
  FOR ALL USING (
    (select auth_user_role()) = 'teacher'
    AND EXISTS (SELECT 1 FROM courses c WHERE c.id = announcements.course_id AND c.teacher_id = (select auth.uid()))
  );

DROP POLICY IF EXISTS "announcements_admin_write" ON announcements;
CREATE POLICY "announcements_admin_write" ON announcements
  FOR ALL USING (
    (select auth_user_role()) = 'admin'
    AND EXISTS (
      SELECT 1 FROM courses c JOIN programs p ON p.id = c.program_id
      WHERE c.id = announcements.course_id AND p.institution_id = (select auth_institution_id())
    )
  );

-- ─── COURSE_MODULES ──────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "course_modules_read" ON course_modules;
CREATE POLICY "course_modules_read" ON course_modules
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM courses c JOIN programs p ON p.id = c.program_id
      WHERE c.id = course_modules.course_id AND p.institution_id = (select auth_institution_id())
    )
  );

DROP POLICY IF EXISTS "course_modules_teacher_write" ON course_modules;
CREATE POLICY "course_modules_teacher_write" ON course_modules
  FOR ALL USING (
    (select auth_user_role()) = 'teacher'
    AND EXISTS (SELECT 1 FROM courses c WHERE c.id = course_modules.course_id AND c.teacher_id = (select auth.uid()))
  );

-- ─── COURSE_MATERIALS ────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "course_materials_read" ON course_materials;
CREATE POLICY "course_materials_read" ON course_materials
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM course_modules cm
      JOIN courses c ON c.id = cm.course_id
      JOIN programs p ON p.id = c.program_id
      WHERE cm.id = course_materials.module_id AND p.institution_id = (select auth_institution_id())
    )
  );

DROP POLICY IF EXISTS "course_materials_teacher_write" ON course_materials;
CREATE POLICY "course_materials_teacher_write" ON course_materials
  FOR ALL USING (
    (select auth_user_role()) = 'teacher'
    AND EXISTS (
      SELECT 1 FROM course_modules cm
      JOIN courses c ON c.id = cm.course_id
      WHERE cm.id = course_materials.module_id AND c.teacher_id = (select auth.uid())
    )
  );

-- ─── DISCUSSION_THREADS ──────────────────────────────────────────────────────

DROP POLICY IF EXISTS "discussion_threads_course_read" ON discussion_threads;
CREATE POLICY "discussion_threads_course_read" ON discussion_threads
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM courses c JOIN programs p ON p.id = c.program_id
      WHERE c.id = discussion_threads.course_id AND p.institution_id = (select auth_institution_id())
    )
  );

DROP POLICY IF EXISTS "discussion_threads_author_write" ON discussion_threads;
CREATE POLICY "discussion_threads_author_write" ON discussion_threads
  FOR INSERT WITH CHECK (
    author_id = (select auth.uid())
    AND EXISTS (
      SELECT 1 FROM courses c JOIN programs p ON p.id = c.program_id
      WHERE c.id = discussion_threads.course_id AND p.institution_id = (select auth_institution_id())
    )
  );

DROP POLICY IF EXISTS "discussion_threads_teacher_manage" ON discussion_threads;
CREATE POLICY "discussion_threads_teacher_manage" ON discussion_threads
  FOR ALL USING (
    (select auth_user_role()) = 'teacher'
    AND EXISTS (SELECT 1 FROM courses c WHERE c.id = discussion_threads.course_id AND c.teacher_id = (select auth.uid()))
  );

-- ─── DISCUSSION_REPLIES ──────────────────────────────────────────────────────

DROP POLICY IF EXISTS "discussion_replies_read" ON discussion_replies;
CREATE POLICY "discussion_replies_read" ON discussion_replies
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM discussion_threads dt
      JOIN courses c ON c.id = dt.course_id
      JOIN programs p ON p.id = c.program_id
      WHERE dt.id = discussion_replies.thread_id AND p.institution_id = (select auth_institution_id())
    )
  );

DROP POLICY IF EXISTS "discussion_replies_author_insert" ON discussion_replies;
CREATE POLICY "discussion_replies_author_insert" ON discussion_replies
  FOR INSERT WITH CHECK (
    author_id = (select auth.uid())
    AND EXISTS (
      SELECT 1 FROM discussion_threads dt
      JOIN courses c ON c.id = dt.course_id
      JOIN programs p ON p.id = c.program_id
      WHERE dt.id = discussion_replies.thread_id AND p.institution_id = (select auth_institution_id())
    )
  );

DROP POLICY IF EXISTS "discussion_replies_teacher_manage" ON discussion_replies;
CREATE POLICY "discussion_replies_teacher_manage" ON discussion_replies
  FOR ALL USING (
    (select auth_user_role()) = 'teacher'
    AND EXISTS (
      SELECT 1 FROM discussion_threads dt
      JOIN courses c ON c.id = dt.course_id
      WHERE dt.id = discussion_replies.thread_id AND c.teacher_id = (select auth.uid())
    )
  );

-- ─── CLASS_SESSIONS ──────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "class_sessions_read" ON class_sessions;
CREATE POLICY "class_sessions_read" ON class_sessions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM course_sections cs
      JOIN courses c ON c.id = cs.course_id
      JOIN programs p ON p.id = c.program_id
      WHERE cs.id = class_sessions.section_id AND p.institution_id = (select auth_institution_id())
    )
  );

DROP POLICY IF EXISTS "class_sessions_teacher_write" ON class_sessions;
CREATE POLICY "class_sessions_teacher_write" ON class_sessions
  FOR ALL USING (
    (select auth_user_role()) = 'teacher'
    AND EXISTS (
      SELECT 1 FROM course_sections cs WHERE cs.id = class_sessions.section_id AND cs.teacher_id = (select auth.uid())
    )
  );

-- ─── ATTENDANCE_RECORDS ──────────────────────────────────────────────────────

DROP POLICY IF EXISTS "attendance_own_read" ON attendance_records;
CREATE POLICY "attendance_own_read" ON attendance_records
  FOR SELECT USING (student_id = (select auth.uid()));

DROP POLICY IF EXISTS "attendance_teacher_manage" ON attendance_records;
CREATE POLICY "attendance_teacher_manage" ON attendance_records
  FOR ALL USING (
    (select auth_user_role()) = 'teacher'
    AND EXISTS (
      SELECT 1 FROM class_sessions cs
      JOIN course_sections sect ON sect.id = cs.section_id
      WHERE cs.id = attendance_records.session_id AND sect.teacher_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "attendance_admin_read" ON attendance_records;
CREATE POLICY "attendance_admin_read" ON attendance_records
  FOR SELECT USING ((select auth_user_role()) = 'admin');

DROP POLICY IF EXISTS "parent_read_student_attendance" ON attendance_records;
CREATE POLICY "parent_read_student_attendance" ON attendance_records
  FOR SELECT USING (
    (select auth_user_role()) = 'parent'
    AND EXISTS (
      SELECT 1 FROM parent_student_links psl
      WHERE psl.student_id = attendance_records.student_id
      AND psl.parent_id = (select auth.uid())
      AND psl.verified = true
    )
  );

-- ─── QUIZZES ─────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "quizzes_course_read" ON quizzes;
CREATE POLICY "quizzes_course_read" ON quizzes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM courses c JOIN programs p ON p.id = c.program_id
      WHERE c.id = quizzes.course_id AND p.institution_id = (select auth_institution_id())
    )
  );

DROP POLICY IF EXISTS "quizzes_teacher_write" ON quizzes;
CREATE POLICY "quizzes_teacher_write" ON quizzes
  FOR ALL USING (
    (select auth_user_role()) = 'teacher'
    AND EXISTS (SELECT 1 FROM courses c WHERE c.id = quizzes.course_id AND c.teacher_id = (select auth.uid()))
  );

-- ─── QUIZ_QUESTIONS ──────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "quiz_questions_read" ON quiz_questions;
CREATE POLICY "quiz_questions_read" ON quiz_questions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM quizzes q
      JOIN courses c ON c.id = q.course_id
      JOIN programs p ON p.id = c.program_id
      WHERE q.id = quiz_questions.quiz_id AND p.institution_id = (select auth_institution_id())
    )
  );

DROP POLICY IF EXISTS "quiz_questions_teacher_write" ON quiz_questions;
CREATE POLICY "quiz_questions_teacher_write" ON quiz_questions
  FOR ALL USING (
    (select auth_user_role()) = 'teacher'
    AND EXISTS (
      SELECT 1 FROM quizzes q
      JOIN courses c ON c.id = q.course_id
      WHERE q.id = quiz_questions.quiz_id AND c.teacher_id = (select auth.uid())
    )
  );

-- ─── QUIZ_ATTEMPTS ───────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "quiz_attempts_own" ON quiz_attempts;
CREATE POLICY "quiz_attempts_own" ON quiz_attempts
  FOR ALL USING (student_id = (select auth.uid()));

DROP POLICY IF EXISTS "quiz_attempts_teacher_read" ON quiz_attempts;
CREATE POLICY "quiz_attempts_teacher_read" ON quiz_attempts
  FOR SELECT USING (
    (select auth_user_role()) = 'teacher'
    AND EXISTS (
      SELECT 1 FROM quizzes q
      JOIN courses c ON c.id = q.course_id
      WHERE q.id = quiz_attempts.quiz_id AND c.teacher_id = (select auth.uid())
    )
  );

-- ─── GRADE_CATEGORIES ────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "grade_categories_read" ON grade_categories;
CREATE POLICY "grade_categories_read" ON grade_categories
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM courses c JOIN programs p ON p.id = c.program_id
      WHERE c.id = grade_categories.course_id AND p.institution_id = (select auth_institution_id())
    )
  );

DROP POLICY IF EXISTS "grade_categories_teacher_write" ON grade_categories;
CREATE POLICY "grade_categories_teacher_write" ON grade_categories
  FOR ALL USING (
    (select auth_user_role()) = 'teacher'
    AND EXISTS (SELECT 1 FROM courses c WHERE c.id = grade_categories.course_id AND c.teacher_id = (select auth.uid()))
  );

-- ─── TIMETABLE_SLOTS ────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "timetable_slots_read" ON timetable_slots;
CREATE POLICY "timetable_slots_read" ON timetable_slots
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM course_sections cs
      JOIN courses c ON c.id = cs.course_id
      JOIN programs p ON p.id = c.program_id
      WHERE cs.id = timetable_slots.section_id AND p.institution_id = (select auth_institution_id())
    )
  );

DROP POLICY IF EXISTS "timetable_slots_admin_write" ON timetable_slots;
CREATE POLICY "timetable_slots_admin_write" ON timetable_slots
  FOR ALL USING (
    (select auth_user_role()) = 'admin'
    AND EXISTS (
      SELECT 1 FROM course_sections cs
      JOIN courses c ON c.id = cs.course_id
      JOIN programs p ON p.id = c.program_id
      WHERE cs.id = timetable_slots.section_id AND p.institution_id = (select auth_institution_id())
    )
  );

-- ─── ACADEMIC_CALENDAR_EVENTS ────────────────────────────────────────────────

DROP POLICY IF EXISTS "calendar_events_institution_read" ON academic_calendar_events;
CREATE POLICY "calendar_events_institution_read" ON academic_calendar_events
  FOR SELECT USING (institution_id = (select auth_institution_id()));

DROP POLICY IF EXISTS "calendar_events_admin_write" ON academic_calendar_events;
CREATE POLICY "calendar_events_admin_write" ON academic_calendar_events
  FOR ALL USING ((select auth_user_role()) = 'admin' AND institution_id = (select auth_institution_id()));

-- ─── PARENT_STUDENT_LINKS ────────────────────────────────────────────────────

DROP POLICY IF EXISTS "parent_links_parent_read" ON parent_student_links;
CREATE POLICY "parent_links_parent_read" ON parent_student_links
  FOR SELECT USING (parent_id = (select auth.uid()));

DROP POLICY IF EXISTS "parent_links_student_read" ON parent_student_links;
CREATE POLICY "parent_links_student_read" ON parent_student_links
  FOR SELECT USING (student_id = (select auth.uid()));

DROP POLICY IF EXISTS "parent_links_admin_manage" ON parent_student_links;
CREATE POLICY "parent_links_admin_manage" ON parent_student_links
  FOR ALL USING (
    (select auth_user_role()) = 'admin'
    AND EXISTS (SELECT 1 FROM profiles p WHERE p.id = parent_student_links.student_id AND p.institution_id = (select auth_institution_id()))
  );

-- ─── FEE_STRUCTURES ─────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "fee_structures_institution_read" ON fee_structures;
CREATE POLICY "fee_structures_institution_read" ON fee_structures
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM programs p WHERE p.id = fee_structures.program_id AND p.institution_id = (select auth_institution_id())
    )
  );

DROP POLICY IF EXISTS "fee_structures_admin_write" ON fee_structures;
CREATE POLICY "fee_structures_admin_write" ON fee_structures
  FOR ALL USING (
    (select auth_user_role()) = 'admin'
    AND EXISTS (
      SELECT 1 FROM programs p WHERE p.id = fee_structures.program_id AND p.institution_id = (select auth_institution_id())
    )
  );

-- ─── FEE_PAYMENTS ────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "fee_payments_own_read" ON fee_payments;
CREATE POLICY "fee_payments_own_read" ON fee_payments
  FOR SELECT USING (student_id = (select auth.uid()));

DROP POLICY IF EXISTS "fee_payments_admin_manage" ON fee_payments;
CREATE POLICY "fee_payments_admin_manage" ON fee_payments
  FOR ALL USING (
    (select auth_user_role()) = 'admin'
    AND EXISTS (
      SELECT 1 FROM profiles p WHERE p.id = fee_payments.student_id AND p.institution_id = (select auth_institution_id())
    )
  );

-- ─── STUDENT_GAMIFICATION ────────────────────────────────────────────────────

DROP POLICY IF EXISTS "parent_read_student_gamification" ON student_gamification;
CREATE POLICY "parent_read_student_gamification" ON student_gamification
  FOR SELECT USING (
    (select auth_user_role()) = 'parent'
    AND EXISTS (
      SELECT 1 FROM parent_student_links psl
      WHERE psl.student_id = student_gamification.student_id
      AND psl.parent_id = (select auth.uid())
      AND psl.verified = true
    )
  );
