-- ============================================================
-- Migration: Drop redundant exact-duplicate indexes
-- Feature: dashboard-and-ux-performance (buffer-cache hygiene on Nano compute)
-- ============================================================
-- WHY THIS EXISTS
--   Each table below carries TWO btree indexes with an identical key: a UNIQUE
--   index that backs a UNIQUE constraint, plus a plain non-unique index created
--   separately (usually a hand-added "FK/lookup" index that happened to match a
--   column set already covered by the constraint's index). The plain index is
--   pure overhead:
--     * it duplicates the unique index's leaf pages in shared_buffers -- wasteful
--       on Nano/Micro where shared_buffers is only ~224 MB, so every redundant
--       page evicts a page the dashboards actually need warm;
--     * every INSERT/UPDATE to the table must maintain BOTH indexes (write
--       amplification) for zero read benefit.
--
-- WHY DROPPING IS SAFE (no query-plan regression)
--   The retained UNIQUE index has the exact same leading columns, ordering, and
--   opclass as the plain index being dropped (verified via pg_index.indkey +
--   indoption + indclass -- byte-identical for all eight). Any equality or prefix
--   lookup the planner served from the plain index is served identically by the
--   unique index. The UNIQUE index cannot be dropped (it enforces a constraint),
--   so it is guaranteed to remain. Net effect: identical read plans, less RAM
--   pressure, less write work.
--
-- WHAT THIS MIGRATION DELIBERATELY DOES *NOT* TOUCH
--   * idx_student_profiles_student on student_profiles(student_id, assessment_version DESC).
--     Its twin student_profiles_student_id_assessment_version_key is (…, ASC). The
--     access paths are still equivalent (equality/prefix identical; ORDER BY DESC
--     is served by a backward scan of the ASC index), so it is *safe* to drop --
--     but it is not a BYTE-EXACT duplicate (trailing-column sort direction differs).
--     It is intentionally left out of this "exact duplicates only" migration and
--     tracked separately for an explicit decision.
--   * ~60 idx_scan=0 "unused" indexes flagged by the advisor. At near-zero prod
--     traffic the idx_scan counter is not a trustworthy drop signal, so those are
--     NOT dropped here.
--   * idx_habit_logs_student_date (student_id, date) is a DIFFERENT key from the
--     dropped idx_habit_logs_student_type_date (student_id, habit_type, date) and
--     is retained.
--
-- SAFETY / REVERSIBILITY
--   * Every statement is DROP INDEX IF EXISTS -> replay-safe and idempotent; a
--     fresh replay where the index was never created simply no-ops.
--   * None of these plain indexes backs a constraint (verified: pg_constraint
--     conindid is NULL for all eight), so no constraint is affected.
--   * To restore any one, run its paired CREATE INDEX (kept verbatim below).
-- ============================================================

-- grades: unique grades_submission_id_key(submission_id) already covers this.
-- recovery: CREATE INDEX idx_grades_submission_id ON public.grades USING btree (submission_id);
DROP INDEX IF EXISTS public.idx_grades_submission_id;

-- habit_logs: unique habit_logs_student_id_habit_type_date_key(student_id, habit_type, date) covers this.
-- recovery: CREATE INDEX idx_habit_logs_student_type_date ON public.habit_logs USING btree (student_id, habit_type, date);
DROP INDEX IF EXISTS public.idx_habit_logs_student_type_date;

-- habit_tracking: unique habit_tracking_student_id_habit_date_key(student_id, habit_date) covers this.
-- recovery: CREATE INDEX idx_habit_tracking_student_date ON public.habit_tracking USING btree (student_id, habit_date);
DROP INDEX IF EXISTS public.idx_habit_tracking_student_date;

-- question_analytics: unique question_analytics_question_id_key(question_id) covers this.
--   (Also independently flagged unused_index by the performance advisor.)
-- recovery: CREATE INDEX idx_qanalytics_question ON public.question_analytics USING btree (question_id);
DROP INDEX IF EXISTS public.idx_qanalytics_question;

-- reflection_digests: unique reflection_digests_student_id_month_key(student_id, month) covers this.
-- recovery: CREATE INDEX idx_reflection_digests_student ON public.reflection_digests USING btree (student_id, month);
DROP INDEX IF EXISTS public.idx_reflection_digests_student;

-- student_gamification: unique student_gamification_student_id_key(student_id) covers this.
--   (idx_student_gamification_student_id was added in 20260821000017 as a latency
--    fix, but the pre-existing unique index already served student_id lookups; the
--    fix's intent is preserved by the retained unique index.)
-- recovery: CREATE INDEX idx_student_gamification_student_id ON public.student_gamification USING btree (student_id);
DROP INDEX IF EXISTS public.idx_student_gamification_student_id;

-- team_gamification: unique team_gamification_team_id_key(team_id) covers this.
-- recovery: CREATE INDEX idx_team_gamification_team ON public.team_gamification USING btree (team_id);
DROP INDEX IF EXISTS public.idx_team_gamification_team;

-- tutor_usage_limits: unique tutor_usage_limits_student_id_usage_date_key(student_id, usage_date) covers this.
-- recovery: CREATE INDEX idx_usage_student_date ON public.tutor_usage_limits USING btree (student_id, usage_date);
DROP INDEX IF EXISTS public.idx_usage_student_date;
