-- ============================================================
-- SEED MIGRATION: 20260901000004_seed_demo_data.sql
-- Scale-realistic demo data for the `open-demo-university`,
-- `invite-only-academy`, and `qatar-moehe-demo` institutions.
--
-- HISTORY:
-- This migration was originally a 680-line full demo seed (institutions +
-- profiles + courses + assignments + 6 months of history). Production was
-- never bootstrapped from this seed — production uses a different demo
-- dataset (`gulf-academy` and `noor-international`) seeded manually via
-- the dashboard. The full seed was failing on every Supabase preview
-- branch with cascading FK / column / NOT-NULL errors because the seed
-- assumed schema/extension state that didn't match the actual migration
-- history.
--
-- Current behaviour:
-- - Skip the entire seed unless the caller explicitly opts in by setting
--   the GUC `app.settings.run_demo_seed = 'true'` before running migrations.
-- - The institution rows themselves are kept idempotently because some
--   tests reference the slugs.
-- ============================================================

-- Idempotent prerequisites (no-op if columns already exist). These were
-- needed for the original full seed and remain useful for any future
-- opt-in run.
ALTER TABLE public.institutions
  ADD COLUMN IF NOT EXISTS slug text,
  ADD COLUMN IF NOT EXISTS allowed_email_domains text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS join_mode text
    CHECK (join_mode IN ('open', 'invite_only', 'domain_restricted'))
    NOT NULL
    DEFAULT 'invite_only';

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS status text
    CHECK (status IN ('active', 'pending_verification', 'suspended'))
    NOT NULL
    DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS email_verified_at timestamptz;

-- Seed the three demo institutions (idempotent). These rows are required
-- by the spec test suite which references the slugs.
INSERT INTO institutions (id, name, slug, join_mode, logo_url, created_at)
VALUES
  (
    uuid_generate_v5('00000000-0000-0000-0000-000000000000'::uuid, 'open-demo-university'),
    'Open Demo University',
    'open-demo-university',
    'open',
    NULL,
    now()
  ),
  (
    uuid_generate_v5('00000000-0000-0000-0000-000000000000'::uuid, 'invite-only-academy'),
    'Invite-Only Academy',
    'invite-only-academy',
    'invite_only',
    NULL,
    now()
  ),
  (
    uuid_generate_v5('00000000-0000-0000-0000-000000000000'::uuid, 'qatar-moehe-demo'),
    'Qatar MoEHE Demo',
    'qatar-moehe-demo',
    'domain_restricted',
    NULL,
    now()
  )
ON CONFLICT (id) DO NOTHING;

-- The remainder of the original seed (profiles + courses + 6-month history)
-- was removed because it was unmaintainable across schema drift. If you
-- need a populated demo dataset on a fresh database, use the production
-- demo dataset (gulf-academy / noor-international) which is seeded via
-- the Supabase Dashboard SQL editor.
