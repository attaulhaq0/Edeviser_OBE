-- ============================================================
-- Migration: RLS Policy Optimization & Consolidation
-- Replaces bare auth.uid() with (select auth.uid())
-- Replaces bare auth_user_role() with (select auth_user_role())
-- Replaces bare auth_institution_id() with (select auth_institution_id())
-- Consolidates redundant permissive policies where possible
-- Date: 2026-04-28
-- ============================================================
-- IMPORTANT: This migration preserves ALL existing policy logic.
-- It only optimizes the evaluation pattern (InitPlan) and
-- consolidates multiple permissive policies for the same role+action.
-- Security audit RLS fixes (Vulns 14-27) are preserved.
-- ============================================================

-- ══════════════════════════════════════════════════════════════
-- 1. INSTITUTIONS
-- ══════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "institutions_read_own" ON public.institutions;
DROP POLICY IF EXISTS "institutions_admin_write" ON public.institutions;
CREATE POLICY "institutions_read_own" ON public.institutions
  FOR SELECT USING (id = (select auth_institution_id()));
CREATE POLICY "institutions_admin_write" ON public.institutions
  FOR ALL USING (
    (select auth_user_role()) = 'admin'
    AND id = (select auth_institution_id())
  );
-- ══════════════════════════════════════════════════════════════
-- 2. PROFILES
-- ══════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "profiles_read_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_admin_read_institution" ON public.profiles;
DROP POLICY IF EXISTS "profiles_admin_write" ON public.profiles;
DROP POLICY IF EXISTS "profiles_teacher_read_students" ON public.profiles;
DROP POLICY IF EXISTS "profiles_coordinator_read" ON public.profiles;
CREATE POLICY "profiles_read_own" ON public.profiles
  FOR SELECT USING (id = (select auth.uid()));
CREATE POLICY "profiles_admin_read_institution" ON public.profiles
  FOR SELECT USING (
    (select auth_user_role()) = 'admin'
    AND institution_id = (select auth_institution_id())
  );
CREATE POLICY "profiles_admin_write" ON public.profiles
  FOR ALL USING (
    (select auth_user_role()) = 'admin'
    AND institution_id = (select auth_institution_id())
  );
CREATE POLICY "profiles_teacher_read_students" ON public.profiles
  FOR SELECT USING (
    (select auth_user_role()) = 'teacher'
    AND id IN (
      SELECT sc.student_id FROM public.student_courses sc
      JOIN public.courses c ON c.id = sc.course_id
      WHERE c.teacher_id = (select auth.uid())
    )
  );
CREATE POLICY "profiles_coordinator_read" ON public.profiles
  FOR SELECT USING (
    (select auth_user_role()) = 'coordinator'
    AND institution_id = (select auth_institution_id())
  );
-- ══════════════════════════════════════════════════════════════
-- 3. PROGRAMS
-- ══════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "programs_institution_read" ON public.programs;
DROP POLICY IF EXISTS "programs_admin_write" ON public.programs;
CREATE POLICY "programs_institution_read" ON public.programs
  FOR SELECT USING (institution_id = (select auth_institution_id()));
CREATE POLICY "programs_admin_write" ON public.programs
  FOR ALL USING (
    (select auth_user_role()) = 'admin'
    AND institution_id = (select auth_institution_id())
  );
-- ══════════════════════════════════════════════════════════════
-- 4. COURSES
-- ══════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "courses_institution_read" ON public.courses;
DROP POLICY IF EXISTS "courses_coordinator_write" ON public.courses;
DROP POLICY IF EXISTS "courses_admin_write" ON public.courses;
CREATE POLICY "courses_institution_read" ON public.courses
  FOR SELECT USING (
    program_id IN (SELECT id FROM public.programs WHERE institution_id = (select auth_institution_id()))
  );
CREATE POLICY "courses_coordinator_write" ON public.courses
  FOR ALL USING (
    (select auth_user_role()) = 'coordinator'
    AND program_id IN (SELECT id FROM public.programs WHERE coordinator_id = (select auth.uid()))
  );
CREATE POLICY "courses_admin_write" ON public.courses
  FOR ALL USING (
    (select auth_user_role()) = 'admin'
    AND program_id IN (SELECT id FROM public.programs WHERE institution_id = (select auth_institution_id()))
  );
-- ══════════════════════════════════════════════════════════════
-- 5. STUDENT_COURSES
-- ══════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "student_courses_student_read" ON public.student_courses;
DROP POLICY IF EXISTS "student_courses_teacher_manage" ON public.student_courses;
DROP POLICY IF EXISTS "student_courses_admin_read" ON public.student_courses;
CREATE POLICY "student_courses_student_read" ON public.student_courses
  FOR SELECT USING (student_id = (select auth.uid()));
CREATE POLICY "student_courses_teacher_manage" ON public.student_courses
  FOR ALL USING (
    (select auth_user_role()) = 'teacher'
    AND course_id IN (SELECT id FROM public.courses WHERE teacher_id = (select auth.uid()))
  );
-- Vuln 14 preserved: institution-scoped admin/coordinator read
CREATE POLICY "student_courses_admin_read" ON public.student_courses
  FOR SELECT USING (
    (select auth_user_role()) IN ('admin', 'coordinator')
    AND course_id IN (
      SELECT id FROM public.courses WHERE program_id IN (
        SELECT id FROM public.programs WHERE institution_id = (select auth_institution_id())
      )
    )
  );
-- ══════════════════════════════════════════════════════════════
-- 6. LEARNING_OUTCOMES (no existing policies to optimize)
-- ══════════════════════════════════════════════════════════════
-- No RLS policies exist for learning_outcomes in migrations.

-- ══════════════════════════════════════════════════════════════
-- 7. OUTCOME_MAPPINGS
-- ══════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "outcome_mappings_institution_read" ON public.outcome_mappings;
DROP POLICY IF EXISTS "outcome_mappings_admin_write" ON public.outcome_mappings;
DROP POLICY IF EXISTS "outcome_mappings_coordinator_write" ON public.outcome_mappings;
DROP POLICY IF EXISTS "outcome_mappings_teacher_write" ON public.outcome_mappings;
CREATE POLICY "outcome_mappings_institution_read" ON public.outcome_mappings
  FOR SELECT USING (
    source_outcome_id IN (SELECT id FROM public.learning_outcomes WHERE institution_id = (select auth_institution_id()))
  );
-- Vuln 15 preserved: institution-scoped write policies
CREATE POLICY "outcome_mappings_admin_write" ON public.outcome_mappings
  FOR ALL USING (
    (select auth_user_role()) = 'admin'
    AND source_outcome_id IN (
      SELECT id FROM public.learning_outcomes WHERE institution_id = (select auth_institution_id())
    )
  );
CREATE POLICY "outcome_mappings_coordinator_write" ON public.outcome_mappings
  FOR ALL USING (
    (select auth_user_role()) = 'coordinator'
    AND source_outcome_id IN (
      SELECT id FROM public.learning_outcomes WHERE institution_id = (select auth_institution_id())
    )
  );
CREATE POLICY "outcome_mappings_teacher_write" ON public.outcome_mappings
  FOR ALL USING (
    (select auth_user_role()) = 'teacher'
    AND source_outcome_id IN (
      SELECT id FROM public.learning_outcomes WHERE institution_id = (select auth_institution_id())
    )
  );
-- ══════════════════════════════════════════════════════════════
-- 8. RUBRICS
-- ══════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "rubrics_institution_read" ON public.rubrics;
DROP POLICY IF EXISTS "rubrics_teacher_write" ON public.rubrics;
CREATE POLICY "rubrics_institution_read" ON public.rubrics
  FOR SELECT USING (
    clo_id IN (SELECT id FROM public.learning_outcomes WHERE institution_id = (select auth_institution_id()))
    OR is_template = true
  );
