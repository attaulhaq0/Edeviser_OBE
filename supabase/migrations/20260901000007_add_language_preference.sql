-- ============================================================================
-- 20260901000007_add_language_preference.sql
--
-- Normalizes public.profiles.language_preference to support the guided tour
-- language-follows-i18n behavior specified in design.md §8.4 / ADR-11.
--
-- Current state (pre-migration):
--   • profiles.language_preference already exists (added in
--     20260222124458_add_columns_activity_log_ai_feedback_parent_role.sql and
--     re-asserted by 20260222124929_add_extensions_indexes_and_column_additions.sql
--     from a prior Qatar-market feature that supported Urdu).
--   • Two duplicate CHECK constraints coexist on the column:
--       - chk_language_preference                 CHECK (… IN ('en','ur','ar'))
--       - profiles_language_preference_check      CHECK (… IN ('en','ur','ar'))
--     because the column definition was repeated across the two stacked
--     migrations above. Only one constraint is needed.
--   • DEFAULT is 'en'.
--
-- Required state (post-migration), per design.md ADR-11 + §8.4:
--   • Allowed values: 'en' | 'ar' | 'ur' | 'auto'.
--       - 'auto' is new: the guided tour follows i18n.language whenever the
--         user has not pinned a specific language.
--       - 'ur' is retained so existing rows that already store 'ur' remain
--         valid and no data rewrite is required.
--   • DEFAULT is 'auto' so freshly-created profiles follow the browser /
--     session locale until the user explicitly pins a language.
--   • Exactly one CHECK constraint on the column (the older duplicate goes).
--
-- Out of scope:
--   • profiles.preferred_language is a separate, older column with its own
--     ('en','ar') CHECK constraint used elsewhere in the app. This migration
--     does NOT touch it.
--
-- Idempotency: DROP CONSTRAINT IF EXISTS + ALTER DEFAULT + ADD CONSTRAINT with
-- a fixed name make re-runs of this migration safe.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Drop BOTH duplicate CHECK constraints so we can re-add a single,
--    widened one under a canonical name.
-- ----------------------------------------------------------------------------
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS chk_language_preference;

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_language_preference_check;

-- ----------------------------------------------------------------------------
-- 2. Update DEFAULT so new rows follow i18n.language by default.
--    Existing rows keep whatever value they already hold (no backfill needed
--    because the widened CHECK in step 3 still accepts every legacy value).
-- ----------------------------------------------------------------------------
ALTER TABLE public.profiles
  ALTER COLUMN language_preference SET DEFAULT 'auto';

-- ----------------------------------------------------------------------------
-- 3. Re-add a single CHECK constraint with the full allowed set.
-- ----------------------------------------------------------------------------
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_language_preference_check
  CHECK (language_preference IN ('en', 'ar', 'ur', 'auto'));

-- ----------------------------------------------------------------------------
-- 4. Column comment documenting the new semantics.
-- ----------------------------------------------------------------------------
COMMENT ON COLUMN public.profiles.language_preference
  IS 'User language preference: en | ar | ur | auto. ''auto'' follows browser/i18n locale. Drives the guided tour language and future per-user UI locale override.';
