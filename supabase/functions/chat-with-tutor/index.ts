// ─── AI Chat Tutor Edge Function ────────────────────────────────────────────
// Main chat endpoint for the AI Tutor with RAG Engine.
// Accepts POST with JSON body, returns SSE stream.
//
// Pipeline:
// 1. JWT validation + course enrollment check
// 2. Rate limit + token budget check
// 3. Query embedding generation via OpenAI
// 4. pgvector similarity search (top 5, score ≥ 0.7)
// 5. CLO attainment fetch + system prompt assembly
// 6. LLM streaming via OpenRouter with SSE response
// 7. Message persistence with source citations
// 8. Usage counter increment + LLM call logging
// 9. Academic integrity detection + flagging
// 10. XP award trigger (3+ messages, once per conversation)
// 11. Retry logic with exponential backoff + model fallback

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ─── Types ──────────────────────────────────────────────────────────────────

type TutorPersona = 'socratic_guide' | 'step_by_step_coach' | 'quick_explainer';
type AutonomyLevel = 'L1' | 'L2' | 'L3';

interface ChatRequest {
  conversation_id?: string;
  course_id?: string;
  message: string;
  persona?: TutorPersona;
  image_urls?: string[];
  document_url?: string;
  clo_scope?: string[];
  autonomy_override?: 'L1' | 'L3';
}

interface SourceCitation {
  chunk_id: string;
  chunk_text: string;
  source_filename: string;
  material_type: string;
  similarity_score: number;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const DEFAULT_DAILY_MESSAGE_LIMIT = 50;
const DEFAULT_DAILY_TOKEN_BUDGET = 50_000;
const WARNING_THRESHOLD = 0.8; // 80% of limit
const MAX_MESSAGE_LENGTH = 2000;
const MAX_IMAGES = 2;
const SIMILARITY_THRESHOLD = 0.7;
const TOP_K_CHUNKS = 5;
const MAX_CONTEXT_MESSAGES = 10;
const XP_THRESHOLD_MESSAGES = 3;
const TUTOR_ENGAGEMENT_XP = 15;
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY_MS = 1000;

// ─── Persona Prompts ────────────────────────────────────────────────────────

const PERSONA_PROMPTS: Record<TutorPersona, string> = {
  socratic_guide:
    'You are a Socratic tutor. Ask probing questions to guide the student toward the answer. ' +
    'Never give direct answers. Instead, break the problem into smaller questions that lead to understanding. ' +
    'Use phrases like "What do you think would happen if...?" and "Can you explain why...?"',
  step_by_step_coach:
    'You are a patient step-by-step coach. Break down every problem into numbered steps. ' +
    'Explain each step clearly before moving to the next. Check understanding at each step. ' +
    'Use phrases like "Step 1: Let\'s start by..." and "Now that we understand X, let\'s move to..."',
  quick_explainer:
    'You are a concise explainer. Give clear, direct explanations with examples. ' +
    'Keep responses focused and to the point. Use analogies when helpful. ' +
    'Prioritize clarity over thoroughness — the student can ask follow-up questions.',
};

const AUTONOMY_PROMPTS: Record<AutonomyLevel, string> = {
  L1:
    'AUTONOMY LEVEL L1 (Hints Only): You must NEVER provide direct answers or solutions. ' +
    'Only ask guiding questions, provide hints, and encourage the student to work through the problem. ' +
    'If the student asks for a direct answer, redirect them with a question.',
  L2:
    'AUTONOMY LEVEL L2 (Guided Discovery): Provide scaffolded hints and partial explanations. ' +
    'Guide the student toward understanding step by step, but do not give complete solutions. ' +
    'You may explain concepts but should encourage the student to apply them independently.',
  L3:
    'AUTONOMY LEVEL L3 (Direct Explanation): You may provide complete, direct explanations of concepts. ' +
    'Give clear answers with examples. The student is in review/practice mode and benefits from direct instruction.',
};

const BASE_INSTRUCTIONS =
  'You are an AI tutor for a university course. Your role is to help the student understand course concepts.\n' +
  'IMPORTANT RULES:\n' +
  '- Reference ONLY the provided course materials. If a question falls outside the available content, clearly state that.\n' +
  '- Do NOT generate content unrelated to the course subject matter.\n' +
  '- Do NOT provide personal advice or harmful content.\n' +
  '- Do NOT complete graded assignments for the student. Guide them toward understanding instead.\n' +
  '- Always refer to the learner as "the student" or "you". Never use personal names or identifiers.\n' +
  '- Cite sources using numbered markers like [1], [2] when referencing course materials.';

// ─── Academic Integrity Detection ───────────────────────────────────────────

const INTEGRITY_PATTERNS: Array<{ pattern: RegExp; label: string; weight: number }> = [
  { pattern: /\bgive\s+me\s+the\s+answer/i, label: 'give me the answer', weight: 3 },
  { pattern: /\bjust\s+tell\s+me\s+the\s+answer/i, label: 'just tell me the answer', weight: 3 },
  { pattern: /\bwrite\s+my\s+essay/i, label: 'write my essay', weight: 3 },
  { pattern: /\bdo\s+my\s+homework/i, label: 'do my homework', weight: 3 },
  { pattern: /\bsolve\s+this\s+for\s+me/i, label: 'solve this for me', weight: 3 },
  { pattern: /\bcomplete\s+this\s+assignment/i, label: 'complete this assignment', weight: 3 },
  { pattern: /\bwrite\s+the\s+code\s+for\s+me/i, label: 'write the code for me', weight: 3 },
  { pattern: /\bfinish\s+(this|my)\s+(assignment|homework|essay|project)/i, label: 'finish my assignment', weight: 3 },
  { pattern: /\bdo\s+(this|my)\s+(assignment|homework|essay|project)\s+for\s+me/i, label: 'do my assignment for me', weight: 3 },
  { pattern: /\banswer\s+key\b/i, label: 'answer key', weight: 2 },
  { pattern: /\bcheat\b/i, label: 'cheat', weight: 2 },
  { pattern: /\bgive\s+me\s+(?:the\s+)?(?:full\s+)?solution/i, label: 'give me the solution', weight: 2 },
  { pattern: /\bjust\s+give\s+me\b/i, label: 'just give me', weight: 1 },
  { pattern: /\btell\s+me\s+the\s+answer/i, label: 'tell me the answer', weight: 1 },
  { pattern: /\bdo\s+it\s+for\s+me/i, label: 'do it for me', weight: 1 },
];

function detectIntegrity(text: string): { detected: boolean; patterns: string[] } {
  const matched: string[] = [];
  for (const entry of INTEGRITY_PATTERNS) {
    entry.pattern.lastIndex = 0;
    if (entry.pattern.test(text)) {
      matched.push(entry.label);
    }
  }
  const totalWeight = matched.reduce((sum, label) => {
    const p = INTEGRITY_PATTERNS.find((e) => e.label === label);
    return sum + (p?.weight ?? 0);
  }, 0);
  return { detected: totalWeight >= 2, patterns: matched };
}

// ─── PII Stripping ──────────────────────────────────────────────────────────

const PII_PATTERNS = [
  { pattern: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, label: 'EMAIL' },
  { pattern: /\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/g, label: 'PHONE' },
];

function stripPII(text: string): string {
  let result = text;
  for (const { pattern, label } of PII_PATTERNS) {
    pattern.lastIndex = 0;
    result = result.replace(pattern, `[REDACTED_${label}]`);
  }
  return result;
}

// ─── Validation ─────────────────────────────────────────────────────────────

function validateRequest(body: unknown): { valid: true; data: ChatRequest } | { valid: false; error: string } {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Request body must be a JSON object' };
  }

