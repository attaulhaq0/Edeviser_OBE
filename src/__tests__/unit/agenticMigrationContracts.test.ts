import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const auditMigration = readFileSync(
  "supabase/migrations/20260827000001_create_agentic_audit_and_proposals.sql",
  "utf8"
);
const embeddingMigration = readFileSync(
  "supabase/migrations/20260827000002_add_versioned_supabase_native_embeddings.sql",
  "utf8"
);
const embeddingConstraintMigration = readFileSync(
  "supabase/migrations/20260827000003_harden_agentic_embedding_constraint.sql",
  "utf8"
);
const auditIndexMigration = readFileSync(
  "supabase/migrations/20260827000004_add_agent_tool_attempt_actor_index.sql",
  "utf8"
);
const atomicEmbeddingReplacementMigration = readFileSync(
  "supabase/migrations/20260827000005_create_atomic_embedding_replacement.sql",
  "utf8"
);
const embeddingSourceScopeMigration = readFileSync(
  "supabase/migrations/20260827000006_harden_embedding_source_material_scope.sql",
  "utf8"
);
const embeddingReplacementScopeMigration = readFileSync(
  "supabase/migrations/20260827000007_harden_atomic_embedding_replacement_scope.sql",
  "utf8"
);
const learningStateMigration = readFileSync(
  "supabase/migrations/20260828000001_create_student_learning_state_and_protected_execution.sql",
  "utf8"
);
const interventionFeedbackMigration = readFileSync(
  "supabase/migrations/20260830000002_measured_intervention_learning_state_feedback.sql",
  "utf8"
);

