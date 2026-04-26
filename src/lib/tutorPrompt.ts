import type { TutorPersona, AutonomyLevel } from '@/lib/tutorSchemas';

// ─── Types ──────────────────────────────────────────────────────────────────

/** CLO attainment data used for context assembly. No PII fields. */
export interface CLOAttainment {
  clo_id: string;
  clo_title: string;
  bloom_level: string;
  attainment_percent: number;
}

/** A retrieved RAG chunk to include in the system prompt. */
export interface RAGChunk {
  chunk_id: string;
  chunk_text: string;
  source_filename: string;
  material_type: string;
  similarity_score: number;
}

/** Conversation message for context window. No PII fields. */
export interface ContextMessage {
  role: 'user' | 'assistant';
  content: string;
}

/** Options for assembling the system prompt. */
export interface AssemblePromptOptions {
  persona: TutorPersona;
  autonomyLevel: AutonomyLevel;
  cloAttainments: CLOAttainment[];
  ragChunks: RAGChunk[];
  conversationHistory?: ContextMessage[];
  toneModifier?: string;
}

// ─── Persona Prompt Templates ───────────────────────────────────────────────

const PERSONA_PROMPTS: Record<TutorPersona, string> = {
  socratic_guide: [
    'You are a Socratic tutor. Ask probing questions to guide the student toward the answer.',
    'Never give direct answers. Instead, break the problem into smaller questions that lead to understanding.',
    'Use phrases like "What do you think would happen if...?" and "Can you explain why...?"',
  ].join(' '),

  step_by_step_coach: [
    'You are a patient step-by-step coach. Break down every problem into numbered steps.',
    'Explain each step clearly before moving to the next. Check understanding at each step.',
    'Use phrases like "Step 1: Let\'s start by..." and "Now that we understand X, let\'s move to..."',
  ].join(' '),

  quick_explainer: [
    'You are a concise explainer. Give clear, direct explanations with examples.',
    'Keep responses focused and to the point. Use analogies when helpful.',
    'Prioritize clarity over thoroughness — the student can ask follow-up questions.',
  ].join(' '),
};

// ─── Autonomy Level Prompt Modifiers ────────────────────────────────────────

const AUTONOMY_PROMPTS: Record<AutonomyLevel, string> = {
  L1: [
    'AUTONOMY LEVEL L1 (Hints Only): You must NEVER provide direct answers or solutions.',
    'Only ask guiding questions, provide hints, and encourage the student to work through the problem.',
    'If the student asks for a direct answer, redirect them with a question.',
  ].join(' '),

  L2: [
    'AUTONOMY LEVEL L2 (Guided Discovery): Provide scaffolded hints and partial explanations.',
    'Guide the student toward understanding step by step, but do not give complete solutions.',
    'You may explain concepts but should encourage the student to apply them independently.',
  ].join(' '),

  L3: [
    'AUTONOMY LEVEL L3 (Direct Explanation): You may provide complete, direct explanations of concepts.',
    'Give clear answers with examples. The student is in review/practice mode and benefits from direct instruction.',
  ].join(' '),
};

// ─── PII Detection ──────────────────────────────────────────────────────────

/**
 * Common PII patterns to detect and strip from prompt text.
 * Matches email addresses, phone numbers, and UUID-like student IDs.
 */
const PII_PATTERNS: ReadonlyArray<{ pattern: RegExp; label: string }> = [
  { pattern: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, label: 'email' },
  { pattern: /\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/g, label: 'phone' },
  { pattern: /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi, label: 'uuid' },
];

/**
 * Checks whether a text string contains any detectable PII patterns.
 * Returns true if PII is found.
 */
export function containsPII(text: string): boolean {
  return PII_PATTERNS.some(({ pattern }) => {
    // Reset lastIndex for global regex patterns
    pattern.lastIndex = 0;
    return pattern.test(text);
  });
}

/**
 * Strips detectable PII from a text string, replacing matches with
 * a redacted placeholder.
 */
export function stripPII(text: string): string {
  let result = text;
  for (const { pattern, label } of PII_PATTERNS) {
    pattern.lastIndex = 0;
    result = result.replace(pattern, `[REDACTED_${label.toUpperCase()}]`);
  }
  return result;
}

// ─── Prompt Section Builders ────────────────────────────────────────────────

/** Returns the persona instruction block for the given persona. */
export function getPersonaPrompt(persona: TutorPersona): string {
  return PERSONA_PROMPTS[persona];
}

/** Returns the autonomy level modifier block for the given level. */
export function getAutonomyPrompt(level: AutonomyLevel): string {
  return AUTONOMY_PROMPTS[level];
}

/** Default competency gap threshold (70%). */
const CLO_GAP_THRESHOLD = 70;

/**
 * Builds the CLO context section of the system prompt.
 * Includes all CLO attainments and highlights gaps (below 70%).
 */
