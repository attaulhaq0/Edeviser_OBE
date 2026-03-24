import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const allowedOrigin = Deno.env.get('ALLOWED_ORIGIN') ?? 'https://edeviser.vercel.app';

const corsHeaders = {
  'Access-Control-Allow-Origin': allowedOrigin,
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ─── Types ──────────────────────────────────────────────────────────────────

type QuestionType = 'mcq' | 'true_false' | 'short_answer' | 'fill_in_blank';

interface GenerateQuestionsRequest {
  course_id: string;
  clo_ids: string[];
  bloom_levels: number[];
  question_count: number;
  question_types: QuestionType[];
}

interface ChunkReference {
  chunk_id: string;
  chunk_text: string;
  source_filename: string;
  similarity_score: number;
}

interface MCQOption {
  key: string;
  text: string;
  is_correct: boolean;
}

interface CorrectAnswer {
  value: string | string[];
  explanation: string;
}

interface LLMGeneratedQuestion {
  clo_id: string;
  bloom_level: number;
  question_type: QuestionType;
  question_text: string;
  options: MCQOption[] | null;
  correct_answer: CorrectAnswer;
  explanation: string;
  difficulty_rating: number;
}

interface GeneratedQuestion extends LLMGeneratedQuestion {
  id: string;
  source_chunks: ChunkReference[];
}

// ─── Constants ──────────────────────────────────────────────────────────────

const VALID_QUESTION_TYPES: QuestionType[] = ['mcq', 'true_false', 'short_answer', 'fill_in_blank'];
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const LLM_MODEL = 'openai/gpt-4o-mini';
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MIN_CHUNKS_THRESHOLD = 3;
const LLM_RETRY_DELAY_MS = 2000;

// ─── Bloom's Level Labels ───────────────────────────────────────────────────

const BLOOM_LABELS: Record<number, string> = {
  1: 'Remembering',
  2: 'Understanding',
  3: 'Applying',
  4: 'Analyzing',
  5: 'Evaluating',
  6: 'Creating',
};

// ─── Validation ─────────────────────────────────────────────────────────────

function isValidUUID(value: unknown): value is string {
  return typeof value === 'string' && UUID_REGEX.test(value);
}

function validatePayload(
  payload: unknown,
): { valid: true; data: GenerateQuestionsRequest } | { valid: false; error: string } {
  if (!payload || typeof payload !== 'object') {
    return { valid: false, error: 'Request body must be a JSON object' };
  }

  const body = payload as Record<string, unknown>;

  // course_id
  if (!isValidUUID(body.course_id)) {
    return { valid: false, error: 'course_id must be a valid UUID' };
  }

  // clo_ids
  if (!Array.isArray(body.clo_ids) || body.clo_ids.length < 1 || body.clo_ids.length > 5) {
    return { valid: false, error: 'clo_ids must be an array of 1–5 UUIDs' };
  }
  for (const id of body.clo_ids) {
    if (!isValidUUID(id)) {
      return { valid: false, error: `Invalid UUID in clo_ids: ${id}` };
    }
  }

  // bloom_levels
  if (!Array.isArray(body.bloom_levels) || body.bloom_levels.length < 1) {
    return { valid: false, error: 'bloom_levels must be a non-empty array of integers 1–6' };
  }
  for (const level of body.bloom_levels) {
    if (typeof level !== 'number' || !Number.isInteger(level) || level < 1 || level > 6) {
      return { valid: false, error: `Invalid bloom_level: ${level}. Must be an integer 1–6` };
    }
  }

  // question_count
  if (
    typeof body.question_count !== 'number' ||
    !Number.isInteger(body.question_count) ||
    body.question_count < 1 ||
    body.question_count > 50
  ) {
    return { valid: false, error: 'question_count must be an integer between 1 and 50' };
  }

  // question_types
  if (!Array.isArray(body.question_types) || body.question_types.length < 1) {
    return { valid: false, error: 'question_types must be a non-empty array' };
  }
  for (const qt of body.question_types) {
    if (!VALID_QUESTION_TYPES.includes(qt as QuestionType)) {
      return { valid: false, error: `Invalid question_type: ${qt}. Must be one of: ${VALID_QUESTION_TYPES.join(', ')}` };
    }
  }

  return {
    valid: true,
    data: {
      course_id: body.course_id as string,
      clo_ids: body.clo_ids as string[],
      bloom_levels: body.bloom_levels as number[],
      question_count: body.question_count as number,
      question_types: body.question_types as QuestionType[],
    },
  };
}

// ─── LLM Prompt Construction ────────────────────────────────────────────────

function buildLLMPrompt(
  chunks: ChunkReference[],
  bloomLevels: number[],
  questionTypes: QuestionType[],
  questionCount: number,
  cloDescriptions: Record<string, string>,
): string {
  const bloomLabels = bloomLevels.map((l) => `${l} (${BLOOM_LABELS[l]})`).join(', ');
  const typeLabels = questionTypes.join(', ');

  const cloContext = Object.entries(cloDescriptions)
    .map(([id, desc]) => `- CLO ${id}: ${desc}`)
    .join('\n');

  const chunkContext = chunks
    .map((c, i) => `[Chunk ${i + 1}] (Source: ${c.source_filename}, Similarity: ${c.similarity_score.toFixed(2)})\n${c.chunk_text}`)
    .join('\n\n');

  return `You are an expert educational assessment designer. Generate ${questionCount} quiz questions based on the provided course material.

## Target Parameters
- Bloom's Taxonomy Levels: ${bloomLabels}
- Question Types: ${typeLabels}
- Distribute questions evenly across the specified CLOs and Bloom's levels.

## Course Learning Outcomes (CLOs)
${cloContext}

## Course Material (Retrieved Chunks)
${chunkContext}

## Instructions
1. Each question MUST be grounded in the provided course material chunks.
2. For MCQ questions: generate exactly 4 options (keys A, B, C, D) with exactly 1 correct answer. Distractors must be plausible and target common student misconceptions, partial understanding, or adjacent but incorrect concepts.
3. For true_false questions: generate 2 options (keys A, B) where A = "True" and B = "False", with exactly 1 correct.
4. For short_answer and fill_in_blank questions: options should be null.
5. Each question must include a clear explanation referencing the source material.
6. Assign a difficulty_rating between 1.0 and 5.0 based on cognitive complexity.
7. Ensure no two MCQ options are semantically identical.
8. Do NOT include any student personal information in questions or explanations.

## Output Format
Return a JSON array of question objects. Each object must have:
{
  "clo_id": "<one of the provided CLO IDs>",
  "bloom_level": <integer 1-6>,
  "question_type": "<mcq|true_false|short_answer|fill_in_blank>",
  "question_text": "<the question>",
  "options": [{"key": "A", "text": "...", "is_correct": false}, ...] or null,
  "correct_answer": {"value": "<correct answer string or array>", "explanation": "<explanation>"},
  "explanation": "<detailed explanation for post-quiz review>",
  "difficulty_rating": <number 1.0-5.0>
}

Return ONLY the JSON array, no markdown fences or extra text.`;
}

// ─── OpenRouter LLM Call ────────────────────────────────────────────────────

async function callOpenRouterLLM(
  prompt: string,
  apiKey: string,
  retryCount = 1,
): Promise<{
  questions: LLMGeneratedQuestion[];
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}> {
  const requestBody = {
    model: LLM_MODEL,
    messages: [
      { role: 'system', content: 'You are an expert educational assessment designer. Always respond with valid JSON arrays only.' },
      { role: 'user', content: prompt },
    ],
    temperature: 0.7,
    max_tokens: 8000,
    response_format: { type: 'json_object' },
  };

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retryCount; attempt++) {
    if (attempt > 0) {
      // Exponential backoff: 2s initial delay
      await new Promise((resolve) => setTimeout(resolve, LLM_RETRY_DELAY_MS * attempt));
    }

    try {
      const response = await fetch(OPENROUTER_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'HTTP-Referer': 'https://edeviser.com',
          'X-Title': 'Edeviser Quiz Generator',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OpenRouter API error (${response.status}): ${errorText}`);
      }

      const result = await response.json();

      const content = result.choices?.[0]?.message?.content;
      if (!content) {
        throw new Error('Empty response from LLM');
      }

      // Parse the JSON response — handle both raw array and wrapped object
      let questions: LLMGeneratedQuestion[];
      const parsed = JSON.parse(content);

      if (Array.isArray(parsed)) {
        questions = parsed;
      } else if (parsed.questions && Array.isArray(parsed.questions)) {
        questions = parsed.questions;
      } else {
        throw new Error('LLM response is not a valid question array');
      }

      const usage = result.usage ?? {};

      return {
        questions,
        promptTokens: usage.prompt_tokens ?? 0,
        completionTokens: usage.completion_tokens ?? 0,
        totalTokens: usage.total_tokens ?? 0,
      };
    } catch (error) {
      lastError = error as Error;
      console.error(`LLM call attempt ${attempt + 1} failed:`, lastError.message);
    }
  }

  throw lastError ?? new Error('LLM call failed after retries');
}

// ─── LLM Response Validation ────────────────────────────────────────────────

function validateGeneratedQuestion(
  q: Record<string, unknown>,
  validCloIds: string[],
  _validBloomLevels: number[],
  validTypes: QuestionType[],
): { valid: true; question: LLMGeneratedQuestion } | { valid: false; reason: string } {
  // clo_id
  if (!validCloIds.includes(q.clo_id as string)) {
    return { valid: false, reason: `Invalid clo_id: ${q.clo_id}` };
  }

  // bloom_level — accept any valid Bloom's level (1-6) even if not in the requested set,
  // since the LLM may produce questions at adjacent levels for pedagogical reasons
  const bloom = q.bloom_level as number;
  if (!Number.isInteger(bloom) || bloom < 1 || bloom > 6) {
    return { valid: false, reason: `Invalid bloom_level: ${bloom}` };
  }

  // question_type
  const qType = q.question_type as QuestionType;
  if (!validTypes.includes(qType)) {
    return { valid: false, reason: `Invalid question_type: ${qType}` };
  }

  // question_text
  if (typeof q.question_text !== 'string' || q.question_text.trim().length === 0) {
    return { valid: false, reason: 'Missing or empty question_text' };
  }

  // options validation for MCQ and true_false
  if (qType === 'mcq') {
    if (!Array.isArray(q.options) || q.options.length !== 4) {
      return { valid: false, reason: 'MCQ must have exactly 4 options' };
    }
    const correctCount = (q.options as MCQOption[]).filter((o) => o.is_correct).length;
    if (correctCount !== 1) {
      return { valid: false, reason: `MCQ must have exactly 1 correct option, found ${correctCount}` };
    }
  } else if (qType === 'true_false') {
    if (!Array.isArray(q.options) || q.options.length !== 2) {
      return { valid: false, reason: 'True/false must have exactly 2 options' };
    }
    const correctCount = (q.options as MCQOption[]).filter((o) => o.is_correct).length;
    if (correctCount !== 1) {
      return { valid: false, reason: `True/false must have exactly 1 correct option, found ${correctCount}` };
    }
  }

  // correct_answer
  const ca = q.correct_answer as CorrectAnswer | null;
  if (!ca || (typeof ca.value !== 'string' && !Array.isArray(ca.value))) {
    return { valid: false, reason: 'Missing or invalid correct_answer' };
  }

  // difficulty_rating
  const diff = q.difficulty_rating as number;
  if (typeof diff !== 'number' || diff < 1.0 || diff > 5.0) {
    return { valid: false, reason: `Invalid difficulty_rating: ${diff}` };
  }

  return {
    valid: true,
    question: {
      clo_id: q.clo_id as string,
      bloom_level: bloom,
      question_type: qType,
      question_text: q.question_text as string,
      options: (qType === 'mcq' || qType === 'true_false') ? q.options as MCQOption[] : null,
      correct_answer: ca,
      explanation: typeof q.explanation === 'string' ? q.explanation : ca.explanation ?? '',
      difficulty_rating: Math.round(diff * 10) / 10, // round to 1 decimal
    },
  };
}

// ─── RAG Chunk Retrieval ────────────────────────────────────────────────────

async function retrieveCourseMaterialChunks(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  courseId: string,
  cloIds: string[],
): Promise<{ chunks: ChunkReference[]; warnings: string[] }> {
  const warnings: string[] = [];

  try {
    // Query course_material_embeddings directly filtered by course_id and clo_ids
    // Since search_course_materials requires a vector embedding, we do a direct
    // filtered query for chunks associated with the target CLOs
    const { data: chunks, error } = await supabase
      .from('course_material_embeddings')
      .select('id, chunk_text, source_filename, clo_ids, similarity:id')
      .eq('course_id', courseId)
      .eq('indexing_status', 'indexed')
      .overlaps('clo_ids', cloIds)
      .limit(10);

    if (error) {
      console.error('RAG chunk retrieval failed:', error.message);
      warnings.push('Course material retrieval failed. Questions generated using LLM general knowledge only.');
      return { chunks: [], warnings };
    }

    if (!chunks || chunks.length === 0) {
      warnings.push('No course material chunks found for the specified CLOs. Questions generated using LLM general knowledge only. Consider uploading more course content.');
      return { chunks: [], warnings };
    }

    const chunkRefs: ChunkReference[] = chunks.map((c: Record<string, unknown>) => ({
      chunk_id: c.id as string,
      chunk_text: c.chunk_text as string,
      source_filename: (c.source_filename as string) ?? 'unknown',
      similarity_score: 0.8, // Direct filter match — assign default similarity
    }));

    // Check if we have enough high-quality chunks
    if (chunkRefs.length < MIN_CHUNKS_THRESHOLD) {
      warnings.push(
        `Only ${chunkRefs.length} relevant course material chunk(s) found (minimum ${MIN_CHUNKS_THRESHOLD} recommended). ` +
        'Consider uploading more content before generating questions for better grounding.',
      );
    }

    return { chunks: chunkRefs, warnings };
  } catch (err) {
    console.error('RAG retrieval error:', (err as Error).message);
    warnings.push('Course material retrieval unavailable. Questions generated using LLM general knowledge only.');
    return { chunks: [], warnings };
  }
}

// ─── Main Handler ───────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // ── Step 1: JWT Validation ──────────────────────────────────────────

    const authHeader = req.headers.get('Authorization') ?? '';
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing Authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const userClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: { user }, error: authError } = await userClient.auth.getUser();

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const teacherId = user.id;

    // ── Step 2: Validate Request Payload ────────────────────────────────

    const body = await req.json();
    const validation = validatePayload(body);

    if (!validation.valid) {
      return new Response(
        JSON.stringify({ error: validation.error }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const { course_id, clo_ids, bloom_levels, question_count, question_types } = validation.data;

    // ── Step 3: Verify Course Ownership ─────────────────────────────────

    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('id, institution_id, teacher_id')
      .eq('id', course_id)
      .maybeSingle();

    if (courseError || !course) {
      return new Response(
        JSON.stringify({ error: 'Course not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    if (course.teacher_id !== teacherId) {
      return new Response(
        JSON.stringify({ error: 'Forbidden: you do not own this course' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const institutionId = course.institution_id;

    // ── Step 4: Fetch CLO Descriptions ──────────────────────────────────

    const { data: clos, error: closError } = await supabase
      .from('learning_outcomes')
      .select('id, title')
      .in('id', clo_ids);

    if (closError || !clos || clos.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Failed to fetch CLO details or no matching CLOs found' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const cloDescriptions: Record<string, string> = {};
    for (const clo of clos) {
      cloDescriptions[clo.id] = clo.title;
    }

    // ── Step 5: RAG Retrieval ───────────────────────────────────────────

    const { chunks, warnings } = await retrieveCourseMaterialChunks(supabase, course_id, clo_ids);

    // ── Step 6: Construct LLM Prompt & Call OpenRouter ──────────────────

    const openrouterApiKey = Deno.env.get('OPENROUTER_API_KEY');
    if (!openrouterApiKey) {
      return new Response(
        JSON.stringify({ error: 'LLM API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const prompt = buildLLMPrompt(chunks, bloom_levels, question_types, question_count, cloDescriptions);

    let llmResult: {
      questions: LLMGeneratedQuestion[];
      promptTokens: number;
      completionTokens: number;
      totalTokens: number;
    };

    const generationRequestId = crypto.randomUUID();

    try {
      llmResult = await callOpenRouterLLM(prompt, openrouterApiKey);
    } catch (llmError) {
      const latencyMs = Date.now() - startTime;

      // Log the failed generation attempt
      await supabase.from('quiz_generation_logs').insert({
        institution_id: institutionId,
        teacher_id: teacherId,
        course_id,
        generation_request_id: generationRequestId,
        model_used: LLM_MODEL,
        prompt_tokens: 0,
        completion_tokens: 0,
        total_tokens: 0,
        latency_ms: latencyMs,
        question_count_requested: question_count,
        question_count_generated: 0,
        chunks_retrieved: chunks.length,
        status: 'error',
        error_message: (llmError as Error).message,
      });

      return new Response(
        JSON.stringify({
          error: 'AI question generation failed after retries. Please try again later.',
          detail: (llmError as Error).message,
        }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // ── Step 7: Validate LLM Response ──────────────────────────────────

    const validatedQuestions: GeneratedQuestion[] = [];
    const validCloIds = clo_ids;

    for (const rawQ of llmResult.questions) {
      const result = validateGeneratedQuestion(
        rawQ as unknown as Record<string, unknown>,
        validCloIds,
        bloom_levels,
        question_types,
      );

      if (result.valid) {
        validatedQuestions.push({
          ...result.question,
          id: crypto.randomUUID(),
          source_chunks: chunks,
        });
      } else {
        console.warn('Skipping invalid LLM question:', result.reason);
      }
    }

    if (validatedQuestions.length === 0) {
      const latencyMs = Date.now() - startTime;

      await supabase.from('quiz_generation_logs').insert({
        institution_id: institutionId,
        teacher_id: teacherId,
        course_id,
        generation_request_id: generationRequestId,
        model_used: LLM_MODEL,
        prompt_tokens: llmResult.promptTokens,
        completion_tokens: llmResult.completionTokens,
        total_tokens: llmResult.totalTokens,
        latency_ms: latencyMs,
        question_count_requested: question_count,
        question_count_generated: 0,
        chunks_retrieved: chunks.length,
        status: 'error',
        error_message: 'No valid questions produced by LLM',
      });

      return new Response(
        JSON.stringify({
          error: 'AI generated questions but none passed validation. Please try again with different parameters.',
        }),
        { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // ── Step 8: INSERT into question_bank ────────────────────────────────

    const questionBankRows = validatedQuestions.map((q) => ({
      id: q.id,
      institution_id: institutionId,
      course_id,
      clo_id: q.clo_id,
      bloom_level: q.bloom_level,
      question_type: q.question_type,
      question_text: q.question_text,
      options: q.options,
      correct_answer: q.correct_answer,
      explanation: q.explanation,
      difficulty_rating: q.difficulty_rating,
      status: 'pending_review',
      generation_source: 'ai',
      source_chunks: q.source_chunks,
      labels: [],
      generation_request_id: generationRequestId,
      created_by: teacherId,
    }));

    const { error: insertError } = await supabase
      .from('question_bank')
      .insert(questionBankRows);

    if (insertError) {
      console.error('Failed to insert questions into question_bank:', insertError.message);
      return new Response(
        JSON.stringify({
          error: 'Failed to save generated questions',
          detail: insertError.message,
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // ── Step 9: Log Generation Request ──────────────────────────────────

    const latencyMs = Date.now() - startTime;

    const { error: logError } = await supabase.from('quiz_generation_logs').insert({
      institution_id: institutionId,
      teacher_id: teacherId,
      course_id,
      generation_request_id: generationRequestId,
      model_used: LLM_MODEL,
      prompt_tokens: llmResult.promptTokens,
      completion_tokens: llmResult.completionTokens,
      total_tokens: llmResult.totalTokens,
      latency_ms: latencyMs,
      question_count_requested: question_count,
      question_count_generated: validatedQuestions.length,
      chunks_retrieved: chunks.length,
      status: 'success',
      error_message: null,
    });

    if (logError) {
      // Non-fatal — log but don't fail the request
      console.error('Failed to insert generation log:', logError.message);
    }

    // ── Step 10: Return Response ────────────────────────────────────────

    return new Response(
      JSON.stringify({
        generation_id: generationRequestId,
        questions: validatedQuestions,
        warnings,
        chunks_used: chunks.length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    console.error('Unhandled error in generate-quiz-questions:', (error as Error).message);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
