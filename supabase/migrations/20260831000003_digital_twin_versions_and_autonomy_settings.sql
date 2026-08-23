-- Task 4.1 (edeviser-agentic-intelligence): explicit version fields on the
-- Digital Twin single-table state (documented deviation from snapshot tables).
ALTER TABLE public.student_learning_states
  ADD COLUMN IF NOT EXISTS versions jsonb NOT NULL DEFAULT (jsonb_build_object('calculation','v1','policy','v1','model','v1'));

COMMENT ON COLUMN public.student_learning_states.versions IS 'Task 4.1 version bundle: calculation/policy/model per PDF s28.';

-- Task 7.2: institution-level A3 operational-autonomy governance.
-- effective autonomy = min(institution ceiling, role, page, tool, user pref,
-- teacher/coordinator ceiling). Rollback controls + evaluation thresholds.
CREATE TABLE public.institution_autonomy_settings (
  institution_id uuid PRIMARY KEY REFERENCES public.institutions(id) ON DELETE CASCADE,
  operational_autonomy_ceiling text NOT NULL DEFAULT 'A2'
    CHECK (operational_autonomy_ceiling IN ('A0','A1','A2','A3')),
  auto_execute_low_risk boolean NOT NULL DEFAULT false,
  evaluation_thresholds jsonb NOT NULL DEFAULT '{}'::jsonb,
  rollback_enabled boolean NOT NULL DEFAULT true,
  updated_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.institution_autonomy_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY institution_autonomy_settings_select ON public.institution_autonomy_settings
FOR SELECT USING (
  institution_id = (SELECT p.institution_id FROM public.profiles p WHERE p.id = auth.uid())
);

CREATE POLICY institution_autonomy_settings_admin_write ON public.institution_autonomy_settings
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.is_active = true
      AND p.institution_id = institution_autonomy_settings.institution_id
      AND p.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.is_active = true
      AND p.institution_id = institution_autonomy_settings.institution_id
      AND p.role = 'admin'
  )
);