-- Canonical OBE hierarchy foundation
--
-- Establishes one persisted direction:
--   ILO (source/parent) -> PLO (target/child)
--   PLO (source/parent) -> CLO (target/child)
--
-- The migration is deliberately self-contained and replay-safe. It captures
-- the exact pre-migration mapping rows in a private, access-revoked relation,
-- deterministically reconciles historical reverse/mirrored rows, installs
-- database-level hierarchy guards, replaces broad write policies with
-- role/type/scope-specific policies, and aligns the grade rollup trigger.

SET lock_timeout = '10s';
SET statement_timeout = '120s';

-- ---------------------------------------------------------------------------
-- 1. Exact, private reconciliation backup
-- ---------------------------------------------------------------------------

CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon, authenticated;

CREATE TABLE IF NOT EXISTS private.outcome_mapping_reconciliation_backup (
  migration_version text NOT NULL,
  id uuid NOT NULL,
  source_outcome_id uuid NOT NULL,
  target_outcome_id uuid NOT NULL,
  weight numeric NOT NULL,
  created_at timestamptz NOT NULL,
  backed_up_at timestamptz NOT NULL DEFAULT statement_timestamp(),
  PRIMARY KEY (migration_version, id)
);

ALTER TABLE private.outcome_mapping_reconciliation_backup
  ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE private.outcome_mapping_reconciliation_backup
  FROM PUBLIC, anon, authenticated;

INSERT INTO private.outcome_mapping_reconciliation_backup (
  migration_version,
  id,
  source_outcome_id,
  target_outcome_id,
  weight,
  created_at
)
SELECT
  '20260824000002',
  m.id,
  m.source_outcome_id,
  m.target_outcome_id,
  m.weight,
  m.created_at
FROM public.outcome_mappings AS m
ON CONFLICT (migration_version, id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 2. Deterministic direction reconciliation and per-child normalization
-- ---------------------------------------------------------------------------

DO $validation$
DECLARE
  v_unexpected text;
BEGIN
  SELECT string_agg(pair_name || ' (' || row_count || ')', ', ' ORDER BY pair_name)
  INTO v_unexpected
  FROM (
    SELECT
      s.type::text || '->' || t.type::text AS pair_name,
      count(*)::text AS row_count
    FROM public.outcome_mappings AS m
    JOIN public.learning_outcomes AS s ON s.id = m.source_outcome_id
    JOIN public.learning_outcomes AS t ON t.id = m.target_outcome_id
    WHERE (s.type::text, t.type::text) NOT IN (
      ('ILO', 'PLO'),
      ('PLO', 'ILO'),
      ('PLO', 'CLO'),
      ('CLO', 'PLO')
    )
    GROUP BY s.type, t.type
  ) AS unexpected;

  IF v_unexpected IS NOT NULL THEN
    RAISE EXCEPTION
      'Cannot reconcile unexpected outcome mapping type pairs: %',
      v_unexpected
      USING ERRCODE = '23514';
  END IF;
END;
$validation$;

DROP TRIGGER IF EXISTS trg_outcome_mapping_weight_sum
  ON public.outcome_mappings;

CREATE TEMP TABLE obe_mapping_candidates ON COMMIT DROP AS
WITH typed AS (
  SELECT
    m.id,
    m.source_outcome_id,
    m.target_outcome_id,
    m.weight,
    m.created_at,
    s.type::text AS source_type,
    t.type::text AS target_type
  FROM public.outcome_mappings AS m
  JOIN public.learning_outcomes AS s ON s.id = m.source_outcome_id
  JOIN public.learning_outcomes AS t ON t.id = m.target_outcome_id
), converted AS (
  SELECT
    id,
    CASE
      WHEN (source_type, target_type) IN (('ILO', 'PLO'), ('PLO', 'CLO'))
        THEN source_outcome_id
      ELSE target_outcome_id
    END AS source_outcome_id,
    CASE
      WHEN (source_type, target_type) IN (('ILO', 'PLO'), ('PLO', 'CLO'))
        THEN target_outcome_id
      ELSE source_outcome_id
    END AS target_outcome_id,
    weight,
    created_at,
    CASE
      WHEN (source_type, target_type) IN (('ILO', 'PLO'), ('PLO', 'CLO'))
        THEN 0
      ELSE 1
    END AS direction_priority
  FROM typed
)
SELECT
  converted.*,
  row_number() OVER (
    PARTITION BY source_outcome_id, target_outcome_id
    ORDER BY direction_priority, created_at, id
  ) AS canonical_rank
FROM converted;

CREATE TEMP TABLE obe_mapping_final ON COMMIT DROP AS
WITH winners AS (
  SELECT
    id,
    source_outcome_id,
    target_outcome_id,
    weight,
    created_at
  FROM obe_mapping_candidates
  WHERE canonical_rank = 1
), weighted AS (
  SELECT
    winners.*,
    sum(weight) OVER (PARTITION BY target_outcome_id) AS target_weight_total,
    count(*) OVER (PARTITION BY target_outcome_id) AS target_parent_count
  FROM winners
)
SELECT
  id,
  source_outcome_id,
  target_outcome_id,
  CASE
    WHEN target_weight_total > 0
      THEN weight / target_weight_total
    ELSE 1.0 / target_parent_count
  END::numeric AS weight,
  created_at
FROM weighted;

DELETE FROM public.outcome_mappings;

INSERT INTO public.outcome_mappings (
  id,
  source_outcome_id,
  target_outcome_id,
  weight,
  created_at
)
SELECT
  id,
  source_outcome_id,
  target_outcome_id,
  weight,
  created_at
FROM obe_mapping_final
ORDER BY target_outcome_id, source_outcome_id;

DO $post_reconciliation$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.outcome_mappings AS m
    JOIN public.learning_outcomes AS s ON s.id = m.source_outcome_id
    JOIN public.learning_outcomes AS t ON t.id = m.target_outcome_id
    WHERE (s.type::text, t.type::text) NOT IN (
      ('ILO', 'PLO'),
      ('PLO', 'CLO')
    )
  ) THEN
    RAISE EXCEPTION 'Outcome mapping reconciliation left a non-canonical edge'
      USING ERRCODE = '23514';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.outcome_mappings
    GROUP BY target_outcome_id
    HAVING abs(sum(weight) - 1.0) > 0.0001
  ) THEN
    RAISE EXCEPTION 'Outcome mapping reconciliation left a non-unit child allocation'
      USING ERRCODE = '23514';
  END IF;