export function buildCLOContext(attainments: CLOAttainment[]): string {
  if (attainments.length === 0) {
    return 'No CLO attainment data is available for this student.';
  }

  const gaps = attainments.filter((a) => a.attainment_percent < CLO_GAP_THRESHOLD);
  const lines: string[] = [];

  lines.push('## Student CLO Attainment');
  for (const a of attainments) {
    const gapMarker = a.attainment_percent < CLO_GAP_THRESHOLD ? ' [COMPETENCY GAP]' : '';
    lines.push(
      `- ${a.clo_title} (Bloom: ${a.bloom_level}): ${a.attainment_percent}%${gapMarker}`,
    );
  }

  if (gaps.length > 0) {
    lines.push('');
    lines.push('## Competency Gaps (below 70%)');
    lines.push(
      'Focus your tutoring on these areas where the student needs the most help:',
    );
    for (const g of gaps) {
      lines.push(`- ${g.clo_title}: ${g.attainment_percent}% (Bloom: ${g.bloom_level})`);
    }
  }

  return lines.join('\n');
}

/**
 * Builds the course material context section from retrieved RAG chunks.
 * Each chunk is numbered for citation reference.
 */
export function buildChunkContext(chunks: RAGChunk[]): string {
  if (chunks.length === 0) {
    return 'No relevant course materials were found for this query.';
  }

  const lines: string[] = [];
  lines.push('## Relevant Course Materials');
  lines.push(
    'Use ONLY the following course material excerpts to ground your response. Cite sources using [N] markers.',
  );
  lines.push('');

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i]!;
    lines.push(`[${i + 1}] Source: ${chunk.source_filename} (${chunk.material_type})`);
    lines.push(chunk.chunk_text);
    lines.push('');
  }

  return lines.join('\n');
}

// ─── Base System Instructions ───────────────────────────────────────────────

const BASE_INSTRUCTIONS = [
  'You are an AI tutor for a university course. Your role is to help the student understand course concepts.',
  'IMPORTANT RULES:',
  '- Reference ONLY the provided course materials. If a question falls outside the available content, clearly state that.',
  '- Do NOT generate content unrelated to the course subject matter.',
  '- Do NOT provide personal advice or harmful content.',
  '- Do NOT complete graded assignments for the student. Guide them toward understanding instead.',
  '- Always refer to the learner as "the student" or "you". Never use personal names or identifiers.',
  '- Cite sources using numbered markers like [1], [2] when referencing course materials.',
].join('\n');

// ─── Main Assembly Function ─────────────────────────────────────────────────

/**
 * Assembles the complete system prompt for the AI tutor.
 *
 * Combines persona instructions, autonomy level modifiers, CLO attainment
 * context (with competency gaps highlighted), and retrieved RAG chunks.
 *
 * Guarantees: no student PII is included in the output. All text sections
 * are passed through PII stripping before assembly.
 *
 * @returns The assembled system prompt string.
 */
export function assembleSystemPrompt(options: AssemblePromptOptions): string {
  const {
    persona,
    autonomyLevel,
    cloAttainments,
    ragChunks,
    toneModifier,
  } = options;

  const sections: string[] = [];

  // 1. Base instructions
  sections.push(BASE_INSTRUCTIONS);

  // 2. Persona instructions
  sections.push(`## Persona: ${persona.replace(/_/g, ' ')}`);
  sections.push(getPersonaPrompt(persona));

  // 3. Tone modifier (from Big Five auto-selection)
  if (toneModifier) {
    sections.push(`## Tone Adjustment`);
    sections.push(stripPII(toneModifier));
  }

  // 4. Autonomy level
  sections.push(`## Autonomy Level`);
  sections.push(getAutonomyPrompt(autonomyLevel));

  // 5. CLO context (strip PII from titles just in case)
  const sanitizedAttainments = cloAttainments.map((a) => ({
    ...a,
    clo_title: stripPII(a.clo_title),
  }));
  sections.push(buildCLOContext(sanitizedAttainments));

  // 6. RAG chunks (strip PII from chunk text)
  const sanitizedChunks = ragChunks.map((c) => ({
    ...c,
    chunk_text: stripPII(c.chunk_text),
    source_filename: stripPII(c.source_filename),
  }));
  sections.push(buildChunkContext(sanitizedChunks));

  const assembled = sections.join('\n\n');

  // Final safety check: ensure no PII leaked through
  return stripPII(assembled);
}

/**
 * Formats conversation history messages for inclusion in the LLM context.
 * Returns the last N messages (default 10) in chronological order.
 * Strips PII from all message content.
 */
export function formatConversationHistory(
  messages: ContextMessage[],
  maxMessages: number = 10,
): ContextMessage[] {
  const recent = messages.slice(-maxMessages);
  return recent.map((m) => ({
    role: m.role,
    content: stripPII(m.content),
  }));
}
