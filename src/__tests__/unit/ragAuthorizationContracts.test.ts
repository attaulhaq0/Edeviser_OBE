import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  "supabase/migrations/20260825000001_rag_authorization_hardening.sql",
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
    expect(migration).toMatch(/REVOKE ALL ON TABLE public\.course_material_embeddings/);
    expect(migration).toMatch(/GRANT SELECT ON TABLE public\.course_material_embeddings TO authenticated/);
    expect(migration).toMatch(/REVOKE EXECUTE ON FUNCTION public\.search_course_materials/);
    expect(migration).toMatch(/FROM PUBLIC, anon/);
    expect(migration).toMatch(/GRANT EXECUTE ON FUNCTION public\.search_course_materials/);
  });

  it("does not reintroduce an unrestricted embedding policy", () => {
    expect(migration).not.toMatch(/CREATE POLICY[\s\S]*authenticated_read_embeddings/);
    expect(migration).not.toMatch(/course_material_embeddings[\s\S]*USING \(true\)/);
  });
});