END;
$post_reconciliation$;

-- ---------------------------------------------------------------------------
-- 3. Outcome shape and mapping hierarchy constraints
-- ---------------------------------------------------------------------------

DROP TRIGGER IF EXISTS trg_validate_sub_clo ON public.learning_outcomes;
DROP FUNCTION IF EXISTS public.validate_sub_clo_weights();

CREATE OR REPLACE FUNCTION public.enforce_learning_outcome_scope()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $function$
DECLARE
  v_program_institution_id uuid;
  v_course_program_id uuid;
  v_course_institution_id uuid;
BEGIN
  CASE NEW.type
    WHEN 'ILO'::public.outcome_type THEN
      IF NEW.program_id IS NOT NULL OR NEW.course_id IS NOT NULL THEN
        RAISE EXCEPTION 'ILO outcomes must be institution-scoped only'
          USING ERRCODE = '23514';
      END IF;

    WHEN 'PLO'::public.outcome_type THEN
      IF NEW.program_id IS NULL OR NEW.course_id IS NOT NULL THEN
        RAISE EXCEPTION 'PLO outcomes require a program and cannot reference a course'
          USING ERRCODE = '23514';
      END IF;

      SELECT p.institution_id
      INTO v_program_institution_id
      FROM public.programs AS p
      WHERE p.id = NEW.program_id;

      IF v_program_institution_id IS NULL THEN
        RAISE EXCEPTION 'PLO program % does not exist or is not visible', NEW.program_id
          USING ERRCODE = '23503';
      END IF;

      NEW.institution_id := v_program_institution_id;

    WHEN 'CLO'::public.outcome_type THEN
      IF NEW.course_id IS NULL THEN
        RAISE EXCEPTION 'CLO outcomes require a course'
          USING ERRCODE = '23514';
      END IF;

      SELECT c.program_id, p.institution_id
      INTO v_course_program_id, v_course_institution_id
      FROM public.courses AS c
      JOIN public.programs AS p ON p.id = c.program_id
      WHERE c.id = NEW.course_id;

      IF v_course_program_id IS NULL OR v_course_institution_id IS NULL THEN
        RAISE EXCEPTION 'CLO course % does not exist or is not visible', NEW.course_id
          USING ERRCODE = '23503';
      END IF;

      IF NEW.program_id IS NOT NULL AND NEW.program_id <> v_course_program_id THEN
        RAISE EXCEPTION 'CLO program must match its course program'
          USING ERRCODE = '23514';
      END IF;

      NEW.program_id := v_course_program_id;
      NEW.institution_id := v_course_institution_id;

    WHEN 'SUB_CLO'::public.outcome_type THEN
      RAISE EXCEPTION
        'SUB_CLO rows belong in public.sub_clos, not public.learning_outcomes'
        USING ERRCODE = '23514';
  END CASE;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_enforce_learning_outcome_scope
  ON public.learning_outcomes;

CREATE TRIGGER trg_enforce_learning_outcome_scope
  BEFORE INSERT OR UPDATE OF type, institution_id, program_id, course_id
  ON public.learning_outcomes
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_learning_outcome_scope();

ALTER TABLE public.learning_outcomes
  DROP CONSTRAINT IF EXISTS learning_outcomes_canonical_shape_check;

ALTER TABLE public.learning_outcomes
  ADD CONSTRAINT learning_outcomes_canonical_shape_check
  CHECK (
    (type = 'ILO' AND program_id IS NULL AND course_id IS NULL)
    OR (type = 'PLO' AND program_id IS NOT NULL AND course_id IS NULL)
    OR (type = 'CLO' AND program_id IS NOT NULL AND course_id IS NOT NULL)
  ) NOT VALID;

ALTER TABLE public.learning_outcomes
  VALIDATE CONSTRAINT learning_outcomes_canonical_shape_check;

CREATE OR REPLACE FUNCTION public.validate_outcome_mapping_hierarchy()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $function$
DECLARE
  v_source_type public.outcome_type;
  v_target_type public.outcome_type;
  v_source_institution_id uuid;
  v_target_institution_id uuid;
  v_source_program_id uuid;
  v_target_program_id uuid;
  v_target_course_id uuid;
  v_target_course_program_id uuid;
