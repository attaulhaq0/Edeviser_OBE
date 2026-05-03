import type { TutorPersona } from "@/lib/tutorSchemas";

// ─── Types ───────────────────────────────────────────────────────────────────

type AutonomyLevel = "L1" | "L2" | "L3";

export interface CLOAttainment {
  clo_id: string;
  clo_title: string;
  bloom_level: string;
  attainment_percentage: number;
}

export interface RetrievedChunk {
  chunk_text: string;
  source_filename: string;
  material_type: string;
  similarity_score: number;
}

export interface PromptAssemblyInput {
  persona: TutorPersona;
  autonomyLevel: AutonomyLevel;
  cloAttainments: CLOAttainment[];
  retrievedChunks: RetrievedChunk[];
  courseName?: string;
}

// ─── Persona Prompt Templates ────────────────────────────────────────────────

const PERSONA_PROMPTS: Record<TutorPersona, string> = {
  socratic_guide: [
    "You are a Socratic tutor. Ask probing questions to guide the student toward the answer.",
    "Never give direct answers. Instead, break the problem into smaller questions that lead to understanding.",
    'Use phrases like "What do you think would happen if...?" and "Can you explain why...?"',
  ].join(" "),

  step_by_step_coach: [
    "You are a patient step-by-step coach. Break down every problem into numbered steps.",
    "Explain each step clearly before moving to the next. Check understanding at each step.",
    'Use phrases like "Step 1: Let\'s start by..." and "Now that we understand X, let\'s move to..."',
  ].join(" "),

  quick_explainer: [
    "You are a concise explainer. Give clear, direct explanations with examples.",
    "Keep responses focused and to the point. Use analogies when helpful.",
    "Prioritize clarity over thoroughness — the student can ask follow-up questions.",
  ].join(" "),
};

// ─── Autonomy Level Prompt Modifiers ─────────────────────────────────────────

const AUTONOMY_PROMPTS: Record<AutonomyLevel, string> = {
  L1: [
    "AUTONOMY LEVEL L1 (Hints Only): You must NEVER provide direct answers or solutions.",
    "Only ask guiding questions, provide hints, and encourage the student to work through the problem.",
    "If the student asks for a direct answer, redirect them with a question.",
  ].join(" "),

  L2: [
    "AUTONOMY LEVEL L2 (Guided Discovery): Provide scaffolded hints and partial explanations.",
    "Guide the student toward understanding step by step, but do not give complete solutions.",
    "You may explain concepts but should encourage the student to apply them independently.",
  ].join(" "),

  L3: [
    "AUTONOMY LEVEL L3 (Direct Explanation): You may provide complete, direct explanations of concepts.",
    "Give clear answers with examples.",
    "The student is in review/practice mode and benefits from direct instruction.",
  ].join(" "),
};

// ─── Safety Instructions ─────────────────────────────────────────────────────

const SAFETY_INSTRUCTIONS = [
  "IMPORTANT RULES:",
  "- Only reference the provided course materials. If a question falls outside the available content, clearly state that.",
  "- Do not generate content unrelated to the course subject matter.",
  "- Do not provide personal advice or harmful content.",
  "- Guide students toward understanding rather than providing complete solutions to graded assignments.",
  "- Never include student personal information (name, email, ID) in your responses.",
  "- If the student asks you to solve, write, or complete a graded assignment, redirect them pedagogically.",
].join("\n");

// ─── CLO Context Builder ────────────────────────────────────────────────────

const buildCLOContext = (cloAttainments: CLOAttainment[]): string => {
  if (cloAttainments.length === 0) return "";

  const gaps = cloAttainments.filter((clo) => clo.attainment_percentage < 70);
  const lines: string[] = ["STUDENT CLO PROGRESS:"];

  for (const clo of cloAttainments) {
    const status = clo.attainment_percentage < 70 ? "⚠ NEEDS IMPROVEMENT" : "✓";
    lines.push(
      `- ${clo.clo_title} (Bloom: ${clo.bloom_level}): ${clo.attainment_percentage}% ${status}`
    );
  }

  if (gaps.length > 0) {
    lines.push("");
    lines.push("COMPETENCY GAPS (below 70%):");
    for (const gap of gaps) {
      lines.push(
        `- ${gap.clo_title}: ${gap.attainment_percentage}% — focus tutoring here`
      );
    }
  }

  return lines.join("\n");
};

// ─── Chunk Context Builder ───────────────────────────────────────────────────

const buildChunkContext = (chunks: RetrievedChunk[]): string => {
  if (chunks.length === 0) return "";

  const lines: string[] = ["RELEVANT COURSE MATERIALS:"];

  chunks.forEach((chunk, index) => {
    lines.push(
      `[${index + 1}] Source: ${chunk.source_filename} (${chunk.material_type})`
    );
    lines.push(chunk.chunk_text);
    lines.push("");
  });

  return lines.join("\n");
};

// ─── Prompt Assembly ─────────────────────────────────────────────────────────

export const assembleSystemPrompt = (input: PromptAssemblyInput): string => {
  const sections: string[] = [];

  // 1. Role and course context
  if (input.courseName) {
    sections.push(`You are an AI tutor for the course "${input.courseName}".`);
  } else {
    sections.push(
      "You are an AI tutor helping a student with their coursework."
    );
  }

  // 2. Persona instructions
  sections.push(PERSONA_PROMPTS[input.persona]);

  // 3. Autonomy level
  sections.push(AUTONOMY_PROMPTS[input.autonomyLevel]);

  // 4. Safety instructions
  sections.push(SAFETY_INSTRUCTIONS);

  // 5. CLO context (no PII — only CLO titles and percentages)
  const cloContext = buildCLOContext(input.cloAttainments);
  if (cloContext) {
    sections.push(cloContext);
  }

  // 6. Retrieved chunks
  const chunkContext = buildChunkContext(input.retrievedChunks);
  if (chunkContext) {
    sections.push(chunkContext);
  }

  return sections.join("\n\n");
};

// ─── Exports for testing ─────────────────────────────────────────────────────

export { PERSONA_PROMPTS, AUTONOMY_PROMPTS, SAFETY_INSTRUCTIONS };
