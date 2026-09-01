-- Replay-integrity reconciliation (deferral ledger #278: migration-drift policy;
-- GitHub-integration MIGRATIONS_FAILED investigation 2026-09-01).
--
-- A prior hardening migration revoked table DML across the public schema
-- without re-granting it, so a FRESH replay of the migration set produces a
-- database where anon/authenticated/service_role have no DML on most tables.
-- The live production database does NOT have that state (verified live
-- 2026-09-01 via MCP information_schema.role_table_grants): it follows the
-- Supabase-default posture (full DML to all three roles; RLS policies perform
-- the real access control) with a small set of intentional per-table
-- restrictions on sensitive system tables.
--
-- This migration restores the default posture for every public base table and
-- then re-asserts the intentional restrictions mirrored 1:1 from live:
--   - 28 table:role pairs with NO DML
--   - 2 pairs kept SELECT-only (course_material_embeddings, student_learning_states
--     for authenticated)
--
-- Idempotent: on live every statement is a no-op re-grant/re-assert; on fresh
-- replays it heals the drift. Forward-only; no destructive change.

DO $$
DECLARE
  t record;
BEGIN
  FOR t IN
    SELECT tablename FROM pg_tables WHERE schemaname = 'public'
  LOOP
    EXECUTE format(
      'GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO anon, authenticated, service_role',
      t.tablename
    );
  END LOOP;
END $$;

-- ─── Intentional restrictions (mirror of live grant state) ──────────────────

REVOKE ALL ON public.accreditation_generated_reports FROM anon;
REVOKE ALL ON public.accreditation_report_jobs FROM anon;
REVOKE ALL ON public.admin_bootstrap_requests FROM anon;
REVOKE ALL ON public.admin_bootstrap_requests FROM authenticated;
REVOKE ALL ON public.agent_action_executions FROM anon;
REVOKE ALL ON public.agent_action_executions FROM authenticated;
REVOKE ALL ON public.agent_action_proposals FROM anon;
REVOKE ALL ON public.agent_action_proposals FROM authenticated;
REVOKE ALL ON public.agent_runs FROM anon;
REVOKE ALL ON public.agent_runs FROM authenticated;
REVOKE ALL ON public.agent_tool_attempts FROM anon;
REVOKE ALL ON public.agent_tool_attempts FROM authenticated;
REVOKE ALL ON public.ai_governance_policies FROM anon;
REVOKE ALL ON public.connected_integrations FROM anon;
REVOKE ALL ON public.course_material_embeddings FROM anon;
REVOKE ALL ON public.cqi_action_plan_measurements FROM anon;
REVOKE ALL ON public.cqi_action_plan_measurements FROM authenticated;
REVOKE ALL ON public.cqi_systemic_patterns FROM anon;
REVOKE ALL ON public.cqi_systemic_patterns FROM authenticated;
REVOKE ALL ON public.email_deliveries FROM anon;
REVOKE ALL ON public.email_deliveries FROM authenticated;
REVOKE ALL ON public.email_delivery_events FROM anon;
REVOKE ALL ON public.email_delivery_events FROM authenticated;
REVOKE ALL ON public.intervention_measurements FROM anon;
REVOKE ALL ON public.proactive_agent_jobs FROM anon;
REVOKE ALL ON public.proactive_agent_jobs FROM authenticated;
REVOKE ALL ON public.student_learning_states FROM anon;

REVOKE INSERT, UPDATE, DELETE ON public.course_material_embeddings FROM authenticated;
GRANT SELECT ON public.course_material_embeddings TO authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.student_learning_states FROM authenticated;
GRANT SELECT ON public.student_learning_states TO authenticated;