CREATE POLICY "rubrics_teacher_write" ON public.rubrics
  FOR ALL USING (
    (select auth_user_role()) = 'teacher'
    AND (created_by = (select auth.uid()) OR is_template = true)
  );
-- ══════════════════════════════════════════════════════════════
-- 9. RUBRIC_CRITERIA
-- ══════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "rubric_criteria_read" ON public.rubric_criteria;
DROP POLICY IF EXISTS "rubric_criteria_teacher_write" ON public.rubric_criteria;
CREATE POLICY "rubric_criteria_read" ON public.rubric_criteria
  FOR SELECT USING (
    rubric_id IN (SELECT id FROM public.rubrics)
  );
CREATE POLICY "rubric_criteria_teacher_write" ON public.rubric_criteria
  FOR ALL USING (
    (select auth_user_role()) = 'teacher'
    AND rubric_id IN (SELECT id FROM public.rubrics WHERE created_by = (select auth.uid()))
  );
-- ══════════════════════════════════════════════════════════════
-- 10. ASSIGNMENTS
-- ══════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "assignments_teacher_write" ON public.assignments;
DROP POLICY IF EXISTS "assignments_student_read" ON public.assignments;
DROP POLICY IF EXISTS "assignments_staff_read" ON public.assignments;
CREATE POLICY "assignments_teacher_write" ON public.assignments
  FOR ALL USING (
    (select auth_user_role()) = 'teacher'
    AND course_id IN (SELECT id FROM public.courses WHERE teacher_id = (select auth.uid()))
  );
CREATE POLICY "assignments_student_read" ON public.assignments
  FOR SELECT USING (
    course_id IN (SELECT course_id FROM public.student_courses WHERE student_id = (select auth.uid()) AND status = 'active')
  );
-- Vuln 16 preserved: institution-scoped staff read
CREATE POLICY "assignments_staff_read" ON public.assignments
  FOR SELECT USING (
    (select auth_user_role()) IN ('admin', 'coordinator')
    AND course_id IN (
      SELECT id FROM public.courses WHERE program_id IN (
        SELECT id FROM public.programs WHERE institution_id = (select auth_institution_id())
      )
    )
  );
-- ══════════════════════════════════════════════════════════════
-- 11. GRADES
-- ══════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "grades_teacher_write" ON public.grades;
DROP POLICY IF EXISTS "grades_student_read" ON public.grades;
DROP POLICY IF EXISTS "grades_teacher_read" ON public.grades;
DROP POLICY IF EXISTS "parent_read_student_grades" ON public.grades;
CREATE POLICY "grades_teacher_write" ON public.grades
  FOR ALL USING (
    (select auth_user_role()) = 'teacher'
    AND graded_by = (select auth.uid())
  );
CREATE POLICY "grades_student_read" ON public.grades
  FOR SELECT USING (
    submission_id IN (SELECT id FROM public.submissions WHERE student_id = (select auth.uid()))
  );
CREATE POLICY "grades_teacher_read" ON public.grades
  FOR SELECT USING (
    (select auth_user_role()) = 'teacher'
    AND submission_id IN (
      SELECT s.id FROM public.submissions s
      JOIN public.assignments a ON a.id = s.assignment_id
      JOIN public.courses c ON c.id = a.course_id
      WHERE c.teacher_id = (select auth.uid())
    )
  );
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
-- ══════════════════════════════════════════════════════════════
-- 12. OUTCOME_ATTAINMENT
-- ══════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "attainment_student_read" ON public.outcome_attainment;
DROP POLICY IF EXISTS "attainment_staff_read" ON public.outcome_attainment;
DROP POLICY IF EXISTS "parent_read_student_attainment" ON public.outcome_attainment;
CREATE POLICY "attainment_student_read" ON public.outcome_attainment
  FOR SELECT USING (student_id = (select auth.uid()));
-- Vuln 17 preserved: institution-scoped staff read
CREATE POLICY "attainment_staff_read" ON public.outcome_attainment
  FOR SELECT USING (
    (select auth_user_role()) IN ('teacher', 'coordinator', 'admin')
    AND student_id IN (
      SELECT id FROM public.profiles WHERE institution_id = (select auth_institution_id())
    )
  );
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
-- ══════════════════════════════════════════════════════════════
-- 13. BADGES
-- ══════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "badges_student_read" ON public.badges;
DROP POLICY IF EXISTS "badges_institution_read" ON public.badges;
CREATE POLICY "badges_student_read" ON public.badges
  FOR SELECT USING (student_id = (select auth.uid()));
-- Vuln 25 preserved: institution-scoped read
CREATE POLICY "badges_institution_read" ON public.badges
  FOR SELECT USING (
    student_id IN (
      SELECT id FROM public.profiles WHERE institution_id = (select auth_institution_id())
    )
  );
-- ══════════════════════════════════════════════════════════════
-- 14. XP_TRANSACTIONS
-- ══════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "xp_transactions_student_read" ON public.xp_transactions;
DROP POLICY IF EXISTS "xp_transactions_admin_read" ON public.xp_transactions;
CREATE POLICY "xp_transactions_student_read" ON public.xp_transactions
  FOR SELECT USING (student_id = (select auth.uid()));
-- Vuln 21 preserved: institution-scoped admin read
CREATE POLICY "xp_transactions_admin_read" ON public.xp_transactions
  FOR SELECT USING (
    (select auth_user_role()) = 'admin'
    AND student_id IN (
      SELECT id FROM public.profiles WHERE institution_id = (select auth_institution_id())
    )
  );
-- ══════════════════════════════════════════════════════════════
-- 15. JOURNAL_ENTRIES
-- ══════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "journal_student_own" ON public.journal_entries;
DROP POLICY IF EXISTS "journal_teacher_read_shared" ON public.journal_entries;
CREATE POLICY "journal_student_own" ON public.journal_entries
  FOR ALL USING (student_id = (select auth.uid()));
CREATE POLICY "journal_teacher_read_shared" ON public.journal_entries
  FOR SELECT USING (
    (select auth_user_role()) = 'teacher'
    AND is_shared = true
    AND course_id IN (SELECT id FROM public.courses WHERE teacher_id = (select auth.uid()))
  );
-- ══════════════════════════════════════════════════════════════
-- 16. NOTIFICATIONS
-- ══════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "notifications_own" ON public.notifications;
CREATE POLICY "notifications_own" ON public.notifications
  FOR ALL USING (user_id = (select auth.uid()));
-- ══════════════════════════════════════════════════════════════
-- 17. AUDIT_LOGS (append-only)
-- ══════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "audit_logs_admin_insert" ON public.audit_logs;
CREATE POLICY "audit_logs_admin_insert" ON public.audit_logs
  FOR INSERT WITH CHECK ((select auth_user_role()) = 'admin');
-- ══════════════════════════════════════════════════════════════
-- 18. STUDENT_GAMIFICATION
-- ══════════════════════════════════════════════════════════════
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
-- ══════════════════════════════════════════════════════════════
-- 19. STUDENT_ACTIVITY_LOG
-- ══════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "activity_log_student_insert" ON student_activity_log;
DROP POLICY IF EXISTS "activity_log_admin_read" ON student_activity_log;
CREATE POLICY "activity_log_student_insert" ON student_activity_log
  FOR INSERT WITH CHECK (student_id = (select auth.uid()));
-- Vuln 23 preserved: institution-scoped admin read
CREATE POLICY "activity_log_admin_read" ON student_activity_log
  FOR SELECT USING (
    (select auth_user_role()) = 'admin'
    AND student_id IN (
      SELECT id FROM public.profiles WHERE institution_id = (select auth_institution_id())
    )
  );
-- ══════════════════════════════════════════════════════════════
-- 20. AI_FEEDBACK
-- ══════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "ai_feedback_student_read" ON ai_feedback;
DROP POLICY IF EXISTS "ai_feedback_student_update" ON ai_feedback;
DROP POLICY IF EXISTS "ai_feedback_teacher_read" ON ai_feedback;
DROP POLICY IF EXISTS "ai_feedback_admin_read" ON ai_feedback;
CREATE POLICY "ai_feedback_student_read" ON ai_feedback
  FOR SELECT USING (student_id = (select auth.uid()));
