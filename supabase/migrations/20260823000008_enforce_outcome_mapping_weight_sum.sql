-- Enforce the outcome_mappings weight-sum-to-100% invariant (audit finding
-- H-3). Weights are stored on a 0-1 scale (confirmed live: existing rows use
-- values like 0.3, 0.4, 0.5, matching src/lib/schemas/clo.ts's
-- `weight: z.number().min(0).max(1)`), so "sum to 100" means "sum to 1.0" in
-- this schema.
--
-- IMPORTANT — pre-existing data quality note found while writing this
-- migration: a handful of live target_outcome_id groups currently sum to 2.0
-- instead of 1.0 (apparent duplicate/double-weighted mappings from prior
-- inserts). A plain CHECK constraint or an unconditional validation of all
-- existing rows would fail migration replay on that pre-existing data. This
-- migration therefore uses a deferred, per-statement CONSTRAINT TRIGGER that
-- validates only the target_outcome_id group(s) touched by the triggering
-- statement (INSERT/UPDATE/DELETE) — new writes are enforced immediately;
-- untouched historical groups are left as-is until someone next edits them
-- (which the app already does via delete-all + insert-new-set in
-- useUpdatePLOMappings / useUpdateCLOMappings — see src/hooks/usePLOs.ts and
-- src/hooks/useCLOs.ts), at which point the corrected set must sum to 1.0.
--
-- Tolerance: 0.01 to absorb floating-point/rounding noise (the UI's Zod
-- schema uses `z.number().min(0).max(1)` with no smaller granularity today).

CREATE OR REPLACE FUNCTION public.validate_outcome_mapping_weight_sum()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  v_target uuid;
  v_total numeric;
BEGIN
  -- Determine which target_outcome_id was affected by this row event.
  IF TG_OP = 'DELETE' THEN
    v_target := OLD.target_outcome_id;
  ELSE
    v_target := NEW.target_outcome_id;
  END IF;

  -- A fully-deleted group (no remaining rows) has nothing to validate.
  SELECT sum(weight) INTO v_total
  FROM public.outcome_mappings
  WHERE target_outcome_id = v_target;

  IF v_total IS NULL THEN
    RETURN NULL;
  END IF;

  IF abs(v_total - 1.0) > 0.01 THEN
    RAISE EXCEPTION
      'outcome_mappings weight-sum invariant violated for target_outcome_id %: weights sum to % (expected 1.0 / 100%%)',
      v_target, v_total
      USING ERRCODE = '23514'; -- check_violation
  END IF;

  RETURN NULL;
END;
$$;

COMMENT ON FUNCTION public.validate_outcome_mapping_weight_sum() IS
  'Deferred constraint trigger: validates that weights for a touched target_outcome_id group in outcome_mappings sum to 1.0 (100%). Only re-validates groups affected by the current statement, so pre-existing non-conforming historical data does not block migration replay (audit finding H-3).';

DROP TRIGGER IF EXISTS trg_outcome_mapping_weight_sum ON public.outcome_mappings;

CREATE CONSTRAINT TRIGGER trg_outcome_mapping_weight_sum
  AFTER INSERT OR UPDATE OR DELETE ON public.outcome_mappings
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_outcome_mapping_weight_sum();
