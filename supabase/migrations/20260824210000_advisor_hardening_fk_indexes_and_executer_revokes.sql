-- Advisor remediation (security + performance), verified against the live project
-- via MCP introspection on 2026-08-24:
--
-- 1. PERFORMANCE `unindexed_foreign_keys` (78 FKs): creates a covering index for
--    every public FK constraint that no existing index prefixes. Computed
--    dynamically so the migration stays replay-safe and self-maintaining.
-- 2. SECURITY `authenticated_security_definer_function_executable` (WARN):
--    revokes EXECUTE from `anon`/`authenticated` (and PUBLIC, re-granting
--    service_role) for SECURITY DEFINER functions that are (a) referenced by no
--    RLS policy and (b) have no client-side caller (src/ or anon-key Edge
--    Function callers were cross-checked by name before inclusion). Notable
--    hardening: execute_approved_* proposal executors can no longer be invoked
--    directly by end users, bypassing orchestrator revalidation.
--    Client-facing functions deliberately KEPT callable: send_teacher_nudge,
--    fan_out_announcement_notifications, get_*_dashboard/workspace/analytics,
--    get_leaderboard_page, get_historical_evidence, get_my_proactive_intelligence_v1,
--    get_coordinator_accreditation_readiness, get_coordinator_cqi_patterns_v1,
--    send_friend_request, respond_friend_request, preview_invitation (anon flow).
-- 3. `rls_enabled_no_policy` (INFO) is INTENTIONAL for job-managed tables
--    (agent_runs, agent_tool_attempts, ...): RLS enabled + zero policies means
--    deny-all for client roles; writes happen via service_role only. No change.

-- ---------------------------------------------------------------------------
-- 1. Covering indexes for unindexed foreign keys
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  fk record;
  idx_cols text;
  idx_name text;
BEGIN
  FOR fk IN
    SELECT con.oid AS conoid, con.conrelid AS relid, c.relname AS table_name, con.conkey
    FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND con.contype = 'f'
      AND NOT EXISTS (
        SELECT 1
        FROM pg_index i
        WHERE i.indrelid = con.conrelid
          AND (SELECT array_agg(v::int2 ORDER BY ord)
               FROM unnest(string_to_array(i.indkey::text, ' ')) WITH ORDINALITY AS t(v, ord))
              @> (SELECT array_agg(DISTINCT v::int2)
                  FROM unnest(string_to_array(translate(con.conkey::text, '{}', ''), ',')) AS t(v))
      )
  LOOP
    SELECT string_agg(att.attname, ', ' ORDER BY k.ord)
      INTO idx_cols
      FROM unnest(string_to_array(translate(fk.conkey::text, '{}', ''), ',')) WITH ORDINALITY AS k(attnum_str, ord)
      JOIN pg_attribute att
        ON att.attrelid = fk.relid AND att.attnum = k.attnum_str::int2;

    IF idx_cols IS NULL THEN
      CONTINUE;
    END IF;

    idx_name := 'idx_' || fk.table_name || '_' || replace(idx_cols, ', ', '_');
    EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON public.%I (%s)', idx_name, fk.table_name, idx_cols);
  END LOOP;
END
$$;

-- ---------------------------------------------------------------------------
-- 2. Close direct RPC access to internal SECURITY DEFINER functions
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  fname text;
  fn record;
  targets text[] := ARRAY[
    'admin_update_parent_link',
    'badge_auto_archive',
    'badge_spotlight_auto_rotate',
    'capture_active_semester_snapshots',
    'check_rate_limit_approaching',
    'claim_due_intervention_measurements_v1',
    'claim_proactive_agent_jobs_v1',
    'complete_intervention_evaluation_v1',
    'complete_proactive_agent_job_v1',
    'consume_invitation',
    'create_invitation',
    'create_parent_link_invitation',
    'delete_course_material_embeddings_on_material_delete',
    'delete_department_if_no_programs',
    'emit_notification',
    'enforce_parent_link_same_institution',
    'enqueue_intervention_generation_jobs_v1',
    'enqueue_proactive_agent_jobs_v1',
    'execute_approved_agent_personal_action_v1',
    'execute_approved_cqi_action_v1',
    'fail_intervention_evaluation_v1',
    'fail_proactive_agent_job_v1',
    'finalize_invitation_acceptance',
    'fn_track_habit_level_change',
    'get_admin_cqi_effectiveness_v1',
    'get_badge_spotlight',
    'get_earn_spend_ratio',
    'get_invitation_by_token',
    'get_student_learning_state_v1',
    'get_wellness_aggregate_stats',
    'handle_new_user',
    'increment_team_xp',
    'is_pgcron_available',
    'keepwarm_dashboards',
    'link_existing_parent',
    'mark_invitation_sent',
    'measure_cqi_action_plan_v1',
    'measure_intervention_v1',
    'portfolio_public_access',
    'prevent_profile_privilege_escalation',
    'prevent_profile_privilege_mutation',
    'prevent_xp_purchases_financial_mutation',
    'preview_invitation_by_hash',
    'recalculate_dynamic_prices',
    'recalculate_league_tiers',
    'reconcile_student_learning_state_measurements_v1',
    'refresh_learning_state_after_intervention_measurement_v1',
    'refresh_mv_historical_evidence',
    'refresh_student_learning_state_v1',
    'register_intervention_measurement_v1',
    'replace_course_material_embeddings_v2',
    'replace_course_material_embeddings_v3',
    'rls_auto_enable',
    'set_audit_log_institution',
    'student_learning_state_needs_refresh_v1',
    'sync_learning_state_measurements_v1',
    'trg_badge_earned_notify',
    'trg_grade_released_notify',
    'trg_new_assignment_notify',
    'trg_outcome_attainment_drop_notify',
    'trg_pending_approval_notify',
    'trigger_attainment_rollup',
    'validate_audit_log_actor',
    'validate_course_material_embedding_metadata'
  ];
BEGIN
  FOREACH fname IN ARRAY targets LOOP
    FOR fn IN
      SELECT p.oid,
             pg_get_function_identity_arguments(p.oid) AS args
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public'
        AND p.proname = fname
    LOOP
      EXECUTE format('REVOKE EXECUTE ON FUNCTION public.%I(%s) FROM PUBLIC', fname, fn.args);
      EXECUTE format('REVOKE EXECUTE ON FUNCTION public.%I(%s) FROM anon, authenticated', fname, fn.args);
      EXECUTE format('GRANT EXECUTE ON FUNCTION public.%I(%s) TO service_role', fname, fn.args);
    END LOOP;
  END LOOP;
END
$$;