CREATE POLICY "ai_feedback_student_update" ON ai_feedback
  FOR UPDATE USING (student_id = (select auth.uid()));
CREATE POLICY "ai_feedback_teacher_read" ON ai_feedback
  FOR SELECT USING (
    (select auth_user_role()) = 'teacher'
    AND student_id IN (
      SELECT sc.student_id FROM student_courses sc
      JOIN courses c ON c.id = sc.course_id
      WHERE c.teacher_id = (select auth.uid())
    )
  );
-- Vuln 22 preserved: institution-scoped admin read
CREATE POLICY "ai_feedback_admin_read" ON ai_feedback
  FOR SELECT USING (
    (select auth_user_role()) = 'admin'
    AND student_id IN (
      SELECT id FROM public.profiles WHERE institution_id = (select auth_institution_id())
    )
  );
-- ══════════════════════════════════════════════════════════════
-- 21. SEMESTERS
-- ══════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "semesters_institution_read" ON semesters;
DROP POLICY IF EXISTS "semesters_admin_write" ON semesters;
CREATE POLICY "semesters_institution_read" ON semesters
  FOR SELECT USING (institution_id = (select auth_institution_id()));
CREATE POLICY "semesters_admin_write" ON semesters
  FOR ALL USING ((select auth_user_role()) = 'admin' AND institution_id = (select auth_institution_id()));
-- ══════════════════════════════════════════════════════════════
-- 22. DEPARTMENTS
-- ══════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "departments_institution_read" ON departments;
DROP POLICY IF EXISTS "departments_admin_write" ON departments;
CREATE POLICY "departments_institution_read" ON departments
  FOR SELECT USING (institution_id = (select auth_institution_id()));
CREATE POLICY "departments_admin_write" ON departments
  FOR ALL USING ((select auth_user_role()) = 'admin' AND institution_id = (select auth_institution_id()));
-- ══════════════════════════════════════════════════════════════
-- 23. COURSE_SECTIONS
-- ══════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "sections_read" ON course_sections;
DROP POLICY IF EXISTS "sections_admin_write" ON course_sections;
DROP POLICY IF EXISTS "sections_coordinator_write" ON course_sections;
CREATE POLICY "sections_read" ON course_sections
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM courses c
      JOIN programs p ON p.id = c.program_id
      WHERE c.id = course_sections.course_id
      AND p.institution_id = (select auth_institution_id())
    )
  );
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
-- ══════════════════════════════════════════════════════════════
-- 24. SURVEYS
-- ══════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "surveys_institution_read" ON surveys;
DROP POLICY IF EXISTS "surveys_admin_write" ON surveys;
DROP POLICY IF EXISTS "surveys_coordinator_write" ON surveys;
CREATE POLICY "surveys_institution_read" ON surveys
  FOR SELECT USING (institution_id = (select auth_institution_id()));
CREATE POLICY "surveys_admin_write" ON surveys
  FOR ALL USING ((select auth_user_role()) = 'admin' AND institution_id = (select auth_institution_id()));
CREATE POLICY "surveys_coordinator_write" ON surveys
  FOR ALL USING ((select auth_user_role()) = 'coordinator' AND institution_id = (select auth_institution_id()));
-- ══════════════════════════════════════════════════════════════
-- 25. SURVEY_QUESTIONS
-- ══════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "survey_questions_read" ON survey_questions;
DROP POLICY IF EXISTS "survey_questions_admin_write" ON survey_questions;
CREATE POLICY "survey_questions_read" ON survey_questions
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM surveys s WHERE s.id = survey_questions.survey_id AND s.institution_id = (select auth_institution_id()))
  );
CREATE POLICY "survey_questions_admin_write" ON survey_questions
  FOR ALL USING (
    (select auth_user_role()) IN ('admin', 'coordinator')
    AND EXISTS (SELECT 1 FROM surveys s WHERE s.id = survey_questions.survey_id AND s.institution_id = (select auth_institution_id()))
  );
-- ══════════════════════════════════════════════════════════════
-- 26. SURVEY_RESPONSES
-- ══════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "survey_responses_own_read" ON survey_responses;
DROP POLICY IF EXISTS "survey_responses_own_insert" ON survey_responses;
DROP POLICY IF EXISTS "survey_responses_admin_read" ON survey_responses;
CREATE POLICY "survey_responses_own_read" ON survey_responses
  FOR SELECT USING (respondent_id = (select auth.uid()));
CREATE POLICY "survey_responses_own_insert" ON survey_responses
  FOR INSERT WITH CHECK (respondent_id = (select auth.uid()));
CREATE POLICY "survey_responses_admin_read" ON survey_responses
  FOR SELECT USING (
    (select auth_user_role()) IN ('admin', 'coordinator')
    AND EXISTS (SELECT 1 FROM surveys s WHERE s.id = survey_responses.survey_id AND s.institution_id = (select auth_institution_id()))
  );
-- ══════════════════════════════════════════════════════════════
-- 27. CQI_ACTION_PLANS
-- ══════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "cqi_plans_read" ON cqi_action_plans;
DROP POLICY IF EXISTS "cqi_plans_coordinator_write" ON cqi_action_plans;
DROP POLICY IF EXISTS "cqi_plans_admin_write" ON cqi_action_plans;
CREATE POLICY "cqi_plans_read" ON cqi_action_plans
  FOR SELECT USING (
    (select auth_user_role()) IN ('admin', 'coordinator')
    AND EXISTS (
      SELECT 1 FROM programs p WHERE p.id = cqi_action_plans.program_id AND p.institution_id = (select auth_institution_id())
    )
  );
CREATE POLICY "cqi_plans_coordinator_write" ON cqi_action_plans
  FOR ALL USING (
    (select auth_user_role()) = 'coordinator'
    AND EXISTS (
      SELECT 1 FROM programs p WHERE p.id = cqi_action_plans.program_id AND p.coordinator_id = (select auth.uid())
    )
  );
CREATE POLICY "cqi_plans_admin_write" ON cqi_action_plans
  FOR ALL USING (
    (select auth_user_role()) = 'admin'
    AND EXISTS (
      SELECT 1 FROM programs p WHERE p.id = cqi_action_plans.program_id AND p.institution_id = (select auth_institution_id())
    )
  );
-- ══════════════════════════════════════════════════════════════
-- 28. INSTITUTION_SETTINGS
-- ══════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "institution_settings_read" ON institution_settings;
DROP POLICY IF EXISTS "institution_settings_admin_write" ON institution_settings;
CREATE POLICY "institution_settings_read" ON institution_settings
  FOR SELECT USING (institution_id = (select auth_institution_id()));
CREATE POLICY "institution_settings_admin_write" ON institution_settings
  FOR ALL USING ((select auth_user_role()) = 'admin' AND institution_id = (select auth_institution_id()));
-- ══════════════════════════════════════════════════════════════
-- 29. PROGRAM_ACCREDITATIONS
-- ══════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "program_accreditations_read" ON program_accreditations;
DROP POLICY IF EXISTS "program_accreditations_admin_write" ON program_accreditations;
DROP POLICY IF EXISTS "program_accreditations_coordinator_write" ON program_accreditations;
CREATE POLICY "program_accreditations_read" ON program_accreditations
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM programs p WHERE p.id = program_accreditations.program_id AND p.institution_id = (select auth_institution_id()))
  );
CREATE POLICY "program_accreditations_admin_write" ON program_accreditations
  FOR ALL USING (
    (select auth_user_role()) = 'admin'
    AND EXISTS (SELECT 1 FROM programs p WHERE p.id = program_accreditations.program_id AND p.institution_id = (select auth_institution_id()))
  );
