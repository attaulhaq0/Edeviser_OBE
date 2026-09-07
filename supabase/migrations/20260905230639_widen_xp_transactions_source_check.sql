-- ============================================================================
-- Widen xp_transactions_source_check to include all sources emitted by the
-- award-xp Edge Function (VALID_SOURCES) plus the live-production legacy set.
--
-- WHY: the live constraint (verified 2026-09-05) rejects `improvement_bonus`
-- and `league_promotion` even though award-xp's VALID_SOURCES includes them. This
-- caused a silent 23514 check-violation path: award-xp caught the insert error
-- and returned without awarding. League-promotion XP has never been recorded;
-- the improvement bonus would have failed the same way.
--
-- Forward-only, idempotent (DROP IF EXISTS + ADD). Mirrors the authoritative
-- server-side allowlist in supabase/functions/award-xp/index.ts.
-- ============================================================================

ALTER TABLE public.xp_transactions
  DROP CONSTRAINT IF EXISTS xp_transactions_source_check;

ALTER TABLE public.xp_transactions
  ADD CONSTRAINT xp_transactions_source_check
  CHECK (
    source = ANY (ARRAY[
      -- Core proven-codes (live rows verified 2026-09-05)
      'login', 'submission', 'grade', 'badge', 'streak', 'journal',
      'perfect_day', 'first_attempt', 'bonus_event', 'admin_adjustment',
      'streak_freeze_purchase', 'discussion_question', 'discussion_answer',
      'survey_completion', 'quiz_completion', 'perfect_rubric',
      'onboarding_personality', 'onboarding_learning_style',
      'onboarding_self_efficacy', 'onboarding_study_strategy',
      'onboarding_baseline', 'onboarding_complete', 'profile_complete',
      'micro_assessment', 'study_session', 'wellness_habit', 'planner_task',
      'weekly_goal', 'review_session', 'review_cycle_complete',
      'submission_late', 'comeback_challenge', 'team_challenge',
      'challenge_reward',
      -- award-xp VALID_SOURCES additions (authoritative allowlist)
      'first_attempt_bonus', 'quiz_hard_bonus', 'streak_milestone',
      'starter_session_complete', 'practice_quiz', 'improvement_bonus',
      'league_promotion', 'session_reflection', 'peer_teaching',
      'peer_learning', 'tutor_engagement', 'tutor_rating'
    ])
  );

COMMENT ON CONSTRAINT xp_transactions_source_check ON public.xp_transactions IS
  'XP sources allowed; must stay in sync with VALID_SOURCES in supabase/functions/award-xp/index.ts';
