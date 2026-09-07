// Migration duplicate base-name guard.
//
// WHY THIS EXISTS (root-cause guard for the "stripped hardening / regressed definition"
// class):
// A Supabase migration filename is `<timestamp>_<base-name>.sql`. When the SAME base-name
// is re-introduced at a LATER timestamp, the later file wins on a fresh replay (Supabase
// Preview / clean rebuild / DR restore). If that later copy carries an OLDER or less-correct
// body (e.g. a `CREATE OR REPLACE FUNCTION` that dropped `SET search_path`), the rebuilt
// database silently regresses even though production — built incrementally — is fine. This
// is the structural root cause behind the CLASS A / CLASS H search_path regressions:
// duplicate-named cron/guard migrations (`badge_archive_cron`, `badge_spotlight_rotate_cron`,
// `conditional_pgcron_guard`) were re-added later with unhardened bodies.
//
// We cannot safely delete or rename the EXISTING duplicates: they are already recorded in
// production's `supabase_migrations.schema_migrations` ledger, and reordering applied history
// desyncs the ledger and breaks `supabase db push` / `migration repair` (see the
// migration-replay-integrity steering). So this guard GRANDFATHERS the known, reviewed
// duplicates (each justified below) and FAILS on any NEW duplicate base-name — preventing
// the root cause from ever recurring while leaving applied history untouched.
//
// The companion `check-migration-replay-order.mjs` separately proves that the replay-winning
// copy of each grandfathered duplicate is correct (CLEAN ordering + no stripped search_path).
//
// Usage:  node scripts/check-migration-duplicate-names.mjs
// Exit 0 = clean (no duplicates, or all duplicates are grandfathered).
// Exit 1 = a NEW (non-allowlisted) duplicate base-name was found.

import { readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = join(__dirname, "..", "supabase", "migrations");

/**
 * Grandfathered duplicate base-names: base-name -> exact set of allowed filenames.
 *
 * These are KNOWN, REVIEWED duplicates that already exist in applied production history.
 * The replay-winning (greatest-timestamp) copy of each has been verified correct by
 * `check-migration-replay-order.mjs` (CLEAN ordering + no stripped search_path hardening).
 * Do NOT add to this list to silence a NEW collision — instead, give the new migration a
 * unique base-name. This list should only ever shrink (never grow).
 */
const GRANDFATHERED = {
  // Re-assertion of FK indexes after the tutor_* tables exist (replay-safe, idempotent).
  add_missing_fk_indexes: [
    "20260504033325_add_missing_fk_indexes.sql",
    "20260520064038_add_missing_fk_indexes.sql",
  ],
  // Parent-RLS reconciliation: 20260821* re-asserts the 20260609* originals in final form.
  add_parent_assignments_read_rls: [
    "20260609072124_add_parent_assignments_read_rls.sql",
    "20260821000003_add_parent_assignments_read_rls.sql",
  ],
  add_parent_course_access_rls: [
    "20260609070906_add_parent_course_access_rls.sql",
    "20260821000000_add_parent_course_access_rls.sql",
  ],
  // Early duplicate column-add (idempotent ADD COLUMN IF NOT EXISTS).
  add_team_formation_mode_to_courses: [
    "20260415071239_add_team_formation_mode_to_courses.sql",
    "20260502102536_add_team_formation_mode_to_courses.sql",
  ],
  // Cron/guard re-introductions — the LATER copy is now search_path-hardened (CLASS H fix).
  badge_archive_cron: [
    "20260504032900_badge_archive_cron.sql",
    "20260720000008_badge_archive_cron.sql",
  ],
  badge_spotlight_rotate_cron: [
    "20260504032800_badge_spotlight_rotate_cron.sql",
    "20260720000007_badge_spotlight_rotate_cron.sql",
  ],
  challenge_participants_student_self_join: [
    "20260609071106_challenge_participants_student_self_join.sql",
    "20260821000002_challenge_participants_student_self_join.sql",
  ],
  conditional_pgcron_guard: [
    "20260504032700_conditional_pgcron_guard.sql",
    "20260615000001_conditional_pgcron_guard.sql",
  ],
  fix_parent_rls_recursion_use_helper: [
    "20260609073304_fix_parent_rls_recursion_use_helper.sql",
    "20260821000004_fix_parent_rls_recursion_use_helper.sql",
  ],
  grade_trigger_level_recompute_and_graded_status: [
    "20260609070957_grade_trigger_level_recompute_and_graded_status.sql",
    "20260821000001_grade_trigger_level_recompute_and_graded_status.sql",
  ],
  seed_default_marketplace_items: [
    "20260412192106_seed_default_marketplace_items.sql",
    "20260503100012_seed_default_marketplace_items.sql",
  ],

  // ── MCP reconciliation pairs (2026-09-07) ─────────────────────────────────
  // The 2026-09-07 migration-history reconciliation aligned local files with
  // the platform's `supabase_migrations.schema_migrations` ledger. Each pair
  // below is TWO genuinely applied ledger versions sharing one base-name:
  // the earlier version is the authored migration file; the later version was
  // applied via MCP/Dashboard and its local parity file is a COMMENT-ONLY
  // stub (no statements — replay-safe, later file wins as a no-op). Every
  // pair was verified against the LIVE ledger on 2026-09-07 (both versions
  // present, distinct versions, same name), and
  // `check-migration-replay-order.mjs` reports CLEAN (482 migrations, no
  // too-early references, no stripped search_path). Do NOT add further
  // entries except for the same verified applied-history situation.
  adaptive_scoring_foundation: [
    "20260906173000_adaptive_scoring_foundation.sql",
    "20260907083954_adaptive_scoring_foundation.sql",
  ],
  agent_feedback_run_tenant_fk: [
    "20260901000002_agent_feedback_run_tenant_fk.sql",
    "20260901101937_agent_feedback_run_tenant_fk.sql",
  ],
  agent_worker_cron: [
    "20260906172000_agent_worker_cron.sql",
    "20260907123915_agent_worker_cron.sql",
  ],
  attendance_summary_view_and_record_rpc: [
    "20260902160000_attendance_summary_view_and_record_rpc.sql",
    "20260902201542_attendance_summary_view_and_record_rpc.sql",
  ],
  db_level_qa_hardening_constraints: [
    "20260902200000_db_level_qa_hardening_constraints.sql",
    "20260902224817_db_level_qa_hardening_constraints.sql",
  ],
  grades_ai_edited_by_teacher: [
    "20260902131009_grades_ai_edited_by_teacher.sql",
    "20260902153138_grades_ai_edited_by_teacher.sql",
  ],
  learning_interventions_teacher_write_policies: [
    "20260902180000_learning_interventions_teacher_write_policies.sql",
    "20260902223538_learning_interventions_teacher_write_policies.sql",
  ],
  lock_mv_historical_evidence_select: [
    "20260905205526_lock_mv_historical_evidence_select.sql",
    "20260905205552_lock_mv_historical_evidence_select.sql",
  ],
  question_usage_stats_view: [
    "20260902150000_question_usage_stats_view.sql",
    "20260902171908_question_usage_stats_view.sql",
  ],
  reconcile_table_grants: [
    "20260901181637_reconcile_table_grants.sql",
    "20260902000005_reconcile_table_grants.sql",
  ],
  respond_teacher_handoff_rpc: [
    "20260902210000_respond_teacher_handoff_rpc.sql",
    "20260903082607_respond_teacher_handoff_rpc.sql",
  ],
  rubrics_created_by_default_auth_uid: [
    "20260901232509_rubrics_created_by_default_auth_uid.sql",
    "20260902090000_rubrics_created_by_default_auth_uid.sql",
  ],
  scope_coordinator_analytics: [
    "20260906174100_scope_coordinator_analytics.sql",
    "20260906202523_scope_coordinator_analytics.sql",
  ],
  send_teacher_nudge_records_intervention: [
    "20260902190000_send_teacher_nudge_records_intervention.sql",
    "20260902223712_send_teacher_nudge_records_intervention.sql",
  ],
  sub_clo_weight_code: [
    "20260902170000_sub_clo_weight_code.sql",
    "20260902222032_sub_clo_weight_code.sql",
  ],
  // The 11 `*_applied_via_dashboard.sql` parity stubs from that pass were
  // misnamed; they were RENAMED (git mv, content unchanged) to the real
  // ledger names on 2026-09-07. This surfaced the 10 additional pairs below —
  // each also live-ledger-verified (both versions applied, same name).
  // Do NOT add further entries except for the same verified applied-history
  // situation.
  advisor_hardening_fk_indexes_and_executer_revokes: [
    "20260824185310_advisor_hardening_fk_indexes_and_executer_revokes.sql",
    "20260824210000_advisor_hardening_fk_indexes_and_executer_revokes.sql",
  ],
  advisor_hardening_fk_indexes_fix: [
    "20260824185752_advisor_hardening_fk_indexes_fix.sql",
    "20260824210001_advisor_hardening_fk_indexes_fix.sql",
  ],
  agent_evaluation_schedule_timeout: [
    "20260825142502_agent_evaluation_schedule_timeout.sql",
    "20260902000003_agent_evaluation_schedule_timeout.sql",
  ],
  agentic_platform_tables: [
    "20260823125015_agentic_platform_tables.sql",
    "20260831000002_agentic_platform_tables.sql",
  ],
  create_intervention_loop_jobs: [
    "20260824125704_create_intervention_loop_jobs.sql",
    "20260901000001_create_intervention_loop_jobs.sql",
  ],
  cron_secrets_and_agent_evaluation_schedule: [
    "20260825133723_cron_secrets_and_agent_evaluation_schedule.sql",
    "20260902000001_cron_secrets_and_agent_evaluation_schedule.sql",
  ],
  digital_twin_versions_and_autonomy_settings: [
    "20260823130338_digital_twin_versions_and_autonomy_settings.sql",
    "20260831000003_digital_twin_versions_and_autonomy_settings.sql",
  ],
  fix_intervention_cron_auth_private_schema: [
    "20260824201013_fix_intervention_cron_auth_private_schema.sql",
    "20260824210002_fix_intervention_cron_auth_private_schema.sql",
  ],
  gate_agent_evaluation_schedule: [
    "20260825140333_gate_agent_evaluation_schedule.sql",
    "20260902000002_gate_agent_evaluation_schedule.sql",
  ],
  reorder_learning_outcomes_rpc: [
    "20260822160236_reorder_learning_outcomes_rpc.sql",
    "20260831000001_reorder_learning_outcomes_rpc.sql",
  ],
  widen_xp_transactions_source_check: [
    "20260905230606_widen_xp_transactions_source_check.sql",
    "20260905230639_widen_xp_transactions_source_check.sql",
  ],
  wire_improvement_bonus_award: [
    "20260905231218_wire_improvement_bonus_award.sql",
    "20260905231402_wire_improvement_bonus_award.sql",
  ],
};

/** @returns {{base:string, files:string[]}[]} duplicate base-names (count > 1) */
function findDuplicates() {
  /** @type {Map<string,string[]>} */
  const byBase = new Map();
  for (const f of readdirSync(MIGRATIONS_DIR).filter((n) => n.endsWith(".sql"))) {
    const m = f.match(/^\d+_(.+)\.sql$/);
    if (!m) continue;
    const base = m[1];
    if (!byBase.has(base)) byBase.set(base, []);
    byBase.get(base).push(f);
  }
  const dupes = [];
  for (const [base, files] of byBase) {
    if (files.length > 1) dupes.push({ base, files: files.sort() });
  }
  return dupes.sort((a, b) => a.base.localeCompare(b.base));
}

/** True if `files` exactly matches the grandfathered allowlist for `base`. */
function isGrandfathered(base, files) {
  const allowed = GRANDFATHERED[base];
  if (!allowed) return false;
  const a = [...allowed].sort();
  const b = [...files].sort();
  return a.length === b.length && a.every((x, i) => x === b[i]);
}

function main() {
  const dupes = findDuplicates();
  /** @type {{base:string, files:string[]}[]} */
  const violations = [];
  for (const d of dupes) {
    if (!isGrandfathered(d.base, d.files)) violations.push(d);
  }

  if (violations.length === 0) {
    console.log(
      `✓ migration duplicate-names: CLEAN — ${dupes.length} known/grandfathered ` +
        `duplicate base-name(s), no new collisions.`
    );
    process.exit(0);
  }

  console.error(
    `✗ migration duplicate-names: ${violations.length} NEW duplicate base-name(s) found.\n` +
      `  A migration filename is <timestamp>_<base-name>.sql. Re-using a base-name means the\n` +
      `  LATER file wins on a fresh replay — if it carries an older/less-hardened body it\n` +
      `  silently regresses the rebuilt database (the root cause of the CLASS A/H search_path\n` +
      `  regressions). Give the new migration a UNIQUE base-name. Do not edit the allowlist to\n` +
      `  silence this — the allowlist only grandfathers already-applied production history.\n`
  );
  for (const v of violations) {
    console.error(`  [duplicate] ${v.base}:`);
    for (const f of v.files) console.error(`      ${f}`);
  }
  process.exit(1);
}

main();