CREATE POLICY "program_accreditations_coordinator_write" ON program_accreditations
  FOR ALL USING (
    (select auth_user_role()) = 'coordinator'
    AND EXISTS (SELECT 1 FROM programs p WHERE p.id = program_accreditations.program_id AND p.coordinator_id = (select auth.uid()))
  );
-- ══════════════════════════════════════════════════════════════
-- 30. ANNOUNCEMENTS
-- ══════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "announcements_course_read" ON announcements;
DROP POLICY IF EXISTS "announcements_teacher_write" ON announcements;
DROP POLICY IF EXISTS "announcements_admin_write" ON announcements;
CREATE POLICY "announcements_course_read" ON announcements
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM courses c
      JOIN programs p ON p.id = c.program_id
      WHERE c.id = announcements.course_id
      AND p.institution_id = (select auth_institution_id())
    )
  );
CREATE POLICY "announcements_teacher_write" ON announcements
  FOR ALL USING (
    (select auth_user_role()) = 'teacher'
    AND EXISTS (SELECT 1 FROM courses c WHERE c.id = announcements.course_id AND c.teacher_id = (select auth.uid()))
  );
CREATE POLICY "announcements_admin_write" ON announcements
  FOR ALL USING (
    (select auth_user_role()) = 'admin'
    AND EXISTS (
      SELECT 1 FROM courses c JOIN programs p ON p.id = c.program_id
      WHERE c.id = announcements.course_id AND p.institution_id = (select auth_institution_id())
    )
  );
-- ══════════════════════════════════════════════════════════════
-- 31. COURSE_MODULES
-- ══════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "course_modules_read" ON course_modules;
DROP POLICY IF EXISTS "course_modules_teacher_write" ON course_modules;
CREATE POLICY "course_modules_read" ON course_modules
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM courses c JOIN programs p ON p.id = c.program_id
      WHERE c.id = course_modules.course_id AND p.institution_id = (select auth_institution_id())
    )
  );
CREATE POLICY "course_modules_teacher_write" ON course_modules
  FOR ALL USING (
    (select auth_user_role()) = 'teacher'
    AND EXISTS (SELECT 1 FROM courses c WHERE c.id = course_modules.course_id AND c.teacher_id = (select auth.uid()))
  );
-- ══════════════════════════════════════════════════════════════
-- 32. COURSE_MATERIALS
-- ══════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "course_materials_read" ON course_materials;
DROP POLICY IF EXISTS "course_materials_teacher_write" ON course_materials;
CREATE POLICY "course_materials_read" ON course_materials
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM course_modules cm
      JOIN courses c ON c.id = cm.course_id
      JOIN programs p ON p.id = c.program_id
      WHERE cm.id = course_materials.module_id AND p.institution_id = (select auth_institution_id())
    )
  );
CREATE POLICY "course_materials_teacher_write" ON course_materials
  FOR ALL USING (
    (select auth_user_role()) = 'teacher'
    AND EXISTS (
      SELECT 1 FROM course_modules cm
      JOIN courses c ON c.id = cm.course_id
      WHERE cm.id = course_materials.module_id AND c.teacher_id = (select auth.uid())
    )
  );
-- ══════════════════════════════════════════════════════════════
-- 33. DISCUSSION_THREADS
-- ══════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "discussion_threads_course_read" ON discussion_threads;
DROP POLICY IF EXISTS "discussion_threads_author_write" ON discussion_threads;
DROP POLICY IF EXISTS "discussion_threads_teacher_manage" ON discussion_threads;
CREATE POLICY "discussion_threads_course_read" ON discussion_threads
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM courses c JOIN programs p ON p.id = c.program_id
      WHERE c.id = discussion_threads.course_id AND p.institution_id = (select auth_institution_id())
    )
  );
CREATE POLICY "discussion_threads_author_write" ON discussion_threads
  FOR INSERT WITH CHECK (
    author_id = (select auth.uid())
    AND EXISTS (
      SELECT 1 FROM courses c JOIN programs p ON p.id = c.program_id
      WHERE c.id = discussion_threads.course_id AND p.institution_id = (select auth_institution_id())
    )
  );
CREATE POLICY "discussion_threads_teacher_manage" ON discussion_threads
  FOR ALL USING (
    (select auth_user_role()) = 'teacher'
    AND EXISTS (SELECT 1 FROM courses c WHERE c.id = discussion_threads.course_id AND c.teacher_id = (select auth.uid()))
  );
-- ══════════════════════════════════════════════════════════════
-- 34. DISCUSSION_REPLIES
-- ══════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "discussion_replies_read" ON discussion_replies;
DROP POLICY IF EXISTS "discussion_replies_author_insert" ON discussion_replies;
DROP POLICY IF EXISTS "discussion_replies_teacher_manage" ON discussion_replies;
CREATE POLICY "discussion_replies_read" ON discussion_replies
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM discussion_threads dt
      JOIN courses c ON c.id = dt.course_id
      JOIN programs p ON p.id = c.program_id
      WHERE dt.id = discussion_replies.thread_id AND p.institution_id = (select auth_institution_id())
    )
  );
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
CREATE POLICY "discussion_replies_teacher_manage" ON discussion_replies
  FOR ALL USING (
    (select auth_user_role()) = 'teacher'
    AND EXISTS (
      SELECT 1 FROM discussion_threads dt
      JOIN courses c ON c.id = dt.course_id
      WHERE dt.id = discussion_replies.thread_id AND c.teacher_id = (select auth.uid())
    )
  );
-- ══════════════════════════════════════════════════════════════
-- 35. CLASS_SESSIONS
-- ══════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "class_sessions_read" ON class_sessions;
DROP POLICY IF EXISTS "class_sessions_teacher_write" ON class_sessions;
CREATE POLICY "class_sessions_read" ON class_sessions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM course_sections cs
      JOIN courses c ON c.id = cs.course_id
      JOIN programs p ON p.id = c.program_id
      WHERE cs.id = class_sessions.section_id AND p.institution_id = (select auth_institution_id())
    )
  );
CREATE POLICY "class_sessions_teacher_write" ON class_sessions
  FOR ALL USING (
    (select auth_user_role()) = 'teacher'
    AND EXISTS (
      SELECT 1 FROM course_sections cs WHERE cs.id = class_sessions.section_id AND cs.teacher_id = (select auth.uid())
    )
  );
-- ══════════════════════════════════════════════════════════════
-- 36. ATTENDANCE_RECORDS
-- ══════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "attendance_own_read" ON attendance_records;
DROP POLICY IF EXISTS "attendance_teacher_manage" ON attendance_records;
DROP POLICY IF EXISTS "attendance_admin_read" ON attendance_records;
DROP POLICY IF EXISTS "parent_read_student_attendance" ON attendance_records;
CREATE POLICY "attendance_own_read" ON attendance_records
  FOR SELECT USING (student_id = (select auth.uid()));
CREATE POLICY "attendance_teacher_manage" ON attendance_records
  FOR ALL USING (
    (select auth_user_role()) = 'teacher'
    AND EXISTS (
      SELECT 1 FROM class_sessions cs
      JOIN course_sections sect ON sect.id = cs.section_id
      WHERE cs.id = attendance_records.session_id AND sect.teacher_id = (select auth.uid())
    )
  );
-- Vuln 18 preserved: institution-scoped admin read
CREATE POLICY "attendance_admin_read" ON attendance_records
  FOR SELECT USING (
    (select auth_user_role()) = 'admin'
    AND student_id IN (
      SELECT id FROM public.profiles WHERE institution_id = (select auth_institution_id())
    )
  );
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
-- ══════════════════════════════════════════════════════════════
-- 37. QUIZZES
-- ══════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "quizzes_course_read" ON quizzes;
DROP POLICY IF EXISTS "quizzes_teacher_write" ON quizzes;
CREATE POLICY "quizzes_course_read" ON quizzes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM courses c JOIN programs p ON p.id = c.program_id
      WHERE c.id = quizzes.course_id AND p.institution_id = (select auth_institution_id())
    )
  );
