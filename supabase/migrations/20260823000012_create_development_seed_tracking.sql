-- ============================================================
-- Persistent Seed Tracking Tables & Policies
-- ============================================================

CREATE TABLE IF NOT EXISTS public.development_seed_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seed_version VARCHAR(50) NOT NULL,
  institution_id UUID REFERENCES public.institutions(id),
  status VARCHAR(20) NOT NULL DEFAULT 'completed',
  run_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.development_seed_entities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seed_run_id UUID NOT NULL REFERENCES public.development_seed_runs(id) ON DELETE CASCADE,
  entity_type VARCHAR(50) NOT NULL,
  entity_id VARCHAR(100) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(seed_run_id, entity_type, entity_id)
);

ALTER TABLE public.development_seed_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.development_seed_entities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admins_read_seed_runs" ON public.development_seed_runs;
CREATE POLICY "admins_read_seed_runs" ON public.development_seed_runs FOR SELECT TO authenticated USING (auth_user_role() = 'admin' AND institution_id = auth_institution_id());

DROP POLICY IF EXISTS "admins_read_seed_entities" ON public.development_seed_entities;
CREATE POLICY "admins_read_seed_entities" ON public.development_seed_entities FOR SELECT TO authenticated USING (auth_user_role() = 'admin' AND seed_run_id IN (SELECT id FROM development_seed_runs WHERE institution_id = auth_institution_id()));
