import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";

const files = execFileSync(
  "git",
  [
    "ls-files",
    "--cached",
    "--others",
    "--exclude-standard",
    "supabase/functions",
    "api",
    "src",
    "scripts",
    ".env.example",
  ],
  { encoding: "utf8" }
)
  .split(/\r?\n/)
  .filter(Boolean)
  .filter((file) => !file.includes("__tests__"))
  .filter((file) => file !== "scripts/audit/security-scan.ts");

describe("strict provider consolidation", () => {
  it("has no active legacy generation or embedding runtime consumer", () => {
    const forbidden = [
      /OPENAI_API_KEY/,
      /OPENROUTER_API_KEY/,
      /GEMINI_API_KEY/,
      /GOOGLE_API_KEY/,
      /api\.openai\.com/,
      /openrouter\.ai/,
      /generativelanguage\.googleapis\.com/,
      /text-embedding-ada-002/,
    ];
    const offenders: string[] = [];
    for (const file of files) {
      const contents = readFileSync(file);
      if (contents.includes(0)) continue;
      const source = contents.toString("utf8");
      for (const pattern of forbidden) {
        if (pattern.test(source)) offenders.push(`${file}: ${pattern.source}`);
      }
    }
    expect(offenders, offenders.join("\n")).toEqual([]);
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
    const planUpdate = readFileSync(
      "supabase/functions/generate-plan-update/index.ts",
      "utf8"
    );
    expect(functions).toMatch(/createAIProvider/);
    expect(tutor).toMatch(/createAIProvider/);
    expect(tutor).toMatch(/createConfiguredEmbeddingProvider/);
    expect(embed).toMatch(/createConfiguredEmbeddingProvider/);
    expect(planUpdate).toMatch(/createConfiguredEmbeddingProvider/);
    expect(planUpdate).not.toMatch(/createSupabaseEmbeddingProvider/);
    expect(planUpdate).toMatch(/search_course_materials_v2/);
    expect(planUpdate).toMatch(/search_course_materials_v3/);
  });

  it("keeps vendor selection inside the canonical provider composition root", () => {
    const vendorFactoryConsumers = files.filter((file) =>
      readFileSync(file, "utf8").includes("createDeepSeekProvider")
    );
    expect(vendorFactoryConsumers).toEqual([
      "supabase/functions/_shared/ai/provider-factory.ts",
      "supabase/functions/_shared/ai/providers/deepseek.ts",
    ]);
    for (const consumer of [
      "supabase/functions/agent-orchestrator/index.ts",
      "supabase/functions/chat-with-tutor/index.ts",
      "supabase/functions/coordinator-ai-insights/index.ts",
      "supabase/functions/generate-plan-update/index.ts",
      "supabase/functions/generate-quiz-questions/index.ts",
    ]) {
      expect(readFileSync(consumer, "utf8")).toContain("createAIProvider");
    }
  });

  it("preserves tutor RAG degradation, context assembly, and integrity guards", () => {
    const tutor = readFileSync(
      "supabase/functions/chat-with-tutor/index.ts",
      "utf8"
    );
    expect(tutor).toMatch(/createConfiguredEmbeddingProvider/);
    expect(tutor).toMatch(/continuing without RAG context/i);
    expect(tutor).not.toMatch(/OPENAI_API_KEY/);
    expect(tutor).toMatch(/PERSONA_PROMPTS/);
    expect(tutor).toMatch(/assembleSystemPrompt/);
    expect(tutor).toMatch(/cloAttainments/);
    expect(tutor).toMatch(/detectIntegrityViolation/);
    expect(tutor).toMatch(/do my homework/i);
    expect(tutor).toMatch(/ACADEMIC INTEGRITY ALERT/);
  });

  it("keeps the downstream plan specialist on the protected internal contract", () => {
    const planUpdate = readFileSync(
      "supabase/functions/generate-plan-update/index.ts",
      "utf8"
    );
    expect(planUpdate).toContain("getManagedServerKey");
    expect(planUpdate).toContain("student_id");
    expect(planUpdate).toContain("course_id");
    expect(planUpdate).toContain("clo_id");
    expect(planUpdate).toContain("tutor_plan_updates");
    expect(planUpdate).toContain("createAIProvider");
  });
});