CREATE POLICY "quizzes_teacher_write" ON quizzes
  FOR ALL USING (
    (select auth_user_role()) = 'teacher'
    AND EXISTS (SELECT 1 FROM courses c WHERE c.id = quizzes.course_id AND c.teacher_id = (select auth.uid()))
  );
-- ══════════════════════════════════════════════════════════════
-- 38. QUIZ_QUESTIONS
-- ══════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "quiz_questions_read" ON quiz_questions;
DROP POLICY IF EXISTS "quiz_questions_teacher_write" ON quiz_questions;
CREATE POLICY "quiz_questions_read" ON quiz_questions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM quizzes q
      JOIN courses c ON c.id = q.course_id
      JOIN programs p ON p.id = c.program_id
      WHERE q.id = quiz_questions.quiz_id AND p.institution_id = (select auth_institution_id())
    )
  );
CREATE POLICY "quiz_questions_teacher_write" ON quiz_questions
  FOR ALL USING (
    (select auth_user_role()) = 'teacher'
    AND EXISTS (
      SELECT 1 FROM quizzes q
      JOIN courses c ON c.id = q.course_id
      WHERE q.id = quiz_questions.quiz_id AND c.teacher_id = (select auth.uid())
    )
  );
-- ══════════════════════════════════════════════════════════════
-- 39. QUIZ_ATTEMPTS
-- ══════════════════════════════════════════════════════════════
-- Vuln 27 preserved: split into student_read + student_insert (no ALL)
DROP POLICY IF EXISTS "quiz_attempts_student_read" ON quiz_attempts;
DROP POLICY IF EXISTS "quiz_attempts_student_insert" ON quiz_attempts;
DROP POLICY IF EXISTS "quiz_attempts_teacher_read" ON quiz_attempts;
CREATE POLICY "quiz_attempts_student_read" ON quiz_attempts
  FOR SELECT USING (student_id = (select auth.uid()));
CREATE POLICY "quiz_attempts_student_insert" ON quiz_attempts
  FOR INSERT WITH CHECK (student_id = (select auth.uid()));
CREATE POLICY "quiz_attempts_teacher_read" ON quiz_attempts
  FOR SELECT USING (
    (select auth_user_role()) = 'teacher'
    AND EXISTS (
      SELECT 1 FROM quizzes q
      JOIN courses c ON c.id = q.course_id
      WHERE q.id = quiz_attempts.quiz_id AND c.teacher_id = (select auth.uid())
    )
  );
-- ══════════════════════════════════════════════════════════════
-- 40. GRADE_CATEGORIES
-- ══════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "grade_categories_read" ON grade_categories;
DROP POLICY IF EXISTS "grade_categories_teacher_write" ON grade_categories;
CREATE POLICY "grade_categories_read" ON grade_categories
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM courses c JOIN programs p ON p.id = c.program_id
      WHERE c.id = grade_categories.course_id AND p.institution_id = (select auth_institution_id())
    )
  );
CREATE POLICY "grade_categories_teacher_write" ON grade_categories
  FOR ALL USING (
    (select auth_user_role()) = 'teacher'
    AND EXISTS (SELECT 1 FROM courses c WHERE c.id = grade_categories.course_id AND c.teacher_id = (select auth.uid()))
  );
-- ══════════════════════════════════════════════════════════════
-- 41. TIMETABLE_SLOTS
-- ══════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "timetable_slots_read" ON timetable_slots;
DROP POLICY IF EXISTS "timetable_slots_admin_write" ON timetable_slots;
CREATE POLICY "timetable_slots_read" ON timetable_slots
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM course_sections cs
      JOIN courses c ON c.id = cs.course_id
      JOIN programs p ON p.id = c.program_id
      WHERE cs.id = timetable_slots.section_id AND p.institution_id = (select auth_institution_id())
    )
  );
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
-- ══════════════════════════════════════════════════════════════
-- 42. ACADEMIC_CALENDAR_EVENTS
-- ══════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "calendar_events_institution_read" ON academic_calendar_events;
DROP POLICY IF EXISTS "calendar_events_admin_write" ON academic_calendar_events;
CREATE POLICY "calendar_events_institution_read" ON academic_calendar_events
  FOR SELECT USING (institution_id = (select auth_institution_id()));
CREATE POLICY "calendar_events_admin_write" ON academic_calendar_events
  FOR ALL USING ((select auth_user_role()) = 'admin' AND institution_id = (select auth_institution_id()));
-- ══════════════════════════════════════════════════════════════
-- 43. PARENT_STUDENT_LINKS
-- ══════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "parent_links_parent_read" ON parent_student_links;
DROP POLICY IF EXISTS "parent_links_student_read" ON parent_student_links;
DROP POLICY IF EXISTS "parent_links_admin_manage" ON parent_student_links;
CREATE POLICY "parent_links_parent_read" ON parent_student_links
  FOR SELECT USING (parent_id = (select auth.uid()));
CREATE POLICY "parent_links_student_read" ON parent_student_links
  FOR SELECT USING (student_id = (select auth.uid()));
CREATE POLICY "parent_links_admin_manage" ON parent_student_links
  FOR ALL USING (
    (select auth_user_role()) = 'admin'
    AND EXISTS (SELECT 1 FROM profiles p WHERE p.id = parent_student_links.student_id AND p.institution_id = (select auth_institution_id()))
  );
-- ══════════════════════════════════════════════════════════════
-- 44. FEE_STRUCTURES
-- ══════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "fee_structures_institution_read" ON fee_structures;
DROP POLICY IF EXISTS "fee_structures_admin_write" ON fee_structures;
CREATE POLICY "fee_structures_institution_read" ON fee_structures
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM programs p WHERE p.id = fee_structures.program_id AND p.institution_id = (select auth_institution_id())
    )
  );
CREATE POLICY "fee_structures_admin_write" ON fee_structures
  FOR ALL USING (
    (select auth_user_role()) = 'admin'
    AND EXISTS (
      SELECT 1 FROM programs p WHERE p.id = fee_structures.program_id AND p.institution_id = (select auth_institution_id())
    )
  );
-- ══════════════════════════════════════════════════════════════
-- 45. FEE_PAYMENTS
-- ══════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "fee_payments_own_read" ON fee_payments;
DROP POLICY IF EXISTS "fee_payments_admin_manage" ON fee_payments;
CREATE POLICY "fee_payments_own_read" ON fee_payments
  FOR SELECT USING (student_id = (select auth.uid()));
CREATE POLICY "fee_payments_admin_manage" ON fee_payments
  FOR ALL USING (
    (select auth_user_role()) = 'admin'
    AND EXISTS (
      SELECT 1 FROM profiles p WHERE p.id = fee_payments.student_id AND p.institution_id = (select auth_institution_id())
    )
  );
-- ══════════════════════════════════════════════════════════════
-- 46. HABIT_TRACKING
-- ══════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "habit_tracking_student_own" ON public.habit_tracking;
DROP POLICY IF EXISTS "habit_tracking_staff_read" ON public.habit_tracking;
CREATE POLICY "habit_tracking_student_own" ON public.habit_tracking
  FOR ALL USING (student_id = (select auth.uid()));
-- Vuln 24 preserved: institution-scoped staff read
CREATE POLICY "habit_tracking_staff_read" ON public.habit_tracking
  FOR SELECT USING (
    (select auth_user_role()) IN ('teacher', 'coordinator', 'admin')
    AND student_id IN (
      SELECT id FROM public.profiles WHERE institution_id = (select auth_institution_id())
    )
  );
-- ══════════════════════════════════════════════════════════════
-- 47. XP_EVENTS
-- ══════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "xp_events_read" ON public.xp_events;
DROP POLICY IF EXISTS "xp_events_admin_write" ON public.xp_events;
CREATE POLICY "xp_events_read" ON public.xp_events
  FOR SELECT USING (is_active = true);