BEGIN
  IF NEW.source_outcome_id = NEW.target_outcome_id THEN
    RAISE EXCEPTION 'An outcome cannot map to itself'
      USING ERRCODE = '23514';
  END IF;

  SELECT type, institution_id, program_id
  INTO v_source_type, v_source_institution_id, v_source_program_id
  FROM public.learning_outcomes
  WHERE id = NEW.source_outcome_id;

  SELECT type, institution_id, program_id, course_id
  INTO v_target_type, v_target_institution_id, v_target_program_id, v_target_course_id
  FROM public.learning_outcomes
  WHERE id = NEW.target_outcome_id;

  IF v_source_type IS NULL OR v_target_type IS NULL THEN
    RAISE EXCEPTION 'Both mapping endpoints must exist and be visible'
      USING ERRCODE = '23503';
  END IF;

  IF v_source_institution_id <> v_target_institution_id THEN
    RAISE EXCEPTION 'Outcome mapping endpoints must belong to one institution'
      USING ERRCODE = '23514';
  END IF;

  IF (v_source_type, v_target_type) = (
    'ILO'::public.outcome_type,
    'PLO'::public.outcome_type
  ) THEN
    IF v_target_program_id IS NULL THEN
      RAISE EXCEPTION 'A mapped PLO must belong to a program'
        USING ERRCODE = '23514';
    END IF;
  ELSIF (v_source_type, v_target_type) = (
    'PLO'::public.outcome_type,
    'CLO'::public.outcome_type
  ) THEN
    SELECT c.program_id
    INTO v_target_course_program_id
    FROM public.courses AS c
    WHERE c.id = v_target_course_id;

    IF v_source_program_id IS NULL
       OR v_target_program_id IS NULL
       OR v_target_course_program_id IS NULL
       OR v_source_program_id <> v_target_program_id
       OR v_source_program_id <> v_target_course_program_id THEN
      RAISE EXCEPTION 'PLO and CLO mapping scopes must share one program'
        USING ERRCODE = '23514';
    END IF;
  ELSE
    RAISE EXCEPTION 'Only canonical ILO->PLO and PLO->CLO mappings are allowed'
      USING ERRCODE = '23514';
  END IF;

  IF EXISTS (
    WITH RECURSIVE descendants(outcome_id) AS (
      SELECT m.target_outcome_id
      FROM public.outcome_mappings AS m
      WHERE m.source_outcome_id = NEW.target_outcome_id
        AND m.id <> NEW.id
      UNION
      SELECT m.target_outcome_id
      FROM public.outcome_mappings AS m
      JOIN descendants AS d ON d.outcome_id = m.source_outcome_id
      WHERE m.id <> NEW.id
    )
    SELECT 1
    FROM descendants
    WHERE outcome_id = NEW.source_outcome_id
  ) THEN
    RAISE EXCEPTION 'Outcome mapping would create a cycle'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_validate_outcome_mapping_hierarchy
  ON public.outcome_mappings;

CREATE TRIGGER trg_validate_outcome_mapping_hierarchy
  BEFORE INSERT OR UPDATE OF source_outcome_id, target_outcome_id
  ON public.outcome_mappings
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_outcome_mapping_hierarchy();

CREATE OR REPLACE FUNCTION public.guard_mapped_outcome_delete()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $function$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.outcome_mappings AS m
    WHERE m.source_outcome_id = OLD.id
       OR m.target_outcome_id = OLD.id
  ) THEN
    RAISE EXCEPTION 'Outcome % is mapped; remove its mappings before deletion', OLD.id
      USING ERRCODE = '23503';
  END IF;

  RETURN OLD;
END;
$function$;

DROP TRIGGER IF EXISTS trg_guard_mapped_outcome_delete
  ON public.learning_outcomes;

CREATE TRIGGER trg_guard_mapped_outcome_delete
  BEFORE DELETE ON public.learning_outcomes
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_mapped_outcome_delete();

ALTER TABLE public.outcome_mappings
  DROP CONSTRAINT IF EXISTS outcome_mappings_source_outcome_id_fkey,
  DROP CONSTRAINT IF EXISTS outcome_mappings_target_outcome_id_fkey;

ALTER TABLE public.outcome_mappings
  ADD CONSTRAINT outcome_mappings_source_outcome_id_fkey
    FOREIGN KEY (source_outcome_id)
    REFERENCES public.learning_outcomes(id)
    ON DELETE RESTRICT,
  ADD CONSTRAINT outcome_mappings_target_outcome_id_fkey
    FOREIGN KEY (target_outcome_id)
    REFERENCES public.learning_outcomes(id)
    ON DELETE RESTRICT;

-- Validate every affected child, including both OLD and NEW targets on UPDATE.
CREATE OR REPLACE FUNCTION public.validate_outcome_mapping_weight_sum()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $function$
DECLARE
  v_target uuid;
  v_total numeric;
  v_targets uuid[];
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_targets := ARRAY[NEW.target_outcome_id];
  ELSIF TG_OP = 'DELETE' THEN
    v_targets := ARRAY[OLD.target_outcome_id];
  ELSIF OLD.target_outcome_id = NEW.target_outcome_id THEN
    v_targets := ARRAY[NEW.target_outcome_id];
  ELSE
    v_targets := ARRAY[OLD.target_outcome_id, NEW.target_outcome_id];
  END IF;

  FOREACH v_target IN ARRAY v_targets LOOP
    SELECT sum(weight)
    INTO v_total
    FROM public.outcome_mappings
    WHERE target_outcome_id = v_target;

    IF v_total IS NOT NULL AND abs(v_total - 1.0) > 0.0001 THEN
      RAISE EXCEPTION
        'outcome_mappings weights for child % sum to %, expected 1.0',
        v_target,
        v_total
        USING ERRCODE = '23514';
    END IF;
  END LOOP;

  RETURN NULL;
