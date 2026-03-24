import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ─── Types ──────────────────────────────────────────────────────────────────

interface UpdateAnalyticsRequest {
  quiz_attempt_id: string;
}

interface QuestionSequenceEntry {
  question_id: string;
  difficulty_rating: number;
  bloom_level: number;
}

interface AnalyticsRow {
  id: string;
  question_id: string;
  total_attempts: number;
  correct_count: number;
  success_rate: number | null;
  avg_response_time_seconds: number | null;
  discrimination_index: number | null;
  calibrated_difficulty: number | null;
  quality_flag: string | null;
}

interface QuestionBankRow {
  id: string;
  difficulty_rating: number;
  clo_id: string;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CALIBRATION_MIN_ATTEMPTS = 10;
const DISCRIMINATION_MIN_ATTEMPTS = 20;
const EMPIRICAL_WEIGHT_DENOMINATOR = 50;

// ─── Calibration Logic (mirrors src/lib/difficultyCalibration.ts) ───────────

function computeCalibratedDifficulty(
  originalDifficulty: number,
  successRate: number,
  totalAttempts: number,
): number {
  const calibrated = 5.0 - 4.0 * successRate;
  const empiricalWeight = Math.min(1.0, totalAttempts / EMPIRICAL_WEIGHT_DENOMINATOR);
  return empiricalWeight * calibrated + (1 - empiricalWeight) * originalDifficulty;
}

function determineQualityFlag(
  successRate: number,
  discriminationIndex: number,
  totalAttempts: number,
): string | null {
  if (totalAttempts < DISCRIMINATION_MIN_ATTEMPTS) return null;
  if (discriminationIndex < 0.2) return 'low_discrimination';
  if (successRate > 0.95) return 'too_easy';
  if (successRate < 0.10) return 'too_hard';
  return 'good';
}

// ─── Validation ─────────────────────────────────────────────────────────────

function isValidUUID(value: unknown): value is string {
  return typeof value === 'string' && UUID_REGEX.test(value);
}

function validatePayload(
  payload: unknown,
): { valid: true; data: UpdateAnalyticsRequest } | { valid: false; error: string } {
  if (!payload || typeof payload !== 'object') {
    return { valid: false, error: 'Request body must be a JSON object' };
  }

  const body = payload as Record<string, unknown>;

  if (!isValidUUID(body.quiz_attempt_id)) {
    return { valid: false, error: 'quiz_attempt_id must be a valid UUID' };
  }

  return {
    valid: true,
    data: { quiz_attempt_id: body.quiz_attempt_id as string },
  };
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Parses the answers JSONB from quiz_attempts into a map of question_id → is_correct.
 * Supports two formats:
 *   1. Array of { question_id, is_correct } objects
 *   2. Object keyed by question_id with { is_correct } values
 */
function parseAnswers(answers: unknown): Map<string, boolean> {
  const map = new Map<string, boolean>();

  if (Array.isArray(answers)) {
    for (const entry of answers) {
      if (entry && typeof entry === 'object' && 'question_id' in entry && 'is_correct' in entry) {
        map.set(String(entry.question_id), Boolean(entry.is_correct));
      }
    }
  } else if (answers && typeof answers === 'object') {
    for (const [questionId, value] of Object.entries(answers as Record<string, unknown>)) {
      if (value && typeof value === 'object' && 'is_correct' in (value as Record<string, unknown>)) {
        map.set(questionId, Boolean((value as Record<string, unknown>).is_correct));
      }
    }
  }

  return map;
}

/**
 * Parses per_question_times JSONB into a map of question_id → response_time_ms.
 */
function parsePerQuestionTimes(times: unknown): Map<string, number> {
  const map = new Map<string, number>();

  if (Array.isArray(times)) {
    for (const entry of times) {
      if (
        entry &&
        typeof entry === 'object' &&
        'question_id' in entry &&
        'response_time_ms' in entry
      ) {
        map.set(String(entry.question_id), Number(entry.response_time_ms));
      }
    }
  }

  return map;
}

// ─── Discrimination Index Computation ────────────────────────────────────────

/**
 * Computes discrimination index for a question using the top/bottom 27% method.
 * Groups students who attempted this question by their CLO attainment,
 * then compares success rates of the top 27% vs bottom 27%.
 */
async function computeDiscriminationForQuestion(
  supabase: ReturnType<typeof createClient>,
  questionId: string,
  cloId: string,
): Promise<number | null> {
  // Find all quiz_attempts that include this question
  const { data: attempts } = await supabase
    .from('quiz_attempts')
    .select('student_id, answers')
    .not('answers', 'is', null);

  if (!attempts || attempts.length === 0) return null;

  // Filter to attempts that actually answered this question
  const studentResults: { student_id: string; is_correct: boolean }[] = [];

  for (const attempt of attempts) {
    const answersMap = parseAnswers(attempt.answers);
    const result = answersMap.get(questionId);
    if (result !== undefined) {
      studentResults.push({
        student_id: attempt.student_id,
        is_correct: result,
      });
    }
  }

  if (studentResults.length < 2) return null;

  // Deduplicate by student_id (take latest attempt)
  const studentMap = new Map<string, boolean>();
  for (const r of studentResults) {
    studentMap.set(r.student_id, r.is_correct);
  }

  const uniqueStudentIds = Array.from(studentMap.keys());

  // Fetch CLO attainment for these students
  const { data: attainments } = await supabase
    .from('outcome_attainment')
    .select('student_id, attainment_percentage')
    .in('student_id', uniqueStudentIds)
    .eq('outcome_id', cloId)
    .eq('scope', 'clo');

  // Build attainment map (default to 0 for students without attainment data)
  const attainmentMap = new Map<string, number>();
  for (const a of (attainments ?? [])) {
    attainmentMap.set(a.student_id, a.attainment_percentage ?? 0);
  }

  // Sort students by CLO attainment descending
  const sortedStudents = uniqueStudentIds
    .map((sid) => ({
      student_id: sid,
      attainment: attainmentMap.get(sid) ?? 0,
      is_correct: studentMap.get(sid)!,
    }))
    .sort((a, b) => b.attainment - a.attainment);

  // Top 27% and bottom 27%
  const groupSize = Math.max(1, Math.ceil(sortedStudents.length * 0.27));
  const topGroup = sortedStudents.slice(0, groupSize);
  const bottomGroup = sortedStudents.slice(-groupSize);

  const topSuccessRate =
    topGroup.filter((s) => s.is_correct).length / topGroup.length;
  const bottomSuccessRate =
    bottomGroup.filter((s) => s.is_correct).length / bottomGroup.length;

  return topSuccessRate - bottomSuccessRate;
}

// ─── Main Handler ───────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // ── Auth: require service role or teacher/admin ──────────────────
    const authHeader = req.headers.get('Authorization') ?? '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const isServiceRole = serviceRoleKey && authHeader.includes(serviceRoleKey);

    if (!isServiceRole) {
      if (!authHeader) {
        return new Response(
          JSON.stringify({ error: 'Missing authorization header' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }
      const userClient = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_ANON_KEY')!,
        { global: { headers: { Authorization: authHeader } } },
      );
      const { data: { user: caller }, error: authError } = await userClient.auth.getUser();
      if (authError || !caller) {
        return new Response(
          JSON.stringify({ error: 'Unauthorized' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // ── Step 1: Validate Request Payload ────────────────────────────────

    const body = await req.json();
    const validation = validatePayload(body);

    if (!validation.valid) {
      return new Response(
        JSON.stringify({ error: validation.error }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const { quiz_attempt_id } = validation.data;

    // ── Step 2: Fetch the quiz attempt record ───────────────────────────

    const { data: attempt, error: attemptError } = await supabase
      .from('quiz_attempts')
      .select('id, quiz_id, student_id, answers, question_sequence, per_question_times')
      .eq('id', quiz_attempt_id)
      .maybeSingle();

    if (attemptError || !attempt) {
      return new Response(
        JSON.stringify({ error: 'Quiz attempt not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const questionSequence = (attempt.question_sequence ?? []) as QuestionSequenceEntry[];
    const answersMap = parseAnswers(attempt.answers);
    const timesMap = parsePerQuestionTimes(attempt.per_question_times);

    if (questionSequence.length === 0) {
      return new Response(
        JSON.stringify({ success: true, updated: 0, message: 'No questions in sequence' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // ── Step 3: Get question_ids from the sequence ──────────────────────

    const questionIds = questionSequence.map((q) => q.question_id);

    // Fetch question_bank rows for original difficulty ratings
    const { data: questionBankRows } = await supabase
      .from('question_bank')
      .select('id, difficulty_rating, clo_id')
      .in('id', questionIds);

    const questionBankMap = new Map<string, QuestionBankRow>();
    for (const row of (questionBankRows ?? []) as QuestionBankRow[]) {
      questionBankMap.set(row.id, row);
    }

    // Fetch existing analytics rows for these questions
    const { data: existingAnalytics } = await supabase
      .from('question_analytics')
      .select('*')
      .in('question_id', questionIds);

    const analyticsMap = new Map<string, AnalyticsRow>();
    for (const row of (existingAnalytics ?? []) as AnalyticsRow[]) {
      analyticsMap.set(row.question_id, row);
    }

    // ── Step 4: Process each question answered ──────────────────────────

    const updatedSummary: {
      question_id: string;
      total_attempts: number;
      success_rate: number;
      calibrated_difficulty: number | null;
      discrimination_index: number | null;
      quality_flag: string | null;
    }[] = [];

    for (const seqEntry of questionSequence) {
      const questionId = seqEntry.question_id;
      const isCorrect = answersMap.get(questionId);
      const responseTimeMs = timesMap.get(questionId);

      // Skip questions without answer data
      if (isCorrect === undefined) continue;

      const existing = analyticsMap.get(questionId);
      const qbRow = questionBankMap.get(questionId);

      // ── 4a: Compute new totals ──────────────────────────────────────

      const prevTotalAttempts = existing?.total_attempts ?? 0;
      const prevCorrectCount = existing?.correct_count ?? 0;
      const prevAvgResponseTime = existing?.avg_response_time_seconds ?? 0;

      const newTotalAttempts = prevTotalAttempts + 1;
      const newCorrectCount = isCorrect ? prevCorrectCount + 1 : prevCorrectCount;

      // ── 4b: Recalculate success_rate ────────────────────────────────

      const newSuccessRate = newCorrectCount / newTotalAttempts;

      // ── 4c: Recalculate avg_response_time_seconds ───────────────────

      let newAvgResponseTime = prevAvgResponseTime;
      if (responseTimeMs !== undefined && responseTimeMs >= 0) {
        const responseTimeSec = responseTimeMs / 1000;
        // Running average: ((prev_avg * prev_count) + new_value) / new_count
        newAvgResponseTime =
          (prevAvgResponseTime * prevTotalAttempts + responseTimeSec) / newTotalAttempts;
      }

      // ── 4d: Calibrated difficulty (if total_attempts >= 10) ─────────

      let newCalibratedDifficulty: number | null = existing?.calibrated_difficulty ?? null;
      if (newTotalAttempts >= CALIBRATION_MIN_ATTEMPTS && qbRow) {
        newCalibratedDifficulty = computeCalibratedDifficulty(
          qbRow.difficulty_rating,
          newSuccessRate,
          newTotalAttempts,
        );
        // Round to 1 decimal place to match NUMERIC(3,1)
        newCalibratedDifficulty = Math.round(newCalibratedDifficulty * 10) / 10;
      }

      // ── 4e: Discrimination index (if total_attempts >= 20) ──────────

      let newDiscriminationIndex: number | null = existing?.discrimination_index ?? null;
      if (newTotalAttempts >= DISCRIMINATION_MIN_ATTEMPTS && qbRow) {
        newDiscriminationIndex = await computeDiscriminationForQuestion(
          supabase,
          questionId,
          qbRow.clo_id,
        );
      }

      // ── 4f: Quality flag ────────────────────────────────────────────

      const newQualityFlag = determineQualityFlag(
        newSuccessRate,
        newDiscriminationIndex ?? 0,
        newTotalAttempts,
      );

      // ── 4g: UPSERT question_analytics ───────────────────────────────

      const { error: upsertError } = await supabase
        .from('question_analytics')
        .upsert(
          {
            question_id: questionId,
            total_attempts: newTotalAttempts,
            correct_count: newCorrectCount,
            success_rate: newSuccessRate,
            avg_response_time_seconds: Math.round(newAvgResponseTime * 100) / 100,
            calibrated_difficulty: newCalibratedDifficulty,
            discrimination_index: newDiscriminationIndex
              ? Math.round(newDiscriminationIndex * 10000) / 10000
              : newDiscriminationIndex,
            quality_flag: newQualityFlag,
            last_calculated_at: new Date().toISOString(),
          },
          { onConflict: 'question_id' },
        );

      if (upsertError) {
        console.error(
          `Failed to upsert analytics for question ${questionId}:`,
          upsertError.message,
        );
        continue;
      }

      updatedSummary.push({
        question_id: questionId,
        total_attempts: newTotalAttempts,
        success_rate: Math.round(newSuccessRate * 10000) / 10000,
        calibrated_difficulty: newCalibratedDifficulty,
        discrimination_index: newDiscriminationIndex
          ? Math.round(newDiscriminationIndex * 10000) / 10000
          : newDiscriminationIndex,
        quality_flag: newQualityFlag,
      });
    }

    // ── Step 5: Return summary ──────────────────────────────────────────

    return new Response(
      JSON.stringify({
        success: true,
        quiz_attempt_id,
        updated: updatedSummary.length,
        analytics: updatedSummary,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    console.error('Unhandled error in update-question-analytics:', (error as Error).message);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