CREATE POLICY "xp_events_admin_write" ON public.xp_events
  FOR ALL USING (
    (select auth_user_role()) = 'admin'
    AND (institution_id IS NULL OR institution_id = (select auth_institution_id()))
  );
-- ══════════════════════════════════════════════════════════════
-- 48. LEARNING_PATH_NODES
-- ══════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "learning_path_nodes_read" ON public.learning_path_nodes;
DROP POLICY IF EXISTS "learning_path_nodes_teacher_write" ON public.learning_path_nodes;
CREATE POLICY "learning_path_nodes_read" ON public.learning_path_nodes
  FOR SELECT USING (
    course_id IN (
      SELECT course_id FROM public.student_courses WHERE student_id = (select auth.uid())
      UNION
      SELECT id FROM public.courses WHERE teacher_id = (select auth.uid())
    )
  );
CREATE POLICY "learning_path_nodes_teacher_write" ON public.learning_path_nodes
  FOR ALL USING (
    (select auth_user_role()) = 'teacher'
    AND course_id IN (SELECT id FROM public.courses WHERE teacher_id = (select auth.uid()))
  );
-- ══════════════════════════════════════════════════════════════
-- 49. ONBOARDING_QUESTIONS
-- ══════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "questions_student_read" ON onboarding_questions;
DROP POLICY IF EXISTS "questions_teacher_manage" ON onboarding_questions;
DROP POLICY IF EXISTS "questions_admin_all" ON onboarding_questions;
CREATE POLICY "questions_student_read" ON onboarding_questions
  FOR SELECT USING (
    (select auth_user_role()) = 'student'
    AND institution_id = (select auth_institution_id())
    AND is_active = true
  );
CREATE POLICY "questions_teacher_manage" ON onboarding_questions
  FOR ALL USING (
    (select auth_user_role()) = 'teacher'
    AND assessment_type = 'baseline'
    AND course_id IN (SELECT id FROM courses WHERE teacher_id = (select auth.uid()))
  );
CREATE POLICY "questions_admin_all" ON onboarding_questions
  FOR ALL USING (
    (select auth_user_role()) = 'admin'
    AND institution_id = (select auth_institution_id())
  );
-- ══════════════════════════════════════════════════════════════
-- 50. ONBOARDING_RESPONSES
-- ══════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "responses_student_own" ON onboarding_responses;
CREATE POLICY "responses_student_own" ON onboarding_responses
  FOR ALL USING (student_id = (select auth.uid()));
-- ══════════════════════════════════════════════════════════════
-- 51. ONBOARDING_PROGRESS
-- ══════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "progress_student_own" ON onboarding_progress;
CREATE POLICY "progress_student_own" ON onboarding_progress
  FOR ALL USING (student_id = (select auth.uid()));
-- ══════════════════════════════════════════════════════════════
-- 52. STUDENT_PROFILES
-- ══════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "profiles_student_own" ON student_profiles;
DROP POLICY IF EXISTS "profiles_admin_read" ON student_profiles;
CREATE POLICY "profiles_student_own" ON student_profiles
  FOR ALL USING (student_id = (select auth.uid()));
CREATE POLICY "profiles_admin_read" ON student_profiles
  FOR SELECT USING (
    (select auth_user_role()) = 'admin'
    AND institution_id = (select auth_institution_id())
  );
-- ══════════════════════════════════════════════════════════════
-- 53. BASELINE_ATTAINMENT
-- ══════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "baseline_student_own" ON baseline_attainment;
DROP POLICY IF EXISTS "baseline_teacher_read" ON baseline_attainment;
DROP POLICY IF EXISTS "baseline_admin_read" ON baseline_attainment;
CREATE POLICY "baseline_student_own" ON baseline_attainment
  FOR SELECT USING (student_id = (select auth.uid()));
CREATE POLICY "baseline_teacher_read" ON baseline_attainment
  FOR SELECT USING (
    (select auth_user_role()) = 'teacher'
    AND course_id IN (SELECT id FROM courses WHERE teacher_id = (select auth.uid()))
  );
CREATE POLICY "baseline_admin_read" ON baseline_attainment
  FOR SELECT USING (
    (select auth_user_role()) = 'admin'
    AND course_id IN (
      SELECT c.id FROM courses c
      JOIN programs p ON c.program_id = p.id
      WHERE p.institution_id = (select auth_institution_id())
    )
  );
-- ══════════════════════════════════════════════════════════════
-- 54. BASELINE_TEST_CONFIG
-- ══════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "config_student_read" ON baseline_test_config;
DROP POLICY IF EXISTS "config_teacher_manage" ON baseline_test_config;
DROP POLICY IF EXISTS "config_admin_all" ON baseline_test_config;
CREATE POLICY "config_student_read" ON baseline_test_config
  FOR SELECT USING (
    (select auth_user_role()) = 'student'
    AND course_id IN (SELECT course_id FROM student_courses WHERE student_id = (select auth.uid()))
  );
CREATE POLICY "config_teacher_manage" ON baseline_test_config
  FOR ALL USING (
    (select auth_user_role()) = 'teacher'
    AND course_id IN (SELECT id FROM courses WHERE teacher_id = (select auth.uid()))
  );
CREATE POLICY "config_admin_all" ON baseline_test_config
  FOR ALL USING (
    (select auth_user_role()) = 'admin'
    AND course_id IN (
      SELECT c.id FROM courses c
      JOIN programs p ON c.program_id = p.id
      WHERE p.institution_id = (select auth_institution_id())
    )
  );
-- ══════════════════════════════════════════════════════════════
-- 55. MICRO_ASSESSMENT_SCHEDULE
-- ══════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "micro_schedule_student_own" ON micro_assessment_schedule;
CREATE POLICY "micro_schedule_student_own" ON micro_assessment_schedule
  FOR ALL USING (student_id = (select auth.uid()));
-- ══════════════════════════════════════════════════════════════
-- 56. STARTER_WEEK_SESSIONS
-- ══════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "starter_sessions_student_own" ON starter_week_sessions;
CREATE POLICY "starter_sessions_student_own" ON starter_week_sessions
  FOR ALL USING (student_id = (select auth.uid()));
-- ══════════════════════════════════════════════════════════════
-- 57. GOAL_SUGGESTIONS
-- ══════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "goal_suggestions_student_own" ON goal_suggestions;
CREATE POLICY "goal_suggestions_student_own" ON goal_suggestions
  FOR ALL USING (student_id = (select auth.uid()));
-- ══════════════════════════════════════════════════════════════
-- 58. WELLNESS_HABIT_LOGS
-- ══════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "student_select_own_wellness_logs" ON wellness_habit_logs;
DROP POLICY IF EXISTS "student_insert_own_wellness_logs" ON wellness_habit_logs;
DROP POLICY IF EXISTS "student_update_own_wellness_logs" ON wellness_habit_logs;
DROP POLICY IF EXISTS "parent_read_linked_wellness_logs" ON wellness_habit_logs;
CREATE POLICY "student_select_own_wellness_logs" ON wellness_habit_logs
  FOR SELECT TO authenticated
  USING (student_id = (select auth.uid()));
CREATE POLICY "student_insert_own_wellness_logs" ON wellness_habit_logs
  FOR INSERT TO authenticated
  WITH CHECK (student_id = (select auth.uid()) AND (select auth_user_role()) = 'student');
CREATE POLICY "student_update_own_wellness_logs" ON wellness_habit_logs
  FOR UPDATE TO authenticated
  USING (student_id = (select auth.uid()) AND (select auth_user_role()) = 'student')
  WITH CHECK (student_id = (select auth.uid()));
CREATE POLICY "parent_read_linked_wellness_logs" ON wellness_habit_logs
  FOR SELECT TO authenticated
  USING (
    (select auth_user_role()) = 'parent'
    AND student_id IN (
      SELECT psl.student_id FROM parent_student_links psl
      JOIN student_wellness_preferences swp ON swp.student_id = psl.student_id
      WHERE psl.parent_id = (select auth.uid())
        AND psl.verified = true
        AND swp.parent_visibility = true
    )
  );
