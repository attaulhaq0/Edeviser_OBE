import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string): string => readFileSync(path, "utf8");

describe("agentic review regressions", () => {
  it("keeps evidence hashes independent of runtime locale collation", () => {
    const hash = read("supabase/functions/_shared/ai/hash.ts");
    expect(hash).not.toContain("localeCompare");
    expect(hash).toMatch(/left < right \? -1 : left > right \? 1 : 0/);
  });

  it("uses callable PDF exports and distinguishes missing embedding runtime", () => {
    const embed = read("supabase/functions/embed-course-material/index.ts");
    expect(embed).toMatch(/\{ default: pdfParse \} = await import/);
    expect(
      embed.match(/embeddingError\.kind === "configuration"/g)
    ).toHaveLength(2);
    expect(embed.match(/status: 503/g)?.length ?? 0).toBeGreaterThanOrEqual(2);
  });

  it("fails closed on proposal scope, audit persistence, and missing course context", () => {
    const proposals = read("supabase/functions/_shared/ai/proposals.ts");
    const dataSource = read(
      "supabase/functions/agent-orchestrator/data-source.ts"
    );
    const endpoint = read("supabase/functions/agent-orchestrator/index.ts");
    expect(proposals).toMatch(/await authorizer\.authorizeProposal/);
    expect(proposals).toContain("unauthorized_scope");
    expect(dataSource).toMatch(/async authorizeProposal\(/);
    expect(dataSource).toContain(
      'tool === "get_student_learning_context" && Boolean(studentId)'
    );
    expect(endpoint).toMatch(/if \(auditError\)/);
    expect(endpoint).toContain("Agent audit record could not be stored");
  });

  it("keeps quiz drafts idempotent and aligned with the client contract", () => {
    const endpoint = read(
      "supabase/functions/generate-quiz-questions/index.ts"
    );
    const hook = read("src/hooks/useGenerateQuestions.ts");
    const page = read(
      "src/pages/teacher/quiz-generation/GenerateQuestionsPage.tsx"
    );
    expect(endpoint).toContain('onConflict: "institution_id,idempotency_key"');
    expect(endpoint).toContain("ignoreDuplicates: true");
    expect(endpoint).toContain('status: "failed"');
    expect(hook).toContain("question_drafts: GeneratedQuestion[]");
    expect(hook).toContain('approval_status: "pending"');
    expect(page).toContain("result?.question_drafts?.map");
    expect(page).toContain("Pending teacher approval");
    expect(page).not.toContain("result?.questions");
  });
});