END;
$function$;

CREATE CONSTRAINT TRIGGER trg_outcome_mapping_weight_sum
  AFTER INSERT OR UPDATE OR DELETE ON public.outcome_mappings
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_outcome_mapping_weight_sum();

COMMENT ON FUNCTION public.validate_outcome_mapping_weight_sum() IS
  'Deferred invariant: every mapped child target has parent weights summing to 1.0; UPDATE validates both its old and new target groups.';

-- ---------------------------------------------------------------------------
-- 4. Least-privilege, operation-specific RLS
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS outcomes_admin_write ON public.learning_outcomes;
DROP POLICY IF EXISTS outcomes_coordinator_write ON public.learning_outcomes;
DROP POLICY IF EXISTS outcomes_teacher_write ON public.learning_outcomes;

DROP POLICY IF EXISTS outcomes_admin_ilo_insert ON public.learning_outcomes;
DROP POLICY IF EXISTS outcomes_admin_ilo_update ON public.learning_outcomes;
DROP POLICY IF EXISTS outcomes_admin_ilo_delete ON public.learning_outcomes;
DROP POLICY IF EXISTS outcomes_coordinator_plo_insert ON public.learning_outcomes;
DROP POLICY IF EXISTS outcomes_coordinator_plo_update ON public.learning_outcomes;
DROP POLICY IF EXISTS outcomes_coordinator_plo_delete ON public.learning_outcomes;
DROP POLICY IF EXISTS outcomes_teacher_clo_insert ON public.learning_outcomes;
DROP POLICY IF EXISTS outcomes_teacher_clo_update ON public.learning_outcomes;
DROP POLICY IF EXISTS outcomes_teacher_clo_delete ON public.learning_outcomes;

CREATE POLICY outcomes_admin_ilo_insert
ON public.learning_outcomes FOR INSERT TO authenticated
WITH CHECK (
  (SELECT public.auth_user_role()) = 'admin'
  AND type = 'ILO'
  AND institution_id = (SELECT public.auth_institution_id())
  AND program_id IS NULL
  AND course_id IS NULL
);

CREATE POLICY outcomes_admin_ilo_update
ON public.learning_outcomes FOR UPDATE TO authenticated
USING (
  (SELECT public.auth_user_role()) = 'admin'
  AND type = 'ILO'
  AND institution_id = (SELECT public.auth_institution_id())
)
WITH CHECK (
  (SELECT public.auth_user_role()) = 'admin'
  AND type = 'ILO'
  AND institution_id = (SELECT public.auth_institution_id())
  AND program_id IS NULL
  AND course_id IS NULL
);

CREATE POLICY outcomes_admin_ilo_delete
ON public.learning_outcomes FOR DELETE TO authenticated
USING (
  (SELECT public.auth_user_role()) = 'admin'
  AND type = 'ILO'
  AND institution_id = (SELECT public.auth_institution_id())
);

CREATE POLICY outcomes_coordinator_plo_insert
ON public.learning_outcomes FOR INSERT TO authenticated
WITH CHECK (
  (SELECT public.auth_user_role()) = 'coordinator'
  AND type = 'PLO'
  AND institution_id = (SELECT public.auth_institution_id())
  AND course_id IS NULL
  AND program_id IN (
    SELECT p.id
    FROM public.programs AS p
    WHERE p.coordinator_id = (SELECT auth.uid())
      AND p.institution_id = (SELECT public.auth_institution_id())
  )
);

CREATE POLICY outcomes_coordinator_plo_update
ON public.learning_outcomes FOR UPDATE TO authenticated
USING (
  (SELECT public.auth_user_role()) = 'coordinator'
  AND type = 'PLO'
  AND program_id IN (
    SELECT p.id FROM public.programs AS p
    WHERE p.coordinator_id = (SELECT auth.uid())
  )
)
WITH CHECK (
  (SELECT public.auth_user_role()) = 'coordinator'
  AND type = 'PLO'
  AND institution_id = (SELECT public.auth_institution_id())
  AND course_id IS NULL
  AND program_id IN (
    SELECT p.id
    FROM public.programs AS p
    WHERE p.coordinator_id = (SELECT auth.uid())
      AND p.institution_id = (SELECT public.auth_institution_id())
  )
);

CREATE POLICY outcomes_coordinator_plo_delete
ON public.learning_outcomes FOR DELETE TO authenticated
USING (
  (SELECT public.auth_user_role()) = 'coordinator'
  AND type = 'PLO'
  AND program_id IN (
    SELECT p.id FROM public.programs AS p
    WHERE p.coordinator_id = (SELECT auth.uid())
  )
);

CREATE POLICY outcomes_teacher_clo_insert
ON public.learning_outcomes FOR INSERT TO authenticated
WITH CHECK (
  (SELECT public.auth_user_role()) = 'teacher'
  AND type = 'CLO'
  AND institution_id = (SELECT public.auth_institution_id())
  AND course_id IN (
    SELECT c.id
    FROM public.courses AS c
    JOIN public.programs AS p ON p.id = c.program_id
    WHERE c.teacher_id = (SELECT auth.uid())
      AND p.institution_id = (SELECT public.auth_institution_id())
  )
);