  const b = body as Record<string, unknown>;

  if (!b.message || typeof b.message !== 'string') {
    return { valid: false, error: 'message is required and must be a string' };
  }
  if (b.message.length === 0) {
    return { valid: false, error: 'message cannot be empty' };
  }
  if (b.message.length > MAX_MESSAGE_LENGTH) {
    return { valid: false, error: `message cannot exceed ${MAX_MESSAGE_LENGTH} characters` };
  }

  if (b.conversation_id !== undefined && typeof b.conversation_id !== 'string') {
    return { valid: false, error: 'conversation_id must be a string UUID' };
  }
  if (b.course_id !== undefined && typeof b.course_id !== 'string') {
    return { valid: false, error: 'course_id must be a string UUID' };
  }
  if (!b.conversation_id && !b.course_id) {
    return { valid: false, error: 'Either conversation_id or course_id is required' };
  }

  const validPersonas: TutorPersona[] = ['socratic_guide', 'step_by_step_coach', 'quick_explainer'];
  if (b.persona !== undefined && !validPersonas.includes(b.persona as TutorPersona)) {
    return { valid: false, error: `persona must be one of: ${validPersonas.join(', ')}` };
  }

  if (b.image_urls !== undefined) {
    if (!Array.isArray(b.image_urls)) return { valid: false, error: 'image_urls must be an array' };
    if (b.image_urls.length > MAX_IMAGES) return { valid: false, error: `Maximum ${MAX_IMAGES} images allowed` };
  }

  const validAutonomy = ['L1', 'L3'];
  if (b.autonomy_override !== undefined && !validAutonomy.includes(b.autonomy_override as string)) {
    return { valid: false, error: 'autonomy_override must be L1 or L3' };
  }

  return {
    valid: true,
    data: {
      conversation_id: b.conversation_id as string | undefined,
      course_id: b.course_id as string | undefined,
      message: b.message as string,
      persona: b.persona as TutorPersona | undefined,
      image_urls: b.image_urls as string[] | undefined,
      document_url: typeof b.document_url === 'string' ? b.document_url : undefined,
      clo_scope: Array.isArray(b.clo_scope) ? b.clo_scope as string[] : undefined,
      autonomy_override: b.autonomy_override as 'L1' | 'L3' | undefined,
    },
  };
}

// ─── SSE Helpers ────────────────────────────────────────────────────────────

