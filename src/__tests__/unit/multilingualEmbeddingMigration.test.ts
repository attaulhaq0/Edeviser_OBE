import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { createConfiguredEmbeddingProvider } from "../../../supabase/functions/_shared/ai/embedding-registry";

const migration = readFileSync(
  "supabase/migrations/20260830000009_multilingual_embedding_version_3.sql",
  "utf8"
);
const registry = readFileSync(
  "supabase/functions/_shared/ai/embedding-registry.ts",
  "utf8"
);
const deleteCleanupMigration = readFileSync(
  "supabase/migrations/20260830000010_material_embedding_delete_cleanup.sql",
  "utf8"
);

describe("multilingual embedding version-3 contract", () => {
  it("keeps legacy vectors and isolates the multilingual dimension", () => {
    expect(migration).toContain("embedding_v3 vector(1024)");
    expect(migration).toContain("embedding_version = 3");
    expect(migration).toContain("embedding_provider = 'self_hosted_http'");
    expect(migration).toContain("embedding_model = 'BAAI/bge-m3'");
    expect(migration).toContain("search_course_materials_v3");
    expect(migration).toContain("replace_course_material_embeddings_v3");
    expect(migration).toContain("source_material_id = p_source_material_id");
    expect(migration).toContain(
      "source_filename = p_source_filename"
    );
    expect(migration).toContain(
      "contiguous chunk indexes starting at zero"
    );
    expect(migration).toContain("embedding_v3' IS NULL");
    expect(migration).toMatch(/embedding_version = 3[\s\S]*embedding IS NULL[\s\S]*embedding_v2 IS NULL/);
    expect(migration).not.toMatch(/DROP COLUMN\s+embedding/i);
    expect(migration).not.toMatch(/TRUNCATE|DELETE FROM public\.course_material_embeddings\s*;/i);
  });

  it("fails closed when an opt-in multilingual endpoint is not configured", () => {
    expect(registry).toContain("self_hosted_bge_m3");
    expect(registry).toContain("EMBEDDING_ENDPOINT_URL");
    expect(registry).toContain("EmbeddingProviderError");
    expect(registry).toContain("supabase_gte_small");

    expect(() =>
      createConfiguredEmbeddingProvider({
        get: (name) =>
          name === "EMBEDDING_PROVIDER" ? "unsupported_provider" : undefined,
      })
    ).toThrow(/Unsupported EMBEDDING_PROVIDER/);

    expect(() =>
      createConfiguredEmbeddingProvider({
        get: (name) =>
          name === "EMBEDDING_PROVIDER" ? "self_hosted_bge_m3" : undefined,
      })
    ).toThrow(/EMBEDDING_ENDPOINT_URL/);
  });

  it("removes material-owned chunks before source identity can be orphaned", () => {
    expect(deleteCleanupMigration).toContain(
      "DELETE FROM public.course_material_embeddings"
    );
    expect(deleteCleanupMigration).toContain("WHERE source_material_id = OLD.id");
    expect(deleteCleanupMigration).toContain(
      "BEFORE DELETE ON public.course_materials"
    );
    expect(deleteCleanupMigration).toContain("SECURITY DEFINER");
    expect(deleteCleanupMigration).toMatch(
      /REVOKE ALL ON FUNCTION public\.delete_course_material_embeddings_on_material_delete\(\)[\s\S]*FROM PUBLIC, anon, authenticated/
    );
  });
});