CREATE POLICY outcomes_teacher_clo_update
ON public.learning_outcomes FOR UPDATE TO authenticated
USING (
  (SELECT public.auth_user_role()) = 'teacher'
  AND type = 'CLO'
  AND course_id IN (
    SELECT c.id FROM public.courses AS c
    WHERE c.teacher_id = (SELECT auth.uid())
  )
)
WITH CHECK (
  (SELECT public.auth_user_role()) = 'teacher'
  AND type = 'CLO'
  AND institution_id = (SELECT public.auth_institution_id())
  AND course_id IN (
    SELECT c.id
    FROM public.courses AS c
    JOIN public.programs AS p ON p.id = c.program_id
    WHERE c.teacher_id = (SELECT auth.uid())
      AND p.institution_id = (SELECT public.auth_institution_id())
  )
);

CREATE POLICY outcomes_teacher_clo_delete
ON public.learning_outcomes FOR DELETE TO authenticated
USING (
  (SELECT public.auth_user_role()) = 'teacher'
  AND type = 'CLO'
  AND course_id IN (
    SELECT c.id FROM public.courses AS c
    WHERE c.teacher_id = (SELECT auth.uid())
  )
);

DROP POLICY IF EXISTS outcome_mappings_institution_read
  ON public.outcome_mappings;
DROP POLICY IF EXISTS outcome_mappings_admin_write
  ON public.outcome_mappings;
DROP POLICY IF EXISTS outcome_mappings_coordinator_write
  ON public.outcome_mappings;
DROP POLICY IF EXISTS outcome_mappings_teacher_write
  ON public.outcome_mappings;

DROP POLICY IF EXISTS outcome_mappings_coordinator_insert
  ON public.outcome_mappings;
DROP POLICY IF EXISTS outcome_mappings_coordinator_update
  ON public.outcome_mappings;
DROP POLICY IF EXISTS outcome_mappings_coordinator_delete
  ON public.outcome_mappings;
DROP POLICY IF EXISTS outcome_mappings_teacher_insert
  ON public.outcome_mappings;
DROP POLICY IF EXISTS outcome_mappings_teacher_update
  ON public.outcome_mappings;
DROP POLICY IF EXISTS outcome_mappings_teacher_delete
  ON public.outcome_mappings;

CREATE POLICY outcome_mappings_institution_read
ON public.outcome_mappings FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.learning_outcomes AS source_outcome
    JOIN public.learning_outcomes AS target_outcome
      ON target_outcome.id = outcome_mappings.target_outcome_id
    WHERE source_outcome.id = outcome_mappings.source_outcome_id
      AND source_outcome.institution_id = (SELECT public.auth_institution_id())
      AND target_outcome.institution_id = source_outcome.institution_id
  )
);

CREATE POLICY outcome_mappings_coordinator_insert
ON public.outcome_mappings FOR INSERT TO authenticated
WITH CHECK (
  (SELECT public.auth_user_role()) = 'coordinator'
  AND EXISTS (
    SELECT 1
    FROM public.learning_outcomes AS source_outcome
    JOIN public.learning_outcomes AS target_outcome
      ON target_outcome.id = outcome_mappings.target_outcome_id
    JOIN public.programs AS p ON p.id = target_outcome.program_id
    WHERE source_outcome.id = outcome_mappings.source_outcome_id
      AND source_outcome.type = 'ILO'
      AND target_outcome.type = 'PLO'
      AND source_outcome.institution_id = (SELECT public.auth_institution_id())
      AND target_outcome.institution_id = source_outcome.institution_id
      AND p.coordinator_id = (SELECT auth.uid())
  )
);

CREATE POLICY outcome_mappings_coordinator_update
ON public.outcome_mappings FOR UPDATE TO authenticated
USING (
  (SELECT public.auth_user_role()) = 'coordinator'
  AND EXISTS (
    SELECT 1
    FROM public.learning_outcomes AS source_outcome
    JOIN public.learning_outcomes AS target_outcome
      ON target_outcome.id = outcome_mappings.target_outcome_id
    JOIN public.programs AS p ON p.id = target_outcome.program_id
    WHERE source_outcome.id = outcome_mappings.source_outcome_id
      AND source_outcome.type = 'ILO'
      AND target_outcome.type = 'PLO'
      AND p.coordinator_id = (SELECT auth.uid())
  )
)
WITH CHECK (
  (SELECT public.auth_user_role()) = 'coordinator'
  AND EXISTS (
    SELECT 1
    FROM public.learning_outcomes AS source_outcome
    JOIN public.learning_outcomes AS target_outcome
      ON target_outcome.id = outcome_mappings.target_outcome_id
    JOIN public.programs AS p ON p.id = target_outcome.program_id
    WHERE source_outcome.id = outcome_mappings.source_outcome_id
      AND source_outcome.type = 'ILO'
      AND target_outcome.type = 'PLO'
      AND source_outcome.institution_id = (SELECT public.auth_institution_id())
      AND target_outcome.institution_id = source_outcome.institution_id
      AND p.coordinator_id = (SELECT auth.uid())
  )
);

CREATE POLICY outcome_mappings_coordinator_delete
ON public.outcome_mappings FOR DELETE TO authenticated
USING (
  (SELECT public.auth_user_role()) = 'coordinator'
  AND EXISTS (
    SELECT 1
    FROM public.learning_outcomes AS source_outcome
    JOIN public.learning_outcomes AS target_outcome
      ON target_outcome.id = outcome_mappings.target_outcome_id
    JOIN public.programs AS p ON p.id = target_outcome.program_id
    WHERE source_outcome.id = outcome_mappings.source_outcome_id
      AND source_outcome.type = 'ILO'
      AND target_outcome.type = 'PLO'
      AND p.coordinator_id = (SELECT auth.uid())
  )
);

