-- =============================================================================
-- adaptive_scoring_foundation — continuous-verification task 8.1 (Wave A)
-- Additive, contract-independent schema: per-course assessment-model framing +
-- per-course grade scales + raw-score evidence. NO framework math here —
-- boundary tables land with Wave B (8.3/8.4) per the Discovery contract
-- (README session C / R21). Percent path is byte-identical: the existing
-- trigger_attainment_rollup assignment branch is untouched; the criterion/
-- band/component branches activate only when a course sets assessment_model.
--
-- Forward-only. All columns nullable or defaulted → existing tenants migrate
-- cleanly with zero behavior change.
-- =============================================================================

-- 1) Per-course grade scales (institution-scoped; course_id NULL = default).
CREATE TABLE public.grade_scales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES public.institutions(id),
  course_id uuid REFERENCES public.courses(id),
  name text NOT NULL,
  definition jsonb NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.grade_scales ENABLE ROW LEVEL SECURITY;

CREATE POLICY grade_scales_select ON public.grade_scales
  FOR SELECT TO authenticated
  USING (institution_id = (SELECT public.auth_institution_id()));

CREATE POLICY grade_scales_admin_write ON public.grade_scales
  FOR ALL TO authenticated
  USING (
    (SELECT public.auth_user_role()) = 'admin'
    AND institution_id = (SELECT public.auth_institution_id())
  )
  WITH CHECK (
    (SELECT public.auth_user_role()) = 'admin'
    AND institution_id = (SELECT public.auth_institution_id())
  );

CREATE INDEX idx_grade_scales_institution ON public.grade_scales (institution_id);
CREATE INDEX idx_grade_scales_course ON public.grade_scales (course_id) WHERE course_id IS NOT NULL;

-- 2) Courses: assessment-model framing.
ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS framework_id uuid REFERENCES public.competency_frameworks(id),
  ADD COLUMN IF NOT EXISTS curriculum_code text,
  ADD COLUMN IF NOT EXISTS key_stage text,
  ADD COLUMN IF NOT EXISTS assessment_model text
    NOT NULL DEFAULT 'percent'
    CHECK (assessment_model IN ('percent', 'criterion', 'band_grade', 'component')),
  ADD COLUMN IF NOT EXISTS grade_scale_id uuid REFERENCES public.grade_scales(id);

-- 3) Evidence: immutable raw score semantics (criterion levels, rubric
--    selections, band/component results) alongside the canonical normalized
--    score_percent. Nullable → zero impact on existing rows.
ALTER TABLE public.evidence ADD COLUMN IF NOT EXISTS raw_score jsonb;

-- 4) Accreditation bodies: relax the higher-ed-only CHECK so K-12 accreditors
--    (IB, CIS, BSO, QNSA, NEASC, Cambridge, …) can be recorded. The legacy
--    column + default stay for backward compatibility; new values are free
--    text (comma-separated multi-accreditation is valid).
ALTER TABLE public.institution_settings
  DROP CONSTRAINT institution_settings_accreditation_body_check;

COMMENT ON COLUMN public.institution_settings.accreditation_body IS
  'Legacy single-accreditor field (pre-8.1; kept for backward compat). Post-8.1: free text — use accreditation_bodies for the authoritative list.';
ALTER TABLE public.institution_settings
  ADD COLUMN IF NOT EXISTS accreditation_bodies text[]
    NOT NULL DEFAULT ARRAY[]::text[];

COMMENT ON COLUMN public.institution_settings.accreditation_bodies IS
  '8.1: authoritative multi-accreditor list (free text, frame-independent). Example: {IB,CIS,QNSA}.';

-- 5) Seed each existing institution a percent default scale (idempotent).
INSERT INTO public.grade_scales (institution_id, course_id, name, definition, is_active)
SELECT
  i.id,
  NULL,
  'Default percent (A–F)',
  jsonb_build_object(
    'model', 'percent',
    'bands', jsonb_build_array(
      jsonb_build_object('letter', 'A', 'min_percent', 85, 'max_percent', 100, 'gpa_points', 4),
      jsonb_build_object('letter', 'B', 'min_percent', 70, 'max_percent', 84, 'gpa_points', 3),
      jsonb_build_object('letter', 'C', 'min_percent', 55, 'max_percent', 69, 'gpa_points', 2),
      jsonb_build_object('letter', 'D', 'min_percent', 50, 'max_percent', 54, 'gpa_points', 1),
      jsonb_build_object('letter', 'F', 'min_percent', 0,  'max_percent', 49, 'gpa_points', 0)
    )
  ),
  true
FROM public.institutions i
WHERE NOT EXISTS (
  SELECT 1 FROM public.grade_scales gs WHERE gs.institution_id = i.id
);