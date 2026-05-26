-- =============================================================================
-- Schema-drift alignment: add columns the frontend code references but that
-- were missing from production. Identified by the table+column scanner in
-- scripts/audit-table-columns.mjs against db-schema.json (2026-05-26).
--
-- Each ALTER is idempotent (IF NOT EXISTS) so re-runs are safe. Already
-- applied to production via apply_migration; this file backfills the
-- migration history so preview branches and future deploys stay in sync.
-- =============================================================================

-- 1. profiles.email_preferences — used by useEmailPreferences hook to store
--    per-user email opt-in flags (streak_risk, weekly_summary, etc.). Stored
--    as JSONB. The `notification_preferences` column is for in-app
--    notifications and is kept separate.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email_preferences jsonb DEFAULT '{}'::jsonb;

-- 2. institution_settings.dynamic_pricing_enabled — used by useDynamicPricing
--    to gate the marketplace dynamic-pricing feature per institution.
ALTER TABLE public.institution_settings
  ADD COLUMN IF NOT EXISTS dynamic_pricing_enabled boolean
  NOT NULL DEFAULT false;

-- 3. teams.avatar_letter — used everywhere (Sidebar, TeamLeaderboard, team
--    cards). Displayed as a single uppercase letter avatar. Backfilled from
--    the first letter of the team name for existing rows.
ALTER TABLE public.teams
  ADD COLUMN IF NOT EXISTS avatar_letter text;

UPDATE public.teams
SET avatar_letter = UPPER(LEFT(name, 1))
WHERE avatar_letter IS NULL;

-- 4. tutor_conversations.recommended_persona — used by useTutorConversations
--    when creating a new chat. Records the persona the system suggested
--    (vs. the resolved persona the user accepted).
ALTER TABLE public.tutor_conversations
  ADD COLUMN IF NOT EXISTS recommended_persona text;

-- 5. assignments.rubric_id — used by GradingInterface to look up the rubric
--    associated with an assignment. Foreign key to rubrics(id).
ALTER TABLE public.assignments
  ADD COLUMN IF NOT EXISTS rubric_id uuid REFERENCES public.rubrics(id);
