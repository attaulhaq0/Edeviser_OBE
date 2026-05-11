import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// ─── Types ──────────────────────────────────────────────────────────────────

type AbilityLevel = "high" | "medium" | "low";

interface SelectQuestionRequest {
  quiz_id: string;
  quiz_attempt_id: string;
  previous_question_id?: string;
  previous_answer_correct?: boolean;
  previous_response_time_ms?: number;
}

interface MCQOption {
  key: string;
  text: string;
  is_correct?: boolean;
}

interface QuestionRow {
  id: string;
  question_text: string;
  question_type: string;
  options: MCQOption[] | null;
  bloom_level: number;
  clo_id: string;
  difficulty_rating: number;
}

interface QuestionSequenceEntry {
  question_id: string;
  difficulty_rating: number;
  bloom_level: number;
}

interface DifficultyTrajectoryEntry {
  question_number: number;
  target_difficulty: number;
  actual_difficulty: number;
  was_correct: boolean | null;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DEFAULT_DIFFICULTY_RANGE = 0.5;
const EXPANDED_DIFFICULTY_RANGE = 1.0;
const MIN_ELIGIBLE_QUESTIONS = 3;
const DIFFICULTY_STEP_UP = 0.3;
const DIFFICULTY_STEP_DOWN = 0.5;

// ─── Adaptive Engine (mirrors src/lib/adaptiveEngine.ts) ────────────────────

function classifyAbility(attainmentPercent: number): AbilityLevel {
  if (attainmentPercent >= 85) return "high";
  if (attainmentPercent >= 50) return "medium";
  return "low";
}

function abilityToTargetDifficulty(ability: AbilityLevel): number {
  switch (ability) {
    case "high":
      return 3.5;
    case "medium":
      return 2.5;
    case "low":
      return 1.5;
  }
}

function adjustDifficulty(
  current: number,
  wasCorrect: boolean,
  stepUp = DIFFICULTY_STEP_UP,
  stepDown = DIFFICULTY_STEP_DOWN
): number {
  if (wasCorrect) return Math.min(5.0, current + stepUp);
  return Math.max(1.0, current - stepDown);
}

function preferredBloomLevels(ability: AbilityLevel): number[] {
  switch (ability) {
    case "high":
      return [4, 5, 6];
    case "medium":
      return [2, 3, 4];
    case "low":
      return [1, 2];
  }
}

// ─── Validation ─────────────────────────────────────────────────────────────

function isValidUUID(value: unknown): value is string {
  return typeof value === "string" && UUID_REGEX.test(value);
}

function validatePayload(
  payload: unknown
):
  | { valid: true; data: SelectQuestionRequest }
  | { valid: false; error: string } {
  if (!payload || typeof payload !== "object") {
    return { valid: false, error: "Request body must be a JSON object" };
  }

  const body = payload as Record<string, unknown>;

  if (!isValidUUID(body.quiz_id)) {
    return { valid: false, error: "quiz_id must be a valid UUID" };
  }

  if (!isValidUUID(body.quiz_attempt_id)) {
    return { valid: false, error: "quiz_attempt_id must be a valid UUID" };
  }

  // previous_question_id is optional (null for first question)
  if (
    body.previous_question_id !== undefined &&
    body.previous_question_id !== null
  ) {
    if (!isValidUUID(body.previous_question_id)) {
      return {
        valid: false,
        error: "previous_question_id must be a valid UUID",
      };
    }
  }

  if (
    body.previous_answer_correct !== undefined &&
    body.previous_answer_correct !== null
  ) {
    if (typeof body.previous_answer_correct !== "boolean") {
      return {
        valid: false,
        error: "previous_answer_correct must be a boolean",
      };
    }
  }

  if (
    body.previous_response_time_ms !== undefined &&
    body.previous_response_time_ms !== null
  ) {
    if (
      typeof body.previous_response_time_ms !== "number" ||
      body.previous_response_time_ms < 0
    ) {
      return {
        valid: false,
        error: "previous_response_time_ms must be a non-negative number",
      };
    }
  }

  return {
    valid: true,
    data: {
      quiz_id: body.quiz_id as string,
      quiz_attempt_id: body.quiz_attempt_id as string,
      previous_question_id: (body.previous_question_id as string) ?? undefined,
      previous_answer_correct:
        (body.previous_answer_correct as boolean) ?? undefined,
      previous_response_time_ms:
        (body.previous_response_time_ms as number) ?? undefined,
    },
  };
}

// ─── Option Shuffling ───────────────────────────────────────────────────────

function shuffleArray<T>(arr: T[]): T[] {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function stripAndShuffleOptions(
  options: MCQOption[] | null
): MCQOption[] | null {
  if (!options) return null;
  // Strip is_correct, shuffle, re-key
  const stripped = options.map((o) => ({ key: o.key, text: o.text }));
  const shuffled = shuffleArray(stripped);
  return shuffled.map((o, i) => ({
    key: String.fromCharCode(65 + i), // A, B, C, D...
    text: o.text,
  }));
}

// ─── Main Handler ───────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // ── Step 1: JWT Validation → extract student_id ─────────────────────

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

    const studentId = user.id;

    // ── Step 2: Validate Request Payload ────────────────────────────────

    const body = await req.json();
    const validation = validatePayload(body);

    if (!validation.valid) {
      return new Response(JSON.stringify({ error: validation.error }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const {
      quiz_id,
      quiz_attempt_id,
      previous_question_id,
      previous_answer_correct,
      previous_response_time_ms,
    } = validation.data;

    // ── Step 3: Fetch quiz config ───────────────────────────────────────

    const { data: quiz, error: quizError } = await supabase
      .from("quizzes")
      .select("id, is_adaptive, adaptation_config, total_questions, course_id")
      .eq("id", quiz_id)
      .maybeSingle();

    if (quizError || !quiz) {
      return new Response(JSON.stringify({ error: "Quiz not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!quiz.is_adaptive) {
      return new Response(
        JSON.stringify({
          error: "This quiz is not configured for adaptive mode",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const totalQuestions: number = quiz.total_questions ?? 10;
    const adaptConfig = (quiz.adaptation_config ?? {}) as Record<
      string,
      unknown
    >;
    const stepUp =
      typeof adaptConfig.difficulty_step_up === "number"
        ? adaptConfig.difficulty_step_up
        : DIFFICULTY_STEP_UP;
    const stepDown =
      typeof adaptConfig.difficulty_step_down === "number"
        ? adaptConfig.difficulty_step_down
        : DIFFICULTY_STEP_DOWN;

    // ── Step 4: Fetch quiz_attempt record ───────────────────────────────

    const { data: attempt, error: attemptError } = await supabase
      .from("quiz_attempts")
      .select(
        "id, question_sequence, difficulty_trajectory, per_question_times"
      )
      .eq("id", quiz_attempt_id)
      .eq("student_id", studentId)
      .maybeSingle();

    if (attemptError || !attempt) {
      return new Response(
        JSON.stringify({
          error: "Quiz attempt not found or does not belong to this student",
        }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const questionSequence: QuestionSequenceEntry[] =
      (attempt.question_sequence ?? []) as QuestionSequenceEntry[];
    const difficultyTrajectory: DifficultyTrajectoryEntry[] =
      (attempt.difficulty_trajectory ?? []) as DifficultyTrajectoryEntry[];
    const perQuestionTimes: {
      question_id: string;
      response_time_ms: number;
    }[] = (attempt.per_question_times ?? []) as {
      question_id: string;
      response_time_ms: number;
    }[];

    const currentQuestionNumber = questionSequence.length + 1;

    // ── Check if session is complete ────────────────────────────────────

    if (questionSequence.length >= totalQuestions) {
      return new Response(
        JSON.stringify({
          question: null,
          question_number: questionSequence.length,
          total_questions: totalQuestions,
          current_target_difficulty:
            difficultyTrajectory.length > 0
              ? difficultyTrajectory[difficultyTrajectory.length - 1]
                  .target_difficulty
              : 2.5,
          session_complete: true,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Step 5: Fetch quiz CLOs ─────────────────────────────────────────

    const { data: quizCLOs, error: cloError } = await supabase
      .from("quiz_clos")
      .select("clo_id")
      .eq("quiz_id", quiz_id);

    // Fallback: if quiz_clos table doesn't exist, try quizzes.clo_ids
    let cloIds: string[] = [];
    if (cloError || !quizCLOs || quizCLOs.length === 0) {
      // Try fetching from quiz record directly (some schemas store clo_ids on quizzes)
      const { data: quizRecord } = await supabase
        .from("quizzes")
        .select("clo_ids")
        .eq("id", quiz_id)
        .maybeSingle();

      if (quizRecord?.clo_ids && Array.isArray(quizRecord.clo_ids)) {
        cloIds = quizRecord.clo_ids;
      }
    } else {
      cloIds = quizCLOs.map((r: { clo_id: string }) => r.clo_id);
    }

    if (cloIds.length === 0) {
      return new Response(
        JSON.stringify({ error: "No CLOs linked to this quiz" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // ── Step 6: Compute target difficulty ────────────────────────────────

    let targetDifficulty: number;
    let ability: AbilityLevel = "medium";
    const isFirstQuestion = !previous_question_id;

    if (isFirstQuestion) {
      // Fetch student CLO attainment from outcome_attainment
      const { data: attainments } = await supabase
        .from("outcome_attainment")
        .select("outcome_id, attainment_percentage")
        .eq("student_id", studentId)
        .in("outcome_id", cloIds)
        .eq("scope", "clo");

      if (attainments && attainments.length > 0) {
        // Average attainment across quiz CLOs
        const totalAttainment = attainments.reduce(
          (sum: number, a: { attainment_percentage: number }) =>
            sum + (a.attainment_percentage ?? 0),
          0
        );
        const avgAttainment = totalAttainment / attainments.length;
        ability = classifyAbility(avgAttainment);
      }
      // If no attainment data, default to 'medium'

      targetDifficulty = abilityToTargetDifficulty(ability);

      // Check if adaptation_config has an initial_difficulty override
      if (typeof adaptConfig.initial_difficulty === "number") {
        targetDifficulty = adaptConfig.initial_difficulty;
      }
    } else {
      // Subsequent question: adjust from last trajectory entry
      if (difficultyTrajectory.length > 0) {
        const lastEntry = difficultyTrajectory[difficultyTrajectory.length - 1];
        targetDifficulty = lastEntry.target_difficulty;
      } else {
        targetDifficulty = 2.5; // fallback
      }

      if (
        previous_answer_correct !== undefined &&
        previous_answer_correct !== null
      ) {
        targetDifficulty = adjustDifficulty(
          targetDifficulty,
          previous_answer_correct,
          stepUp,
          stepDown
        );
      }

      // Record response time for previous question
      if (previous_question_id && previous_response_time_ms !== undefined) {
        perQuestionTimes.push({
          question_id: previous_question_id,
          response_time_ms: previous_response_time_ms,
        });
      }

      // Update previous trajectory entry with correctness
      if (
        difficultyTrajectory.length > 0 &&
        previous_answer_correct !== undefined
      ) {
        difficultyTrajectory[difficultyTrajectory.length - 1].was_correct =
          previous_answer_correct;
      }

      // Re-derive ability from attainment for Bloom's preference
      const { data: attainments } = await supabase
        .from("outcome_attainment")
        .select("outcome_id, attainment_percentage")
        .eq("student_id", studentId)
        .in("outcome_id", cloIds)
        .eq("scope", "clo");

      if (attainments && attainments.length > 0) {
        const totalAttainment = attainments.reduce(
          (sum: number, a: { attainment_percentage: number }) =>
            sum + (a.attainment_percentage ?? 0),
          0
        );
        const avgAttainment = totalAttainment / attainments.length;
        ability = classifyAbility(avgAttainment);
      }
    }

    // ── Step 7: Query eligible questions from question_bank ─────────────

    const answeredQuestionIds = questionSequence.map((q) => q.question_id);
    const bloomPreference = preferredBloomLevels(ability);
    let difficultyRange = DEFAULT_DIFFICULTY_RANGE;
    const warnings: string[] = [];

    const lowerBound = Math.max(1.0, targetDifficulty - difficultyRange);
    const upperBound = Math.min(5.0, targetDifficulty + difficultyRange);

    let query = supabase
      .from("question_bank")
      .select(
        "id, question_text, question_type, options, bloom_level, clo_id, difficulty_rating"
      )
      .eq("status", "approved")
      .in("clo_id", cloIds)
      .gte("difficulty_rating", lowerBound)
      .lte("difficulty_rating", upperBound);

    // Exclude previously answered questions
    if (answeredQuestionIds.length > 0) {
      // Use not-in filter to exclude answered questions
      query = query.not("id", "in", `(${answeredQuestionIds.join(",")})`);
    }

    const { data: eligibleQuestions } = await query;

    let candidates: QuestionRow[] = (eligibleQuestions ?? []) as QuestionRow[];

    // ── Step 8: Expand range if fewer than 3 eligible ───────────────────

    if (candidates.length < MIN_ELIGIBLE_QUESTIONS) {
      difficultyRange = EXPANDED_DIFFICULTY_RANGE;
      const expandedLower = Math.max(1.0, targetDifficulty - difficultyRange);
      const expandedUpper = Math.min(5.0, targetDifficulty + difficultyRange);

      let expandedQuery = supabase
        .from("question_bank")
        .select(
          "id, question_text, question_type, options, bloom_level, clo_id, difficulty_rating"
        )
        .eq("status", "approved")
        .in("clo_id", cloIds)
        .gte("difficulty_rating", expandedLower)
        .lte("difficulty_rating", expandedUpper);

      if (answeredQuestionIds.length > 0) {
        expandedQuery = expandedQuery.not(
          "id",
          "in",
          `(${answeredQuestionIds.join(",")})`
        );
      }

      const { data: expandedQuestions } = await expandedQuery;
      candidates = (expandedQuestions ?? []) as QuestionRow[];

      if (candidates.length < MIN_ELIGIBLE_QUESTIONS) {
        warnings.push(
          `Insufficient question pool: only ${candidates.length} eligible question(s) found ` +
            `for target difficulty ${targetDifficulty.toFixed(
              1
            )} (expanded range ±${EXPANDED_DIFFICULTY_RANGE}). ` +
            "Consider adding more approved questions to the question bank."
        );
      } else {
        warnings.push(
          `Expanded difficulty range from ±${DEFAULT_DIFFICULTY_RANGE} to ±${EXPANDED_DIFFICULTY_RANGE} ` +
            `to find sufficient questions (found ${candidates.length}).`
        );
      }
    }

    // ── Fallback: if still no candidates, try all approved for quiz CLOs ─

    if (candidates.length === 0) {
      let fallbackQuery = supabase
        .from("question_bank")
        .select(
          "id, question_text, question_type, options, bloom_level, clo_id, difficulty_rating"
        )
        .eq("status", "approved")
        .in("clo_id", cloIds);

      if (answeredQuestionIds.length > 0) {
        fallbackQuery = fallbackQuery.not(
          "id",
          "in",
          `(${answeredQuestionIds.join(",")})`
        );
      }

      const { data: fallbackQuestions } = await fallbackQuery;
      candidates = (fallbackQuestions ?? []) as QuestionRow[];

      if (candidates.length > 0) {
        warnings.push(
          "Fell back to random selection from all approved questions for linked CLOs. " +
            "No questions matched the target difficulty range."
        );
      }
    }

    if (candidates.length === 0) {
      return new Response(
        JSON.stringify({
          error: "No eligible questions available for this quiz session",
          warnings,
        }),
        {
          status: 422,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // ── Step 9: Prefer questions at matching Bloom's levels ─────────────

    // Score candidates: prefer Bloom's levels matching ability
    const scoredCandidates = candidates.map((q) => {
      let score = 0;

      // Bloom's preference: higher score for preferred levels
      if (bloomPreference.includes(q.bloom_level)) {
        score += 10;
      }

      // Closer to target difficulty = higher score
      const diffDistance = Math.abs(q.difficulty_rating - targetDifficulty);
      score += 5.0 - diffDistance; // max 5 bonus for exact match

      return { question: q, score };
    });

    // Sort by score descending
    scoredCandidates.sort((a, b) => b.score - a.score);

    // Select from top candidates with some randomness (pick from top 3)
    const topN = Math.min(3, scoredCandidates.length);
    const selectedIndex = Math.floor(Math.random() * topN);
    const selectedQuestion = scoredCandidates[selectedIndex].question;

    // ── Step 10: Strip correct_answer and is_correct from options ────────

    const sanitizedOptions = stripAndShuffleOptions(selectedQuestion.options);

    // ── Step 11: Append to question_sequence and difficulty_trajectory ───

    questionSequence.push({
      question_id: selectedQuestion.id,
      difficulty_rating: selectedQuestion.difficulty_rating,
      bloom_level: selectedQuestion.bloom_level,
    });

    difficultyTrajectory.push({
      question_number: currentQuestionNumber,
      target_difficulty: targetDifficulty,
      actual_difficulty: selectedQuestion.difficulty_rating,
      was_correct: null, // will be filled on next request
    });

    // Update quiz_attempt record
    const { error: updateError } = await supabase
      .from("quiz_attempts")
      .update({
        question_sequence: questionSequence,
        difficulty_trajectory: difficultyTrajectory,
        per_question_times: perQuestionTimes,
      })
      .eq("id", quiz_attempt_id);

    if (updateError) {
      console.error("Failed to update quiz_attempt:", updateError.message);
      // Non-fatal: continue serving the question
    }

    // ── Step 12: Return question to student UI ──────────────────────────

    return new Response(
      JSON.stringify({
        question: {
          id: selectedQuestion.id,
          question_text: selectedQuestion.question_text,
          question_type: selectedQuestion.question_type,
          options: sanitizedOptions,
          bloom_level: selectedQuestion.bloom_level,
          clo_id: selectedQuestion.clo_id,
        },
        question_number: currentQuestionNumber,
        total_questions: totalQuestions,
        current_target_difficulty: Math.round(targetDifficulty * 100) / 100,
        session_complete: false,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error(
      "Unhandled error in select-adaptive-question:",
      (error as Error).message
    );
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
