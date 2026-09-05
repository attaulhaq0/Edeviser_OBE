-- lock_mv_historical_evidence_select
--
-- SECURITY: `mv_historical_evidence` is a materialized view aggregating
-- cross-institution OBE attainment (semesters x outcome type x Bloom level x
-- counts/avg). It had no RLS, no `security_invoker` semantics (materialized
-- views store their own rows, so source-table RLS does not apply), and an ACL
-- granting SELECT to `anon` + `authenticated` — contradicting the admin-gated
-- `get_historical_evidence(p_outcome_type, p_blooms_level)` SECURITY DEFINER
-- function whose comment claims the rollup "is no longer directly selectable
-- from the API".
--
-- Fix: revoke direct SELECT from anon + authenticated. postgres (owner) and
-- service_role retain SELECT for the refresher, the gated definer function,
-- and the admin Historical Evidence dashboard (which reads via the function).
--
-- Verified safe: no src/ client queries the MV directly (grep 2026-09-05);
-- the only consumer is `get_historical_evidence` (SECURITY DEFINER, owner
-- context) and the admin page that calls it.
-- Regression coverage: src/__tests__/integration-rls/mvHistoricalEvidence.rls.test.ts

REVOKE SELECT ON public.mv_historical_evidence FROM anon;
REVOKE SELECT ON public.mv_historical_evidence FROM authenticated;