describe("agentic migration contracts", () => {
  it("captures correlation, audit, approval, and idempotency fields", () => {
    for (const field of [
      "request_id",
      "run_id",
      "actor_user_id",
      "actor_role",
      "institution_id",
      "session_id",
      "specialist",
      "tool_name",
      "tool_version",
      "idempotency_key",
      "evidence_hash",
      "approval_state",
      "latency_ms",
      "provider",
      "model",
      "error_classification",
    ]) {
      expect(auditMigration).toContain(field);
    }
    expect(auditMigration).toMatch(/agent_action_proposals_idempotency_unique/);
    expect(auditMigration).toMatch(/REVOKE ALL[\s\S]*authenticated/);
    expect(auditIndexMigration).toMatch(
      /institution_id,[\s\S]*actor_user_id,[\s\S]*started_at DESC/
    );
  });

  it("uses a non-destructive versioned 384-dimensional native path", () => {
    expect(embeddingMigration).toMatch(/embedding_v2 vector\(384\)/);
    expect(embeddingMigration).toContain("supabase_edge_runtime");
    expect(embeddingMigration).toContain("gte-small");
    expect(embeddingMigration).toContain("search_course_materials_v2");
    expect(embeddingMigration).toContain("SET search_path = ''");
    expect(embeddingMigration.match(/OPERATOR\(public\.<=>\)/g)).toHaveLength(
      3
    );
    expect(embeddingMigration).toContain(
      "ALTER COLUMN embedding DROP NOT NULL"
    );
    expect(embeddingMigration).not.toMatch(/DROP COLUMN\s+embedding/i);
    expect(embeddingMigration).not.toMatch(/TRUNCATE|DELETE FROM/i);
    expect(embeddingConstraintMigration).toMatch(/CHECK \([\s\S]*\) NOT VALID/);
    expect(embeddingConstraintMigration).toContain(
      "VALIDATE CONSTRAINT course_material_embeddings_vector_version_check"
    );
  });

  it("replaces re-indexed chunks atomically through a service-only RPC", () => {
    expect(atomicEmbeddingReplacementMigration).toContain(
      "replace_course_material_embeddings_v2"
    );
    expect(atomicEmbeddingReplacementMigration).toMatch(/SECURITY DEFINER/);
    expect(atomicEmbeddingReplacementMigration).toContain(
      "SET search_path = ''"
    );
    expect(atomicEmbeddingReplacementMigration).toMatch(
      /REVOKE ALL[\s\S]*PUBLIC, anon, authenticated/
    );
    expect(atomicEmbeddingReplacementMigration).toMatch(
      /GRANT EXECUTE[\s\S]*TO service_role/
    );
    expect(atomicEmbeddingReplacementMigration).toMatch(/RETURNS integer/);
    const deleteIndex =
      atomicEmbeddingReplacementMigration.indexOf("DELETE FROM");
    const insertIndex =
      atomicEmbeddingReplacementMigration.indexOf("INSERT INTO");
    expect(deleteIndex).toBeGreaterThanOrEqual(0);
    expect(insertIndex).toBeGreaterThanOrEqual(0);
    expect(deleteIndex).toBeLessThan(insertIndex);
    expect(atomicEmbeddingReplacementMigration).toMatch(
      /course_materials[\s\S]*course_modules[\s\S]*module\.course_id = p_course_id/
    );
    expect(embeddingSourceScopeMigration).toMatch(
      /NEW\.source_material_id[\s\S]*module\.course_id = NEW\.course_id/
    );
    expect(embeddingSourceScopeMigration).toMatch(
      /UPDATE OF institution_id, course_id, source_material_id, clo_ids/
    );
    expect(embeddingReplacementScopeMigration).toContain(
      "CREATE OR REPLACE FUNCTION public.replace_course_material_embeddings_v2"
    );
    expect(embeddingReplacementScopeMigration).toMatch(/RETURNS integer/);
    expect(embeddingReplacementScopeMigration).toMatch(
      /course_id = p_course_id[\s\S]*institution_id = p_institution_id[\s\S]*source_filename = p_source_filename[\s\S]*OR[\s\S]*p_source_material_id IS NOT NULL[\s\S]*source_material_id = p_source_material_id/
    );
    expect(embeddingReplacementScopeMigration).not.toMatch(
      /IF p_source_material_id IS NOT NULL THEN[\s\S]*DELETE FROM/
    );
    const hardenedDeleteIndex =
      embeddingReplacementScopeMigration.indexOf("DELETE FROM");
    const hardenedInsertIndex =
      embeddingReplacementScopeMigration.indexOf("INSERT INTO");
    expect(hardenedDeleteIndex).toBeGreaterThanOrEqual(0);
    expect(hardenedInsertIndex).toBeGreaterThanOrEqual(0);
    expect(hardenedDeleteIndex).toBeLessThan(hardenedInsertIndex);
    const embedFunction = readFileSync(
      "supabase/functions/embed-course-material/index.ts",
      "utf8"
    );
    expect(embedFunction).not.toContain(".delete()");
    expect(
      embedFunction.match(/replace_course_material_embeddings_v2/g)
    ).toHaveLength(2);
    expect(embedFunction).toContain(
      "autoInsertedCount !== autoInsertRows.length"
    );
    expect(embedFunction).toContain("insertedCount !== insertRows.length");
    expect(embedFunction).toContain("authorizeSourceMaterial");
  });

  it("materializes deterministic Student Learning State with five-role read scope", () => {
    expect(learningStateMigration).toContain(
      "CREATE TABLE public.student_learning_states"
    );
    for (const field of [
      "mastery",
      "habits",
      "risk_signals",
      "strengths",
      "opportunities",
      "goals",
      "active_interventions",
      "recent_evidence",
      "recommendation_history",
      "approved_executed_actions",
      "measured_intervention_effects",
      "fresh_until",
      "state_hash",
    ]) {
      expect(learningStateMigration).toContain(field);
    }
    for (const role of ["student", "parent", "admin"]) {
      expect(learningStateMigration).toContain(
        `student_learning_states_${role}_read`
      );
    }
    expect(learningStateMigration).not.toContain(
      "student_learning_states_teacher_read"
    );
    expect(learningStateMigration).not.toContain(
      "student_learning_states_coordinator_read"
    );
    expect(learningStateMigration).toContain(
      "CREATE OR REPLACE FUNCTION public.get_student_learning_state_v1"
    );
    expect(learningStateMigration).toContain(
      "CREATE OR REPLACE FUNCTION public.student_learning_state_needs_refresh_v1"
    );
    expect(learningStateMigration).toMatch(
      /student_learning_state_needs_refresh_v1\(uuid\)[\s\S]*FROM PUBLIC, anon, authenticated[\s\S]*TO service_role/
    );
    expect(learningStateMigration).toMatch(
      /v_actor_role = 'teacher'[\s\S]*c\.teacher_id = v_actor_id/
    );
    expect(learningStateMigration).toMatch(
      /v_actor_role = 'coordinator'[\s\S]*p\.coordinator_id = v_actor_id/
    );
    expect(learningStateMigration).toMatch(
      /get_student_learning_state_v1\(uuid, uuid, uuid\)[\s\S]*TO authenticated, service_role/
    );
    expect(learningStateMigration).toMatch(
      /REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER[\s\S]*FROM authenticated/
    );
    expect(learningStateMigration).toContain(
      "public.parent_has_verified_link(student_id)"
    );
    expect(learningStateMigration).toContain(
      "'calculation', 'outcome_attainment_below_success_threshold'"
    );
    expect(learningStateMigration).toContain(
      "FROM public.institution_settings s"
    );
    expect(learningStateMigration).toContain(
      "'status', 'awaiting_direct_evidence'"
    );
  });

  it("executes registered personal writes atomically and service-only", () => {
    const createGoalIndex = learningStateMigration.indexOf(
      "IF v_proposal.action_type = 'create_goal'"
    );
    const executionReceiptIndex = learningStateMigration.indexOf(
      "INSERT INTO public.agent_action_executions"
    );
    const auditIndex = learningStateMigration.indexOf(
      "INSERT INTO public.agent_tool_attempts"
    );
    const proposalUpdateIndex = learningStateMigration.indexOf(
      "UPDATE public.agent_action_proposals"
    );
    const stateRefreshIndex = learningStateMigration.indexOf(
      "v_state := public.refresh_student_learning_state_v1"
    );
    for (const marker of [
      createGoalIndex,
      executionReceiptIndex,
      auditIndex,
      proposalUpdateIndex,
      stateRefreshIndex,
    ]) {
      expect(marker).toBeGreaterThanOrEqual(0);
    }
    expect(createGoalIndex).toBeLessThan(executionReceiptIndex);
    expect(executionReceiptIndex).toBeLessThan(auditIndex);
    expect(auditIndex).toBeLessThan(proposalUpdateIndex);
    expect(proposalUpdateIndex).toBeLessThan(stateRefreshIndex);
    expect(learningStateMigration).toMatch(/UNIQUE \(proposal_id\)/);
    expect(learningStateMigration).toContain("ADD COLUMN tool_version text");
    expect(learningStateMigration).toContain(
      "v_proposal.tool_version IS DISTINCT FROM '1.0.0'"
    );
    expect(learningStateMigration).toMatch(
      /execute_approved_agent_personal_action_v1\(uuid, uuid\)[\s\S]*FROM PUBLIC, anon, authenticated[\s\S]*TO service_role/
    );
    expect(learningStateMigration).not.toMatch(
      /EXECUTE\s+format|p_rpc|p_table|raw_sql/i
    );
  });

  it("refreshes and reconciles Learning State on every measured intervention", () => {
    expect(interventionFeedbackMigration).toContain(
      "CREATE OR REPLACE FUNCTION public.reconcile_student_learning_state_measurements_v1"
    );
    expect(interventionFeedbackMigration).toContain(
      "refresh_student_learning_state_v1(NEW.student_id)"
    );
    expect(interventionFeedbackMigration).toContain(
      "intervention_measurement_learning_state_refresh"
    );
    expect(interventionFeedbackMigration).toContain(
      "m.evaluation_state = 'IMPROVED'"
    );
    expect(interventionFeedbackMigration).toContain(
      "m.evaluation_state IN ('DECLINED', 'NO_MATERIAL_CHANGE')"
    );
    expect(interventionFeedbackMigration).toMatch(
      /REVOKE ALL[\s\S]*PUBLIC, anon, authenticated[\s\S]*GRANT EXECUTE[\s\S]*TO service_role/
    );
  });
});