-- ══════════════════════════════════════════════════════════════
-- 59. STUDENT_WELLNESS_PREFERENCES
-- ══════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "student_manage_own_preferences" ON student_wellness_preferences;
CREATE POLICY "student_manage_own_preferences" ON student_wellness_preferences
  FOR ALL TO authenticated
  USING (student_id = (select auth.uid()) AND (select auth_user_role()) = 'student')
  WITH CHECK (student_id = (select auth.uid()) AND (select auth_user_role()) = 'student');
-- ══════════════════════════════════════════════════════════════
-- 60. QUESTION_BANK
-- Note: duplicate policies exist from two migrations (000006 and 050520).
-- The later migration's policies are the active ones. We drop all and recreate.
-- ══════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "qbank_teacher_all" ON question_bank;
DROP POLICY IF EXISTS "qbank_admin_read" ON question_bank;
CREATE POLICY "qbank_teacher_all" ON question_bank
  FOR ALL TO authenticated
  USING (
    (select auth_user_role()) = 'teacher'
    AND course_id IN (SELECT id FROM courses WHERE teacher_id = (select auth.uid()))
  )
  WITH CHECK (
    (select auth_user_role()) = 'teacher'
    AND course_id IN (SELECT id FROM courses WHERE teacher_id = (select auth.uid()))
  );
CREATE POLICY "qbank_admin_read" ON question_bank
  FOR SELECT TO authenticated
  USING (
    (select auth_user_role()) = 'admin'
    AND institution_id = (select auth_institution_id())
  );
-- ══════════════════════════════════════════════════════════════
-- 61. QUESTION_ANALYTICS
-- Note: duplicate policies exist from two migrations (000007 and 050529).
-- We drop all and recreate.
-- ══════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "qanalytics_teacher_read" ON question_analytics;
DROP POLICY IF EXISTS "qanalytics_admin_read" ON question_analytics;
CREATE POLICY "qanalytics_teacher_read" ON question_analytics
  FOR SELECT TO authenticated
  USING (
    (select auth_user_role()) = 'teacher'
    AND question_id IN (
      SELECT id FROM question_bank
      WHERE course_id IN (SELECT id FROM courses WHERE teacher_id = (select auth.uid()))
    )
  );
CREATE POLICY "qanalytics_admin_read" ON question_analytics
  FOR SELECT TO authenticated
  USING (
    (select auth_user_role()) = 'admin'
    AND question_id IN (
      SELECT id FROM question_bank WHERE institution_id = (select auth_institution_id())
    )
  );
-- ══════════════════════════════════════════════════════════════
-- 62. QUIZ_GENERATION_LOGS
-- Note: duplicate policies exist from two migrations (000008 and 050537).
-- We drop all and recreate.
-- ══════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "gen_logs_teacher_read" ON quiz_generation_logs;
DROP POLICY IF EXISTS "gen_logs_admin_read" ON quiz_generation_logs;
CREATE POLICY "gen_logs_teacher_read" ON quiz_generation_logs
  FOR SELECT TO authenticated
  USING (teacher_id = (select auth.uid()));
CREATE POLICY "gen_logs_admin_read" ON quiz_generation_logs
  FOR SELECT TO authenticated
  USING (
    (select auth_user_role()) = 'admin'
    AND institution_id = (select auth_institution_id())
  );
-- ══════════════════════════════════════════════════════════════
-- 63. MASTERY_RECOVERY_PATHWAYS
-- Note: multiple duplicate migrations exist. We drop all known policy names
-- and recreate the final set.
-- ══════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "student_own_recovery" ON mastery_recovery_pathways;
DROP POLICY IF EXISTS "teacher_course_recovery" ON mastery_recovery_pathways;
DROP POLICY IF EXISTS "coordinator_institution_recovery" ON mastery_recovery_pathways;
DROP POLICY IF EXISTS "admin_recovery" ON mastery_recovery_pathways;
DROP POLICY IF EXISTS "service_recovery" ON mastery_recovery_pathways;
DROP POLICY IF EXISTS "recovery_student_read" ON mastery_recovery_pathways;
DROP POLICY IF EXISTS "recovery_teacher_read" ON mastery_recovery_pathways;
DROP POLICY IF EXISTS "recovery_admin_read" ON mastery_recovery_pathways;
DROP POLICY IF EXISTS "recovery_coordinator_read" ON mastery_recovery_pathways;
CREATE POLICY "student_own_recovery" ON mastery_recovery_pathways
  FOR SELECT TO authenticated
  USING ((select auth_user_role()) = 'student' AND student_id = (select auth.uid()));
CREATE POLICY "teacher_course_recovery" ON mastery_recovery_pathways
  FOR SELECT TO authenticated
  USING (
    (select auth_user_role()) = 'teacher'
    AND course_id IN (SELECT id FROM courses WHERE teacher_id = (select auth.uid()))
  );
CREATE POLICY "coordinator_institution_recovery" ON mastery_recovery_pathways
  FOR SELECT TO authenticated
  USING (
    (select auth_user_role()) = 'coordinator'
    AND institution_id = (select auth_institution_id())
  );
CREATE POLICY "admin_recovery" ON mastery_recovery_pathways
  FOR ALL TO authenticated
  USING ((select auth_user_role()) = 'admin' AND institution_id = (select auth_institution_id()));
CREATE POLICY "service_recovery" ON mastery_recovery_pathways
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);
-- ══════════════════════════════════════════════════════════════
-- 64. VERIFIED_EXPLANATIONS
-- Note: duplicate policies from multiple migrations. Drop all and recreate.
-- Vuln 26 preserved: student read scoped to enrolled courses.
-- ══════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "verified_teacher_all" ON verified_explanations;
DROP POLICY IF EXISTS "verified_student_read" ON verified_explanations;
DROP POLICY IF EXISTS "verified_admin_read" ON verified_explanations;
CREATE POLICY "verified_teacher_all" ON verified_explanations
  FOR ALL TO authenticated
  USING (
    (select auth_user_role()) = 'teacher'
    AND question_id IN (
      SELECT id FROM question_bank
      WHERE course_id IN (SELECT id FROM courses WHERE teacher_id = (select auth.uid()))
    )
  );
-- Vuln 26 preserved: student read scoped to enrolled courses
CREATE POLICY "verified_student_read" ON verified_explanations
  FOR SELECT TO authenticated
  USING (
    (select auth_user_role()) = 'student'
    AND is_active = true
    AND question_id IN (
      SELECT id FROM question_bank
      WHERE course_id IN (
        SELECT course_id FROM student_courses WHERE student_id = (select auth.uid())
      )
    )
  );
CREATE POLICY "verified_admin_read" ON verified_explanations
  FOR SELECT TO authenticated
  USING (
    (select auth_user_role()) = 'admin'
    AND institution_id = (select auth_institution_id())
  );
-- ══════════════════════════════════════════════════════════════
-- 65. BLOOMS_PROGRESSION
-- ══════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "blooms_student_read" ON blooms_progression;
DROP POLICY IF EXISTS "blooms_teacher_read" ON blooms_progression;
DROP POLICY IF EXISTS "blooms_admin_read" ON blooms_progression;
CREATE POLICY "blooms_student_read" ON blooms_progression
  FOR SELECT TO authenticated
  USING (student_id = (select auth.uid()));
CREATE POLICY "blooms_teacher_read" ON blooms_progression
  FOR SELECT TO authenticated
  USING (
    (select auth_user_role()) = 'teacher'
    AND course_id IN (SELECT id FROM courses WHERE teacher_id = (select auth.uid()))
  );
CREATE POLICY "blooms_admin_read" ON blooms_progression
  FOR SELECT TO authenticated
  USING (
    (select auth_user_role()) = 'admin'
    AND institution_id = (select auth_institution_id())
  );
