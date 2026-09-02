import { getManagedServerKey } from "../_shared/serverSecret.ts";
import { getAgenticConfig } from "../_shared/ai/config.ts";
import type { AIProvider } from "../_shared/ai/provider.ts";
import { createAIProvider } from "../_shared/ai/provider-factory.ts";
import { hashEvidence } from "../_shared/ai/hash.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// ─── Types ──────────────────────────────────────────────────────────────────

type QuestionType = "mcq" | "true_false" | "short_answer" | "fill_in_blank";

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

const VALID_QUESTION_TYPES: QuestionType[] = [
  "mcq",
  "true_false",
  "short_answer",
  "fill_in_blank",
];
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MIN_CHUNKS_THRESHOLD = 3;

// ─── Bloom's Level Labels ───────────────────────────────────────────────────

const BLOOM_LABELS: Record<number, string> = {
  1: "Remembering",
  2: "Understanding",
  3: "Applying",
  4: "Analyzing",
  5: "Evaluating",
  6: "Creating",
};

// ─── Validation ─────────────────────────────────────────────────────────────

function isValidUUID(value: unknown): value is string {
  return typeof value === "string" && UUID_REGEX.test(value);
}

function validatePayload(
  payload: unknown
):
  | { valid: true; data: GenerateQuestionsRequest }
  | { valid: false; error: string } {
  if (!payload || typeof payload !== "object") {
    return { valid: false, error: "Request body must be a JSON object" };
  }

  const body = payload as Record<string, unknown>;

  // course_id
  if (!isValidUUID(body.course_id)) {
    return { valid: false, error: "course_id must be a valid UUID" };
  }

  // clo_ids
  if (
    !Array.isArray(body.clo_ids) ||
    body.clo_ids.length < 1 ||
    body.clo_ids.length > 5
  ) {
    return { valid: false, error: "clo_ids must be an array of 1–5 UUIDs" };
  }
  for (const id of body.clo_ids) {
    if (!isValidUUID(id)) {
      return { valid: false, error: `Invalid UUID in clo_ids: ${id}` };
    }
  }

  // bloom_levels
  if (!Array.isArray(body.bloom_levels) || body.bloom_levels.length < 1) {
    return {
      valid: false,
      error: "bloom_levels must be a non-empty array of integers 1–6",
    };
  }
  for (const level of body.bloom_levels) {
    if (
      typeof level !== "number" ||
      !Number.isInteger(level) ||
      level < 1 ||
      level > 6
    ) {
      return {
        valid: false,
        error: `Invalid bloom_level: ${level}. Must be an integer 1–6`,
      };
    }
  }

  // question_count
  if (
    typeof body.question_count !== "number" ||
    !Number.isInteger(body.question_count) ||
    body.question_count < 1 ||
    body.question_count > 50
  ) {
    return {
      valid: false,
      error: "question_count must be an integer between 1 and 50",
    };
  }

  // question_types
  if (!Array.isArray(body.question_types) || body.question_types.length < 1) {
    return { valid: false, error: "question_types must be a non-empty array" };
  }
  for (const qt of body.question_types) {
    if (!VALID_QUESTION_TYPES.includes(qt as QuestionType)) {
      return {
        valid: false,
        error: `Invalid question_type: ${qt}. Must be one of: ${VALID_QUESTION_TYPES.join(
          ", "
        )}`,
      };
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
  cloDescriptions: Record<string, string>
): string {
  const bloomLabels = bloomLevels
    .map((l) => `${l} (${BLOOM_LABELS[l]})`)
    .join(", ");
  const typeLabels = questionTypes.join(", ");

  const cloContext = Object.entries(cloDescriptions)
    .map(([id, desc]) => `- CLO ${id}: ${desc}`)
    .join("\n");

  const chunkContext = chunks
    .map(
      (c, i) =>
        `[Chunk ${i + 1}] (Source: ${
          c.source_filename
        }, Similarity: ${c.similarity_score.toFixed(2)})\n${c.chunk_text}`
    )
    .join("\n\n");

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
Return one JSON object with a "questions" array. Each question object must have:
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

Return ONLY JSON in this shape: {"questions": [<question objects>]}.`;
}

// ─── Canonical AIProvider call ──────────────────────────────────────────────

// E1.3: LLMs occasionally wrap JSON in markdown fences (```json ... ```)
// despite response_format=json — the 2026-08-30 generation log shows exactly
// this failure ("Unexpected token '`'"). Strip fences before parsing.
const stripMarkdownFence = (raw: string): string => {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  return fenced ? fenced[1] : trimmed;
};

async function callAIProvider(
  prompt: string,
  provider: AIProvider
): Promise<{
  questions: LLMGeneratedQuestion[];
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  model: string;
}> {
  const response = await provider.complete({
    messages: [
      {
        role: "system",
        content:
          "You are an expert educational assessment designer. Return json only and use only supplied evidence.",
      },
      { role: "user", content: prompt },
    ],
    temperature: 0.7,
    maxOutputTokens: 4000,
    responseFormat: "json",
  });
  const parsed: unknown = JSON.parse(stripMarkdownFence(response.content));
  const questions = Array.isArray(parsed)
    ? parsed
    : parsed &&
      typeof parsed === "object" &&
      Array.isArray((parsed as Record<string, unknown>).questions)
    ? ((parsed as Record<string, unknown>).questions as LLMGeneratedQuestion[])
    : null;
  if (!questions) {
    throw new Error("Provider response is not a valid question array");
  }
  return {
    questions: questions as LLMGeneratedQuestion[],
    promptTokens: response.usage?.inputTokens ?? 0,
    completionTokens: response.usage?.outputTokens ?? 0,
    totalTokens: response.usage?.totalTokens ?? 0,
    model: response.model,
  };
}

// ─── LLM Response Validation ────────────────────────────────────────────────

function validateGeneratedQuestion(
  q: Record<string, unknown>,
  validCloIds: string[],
  _validBloomLevels: number[],
  validTypes: QuestionType[]
):
  | { valid: true; question: LLMGeneratedQuestion }
  | { valid: false; reason: string } {
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
  if (
    typeof q.question_text !== "string" ||
    q.question_text.trim().length === 0
  ) {
    return { valid: false, reason: "Missing or empty question_text" };
  }

  // options validation for MCQ and true_false
  if (qType === "mcq") {
    if (!Array.isArray(q.options) || q.options.length !== 4) {
      return { valid: false, reason: "MCQ must have exactly 4 options" };
    }
    const correctCount = (q.options as MCQOption[]).filter(
      (o) => o.is_correct
    ).length;
    if (correctCount !== 1) {
      return {
        valid: false,
        reason: `MCQ must have exactly 1 correct option, found ${correctCount}`,
      };
    }
  } else if (qType === "true_false") {
    if (!Array.isArray(q.options) || q.options.length !== 2) {
      return { valid: false, reason: "True/false must have exactly 2 options" };
    }
    const correctCount = (q.options as MCQOption[]).filter(
      (o) => o.is_correct
    ).length;
    if (correctCount !== 1) {
      return {
        valid: false,
        reason: `True/false must have exactly 1 correct option, found ${correctCount}`,
      };
    }
  }

  // correct_answer
  const ca = q.correct_answer as CorrectAnswer | null;
  if (!ca || (typeof ca.value !== "string" && !Array.isArray(ca.value))) {
    return { valid: false, reason: "Missing or invalid correct_answer" };
  }

  // difficulty_rating
  const diff = q.difficulty_rating as number;
  if (typeof diff !== "number" || diff < 1.0 || diff > 5.0) {
    return { valid: false, reason: `Invalid difficulty_rating: ${diff}` };
  }

  return {
    valid: true,
    question: {
      clo_id: q.clo_id as string,
      bloom_level: bloom,
      question_type: qType,
      question_text: q.question_text as string,
      options:
        qType === "mcq" || qType === "true_false"
          ? (q.options as MCQOption[])
          : null,
      correct_answer: ca,
      explanation:
        typeof q.explanation === "string"
          ? q.explanation
          : ca.explanation ?? "",
      difficulty_rating: Math.round(diff * 10) / 10, // round to 1 decimal
    },
  };
}

// ─── RAG Chunk Retrieval ────────────────────────────────────────────────────

async function retrieveCourseMaterialChunks(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  courseId: string,
  cloIds: string[]
): Promise<{ chunks: ChunkReference[]; warnings: string[] }> {
  const warnings: string[] = [];

  try {
    // Query course_material_embeddings directly filtered by course_id and clo_ids
    // Since search_course_materials requires a vector embedding, we do a direct
    // filtered query for chunks associated with the target CLOs
    const { data: chunks, error } = await supabase
      .from("course_material_embeddings")
      .select("id, chunk_text, source_filename, clo_ids, similarity:id")
      .eq("course_id", courseId)
      .eq("indexing_status", "indexed")
      .overlaps("clo_ids", cloIds)
      .limit(10);

    if (error) {
      console.error("RAG chunk retrieval failed:", error.message);
      warnings.push(
        "Course material retrieval failed. Questions generated using LLM general knowledge only."
      );
      return { chunks: [], warnings };
    }

    if (!chunks || chunks.length === 0) {
      warnings.push(
        "No course material chunks found for the specified CLOs. Questions generated using LLM general knowledge only. Consider uploading more course content."
      );
      return { chunks: [], warnings };
    }

    const chunkRefs: ChunkReference[] = chunks.map(
      (c: Record<string, unknown>) => ({
        chunk_id: c.id as string,
        chunk_text: c.chunk_text as string,
        source_filename: (c.source_filename as string) ?? "unknown",
        similarity_score: 0.8, // Direct filter match — assign default similarity
      })
    );

    // Check if we have enough high-quality chunks
    if (chunkRefs.length < MIN_CHUNKS_THRESHOLD) {
      warnings.push(
        `Only ${chunkRefs.length} relevant course material chunk(s) found (minimum ${MIN_CHUNKS_THRESHOLD} recommended). ` +
          "Consider uploading more content before generating questions for better grounding."
      );
    }

    return { chunks: chunkRefs, warnings };
  } catch (err) {
    console.error("RAG retrieval error:", (err as Error).message);
    warnings.push(
      "Course material retrieval unavailable. Questions generated using LLM general knowledge only."
    );
    return { chunks: [], warnings };
  }
}

// ─── Main Handler ───────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      getManagedServerKey()
    );

    // ── Step 1: JWT Validation ──────────────────────────────────────────

    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing Authorization header" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const {
      data: { user },
      error: authError,
    } = await userClient.auth.getUser();

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid or expired token" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const teacherId = user.id;

    // ── Step 2: Validate Request Payload ────────────────────────────────

    const body = await req.json();
    const validation = validatePayload(body);

    if (!validation.valid) {
      return new Response(JSON.stringify({ error: validation.error }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { course_id, clo_ids, bloom_levels, question_count, question_types } =
      validation.data;

    // ── Step 3: Verify Course Ownership ─────────────────────────────────
    // institution_id lives on programs, not courses — join through program_id.

    const { data: course, error: courseError } = await supabase
      .from("courses")
      .select("id, teacher_id, program_id, programs(institution_id)")
      .eq("id", course_id)
      .maybeSingle();

    if (courseError || !course) {
      return new Response(JSON.stringify({ error: "Course not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (course.teacher_id !== teacherId) {
      return new Response(
        JSON.stringify({ error: "Forbidden: you do not own this course" }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const programRel = course.programs as
      | { institution_id?: string }
      | { institution_id?: string }[]
      | null;
    const institutionId = Array.isArray(programRel)
      ? programRel[0]?.institution_id ?? ""
      : programRel?.institution_id ?? "";

    // ── Step 4: Fetch CLO Descriptions ──────────────────────────────────

    const { data: clos, error: closError } = await supabase
      .from("learning_outcomes")
      .select("id, title")
      .in("id", clo_ids);

    if (closError || !clos || clos.length === 0) {
      return new Response(
        JSON.stringify({
          error: "Failed to fetch CLO details or no matching CLOs found",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const cloDescriptions: Record<string, string> = {};
    for (const clo of clos) {
      cloDescriptions[clo.id] = clo.title;
    }

    // ── Step 5: RAG Retrieval ───────────────────────────────────────────

    // E1.3: retrieval/config failures here previously escaped as UNLOGGED
    // 500s (the 2026-09-01 20:27Z failure left no quiz_generation_logs row).
    // Guard the whole pre-LLM tail so every failure is logged + structured.
    let chunks: Awaited<ReturnType<typeof retrieveCourseMaterialChunks>>["chunks"];
    let warnings: Awaited<ReturnType<typeof retrieveCourseMaterialChunks>>["warnings"];
    try {
      const retrieval = await retrieveCourseMaterialChunks(
        supabase,
        course_id,
        clo_ids
      );
      chunks = retrieval.chunks;
      warnings = retrieval.warnings;
    } catch (retrievalError) {
      const detail =
        retrievalError instanceof Error
          ? retrievalError.message
          : "unknown retrieval error";
      await supabase.from("quiz_generation_logs").insert({
        institution_id: institutionId,
        teacher_id: teacherId,
        course_id,
        generation_request_id: crypto.randomUUID(),
        model_used: "pre-retrieval",
        prompt_tokens: 0,
        completion_tokens: 0,
        total_tokens: 0,
        latency_ms: Date.now() - startTime,
        question_count_requested: question_count,
        question_count_generated: 0,
        chunks_retrieved: 0,
        status: "error",
        error_message: `Course material retrieval failed: ${detail}`,
      });
      return new Response(
        JSON.stringify({
          error:
            "Could not retrieve course materials for generation. Please try again.",
        }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }


    // ── Step 6: Construct prompt and call the canonical AIProvider ──────
    const agenticConfig = getAgenticConfig(Deno.env);
    if (!agenticConfig.enabled) {
      return new Response(
        JSON.stringify({ error: "E Deviser Intelligence is not enabled" }),
        {
          status: 503,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const prompt = buildLLMPrompt(
      chunks,
      bloom_levels,
      question_types,
      question_count,
      cloDescriptions
    );

    let llmResult: {
      questions: LLMGeneratedQuestion[];
      promptTokens: number;
      completionTokens: number;
      totalTokens: number;
      model: string;
    };

    const generationRequestId = crypto.randomUUID();
    const provider = createAIProvider(agenticConfig, { env: Deno.env });
    const resolvedModel = agenticConfig.deepSeek.primaryModel;

    try {
      llmResult = await callAIProvider(prompt, provider);
    } catch (llmError) {
      const latencyMs = Date.now() - startTime;

      // Log the failed generation attempt
      await supabase.from("quiz_generation_logs").insert({
        institution_id: institutionId,
        teacher_id: teacherId,
        course_id,
        generation_request_id: generationRequestId,
        model_used: resolvedModel,
        prompt_tokens: 0,
        completion_tokens: 0,
        total_tokens: 0,
        latency_ms: latencyMs,
        question_count_requested: question_count,
        question_count_generated: 0,
        chunks_retrieved: chunks.length,
        status: "error",
        error_message: (llmError as Error).message,
      });

      return new Response(
        JSON.stringify({
          error:
            "AI question generation failed after retries. Please try again later.",
          detail: (llmError as Error).message,
        }),
        {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
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
        question_types
      );

      if (result.valid) {
        validatedQuestions.push({
          ...result.question,
          id: crypto.randomUUID(),
          source_chunks: chunks,
        });
      } else {
        console.warn("Skipping invalid LLM question:", result.reason);
      }
    }

    if (validatedQuestions.length === 0) {
      const latencyMs = Date.now() - startTime;

      await supabase.from("quiz_generation_logs").insert({
        institution_id: institutionId,
        teacher_id: teacherId,
        course_id,
        generation_request_id: generationRequestId,
        model_used: llmResult.model,
        prompt_tokens: llmResult.promptTokens,
        completion_tokens: llmResult.completionTokens,
        total_tokens: llmResult.totalTokens,
        latency_ms: latencyMs,
        question_count_requested: question_count,
        question_count_generated: 0,
        chunks_retrieved: chunks.length,
        status: "error",
        error_message: "No valid questions produced by LLM",
      });

      return new Response(
        JSON.stringify({
          error:
            "AI generated questions but none passed validation. Please try again with different parameters.",
        }),
        {
          status: 422,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // ── Step 8: create a human-review proposal, never official content ──
    const runId = crypto.randomUUID();
    const inputHash = await hashEvidence({
      course_id,
      clo_ids,
      bloom_levels,
      question_count,
      question_types,
    });
    const evidenceReferences = chunks.map((chunk) => ({
      kind: "material",
      id: chunk.chunk_id,
      label: chunk.source_filename,
    }));
    const evidenceHash = await hashEvidence(evidenceReferences);
    const idempotencyKey = await hashEvidence({
      institutionId,
      teacherId,
      course_id,
      inputHash,
      evidenceHash,
      questions: validatedQuestions,
    });
    const { error: runError } = await supabase.from("agent_runs").insert({
      id: runId,
      request_id: generationRequestId,
      actor_user_id: teacherId,
      actor_role: "teacher",
      institution_id: institutionId,
      session_id: generationRequestId,
      specialist: "teacher",
      input_hash: inputHash,
      status: "running",
      provider: "deepseek",
      model: llmResult.model,
    });
    if (runError) {
      return new Response(
        JSON.stringify({ error: "Failed to audit generated question drafts" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
    const markRunFailed = async (errorClassification: string) => {
      await supabase
        .from("agent_runs")
        .update({
          status: "failed",
          error_classification: errorClassification,
          completed_at: new Date().toISOString(),
          latency_ms: Date.now() - startTime,
        })
        .eq("id", runId);
    };
    const proposedId = crypto.randomUUID();
    const { data: insertedProposal, error: proposalError } = await supabase
      .from("agent_action_proposals")
      .upsert(
        {
          id: proposedId,
          run_id: runId,
          actor_user_id: teacherId,
          institution_id: institutionId,
          course_id,
          action_type: "publish_official_content",
          payload: {
            kind: "quiz_question_drafts",
            questions: validatedQuestions,
          },
          reason:
            "Generated assessment questions require assigned-teacher review before publication.",
          evidence_references: evidenceReferences,
          evidence_hash: evidenceHash,
          required_approver_role: "teacher",
          required_approver_user_id: teacherId,
          status: "pending",
          idempotency_key: idempotencyKey,
          expires_at: new Date(Date.now() + 7 * 86_400_000).toISOString(),
        },
        {
          onConflict: "institution_id,idempotency_key",
          ignoreDuplicates: true,
        }
      )
      .select("id")
      .maybeSingle();
    if (proposalError) {
      await markRunFailed("proposal_store_failed");
      return new Response(
        JSON.stringify({ error: "Failed to store question review proposal" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
    let proposalId =
      insertedProposal &&
      typeof (insertedProposal as Record<string, unknown>).id === "string"
        ? ((insertedProposal as Record<string, unknown>).id as string)
        : undefined;
    if (!proposalId) {
      const { data: existingProposal, error: existingProposalError } =
        await supabase
          .from("agent_action_proposals")
          .select("id")
          .eq("institution_id", institutionId)
          .eq("idempotency_key", idempotencyKey)
          .single();
      if (
        existingProposalError ||
        !existingProposal ||
        typeof (existingProposal as Record<string, unknown>).id !== "string"
      ) {
        await markRunFailed("proposal_lookup_failed");
        return new Response(
          JSON.stringify({
            error: "Failed to resolve question review proposal",
          }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      proposalId = (existingProposal as Record<string, unknown>).id as string;
    }

    const { error: runCompletionError } = await supabase
      .from("agent_runs")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
        latency_ms: Date.now() - startTime,
        usage: {
          inputTokens: llmResult.promptTokens,
          outputTokens: llmResult.completionTokens,
          totalTokens: llmResult.totalTokens,
        },
      })
      .eq("id", runId);
    if (runCompletionError) {
      await markRunFailed("run_completion_failed");
      return new Response(
        JSON.stringify({ error: "Failed to complete generation audit" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // ── Step 9: Log Generation Request ──────────────────────────────────

    const latencyMs = Date.now() - startTime;

    const { error: logError } = await supabase
      .from("quiz_generation_logs")
      .insert({
        institution_id: institutionId,
        teacher_id: teacherId,
        course_id,
        generation_request_id: generationRequestId,
        model_used: llmResult.model,
        prompt_tokens: llmResult.promptTokens,
        completion_tokens: llmResult.completionTokens,
        total_tokens: llmResult.totalTokens,
        latency_ms: latencyMs,
        question_count_requested: question_count,
        question_count_generated: validatedQuestions.length,
        chunks_retrieved: chunks.length,
        status: "success",
        error_message: null,
      });

    if (logError) {
      // Non-fatal — log but don't fail the request
      console.error("Failed to insert generation log:", logError.message);
    }

    // ── Step 10: Return Response ────────────────────────────────────────

    return new Response(
      JSON.stringify({
        generation_id: generationRequestId,
        proposal_id: proposalId,
        question_drafts: validatedQuestions,
        approval_status: "pending",
        protected_action_executed: false,
        warnings,
        chunks_used: chunks.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error(
      "Unhandled error in generate-quiz-questions:",
      (error as Error).message
    );
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