function sseEvent(type: string, data: unknown): string {
  return `data: ${JSON.stringify({ type, data })}\n\n`;
}

function sseError(code: string, message: string): string {
  return sseEvent('error', { code, message });
}

// ─── Retry with Exponential Backoff ─────────────────────────────────────────

async function fetchWithRetry(
  url: string,
  options: RequestInit,
  maxRetries: number = MAX_RETRIES,
  initialDelay: number = INITIAL_RETRY_DELAY_MS,
): Promise<Response> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);
      if (response.ok || response.status < 500) return response;

      // Server error — retry
      lastError = new Error(`HTTP ${response.status}: ${response.statusText}`);
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
    }

    if (attempt < maxRetries) {
      const delay = initialDelay * Math.pow(2, attempt);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError ?? new Error('Request failed after retries');
}

// ─── Autonomy Level Resolution ──────────────────────────────────────────────

interface AutonomyConfig {
  assignmentLevel?: AutonomyLevel;
  cloLevel?: AutonomyLevel;
  studentOverride?: 'L1' | 'L3';
}

function resolveAutonomyLevel(config: AutonomyConfig): AutonomyLevel {
  // Teacher ceiling: assignment config takes precedence over CLO config
  const teacherCeiling = config.assignmentLevel ?? config.cloLevel ?? 'L2';

  if (!config.studentOverride) return teacherCeiling;

  // Student override cannot exceed teacher ceiling
  const levelOrder: AutonomyLevel[] = ['L1', 'L2', 'L3'];
  const ceilingIdx = levelOrder.indexOf(teacherCeiling);
  const overrideIdx = levelOrder.indexOf(config.studentOverride);

  return overrideIdx <= ceilingIdx ? config.studentOverride : teacherCeiling;
}


// ─── System Prompt Assembly ─────────────────────────────────────────────────

interface CLOAttainment {
  clo_id: string;
  clo_title: string;
  bloom_level: string;
  attainment_percent: number;
}

interface RAGChunk {
  chunk_id: string;
  chunk_text: string;
  source_filename: string;
  material_type: string;
  similarity_score: number;
}

function buildSystemPrompt(
  persona: TutorPersona,
  autonomyLevel: AutonomyLevel,
  cloAttainments: CLOAttainment[],
  ragChunks: RAGChunk[],
): string {
  const sections: string[] = [];

  // Base instructions
  sections.push(BASE_INSTRUCTIONS);

  // Persona
  sections.push(`## Persona: ${persona.replace(/_/g, ' ')}`);
  sections.push(PERSONA_PROMPTS[persona]);

  // Autonomy level
  sections.push('## Autonomy Level');
  sections.push(AUTONOMY_PROMPTS[autonomyLevel]);

  // CLO context
  if (cloAttainments.length > 0) {
    sections.push('## Student CLO Attainment');
    const gaps = cloAttainments.filter((a) => a.attainment_percent < 70);
    for (const a of cloAttainments) {
      const gapMarker = a.attainment_percent < 70 ? ' [COMPETENCY GAP]' : '';
      sections.push(
        `- ${stripPII(a.clo_title)} (Bloom: ${a.bloom_level}): ${a.attainment_percent}%${gapMarker}`,
      );
    }
    if (gaps.length > 0) {
      sections.push('\n## Competency Gaps (below 70%)');
      sections.push('Focus your tutoring on these areas:');
      for (const g of gaps) {
        sections.push(`- ${stripPII(g.clo_title)}: ${g.attainment_percent}% (Bloom: ${g.bloom_level})`);
      }
    }
  } else {
    sections.push('No CLO attainment data is available for this student.');
  }

  // RAG chunks
  if (ragChunks.length > 0) {
    sections.push('## Relevant Course Materials');
    sections.push('Use ONLY the following course material excerpts to ground your response. Cite sources using [N] markers.');
    for (let i = 0; i < ragChunks.length; i++) {
      const chunk = ragChunks[i];
      sections.push(`\n[${i + 1}] Source: ${stripPII(chunk.source_filename)} (${chunk.material_type})`);
      sections.push(stripPII(chunk.chunk_text));
    }
  } else {
    sections.push('No relevant course materials were found for this query.');
  }

  return stripPII(sections.join('\n\n'));
}

// ─── OpenAI Embedding Generation ────────────────────────────────────────────

async function generateEmbedding(text: string): Promise<number[]> {
  const apiKey = Deno.env.get('OPENAI_API_KEY');
  if (!apiKey) throw new Error('OPENAI_API_KEY not configured');

  const response = await fetchWithRetry(
    'https://api.openai.com/v1/embeddings',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'text-embedding-ada-002',
        input: text.slice(0, 8000), // Truncate to avoid token limits
      }),
    },
  );

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(`Embedding API error: ${(err as Record<string, unknown>).error ?? response.statusText}`);
  }

  const result = await response.json();
  return result.data[0].embedding;
}