CREATE POLICY outcome_mappings_teacher_insert
ON public.outcome_mappings FOR INSERT TO authenticated
WITH CHECK (
  (SELECT public.auth_user_role()) = 'teacher'
  AND EXISTS (
    SELECT 1
    FROM public.learning_outcomes AS source_outcome
    JOIN public.learning_outcomes AS target_outcome
      ON target_outcome.id = outcome_mappings.target_outcome_id
    JOIN public.courses AS c ON c.id = target_outcome.course_id
    WHERE source_outcome.id = outcome_mappings.source_outcome_id
      AND source_outcome.type = 'PLO'
      AND target_outcome.type = 'CLO'
      AND source_outcome.program_id = c.program_id
      AND source_outcome.institution_id = (SELECT public.auth_institution_id())
      AND target_outcome.institution_id = source_outcome.institution_id
      AND c.teacher_id = (SELECT auth.uid())
  )
);

CREATE POLICY outcome_mappings_teacher_update
ON public.outcome_mappings FOR UPDATE TO authenticated
USING (
  (SELECT public.auth_user_role()) = 'teacher'
  AND EXISTS (
    SELECT 1
    FROM public.learning_outcomes AS source_outcome
    JOIN public.learning_outcomes AS target_outcome
      ON target_outcome.id = outcome_mappings.target_outcome_id
    JOIN public.courses AS c ON c.id = target_outcome.course_id
    WHERE source_outcome.id = outcome_mappings.source_outcome_id
      AND source_outcome.type = 'PLO'
      AND target_outcome.type = 'CLO'
      AND source_outcome.program_id = c.program_id
      AND c.teacher_id = (SELECT auth.uid())
  )
)
WITH CHECK (
  (SELECT public.auth_user_role()) = 'teacher'
  AND EXISTS (
    SELECT 1
    FROM public.learning_outcomes AS source_outcome
    JOIN public.learning_outcomes AS target_outcome
      ON target_outcome.id = outcome_mappings.target_outcome_id
    JOIN public.courses AS c ON c.id = target_outcome.course_id
    WHERE source_outcome.id = outcome_mappings.source_outcome_id
      AND source_outcome.type = 'PLO'
      AND target_outcome.type = 'CLO'
      AND source_outcome.program_id = c.program_id
      AND source_outcome.institution_id = (SELECT public.auth_institution_id())
      AND target_outcome.institution_id = source_outcome.institution_id
      AND c.teacher_id = (SELECT auth.uid())
  )
);

CREATE POLICY outcome_mappings_teacher_delete
ON public.outcome_mappings FOR DELETE TO authenticated
USING (
  (SELECT public.auth_user_role()) = 'teacher'
  AND EXISTS (
    SELECT 1
    FROM public.learning_outcomes AS source_outcome
    JOIN public.learning_outcomes AS target_outcome
      ON target_outcome.id = outcome_mappings.target_outcome_id
    JOIN public.courses AS c ON c.id = target_outcome.course_id
    WHERE source_outcome.id = outcome_mappings.source_outcome_id
      AND source_outcome.type = 'PLO'
      AND target_outcome.type = 'CLO'
      AND source_outcome.program_id = c.program_id
      AND c.teacher_id = (SELECT auth.uid())
  )
);

DROP POLICY IF EXISTS sub_clos_select ON public.sub_clos;
DROP POLICY IF EXISTS sub_clos_manage ON public.sub_clos;
DROP POLICY IF EXISTS sub_clos_teacher_insert ON public.sub_clos;
DROP POLICY IF EXISTS sub_clos_teacher_update ON public.sub_clos;
DROP POLICY IF EXISTS sub_clos_teacher_delete ON public.sub_clos;

CREATE POLICY sub_clos_select
ON public.sub_clos FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.learning_outcomes AS clo
    WHERE clo.id = sub_clos.clo_id
      AND clo.type = 'CLO'
      AND clo.institution_id = (SELECT public.auth_institution_id())
  )
);

CREATE POLICY sub_clos_teacher_insert
ON public.sub_clos FOR INSERT TO authenticated
WITH CHECK (
  (SELECT public.auth_user_role()) = 'teacher'
  AND EXISTS (
    SELECT 1
    FROM public.learning_outcomes AS clo
    JOIN public.courses AS c ON c.id = clo.course_id
    WHERE clo.id = sub_clos.clo_id
      AND clo.type = 'CLO'
      AND clo.institution_id = (SELECT public.auth_institution_id())
      AND c.teacher_id = (SELECT auth.uid())
  )
);

CREATE POLICY sub_clos_teacher_update
ON public.sub_clos FOR UPDATE TO authenticated
USING (
  (SELECT public.auth_user_role()) = 'teacher'
  AND EXISTS (
    SELECT 1
    FROM public.learning_outcomes AS clo
    JOIN public.courses AS c ON c.id = clo.course_id
    WHERE clo.id = sub_clos.clo_id
      AND clo.type = 'CLO'
      AND c.teacher_id = (SELECT auth.uid())
  )
)
WITH CHECK (
  (SELECT public.auth_user_role()) = 'teacher'
  AND EXISTS (
    SELECT 1
    FROM public.learning_outcomes AS clo
    JOIN public.courses AS c ON c.id = clo.course_id
    WHERE clo.id = sub_clos.clo_id
      AND clo.type = 'CLO'
      AND clo.institution_id = (SELECT public.auth_institution_id())
      AND c.teacher_id = (SELECT auth.uid())
  )
);

