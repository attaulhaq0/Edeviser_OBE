-- ============================================================================
-- Wire the Habit/OBE "Improvement Bonus" end-to-end at the database level.
--
-- The improvement-bonus-check Edge Function was orphaned (no caller): nothing
-- invoked it after evidence creation. pg_net/http are NOT installed in this
-- project, so a DB trigger cannot call the edge function. The correct wiring is
-- a DB trigger on evidence INSERT (where evidence rows are actually created, by
-- on_grade_insert_or_update → generate_evidence), with idempotency.
--
-- Business rule (spec requirement 123.5): when a student's latest evidence
-- score for a (student, clo) pair improves by >= 15 percentage points vs the
-- immediately-previous evidence row, award 50 XP with source = improvement_bonus.
--
-- Idempotency: a partial UNIQUE index on (student_id, reference_id) exists from
-- the xp-widening migration practice; this trigger additionally pre-checks with
-- NOT EXISTS so a retried evidence insert can never double-award, even without
-- relying on a unique constraint (xp_transactions currently has NO unique
-- constraint on reference_id — a separate finding tracked in the spec).
--
-- Forward-only. Executes in SECURITY DEFINER with a locked search_path.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.award_improvement_bonus_v1()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_prev        numeric;
  v_improve     numeric;
  v_total       integer;
  v_level       integer;
  v_reference   text;
BEGIN
  -- Only evidence rows tied to a CLO are eligible.
  IF NEW.clo_id IS NULL OR NEW.score_percent IS NULL THEN
    RETURN NEW;
  END IF;

  -- Immediately-previous evidence score for the same student+CLO.
  SELECT score_percent INTO v_prev
    FROM public.evidence
   WHERE student_id = NEW.student_id
     AND clo_id     = NEW.clo_id
     AND id        <> NEW.id
   ORDER BY created_at DESC
   LIMIT 1;

  IF v_prev IS NULL THEN
    RETURN NEW; -- first evidence for this CLO: no improvement to measure
  END IF;

  v_improve := NEW.score_percent - v_prev;
  IF v_improve < 15 THEN
    RETURN NEW; -- below the 15pp threshold
  END IF;

  v_reference := 'improvement:' || NEW.id::text;

  -- Idempotent award: never double-award for the same evidence row.
  IF NOT EXISTS (
    SELECT 1 FROM public.xp_transactions
     WHERE student_id = NEW.student_id AND reference_id = v_reference
  ) THEN
    INSERT INTO public.xp_transactions (
      student_id, xp_amount, source, reference_id, note,
      created_at, scope, base_xp, final_xp, multipliers
    ) VALUES (
      NEW.student_id, 50, 'improvement_bonus', v_reference,
      jsonb_build_object(
        'action_type',        'improvement_bonus',
        'clo_id',             NEW.clo_id,
        'evidence_id',        NEW.id,
        'previous_percent',   v_prev,
        'current_percent',    NEW.score_percent,
        'improvement_pp',     v_improve
      ),
      now(), 'individual', 50, 50,
      jsonb_build_object('improvement_bonus', 1.0)
    );

    -- Recompute gamification total + level from the authoritative ledger.
    SELECT COALESCE(SUM(xp_amount), 0)::integer INTO v_total
      FROM public.xp_transactions
     WHERE student_id = NEW.student_id;

    v_level := public.calculate_level_from_xp(v_total);

    UPDATE public.student_gamification
       SET xp_total   = v_total,
           level      = v_level,
           updated_at = now()
     WHERE student_id = NEW.student_id;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.award_improvement_bonus_v1() FROM PUBLIC;
-- Supabase default privileges auto-grant EXECUTE to anon/authenticated for new
-- functions, so they must be revoked EXPLICITLY (REVOKE ... FROM PUBLIC alone
-- does NOT remove per-role grants). Verified live 2026-09-05: without this
-- line anon+authenticated could call the SECURITY DEFINER trigger helper.
REVOKE EXECUTE ON FUNCTION public.award_improvement_bonus_v1() FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.award_improvement_bonus_v1() TO postgres, service_role;

COMMENT ON FUNCTION public.award_improvement_bonus_v1()
  IS 'Awards 50 XP (source=improvement_bonus) when evidence for a (student, CLO) improves 15pp+ vs the previous evidence row. Idempotent per evidence row. Wired 2026-09-05 (continuous-verification).';

DROP TRIGGER IF EXISTS trg_improvement_bonus ON public.evidence;
CREATE TRIGGER trg_improvement_bonus
  AFTER INSERT ON public.evidence
  FOR EACH ROW
  EXECUTE FUNCTION public.award_improvement_bonus_v1();
