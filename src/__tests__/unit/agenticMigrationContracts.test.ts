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
    expect(
      atomicEmbeddingReplacementMigration.indexOf("DELETE FROM")
    ).toBeLessThan(atomicEmbeddingReplacementMigration.indexOf("INSERT INTO"));
    expect(atomicEmbeddingReplacementMigration).toMatch(
      /course_materials[\s\S]*course_modules[\s\S]*module\.course_id = p_course_id/
    );
    expect(embeddingSourceScopeMigration).toMatch(
      /NEW\.source_material_id[\s\S]*module\.course_id = NEW\.course_id/
    );
    expect(embeddingSourceScopeMigration).toMatch(
      /UPDATE OF institution_id, course_id, source_material_id, clo_ids/
    );
    const embedFunction = readFileSync(
      "supabase/functions/embed-course-material/index.ts",
      "utf8"
    );
    expect(embedFunction).not.toContain(".delete()");
    expect(
      embedFunction.match(/replace_course_material_embeddings_v2/g)
    ).toHaveLength(2);
    expect(embedFunction).toContain("authorizeSourceMaterial");
  });
});