CREATE POLICY sub_clos_teacher_delete
ON public.sub_clos FOR DELETE TO authenticated
USING (
  (SELECT public.auth_user_role()) = 'teacher'
  AND EXISTS (
    SELECT 1
    FROM public.learning_outcomes AS clo
    JOIN public.courses AS c ON c.id = clo.course_id
    WHERE clo.id = sub_clos.clo_id
      AND clo.type = 'CLO'
      AND c.teacher_id = (SELECT auth.uid())
  )
);

-- RLS policies do not grant table privileges. Make the governed API contract
-- explicit so a clean migration replay behaves the same as a linked project:
-- authenticated users reach the policies above, while trusted server-side
-- service-role clients retain their intended maintenance path.
GRANT SELECT, INSERT, UPDATE, DELETE
ON TABLE public.learning_outcomes, public.outcome_mappings, public.sub_clos
TO authenticated;

GRANT ALL PRIVILEGES
ON TABLE public.learning_outcomes, public.outcome_mappings, public.sub_clos
TO service_role;

-- ---------------------------------------------------------------------------
-- 5. Canonical grade evidence and attainment propagation
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.trigger_attainment_rollup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_student_id uuid;
  v_course_id uuid;
  v_assignment_id uuid;
  v_clo_weight record;
  v_avg_percent numeric;
  v_sample_count integer;
  v_plo_id uuid;
  v_ilo_id uuid;
  v_plo_percent numeric;
  v_plo_samples integer;
  v_ilo_percent numeric;
  v_ilo_samples integer;
  v_mapping record;
  v_att record;
  v_xp_rows integer := 0;
