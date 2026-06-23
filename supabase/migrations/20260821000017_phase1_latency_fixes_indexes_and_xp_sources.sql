-- Phase 1 Latency Fixes: indexes + widen xp_transactions_source_check
-- Resolves: HAR-identified timeout storms and CHECK constraint violations

-- 1. Index on challenge_participants(participant_id) for RLS fast-path
CREATE INDEX IF NOT EXISTS idx_challenge_participants_participant_id
  ON public.challenge_participants(participant_id);

-- 2. Index on student_gamification(student_id) — 94s of timeout in HAR
CREATE INDEX IF NOT EXISTS idx_student_gamification_student_id
  ON public.student_gamification(student_id);

-- 3. Index on grades(graded_by, graded_at) — 26s timeout on teacher dashboard
CREATE INDEX IF NOT EXISTS idx_grades_graded_by_at
  ON public.grades(graded_by, graded_at DESC);

-- 4. Widen xp_transactions_source_check to include all valid sources
ALTER TABLE public.xp_transactions DROP CONSTRAINT IF EXISTS xp_transactions_source_check;
ALTER TABLE public.xp_transactions ADD CONSTRAINT xp_transactions_source_check
  CHECK (source = ANY (ARRAY[
    'login', 'submission', 'grade', 'badge', 'streak', 'journal',
    'perfect_day', 'first_attempt', 'bonus_event', 'admin_adjustment',
    'streak_freeze_purchase', 'discussion_question', 'discussion_answer',
    'survey_completion', 'quiz_completion', 'perfect_rubric',
    'onboarding_personality', 'onboarding_learning_style',
    'onboarding_self_efficacy', 'onboarding_study_strategy',
    'onboarding_baseline', 'onboarding_complete',
    'profile_complete', 'micro_assessment',
    'study_session', 'wellness_habit', 'planner_task',
    'weekly_goal', 'review_session', 'review_cycle_complete',
    'submission_late', 'comeback_challenge', 'team_challenge',
    'challenge_reward'
  ]));