// ─── Main Handler ───────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  // ── Parse and validate request ──────────────────────────────────────────

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return new Response(
      JSON.stringify({ error: 'Invalid JSON body' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  const validation = validateRequest(body);
  if (!validation.valid) {
    return new Response(
      JSON.stringify({ error: validation.error }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  const chatReq = validation.data;

  // ── Task 3.1.1: JWT validation and course enrollment check ──────────────

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  // Validate JWT from Authorization header
  const authHeader = req.headers.get('Authorization') ?? '';
  if (!authHeader.startsWith('Bearer ')) {
    return new Response(
      JSON.stringify({ error: 'Missing or invalid Authorization header' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  const token = authHeader.replace('Bearer ', '');
  const userClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: `Bearer ${token}` } } },
  );

  const { data: { user }, error: authError } = await userClient.auth.getUser();
  if (authError || !user) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized: invalid or expired token' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  const studentId = user.id;

  // Fetch student profile for institution_id
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, institution_id, role')
    .eq('id', studentId)
    .maybeSingle();

  if (profileError || !profile) {
    return new Response(
      JSON.stringify({ error: 'Student profile not found' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  if (profile.role !== 'student') {
    return new Response(
      JSON.stringify({ error: 'Only students can use the AI tutor' }),
      { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  const institutionId = profile.institution_id;

  // Determine course_id from conversation or request
  let courseId = chatReq.course_id;
  let conversationId = chatReq.conversation_id;
  let existingConversation: Record<string, unknown> | null = null;

  if (conversationId) {
    // Load existing conversation
    const { data: conv, error: convError } = await supabase
      .from('tutor_conversations')
      .select('*')
      .eq('id', conversationId)
      .eq('student_id', studentId)
      .maybeSingle();

    if (convError || !conv) {
      return new Response(
        JSON.stringify({ error: 'Conversation not found or access denied' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    existingConversation = conv as Record<string, unknown>;
    courseId = conv.course_id as string;
  }

  // Verify course enrollment
  if (courseId) {
    const { data: enrollment, error: enrollError } = await supabase
      .from('student_courses')
      .select('id')
      .eq('student_id', studentId)
      .eq('course_id', courseId)
      .maybeSingle();

    if (enrollError || !enrollment) {
      return new Response(
        JSON.stringify({ error: 'You are not enrolled in this course' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }
  }

  // ── Task 3.1.2: Rate limit and token budget check ───────────────────────

  const today = new Date().toISOString().slice(0, 10);

  const { data: usageRecord } = await supabase
    .from('tutor_usage_limits')
    .select('id, message_count, token_count')
    .eq('student_id', studentId)
    .eq('usage_date', today)
    .maybeSingle();

  const currentMessageCount = (usageRecord?.message_count as number) ?? 0;
  const currentTokenCount = (usageRecord?.token_count as number) ?? 0;

  // Fetch institution-level limits (or use defaults)
  const { data: instSettings } = await supabase
    .from('institution_settings')
    .select('tutor_daily_message_limit, tutor_daily_token_budget')
    .eq('institution_id', institutionId)
    .maybeSingle();

  const dailyMessageLimit = (instSettings?.tutor_daily_message_limit as number) ?? DEFAULT_DAILY_MESSAGE_LIMIT;
  const dailyTokenBudget = (instSettings?.tutor_daily_token_budget as number) ?? DEFAULT_DAILY_TOKEN_BUDGET;

  if (currentMessageCount >= dailyMessageLimit) {
    return new Response(
      JSON.stringify({ error: 'Daily message limit reached. It resets at midnight.' }),
      { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  if (currentTokenCount >= dailyTokenBudget) {
    return new Response(
      JSON.stringify({ error: 'Daily token budget exceeded. It resets at midnight.' }),
      { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  // ── Begin SSE streaming response ────────────────────────────────────────

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (type: string, data: unknown) => {
        controller.enqueue(encoder.encode(sseEvent(type, data)));
      };

      const sendError = (code: string, message: string) => {
        controller.enqueue(encoder.encode(sseError(code, message)));
        controller.close();
      };

      try {
        // ── Task 3.1.9: Academic integrity detection ────────────────────

        const integrityResult = detectIntegrity(chatReq.message);
        const flaggedIntegrity = integrityResult.detected;

        // ── Task 3.1.3: Query embedding generation ──────────────────────

        let queryEmbedding: number[];
        try {
          queryEmbedding = await generateEmbedding(chatReq.message);
        } catch (err) {
          sendError('EMBEDDING_FAILED', `Failed to generate query embedding: ${(err as Error).message}`);
          return;
        }

        // ── Task 3.1.4: pgvector similarity search ──────────────────────

        let citations: SourceCitation[] = [];
        if (courseId) {
          const embeddingStr = `[${queryEmbedding.join(',')}]`;

          const { data: searchResults, error: searchError } = await supabase.rpc(
            'search_course_materials',
            {
              query_embedding: embeddingStr,
              match_threshold: SIMILARITY_THRESHOLD,
              match_count: TOP_K_CHUNKS,
              filter_course_id: courseId,
            },
          );

          if (searchError) {
            console.error('Vector search error:', searchError.message);
            // Non-fatal: continue without RAG context
          }

          if (searchResults && Array.isArray(searchResults)) {
            citations = searchResults.map((r: Record<string, unknown>) => ({
              chunk_id: r.id as string,
              chunk_text: r.chunk_text as string,
              source_filename: r.source_filename as string,
              material_type: r.material_type as string,
              similarity_score: r.similarity as number,
            }));
          }
        }

        // ── Task 3.1.5: CLO attainment fetch and system prompt assembly ─

        let cloAttainments: CLOAttainment[] = [];
        if (courseId) {
          // Fetch CLOs for the course
          const { data: clos } = await supabase
            .from('clos')
            .select('id, title, bloom_level, tutor_autonomy_level')
            .eq('course_id', courseId);

          const cloIds = (clos ?? []).map((c: Record<string, unknown>) => c.id as string);

          // Fetch attainment for these CLOs
          if (cloIds.length > 0) {
            const { data: attainments } = await supabase
              .from('outcome_attainment')
              .select('outcome_id, attainment_percentage')
              .eq('student_id', studentId)
              .in('outcome_id', cloIds)
              .eq('scope', 'clo');

            const attainmentMap = new Map<string, number>();
            for (const a of (attainments ?? [])) {
              attainmentMap.set(a.outcome_id as string, a.attainment_percentage as number);
            }

            cloAttainments = (clos ?? []).map((c: Record<string, unknown>) => ({
              clo_id: c.id as string,
              clo_title: c.title as string,
              bloom_level: (c.bloom_level as string) ?? 'Unknown',
              attainment_percent: attainmentMap.get(c.id as string) ?? 0,
            }));
          }
        }

        // Resolve autonomy level
        const autonomyConfig: AutonomyConfig = {
          studentOverride: chatReq.autonomy_override,
        };

        // Check assignment-level autonomy if CLO scope is provided
        if (chatReq.clo_scope && chatReq.clo_scope.length > 0) {
          const { data: assignments } = await supabase
            .from('assignments')
            .select('tutor_autonomy_level')
            .contains('clo_ids', chatReq.clo_scope)
            .limit(1);

          if (assignments && assignments.length > 0) {
            autonomyConfig.assignmentLevel = assignments[0].tutor_autonomy_level as AutonomyLevel;
          }
        }

        // Check CLO-level autonomy
        if (chatReq.clo_scope && chatReq.clo_scope.length > 0) {
          const { data: cloConfig } = await supabase
            .from('clos')
            .select('tutor_autonomy_level')
            .in('id', chatReq.clo_scope)
            .limit(1);

          if (cloConfig && cloConfig.length > 0) {
            autonomyConfig.cloLevel = cloConfig[0].tutor_autonomy_level as AutonomyLevel;
          }
        }

        const resolvedAutonomy = resolveAutonomyLevel(autonomyConfig);

        // Determine persona
        const persona: TutorPersona = chatReq.persona ??
          (existingConversation?.persona as TutorPersona) ?? 'socratic_guide';

        // Build RAG chunks for prompt
        const ragChunks: RAGChunk[] = citations.map((c) => ({
          chunk_id: c.chunk_id,
          chunk_text: c.chunk_text,
          source_filename: c.source_filename,
          material_type: c.material_type,
          similarity_score: c.similarity_score,
        }));

        const systemPrompt = buildSystemPrompt(persona, resolvedAutonomy, cloAttainments, ragChunks);

        // Fetch conversation history (last 10 messages)
        let conversationMessages: Array<{ role: string; content: string }> = [];
        if (conversationId) {
          const { data: history } = await supabase
            .from('tutor_messages')
            .select('role, content')
            .eq('conversation_id', conversationId)
            .order('created_at', { ascending: true })
            .limit(MAX_CONTEXT_MESSAGES);

          conversationMessages = (history ?? []).map((m: Record<string, unknown>) => ({
            role: m.role as string,
            content: stripPII(m.content as string),
          }));
        }

        // Create conversation if new
        if (!conversationId) {
          const title = chatReq.message.slice(0, 200);
          const { data: newConv, error: createError } = await supabase
            .from('tutor_conversations')
            .insert({
              student_id: studentId,
              institution_id: institutionId,
              course_id: courseId,
              persona,
              title,
              clo_scope: chatReq.clo_scope ?? [],
              autonomy_override: chatReq.autonomy_override ?? null,
            })
            .select('id')
            .single();

          if (createError || !newConv) {
            sendError('CONVERSATION_CREATE_FAILED', 'Failed to create conversation');
            return;
          }

          conversationId = newConv.id as string;
        } else if (chatReq.autonomy_override) {
          // Update autonomy override on existing conversation
          await supabase
            .from('tutor_conversations')
            .update({ autonomy_override: chatReq.autonomy_override })
            .eq('id', conversationId);
        }

        // ── Task 3.1.6: LLM streaming via OpenRouter with SSE ──────────

        const openRouterKey = Deno.env.get('OPENROUTER_API_KEY');
        const primaryModel = Deno.env.get('TUTOR_PRIMARY_MODEL') ?? 'openai/gpt-4o-mini';
        const fallbackModel = Deno.env.get('TUTOR_FALLBACK_MODEL') ?? 'deepseek/deepseek-chat';

        if (!openRouterKey) {
          sendError('CONFIG_ERROR', 'OpenRouter API key not configured');
          return;
        }

        // Build LLM messages array
        const llmMessages: Array<{ role: string; content: string }> = [
          { role: 'system', content: systemPrompt },
          ...conversationMessages,
          { role: 'user', content: stripPII(chatReq.message) },
        ];

        const startTime = Date.now();
        let modelUsed = primaryModel;
        let llmResponse: Response | null = null;
        let promptTokens = 0;
        let completionTokens = 0;

        // Try primary model, then fallback (Task 3.1.11)
        for (const model of [primaryModel, fallbackModel]) {
          try {
            llmResponse = await fetchWithRetry(
              'https://openrouter.ai/api/v1/chat/completions',
              {
                method: 'POST',
                headers: {
                  Authorization: `Bearer ${openRouterKey}`,
                  'Content-Type': 'application/json',
                  'HTTP-Referer': Deno.env.get('SUPABASE_URL') ?? '',
                },
                body: JSON.stringify({
                  model,
                  messages: llmMessages,
                  stream: true,
                  max_tokens: 2000,
                  temperature: 0.7,
                }),
              },
            );

            if (llmResponse.ok) {
              modelUsed = model;
              break;
            }
          } catch (err) {
            console.error(`Model ${model} failed:`, (err as Error).message);
            if (model === fallbackModel) {
              sendError('LLM_UNAVAILABLE', 'The AI Tutor is temporarily unavailable. Please try again in a few minutes.');
              // Log the outage
              await supabase.from('tutor_llm_logs').insert({
                institution_id: institutionId,
                student_id: studentId,
                conversation_id: conversationId,
                model_used: model,
                prompt_tokens: 0,
                completion_tokens: 0,
                total_tokens: 0,
                latency_ms: Date.now() - startTime,
                status: 'error',
                error_message: (err as Error).message,
              });
              return;
            }
          }
        }

        if (!llmResponse || !llmResponse.ok) {
          sendError('LLM_UNAVAILABLE', 'The AI Tutor is temporarily unavailable. Please try again in a few minutes.');
          return;
        }

        // Stream the LLM response
        const reader = llmResponse.body?.getReader();
        if (!reader) {
          sendError('NO_STREAM', 'No response stream from LLM');
          return;
        }

        const decoder = new TextDecoder();
        let buffer = '';
        let fullResponse = '';

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() ?? '';

            for (const line of lines) {
              if (!line.startsWith('data: ')) continue;
              const jsonStr = line.slice(6).trim();
              if (jsonStr === '[DONE]') continue;

              try {
                const parsed = JSON.parse(jsonStr);
                const delta = parsed.choices?.[0]?.delta?.content;
                if (delta) {
                  fullResponse += delta;
                  send('token', delta);
                }

                // Track token usage from stream metadata
                if (parsed.usage) {
                  promptTokens = parsed.usage.prompt_tokens ?? 0;
                  completionTokens = parsed.usage.completion_tokens ?? 0;
                }
              } catch {
                // Skip malformed SSE lines
              }
            }
          }
        } finally {
          reader.releaseLock();
        }

        const latencyMs = Date.now() - startTime;

        // Estimate tokens if not provided by the API
        if (promptTokens === 0) {
          promptTokens = Math.ceil(systemPrompt.length / 4) +
            conversationMessages.reduce((sum, m) => sum + Math.ceil(m.content.length / 4), 0) +
            Math.ceil(chatReq.message.length / 4);
        }
        if (completionTokens === 0) {
          completionTokens = Math.ceil(fullResponse.length / 4);
        }
        const totalTokens = promptTokens + completionTokens;

        // Send citations
        if (citations.length > 0) {
          send('citations', citations);
        }

        // ── Task 3.1.7: Message persistence ─────────────────────────────

        // Persist user message
        await supabase.from('tutor_messages').insert({
          conversation_id: conversationId,
          role: 'user',
          content: chatReq.message,
          image_urls: chatReq.image_urls ?? [],
          document_url: chatReq.document_url ?? null,
          token_count: Math.ceil(chatReq.message.length / 4),
          flagged_integrity: flaggedIntegrity,
          autonomy_level: resolvedAutonomy,
          nudge_type: null,
        });

        // Persist assistant message
        const { data: assistantMsg } = await supabase
          .from('tutor_messages')
          .insert({
            conversation_id: conversationId,
            role: 'assistant',
            content: fullResponse,
            source_citations: citations,
            token_count: completionTokens,
            flagged_integrity: false,
            autonomy_level: resolvedAutonomy,
            nudge_type: null,
          })
          .select('id')
          .single();

        const assistantMessageId = (assistantMsg?.id as string) ?? '';

        // Update conversation message count and updated_at
        const newMessageCount = (existingConversation?.message_count as number ?? 0) + 2;
        await supabase
          .from('tutor_conversations')
          .update({
            message_count: newMessageCount,
            updated_at: new Date().toISOString(),
          })
          .eq('id', conversationId);

        // ── Task 3.1.8: Usage counter increment and LLM call logging ────

        // Upsert usage limits
        if (usageRecord?.id) {
          await supabase
            .from('tutor_usage_limits')
            .update({
              message_count: currentMessageCount + 1,
              token_count: currentTokenCount + totalTokens,
            })
            .eq('id', usageRecord.id);
        } else {
          await supabase.from('tutor_usage_limits').insert({
            student_id: studentId,
            institution_id: institutionId,
            usage_date: today,
            message_count: 1,
            token_count: totalTokens,
          });
        }

        // Log LLM call
        await supabase.from('tutor_llm_logs').insert({
          institution_id: institutionId,
          student_id: studentId,
          conversation_id: conversationId,
          model_used: modelUsed,
          prompt_tokens: promptTokens,
          completion_tokens: completionTokens,
          total_tokens: totalTokens,
          latency_ms: latencyMs,
          status: 'success',
          error_message: null,
        });

        // ── Task 3.1.10: XP award trigger ───────────────────────────────

        const xpAlreadyAwarded = (existingConversation?.xp_awarded as boolean) ?? false;
        if (!xpAlreadyAwarded && newMessageCount >= XP_THRESHOLD_MESSAGES * 2) {
          // Award XP via the award-xp edge function (server-to-server call)
          try {
            const xpUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/award-xp`;
            await fetch(xpUrl, {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
                'Content-Type': 'application/json',
                apikey: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
              },
              body: JSON.stringify({
                student_id: studentId,
                xp_amount: TUTOR_ENGAGEMENT_XP,
                source: 'tutor_engagement',
                reference_id: conversationId,
                note: 'AI Tutor engagement (3+ messages)',
              }),
            });

            // Mark conversation as XP awarded
            await supabase
              .from('tutor_conversations')
              .update({ xp_awarded: true })
              .eq('id', conversationId);
          } catch (xpErr) {
            console.error('XP award failed (non-blocking):', (xpErr as Error).message);
          }
        }

        // ── Task 15.3: 5-interaction CLO trigger check for plan updates ──

        if (courseId && chatReq.clo_scope && chatReq.clo_scope.length > 0) {
          try {
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

            for (const scopedCloId of chatReq.clo_scope) {
              // Count interactions on this CLO in the last 7 days
              const { data: cloConversations } = await supabase
                .from('tutor_conversations')
                .select('id, message_count')
                .eq('student_id', studentId)
                .eq('course_id', courseId)
                .contains('clo_scope', [scopedCloId])
                .gte('updated_at', sevenDaysAgo.toISOString());

              const totalInteractions = (cloConversations ?? []).reduce(
                (sum: number, c: Record<string, unknown>) => sum + ((c.message_count as number) ?? 0),
                0,
              );

              // Check acceptance rate to determine threshold (Requirement 25.3)
              let triggerThreshold = 5;
              const { data: recentUpdates } = await supabase
                .from('tutor_plan_updates')
                .select('response')
                .eq('student_id', studentId)
                .eq('clo_id', scopedCloId)
                .order('created_at', { ascending: false })
                .limit(10);

              if (recentUpdates && recentUpdates.length >= 10) {
                const acceptedCount = recentUpdates.filter(
                  (u: Record<string, unknown>) => u.response === 'accepted',
                ).length;
                const acceptanceRate = acceptedCount / recentUpdates.length;
                if (acceptanceRate < 0.3) {
                  triggerThreshold = 10; // Reduce frequency for low acceptance
                }
              }

              // Check if we already generated a plan update recently for this CLO
              const { data: existingUpdate } = await supabase
                .from('tutor_plan_updates')
                .select('id')
                .eq('student_id', studentId)
                .eq('clo_id', scopedCloId)
                .gte('created_at', sevenDaysAgo.toISOString())
                .limit(1);

              if (
                totalInteractions >= triggerThreshold &&
                (!existingUpdate || existingUpdate.length === 0)
              ) {
                // Invoke generate-plan-update Edge Function
                const planUpdateUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/generate-plan-update`;
                const planResponse = await fetch(planUpdateUrl, {
                  method: 'POST',
                  headers: {
                    Authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
                    'Content-Type': 'application/json',
                    apikey: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
                  },
                  body: JSON.stringify({
                    student_id: studentId,
                    clo_id: scopedCloId,
                    course_id: courseId,
                    conversation_id: conversationId,
                    institution_id: institutionId,
                    recent_interaction_count: totalInteractions,
                  }),
                });

                if (planResponse.ok) {
                  const planUpdate = await planResponse.json();
                  send('plan_update', planUpdate);
                }
              }
            }
          } catch (planErr) {
            console.error('Plan update check failed (non-blocking):', (planErr as Error).message);
          }
        }

        // ── Task 16.2: Auto-select persona for new conversations ────────

        // (Persona auto-selection is handled during conversation creation above
        //  via the persona resolution logic. The Big Five profile fetch and
        //  mapping is done in the client-side hook before creating the conversation.)

        // ── Task 17.2: Same-topic detection and independence nudge ───────

        if (conversationId) {
          try {
            const { data: lastThreeUserMsgs } = await supabase
              .from('tutor_messages')
              .select('content')
              .eq('conversation_id', conversationId)
              .eq('role', 'user')
              .order('created_at', { ascending: false })
              .limit(3);

            if (lastThreeUserMsgs && lastThreeUserMsgs.length >= 3) {
              // Simple same-topic detection: check if the last 3 user messages
              // share significant word overlap (>40% shared keywords)
              const extractKeywords = (text: string): Set<string> => {
                const stopWords = new Set([
                  'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been',
                  'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will',
                  'would', 'could', 'should', 'may', 'might', 'can', 'shall',
                  'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from',
                  'this', 'that', 'these', 'those', 'it', 'its', 'i', 'me',
                  'my', 'we', 'our', 'you', 'your', 'he', 'she', 'they',
                  'what', 'how', 'why', 'when', 'where', 'which', 'who',
                  'and', 'or', 'but', 'not', 'no', 'so', 'if', 'about',
                ]);
                return new Set(
                  text
                    .toLowerCase()
                    .replace(/[^a-z0-9\s]/g, '')
                    .split(/\s+/)
                    .filter((w) => w.length > 2 && !stopWords.has(w)),
                );
              };

              const msgs = lastThreeUserMsgs.map((m: Record<string, unknown>) => m.content as string);
              const kw1 = extractKeywords(msgs[0]);
              const kw2 = extractKeywords(msgs[1]);
              const kw3 = extractKeywords(msgs[2]);

              const allKeywords = new Set([...kw1, ...kw2, ...kw3]);
              const sharedKeywords = [...allKeywords].filter(
                (w) => kw1.has(w) && kw2.has(w) && kw3.has(w),
              );

              const overlapRatio = allKeywords.size > 0
                ? sharedKeywords.length / Math.min(kw1.size, kw2.size, kw3.size || 1)
                : 0;

              if (overlapRatio > 0.4) {
                const nudgeMessage =
                  "You're making good progress on this topic. Try working through the next step " +
                  "on your own — I believe you can do it. I'm here if you get stuck.";

                send('independence_nudge', { message: nudgeMessage });

                // Log the nudge in tutor_messages
                await supabase.from('tutor_messages').insert({
                  conversation_id: conversationId,
                  role: 'assistant',
                  content: nudgeMessage,
                  token_count: 0,
                  flagged_integrity: false,
                  autonomy_level: resolvedAutonomy,
                  nudge_type: 'independence',
                });
              }
            }
          } catch (nudgeErr) {
            console.error('Independence nudge check failed (non-blocking):', (nudgeErr as Error).message);
          }
        }

        // ── Task 18.2: Handoff trigger detection ────────────────────────

        if (conversationId && courseId) {
          try {
            let shouldSuggestHandoff = false;
            let handoffReason = '';

            // Check 1: Low RAG confidence (avg similarity < 0.7 for last 3 responses)
            if (citations.length > 0) {
              const avgSimilarity = citations.reduce((sum, c) => sum + c.similarity_score, 0) / citations.length;
              if (avgSimilarity < SIMILARITY_THRESHOLD) {
                shouldSuggestHandoff = true;
                handoffReason = "I'm having trouble finding relevant course materials for this topic. Your teacher may be able to help.";
              }
            } else if (courseId) {
              // No citations found at all
              shouldSuggestHandoff = true;
              handoffReason = "I couldn't find relevant course materials for your question. Your teacher may have additional resources.";
            }

            // Check 2: 3 consecutive thumbs-down ratings
            if (!shouldSuggestHandoff) {
              const { data: recentRatings } = await supabase
                .from('tutor_messages')
                .select('satisfaction_rating')
                .eq('conversation_id', conversationId)
                .eq('role', 'assistant')
                .not('satisfaction_rating', 'is', null)
                .order('created_at', { ascending: false })
                .limit(3);

              if (recentRatings && recentRatings.length >= 3) {
                const allNegative = recentRatings.every(
                  (r: Record<string, unknown>) => r.satisfaction_rating === 'thumbs_down',
                );
                if (allNegative) {
                  shouldSuggestHandoff = true;
                  handoffReason = "It seems like my responses haven't been helpful. Your teacher can provide more targeted guidance.";
                }
              }
            }

            if (shouldSuggestHandoff) {
              send('handoff_suggestion', {
                reason: handoffReason,
                message: 'Would you like to connect with your teacher for additional help?',
              });
            }
          } catch (handoffErr) {
            console.error('Handoff detection failed (non-blocking):', (handoffErr as Error).message);
          }
        }

        // Send done event
        send('done', {
          message_id: assistantMessageId,
          tokens_used: totalTokens,
        });

        controller.close();
      } catch (err) {
        console.error('Chat handler error:', (err as Error).message);
        try {
          controller.enqueue(encoder.encode(sseError('INTERNAL_ERROR', 'An unexpected error occurred')));
        } catch {
          // Controller may already be closed
        }
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      ...corsHeaders,
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
});