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
  });
});
