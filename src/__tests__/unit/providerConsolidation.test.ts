import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";

const files = execFileSync(
  "git",
  ["ls-files", "supabase/functions", "api", "src", "scripts", ".env.example"],
  { encoding: "utf8" }
)
  .split(/\r?\n/)
  .filter(Boolean)
  .filter((file) => !file.includes("__tests__"))
  .filter((file) => file !== "scripts/audit/security-scan.ts");

describe("strict provider consolidation", () => {
  it("has no active legacy generation or embedding runtime consumer", () => {
    const activeSource = files
      .map((file) => readFileSync(file, "utf8"))
      .join("\n");
    for (const pattern of [
      /OPENAI_API_KEY/,
      /OPENROUTER_API_KEY/,
      /GEMINI_API_KEY/,
      /GOOGLE_API_KEY/,
      /api\.openai\.com/,
      /openrouter\.ai/,
      /generativelanguage\.googleapis\.com/,
      /text-embedding-ada-002/,
    ]) {
      expect(activeSource).not.toMatch(pattern);
    }
  });

  it("routes active generation and embeddings through canonical boundaries", () => {
    const functions = readFileSync(
      "supabase/functions/agent-orchestrator/index.ts",
      "utf8"
    );
    const tutor = readFileSync(
      "supabase/functions/chat-with-tutor/index.ts",
      "utf8"
    );
    const embed = readFileSync(
      "supabase/functions/embed-course-material/index.ts",
      "utf8"
    );
    expect(functions).toMatch(/createDeepSeekProvider/);
    expect(tutor).toMatch(/createDeepSeekProvider/);
    expect(tutor).toMatch(/createSupabaseEmbeddingProvider/);
    expect(embed).toMatch(/createSupabaseEmbeddingProvider/);
  });

  it("preserves tutor RAG degradation, context assembly, and integrity guards", () => {
    const tutor = readFileSync(
      "supabase/functions/chat-with-tutor/index.ts",
      "utf8"
    );
    expect(tutor).toMatch(/createSupabaseEmbeddingProvider/);
    expect(tutor).toMatch(/continuing without RAG context/i);
    expect(tutor).not.toMatch(/OPENAI_API_KEY/);
    expect(tutor).toMatch(/PERSONA_PROMPTS/);
    expect(tutor).toMatch(/assembleSystemPrompt/);
    expect(tutor).toMatch(/cloAttainments/);
    expect(tutor).toMatch(/detectIntegrityViolation/);
    expect(tutor).toMatch(/do my homework/i);
    expect(tutor).toMatch(/ACADEMIC INTEGRITY ALERT/);
  });
});