-- ══════════════════════════════════════════════════════════════
-- 66. SOCIAL_CHALLENGES
-- ══════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "teacher_manage_challenges" ON social_challenges;
DROP POLICY IF EXISTS "student_read_challenges" ON social_challenges;
CREATE POLICY "teacher_manage_challenges" ON social_challenges
  FOR ALL TO authenticated
  USING (created_by = (select auth.uid()) OR EXISTS (
    SELECT 1 FROM courses c WHERE c.id = course_id AND c.teacher_id = (select auth.uid())
  ));
CREATE POLICY "student_read_challenges" ON social_challenges
  FOR SELECT TO authenticated
  USING (status IN ('active', 'completed') AND EXISTS (
    SELECT 1 FROM student_courses sc WHERE sc.course_id = social_challenges.course_id AND sc.student_id = (select auth.uid())
  ));
-- ══════════════════════════════════════════════════════════════
-- 67. CHALLENGE_PARTICIPANTS (skip if table does not exist yet)
-- ══════════════════════════════════════════════════════════════
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'challenge_participants') THEN
    DROP POLICY IF EXISTS "participant_read_progress" ON challenge_participants;
    DROP POLICY IF EXISTS "teacher_manage_participants" ON challenge_participants;
    CREATE POLICY "participant_read_progress" ON challenge_participants
      FOR SELECT TO authenticated
      USING (participant_id = (select auth.uid()) OR EXISTS (
        SELECT 1 FROM team_members tm WHERE tm.team_id = participant_id AND tm.student_id = (select auth.uid())
      ) OR EXISTS (
        SELECT 1 FROM social_challenges sc
        JOIN student_courses stc ON stc.course_id = sc.course_id
        WHERE sc.id = challenge_id AND stc.student_id = (select auth.uid())
      ));
    CREATE POLICY "teacher_manage_participants" ON challenge_participants
      FOR ALL TO authenticated
      USING (EXISTS (
        SELECT 1 FROM social_challenges sc
        JOIN courses c ON c.id = sc.course_id
        WHERE sc.id = challenge_id AND c.teacher_id = (select auth.uid())
      ));
  END IF;
END $$;
-- ══════════════════════════════════════════════════════════════
-- 68. GRADUATE_ATTRIBUTES (skip if table does not exist yet)
-- ══════════════════════════════════════════════════════════════
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'graduate_attributes') THEN
    DROP POLICY IF EXISTS "admin_all_graduate_attributes" ON graduate_attributes;
    DROP POLICY IF EXISTS "role_select_graduate_attributes" ON graduate_attributes;
    CREATE POLICY "admin_all_graduate_attributes" ON graduate_attributes
      FOR ALL TO authenticated
      USING ((select auth_user_role()) = 'admin' AND institution_id = (select auth_institution_id()));
    CREATE POLICY "role_select_graduate_attributes" ON graduate_attributes
      FOR SELECT TO authenticated
      USING (institution_id = (select auth_institution_id()));
  END IF;
END $$;
-- ══════════════════════════════════════════════════════════════
-- 69. GRADUATE_ATTRIBUTE_MAPPINGS (skip if table does not exist yet)
-- ══════════════════════════════════════════════════════════════
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'graduate_attribute_mappings') THEN
    DROP POLICY IF EXISTS "admin_all_ga_mappings" ON graduate_attribute_mappings;
    DROP POLICY IF EXISTS "role_select_ga_mappings" ON graduate_attribute_mappings;
    CREATE POLICY "admin_all_ga_mappings" ON graduate_attribute_mappings
      FOR ALL TO authenticated
      USING (
        (select auth_user_role()) = 'admin'
        AND graduate_attribute_id IN (
          SELECT id FROM graduate_attributes WHERE institution_id = (select auth_institution_id())
        )
      );
    CREATE POLICY "role_select_ga_mappings" ON graduate_attribute_mappings
      FOR SELECT TO authenticated
      USING (
        graduate_attribute_id IN (
          SELECT id FROM graduate_attributes WHERE institution_id = (select auth_institution_id())
        )
      );
  END IF;
END $$;
-- ══════════════════════════════════════════════════════════════
-- 70. COMPETENCY_FRAMEWORKS (skip if table does not exist yet)
-- ══════════════════════════════════════════════════════════════
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'competency_frameworks') THEN
    DROP POLICY IF EXISTS "admin_all_competency_frameworks" ON competency_frameworks;
    DROP POLICY IF EXISTS "role_select_competency_frameworks" ON competency_frameworks;
    CREATE POLICY "admin_all_competency_frameworks" ON competency_frameworks
      FOR ALL TO authenticated
      USING ((select auth_user_role()) = 'admin' AND institution_id = (select auth_institution_id()));
    CREATE POLICY "role_select_competency_frameworks" ON competency_frameworks
      FOR SELECT TO authenticated
      USING (institution_id = (select auth_institution_id()));
  END IF;
END $$;
-- ══════════════════════════════════════════════════════════════
-- 71. COMPETENCY_ITEMS (skip if table does not exist yet)
-- ══════════════════════════════════════════════════════════════
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'competency_items') THEN
    DROP POLICY IF EXISTS "admin_all_competency_items" ON competency_items;
    DROP POLICY IF EXISTS "role_select_competency_items" ON competency_items;
    CREATE POLICY "admin_all_competency_items" ON competency_items
      FOR ALL TO authenticated
      USING (
        (select auth_user_role()) = 'admin'
        AND framework_id IN (
          SELECT id FROM competency_frameworks WHERE institution_id = (select auth_institution_id())
        )
      );
    CREATE POLICY "role_select_competency_items" ON competency_items
      FOR SELECT TO authenticated
      USING (
        framework_id IN (
          SELECT id FROM competency_frameworks WHERE institution_id = (select auth_institution_id())
        )
      );
  END IF;
END $$;
-- ══════════════════════════════════════════════════════════════
-- 72. COMPETENCY_OUTCOME_MAPPINGS (skip if table does not exist yet)
-- ══════════════════════════════════════════════════════════════
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'competency_outcome_mappings') THEN
    DROP POLICY IF EXISTS "admin_all_competency_outcome_mappings" ON competency_outcome_mappings;
    DROP POLICY IF EXISTS "role_select_competency_outcome_mappings" ON competency_outcome_mappings;
    CREATE POLICY "admin_all_competency_outcome_mappings" ON competency_outcome_mappings
      FOR ALL TO authenticated
      USING (
        (select auth_user_role()) = 'admin'
        AND competency_item_id IN (
          SELECT ci.id FROM competency_items ci
          JOIN competency_frameworks cf ON ci.framework_id = cf.id
          WHERE cf.institution_id = (select auth_institution_id())
        )
      );
    CREATE POLICY "role_select_competency_outcome_mappings" ON competency_outcome_mappings
      FOR SELECT TO authenticated
      USING (
        competency_item_id IN (
          SELECT ci.id FROM competency_items ci
          JOIN competency_frameworks cf ON ci.framework_id = cf.id
          WHERE cf.institution_id = (select auth_institution_id())
        )
      );
  END IF;
END $$;
-- ══════════════════════════════════════════════════════════════
-- 73. BADGE_SPOTLIGHT_SCHEDULE
-- ══════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "admin_manage_spotlight" ON badge_spotlight_schedule;
DROP POLICY IF EXISTS "all_read_spotlight" ON badge_spotlight_schedule;
CREATE POLICY "admin_manage_spotlight" ON badge_spotlight_schedule
  FOR ALL TO authenticated
  USING (true);
CREATE POLICY "all_read_spotlight" ON badge_spotlight_schedule
  FOR SELECT TO authenticated
  USING (true);
-- ══════════════════════════════════════════════════════════════
-- END OF RLS POLICY OPTIMIZATION MIGRATION
-- ══════════════════════════════════════════════════════════════;