BEGIN
  SELECT s.student_id, s.assignment_id
  INTO v_student_id, v_assignment_id
  FROM public.submissions AS s
  WHERE s.id = NEW.submission_id;

  IF v_student_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT a.course_id
  INTO v_course_id
  FROM public.assignments AS a
  WHERE a.id = v_assignment_id;

  IF v_course_id IS NULL THEN
    RETURN NEW;
  END IF;

  FOR v_clo_weight IN
    SELECT
      (element.value->>'clo_id')::uuid AS clo_id,
      (element.value->>'weight')::numeric AS weight
    FROM public.assignments AS a
    CROSS JOIN LATERAL jsonb_array_elements(a.clo_weights) AS element(value)
    WHERE a.id = v_assignment_id
      AND jsonb_array_length(a.clo_weights) > 0
  LOOP
    v_plo_id := NULL;
    v_ilo_id := NULL;

    -- Evidence currently stores one denormalized PLO/ILO path. Choose the
    -- highest-weight parent deterministically while attainment still rolls up
    -- through every valid parent edge below.
    SELECT m.source_outcome_id
    INTO v_plo_id
    FROM public.outcome_mappings AS m
    JOIN public.learning_outcomes AS parent_plo
      ON parent_plo.id = m.source_outcome_id
     AND parent_plo.type = 'PLO'
    WHERE m.target_outcome_id = v_clo_weight.clo_id
    ORDER BY m.weight DESC, m.source_outcome_id
    LIMIT 1;

    IF v_plo_id IS NOT NULL THEN
      SELECT m.source_outcome_id
      INTO v_ilo_id
      FROM public.outcome_mappings AS m
      JOIN public.learning_outcomes AS parent_ilo
        ON parent_ilo.id = m.source_outcome_id
       AND parent_ilo.type = 'ILO'
      WHERE m.target_outcome_id = v_plo_id
      ORDER BY m.weight DESC, m.source_outcome_id
      LIMIT 1;
    END IF;

    IF v_plo_id IS NULL OR v_ilo_id IS NULL THEN
      RAISE WARNING
        'Skipping attainment for unmapped CLO %: canonical PLO/ILO path is incomplete',
        v_clo_weight.clo_id;
      CONTINUE;
    END IF;

    INSERT INTO public.evidence (
      student_id,
      submission_id,
      grade_id,
      clo_id,
      plo_id,
      ilo_id,
      score_percent,
      attainment_level
    )
    VALUES (
      v_student_id,
      NEW.submission_id,
      NEW.id,
      v_clo_weight.clo_id,
      v_plo_id,
      v_ilo_id,
      NEW.score_percent,
      CASE
        WHEN NEW.score_percent >= 85 THEN 'excellent'::public.attainment_level
        WHEN NEW.score_percent >= 70 THEN 'satisfactory'::public.attainment_level
        WHEN NEW.score_percent >= 50 THEN 'developing'::public.attainment_level
        ELSE 'not_yet'::public.attainment_level
      END
    )
    ON CONFLICT DO NOTHING;

    SELECT avg(e.score_percent), count(*)
    INTO v_avg_percent, v_sample_count
    FROM public.evidence AS e
    WHERE e.student_id = v_student_id
      AND e.clo_id = v_clo_weight.clo_id;

    IF v_avg_percent IS NOT NULL THEN
      INSERT INTO public.outcome_attainment (
        outcome_id,
        student_id,
        course_id,
        scope,
        attainment_percent,
        sample_count,
        last_calculated_at
      )
      VALUES (
        v_clo_weight.clo_id,
        v_student_id,
        v_course_id,
        'student_course',
        round(v_avg_percent, 2),
        v_sample_count,
        now()
      )
      ON CONFLICT (
        outcome_id,
        COALESCE(student_id, '00000000-0000-0000-0000-000000000000'::uuid),
        COALESCE(course_id, '00000000-0000-0000-0000-000000000000'::uuid),
        scope
      )
      DO UPDATE SET
        attainment_percent = round(v_avg_percent, 2),
        sample_count = v_sample_count,
        last_calculated_at = now();
    END IF;

    FOR v_mapping IN
      SELECT m.source_outcome_id
      FROM public.outcome_mappings AS m
      WHERE m.target_outcome_id = v_clo_weight.clo_id
    LOOP
      v_plo_id := v_mapping.source_outcome_id;

      SELECT
        sum(oa.attainment_percent * m.weight) / nullif(sum(m.weight), 0),
        sum(oa.sample_count)
      INTO v_plo_percent, v_plo_samples
      FROM public.outcome_mappings AS m
      JOIN public.outcome_attainment AS oa
        ON oa.outcome_id = m.target_outcome_id
       AND oa.student_id = v_student_id
       AND oa.scope = 'student_course'
      WHERE m.source_outcome_id = v_plo_id;

      IF v_plo_percent IS NOT NULL THEN
        INSERT INTO public.outcome_attainment (
          outcome_id,
          student_id,
          course_id,
          scope,
          attainment_percent,
          sample_count,
          last_calculated_at
        )
        VALUES (
          v_plo_id,
          v_student_id,
          v_course_id,
          'course',
          round(v_plo_percent, 2),
          COALESCE(v_plo_samples, 0),
          now()
        )
        ON CONFLICT (
          outcome_id,
          COALESCE(student_id, '00000000-0000-0000-0000-000000000000'::uuid),
          COALESCE(course_id, '00000000-0000-0000-0000-000000000000'::uuid),
          scope
        )
        DO UPDATE SET
          attainment_percent = round(v_plo_percent, 2),
          sample_count = COALESCE(v_plo_samples, 0),
          last_calculated_at = now();
      END IF;

      FOR v_att IN
        SELECT m.source_outcome_id
        FROM public.outcome_mappings AS m
        WHERE m.target_outcome_id = v_plo_id
      LOOP
        v_ilo_id := v_att.source_outcome_id;

        SELECT
          sum(oa.attainment_percent * m.weight) / nullif(sum(m.weight), 0),
          sum(oa.sample_count)
        INTO v_ilo_percent, v_ilo_samples
        FROM public.outcome_mappings AS m
        JOIN public.outcome_attainment AS oa
          ON oa.outcome_id = m.target_outcome_id
         AND oa.student_id = v_student_id
         AND oa.scope = 'course'
        WHERE m.source_outcome_id = v_ilo_id;

        IF v_ilo_percent IS NOT NULL THEN
          INSERT INTO public.outcome_attainment (
            outcome_id,
            student_id,
            course_id,
            scope,
            attainment_percent,
            sample_count,
            last_calculated_at
          )
          VALUES (
            v_ilo_id,
            v_student_id,
            v_course_id,
            'program',
            round(v_ilo_percent, 2),
            COALESCE(v_ilo_samples, 0),
            now()
          )
          ON CONFLICT (
            outcome_id,
            COALESCE(student_id, '00000000-0000-0000-0000-000000000000'::uuid),
            COALESCE(course_id, '00000000-0000-0000-0000-000000000000'::uuid),
            scope
          )
          DO UPDATE SET
            attainment_percent = round(v_ilo_percent, 2),
            sample_count = COALESCE(v_ilo_samples, 0),
            last_calculated_at = now();
        END IF;
      END LOOP;
    END LOOP;
  END LOOP;

  INSERT INTO public.xp_transactions (
    student_id,
    xp_amount,
    source,
    reference_id,
    scope,
    base_xp,
    final_xp,
    multipliers,
    note
  )
  VALUES (
    v_student_id,
    15,
    'grade',
    NEW.id::text,
    'individual',
    15,
    15,
    '{}'::jsonb,
    'Grade released XP'
  )
  ON CONFLICT DO NOTHING;

  GET DIAGNOSTICS v_xp_rows = ROW_COUNT;

  IF v_xp_rows > 0 THEN
    UPDATE public.student_gamification
    SET
      xp_total = COALESCE(xp_total, 0) + 15,
      level = public.calculate_level_from_xp(
        (COALESCE(xp_total, 0) + 15)::bigint
      )
    WHERE student_id = v_student_id;

    UPDATE public.submissions
    SET status = 'graded'
    WHERE id = NEW.submission_id;
  END IF;

  BEGIN
    PERFORM public.emit_notification(
      v_student_id,
      'grade_released',
      'Grade Released',
      'Your assignment has been graded',
      jsonb_build_object(
        'grade_id', NEW.id,
        'score_percent', NEW.score_percent
      ),
      'grade_rollup:' || NEW.id::text
    );
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'trigger_attainment_rollup: %', SQLERRM;
  RETURN NEW;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.trigger_attainment_rollup()
  FROM PUBLIC, anon, authenticated;

COMMENT ON FUNCTION public.trigger_attainment_rollup() IS
  'Grade trigger: writes evidence and rolls CLO attainment through canonical parent->child mappings to PLO and ILO while preserving idempotent grade XP and notification behavior.';
