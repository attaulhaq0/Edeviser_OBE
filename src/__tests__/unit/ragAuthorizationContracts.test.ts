import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  import.meta.url.startsWith("file:")
    ? fileURLToPath(
        new URL(
          "../../../supabase/migrations/20260825000001_rag_authorization_hardening.sql",
          import.meta.url
        )
      )
    : "supabase/migrations/20260825000001_rag_authorization_hardening.sql",
  "utf8"
);
const metadataMigration = readFileSync(
  "supabase/migrations/20260825000002_rag_embedding_metadata_integrity.sql",
  "utf8"
);
const embedFunction = readFileSync(
  "supabase/functions/embed-course-material/index.ts",
  "utf8"
);
const tutorFunction = readFileSync(
  "supabase/functions/chat-with-tutor/index.ts",
  "utf8"
);

describe("RAG authorization contract", () => {
  it("removes the broad policy and grants only scoped authenticated reads", () => {
    expect(migration).toMatch(
      /DROP POLICY IF EXISTS ["']authenticated_read_embeddings["']/
    );
    expect(migration).toMatch(/sc\.status = 'active'/);
    expect(migration).toMatch(/p\.coordinator_id = \(SELECT auth\.uid\(\)\)/);
    expect(migration).toMatch(/p\.institution_id = \(SELECT public\.auth_institution_id\(\)\)/);
    expect(migration).toMatch(
      /CREATE POLICY "embeddings_admin_read"[\s\S]*JOIN public\.programs AS p[\s\S]*p\.institution_id = \(SELECT public\.auth_institution_id\(\)\)/
    );
    expect(migration).toMatch(/REVOKE ALL ON TABLE public\.course_material_embeddings/);
    expect(migration).toMatch(/GRANT SELECT ON TABLE public\.course_material_embeddings TO authenticated/);
    expect(migration).toMatch(/REVOKE EXECUTE ON FUNCTION public\.search_course_materials/);
    expect(migration).toMatch(/FROM PUBLIC, anon/);
    expect(migration).toMatch(/GRANT EXECUTE ON FUNCTION public\.search_course_materials/);
  });

  it("does not reintroduce an unrestricted embedding policy", () => {
    expect(migration).not.toMatch(
      /CREATE\s+POLICY\s+["']authenticated_read_embeddings["']/
    );
    expect(migration).not.toMatch(/course_material_embeddings[\s\S]*USING \(true\)/);
  });

  it("enforces privileged-writer metadata consistency", () => {
    expect(metadataMigration).toMatch(
      /validate_course_material_embedding_metadata/,
    );
    expect(metadataMigration).toMatch(/NEW\.institution_id IS DISTINCT FROM/);
    expect(metadataMigration).toMatch(/lo\.type <> 'CLO'/);
    expect(metadataMigration).toMatch(/lo\.course_id IS DISTINCT FROM NEW\.course_id/);
    expect(metadataMigration).toMatch(/trg_validate_course_material_embedding_metadata/);
  });

  it("authorizes embedding writes before any service-role side effect", () => {
    expect(embedFunction).toMatch(/authenticateRequest\(req\)/);
    expect(embedFunction).toMatch(/auth\.user\.role !== "teacher"/);
    expect(embedFunction).toMatch(/programs!inner\(institution_id\)/);
    expect(embedFunction).toMatch(/validateCloScope\(/);
    expect(embedFunction.indexOf("authenticateRequest(req)")).toBeLessThan(
      embedFunction.indexOf(".delete()")
    );
    expect(embedFunction).not.toMatch(/institution_id, teacher_id\)"/);
  });

  it("requires student scope and caller-JWT RAG retrieval", () => {
    expect(tutorFunction).toMatch(/callerProfile\.role !== "student"/);
    expect(tutorFunction).toMatch(/callerProfile\.status !== "active"/);
    expect(tutorFunction).toMatch(/\.eq\("status", "active"\)/);
    expect(tutorFunction).toMatch(/userClient\.rpc\(/);
    expect(tutorFunction).toMatch(/CLO scope is outside this course/);
    expect(tutorFunction).not.toMatch(/user\.app_metadata\?\./);
    expect(tutorFunction).not.toMatch(/user\.user_metadata\?\./);
  });
});
