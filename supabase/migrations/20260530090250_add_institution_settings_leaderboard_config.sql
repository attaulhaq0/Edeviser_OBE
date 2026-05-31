-- Requirement 6.3, 32.1, 32.2: configurable leaderboard min-cohort gate and page size.
-- Per-institution leaderboard config columns on institution_settings.
-- Read access is covered by the existing institution_settings_read policy
-- (institution_id = auth_institution_id()); no new policy required.

ALTER TABLE public.institution_settings
  ADD COLUMN IF NOT EXISTS leaderboard_min_cohort_size integer NOT NULL DEFAULT 5
    CHECK (leaderboard_min_cohort_size >= 0);

ALTER TABLE public.institution_settings
  ADD COLUMN IF NOT EXISTS leaderboard_page_size integer NOT NULL DEFAULT 50
    CHECK (leaderboard_page_size BETWEEN 1 AND 200);;
