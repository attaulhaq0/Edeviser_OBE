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

interface BloomsClimbState {
  current_level: number;
  consecutive_correct: number;
  transitions: { from_level: number; to_level: number; question_number: number; reason: string }[];
  highest_level_reached: number;
  previous_level: number;
  just_advanced: boolean;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CALIBRATION_MIN_ATTEMPTS = 10;
const DISCRIMINATION_MIN_ATTEMPTS = 20;
const EMPIRICAL_WEIGHT_DENOMINATOR = 50;
const MASTERY_THRESHOLD = 70; // default mastery threshold percentage
const MASTERY_FAILURE_THRESHOLD = 2; // failures before recovery activation

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

// ─── Mastery Failure Detection ───────────────────────────────────────────────

/**
 * Computes per-CLO scores from the quiz attempt answers and question bank data.
 * Returns a Record<clo_id, percentage_correct>.
 */
function computePerCLOScores(
  questionSequence: QuestionSequenceEntry[],
  answersMap: Map<string, boolean>,
  questionBankMap: Map<string, QuestionBankRow>,
): Record<string, number> {
  const totals: Record<string, number> = {};
  const corrects: Record<string, number> = {};

  for (const seqEntry of questionSequence) {
    const qbRow = questionBankMap.get(seqEntry.question_id);
    const isCorrect = answersMap.get(seqEntry.question_id);
    if (!qbRow || isCorrect === undefined) continue;

    const cloId = qbRow.clo_id;
    totals[cloId] = (totals[cloId] ?? 0) + 1;
    if (isCorrect) {
      corrects[cloId] = (corrects[cloId] ?? 0) + 1;
    }
  }

  const result: Record<string, number> = {};
  for (const cloId of Object.keys(totals)) {
    result[cloId] = ((corrects[cloId] ?? 0) / totals[cloId]) * 100;
  }
  return result;
}

/**
 * Counts the number of previous quiz attempts where the student scored below
 * the mastery threshold for a given CLO. Excludes the current attempt.
 */
async function countPreviousCLOFailures(
  supabase: ReturnType<typeof createClient>,
  studentId: string,
  cloId: string,
  currentAttemptId: string,
  threshold: number,
): Promise<number> {
  // Fetch all quiz attempts for this student (excluding current)
  const { data: attempts } = await supabase
    .from('quiz_attempts')
    .select('id, answers, question_sequence')
    .eq('student_id', studentId)
    .neq('id', currentAttemptId)
    .not('answers', 'is', null)
    .not('question_sequence', 'is', null);

  if (!attempts || attempts.length === 0) return 0;

  let failureCount = 0;

  for (const attempt of attempts) {
    const seq = (attempt.question_sequence ?? []) as QuestionSequenceEntry[];
    const answers = parseAnswers(attempt.answers);

    // We need question_bank data for CLO mapping — fetch question IDs from this attempt
    const qIds = seq.map((q: QuestionSequenceEntry) => q.question_id);
    if (qIds.length === 0) continue;

    const { data: qbRows } = await supabase
      .from('question_bank')
      .select('id, clo_id')
      .in('id', qIds);

    if (!qbRows) continue;

    // Count questions for this CLO and how many were correct
    let cloTotal = 0;
    let cloCorrect = 0;

    for (const qb of qbRows) {
      if (qb.clo_id !== cloId) continue;
      const isCorrect = answers.get(qb.id);
      if (isCorrect === undefined) continue;
      cloTotal++;
      if (isCorrect) cloCorrect++;
    }

    // If this attempt had questions for this CLO and scored below threshold
    if (cloTotal > 0) {
      const score = (cloCorrect / cloTotal) * 100;
      if (score < threshold) {
        failureCount++;
      }
    }
  }

  return failureCount;
}

/**
 * Checks mastery failures for all CLOs below threshold in the current attempt
 * and activates recovery pathways when the failure threshold is reached.
 * This is idempotent — the unique partial index on (student_id, clo_id)
 * WHERE status = 'active' prevents duplicate active recovery sessions.
 */
async function checkAndActivateMasteryRecovery(
  supabase: ReturnType<typeof createClient>,
  attemptId: string,
  studentId: string,
  quizId: string,
  questionSequence: QuestionSequenceEntry[],
  answersMap: Map<string, boolean>,
  questionBankMap: Map<string, QuestionBankRow>,
): Promise<{ recoveries_activated: string[] }> {
  const recoveriesActivated: string[] = [];

  // Step 1: Compute per-CLO scores for this attempt
  const perCLOScores = computePerCLOScores(questionSequence, answersMap, questionBankMap);

  // Step 2: Identify CLOs below mastery threshold
  const failingCLOs = Object.entries(perCLOScores)
    .filter(([, score]) => score < MASTERY_THRESHOLD)
    .map(([cloId]) => cloId);

  if (failingCLOs.length === 0) return { recoveries_activated: [] };

  // Step 3: Get course_id from the quiz
  const { data: quiz } = await supabase
    .from('quizzes')
    .select('course_id')
    .eq('id', quizId)
    .maybeSingle();

  if (!quiz) return { recoveries_activated: [] };

  // Step 4: Get institution_id from the student's profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('institution_id')
    .eq('id', studentId)
    .maybeSingle();

  if (!profile) return { recoveries_activated: [] };

  // Step 5: For each failing CLO, check failure count and activate recovery if needed
  for (const cloId of failingCLOs) {
    try {
      // Count previous failures (excluding current attempt — current is +1)
      const previousFailures = await countPreviousCLOFailures(
        supabase,
        studentId,
        cloId,
        attemptId,
        MASTERY_THRESHOLD,
      );

      // Total failures including this attempt
      const totalFailures = previousFailures + 1;

      if (totalFailures < MASTERY_FAILURE_THRESHOLD) continue;

      // Check if an active recovery already exists (the unique partial index
      // also prevents duplicates, but checking first avoids unnecessary errors)
      const { data: existingRecovery } = await supabase
        .from('mastery_recovery_pathways')
        .select('id')
        .eq('student_id', studentId)
        .eq('clo_id', cloId)
        .eq('status', 'active')
        .maybeSingle();

      if (existingRecovery) continue;

      // Activate recovery pathway
      const { error: insertError } = await supabase
        .from('mastery_recovery_pathways')
        .insert({
          institution_id: profile.institution_id,
          student_id: studentId,
          clo_id: cloId,
          course_id: quiz.course_id,
          failure_count: totalFailures,
          status: 'active',
        });

      if (insertError) {
        // The unique partial index will cause a conflict error if an active
        // recovery already exists — this is expected and safe to ignore
        if (insertError.code === '23505') {
          console.log(
            `Active recovery already exists for student ${studentId}, CLO ${cloId} — skipping`,
          );
        } else {
          console.error(
            `Failed to activate recovery for student ${studentId}, CLO ${cloId}:`,
            insertError.message,
          );
        }
        continue;
      }

      // Fetch the inserted recovery pathway id for audit logging
      const { data: insertedRecovery } = await supabase
        .from('mastery_recovery_pathways')
        .select('id')
        .eq('student_id', studentId)
        .eq('clo_id', cloId)
        .eq('status', 'active')
        .maybeSingle();

      const recoveryId = insertedRecovery?.id ?? 'unknown';
      recoveriesActivated.push(cloId);

      // Audit log: recovery pathway activation (non-blocking)
      try {
        await supabase.from('audit_logs').insert({
          action: 'recovery_activated',
          target_type: 'mastery_recovery_pathway',
          target_id: recoveryId,
          diff: {
            student_id: studentId,
            clo_id: cloId,
            course_id: quiz.course_id,
            failure_count: totalFailures,
          },
          actor_id: studentId,
        });
      } catch (auditErr) {
        console.error('[AuditLog] Failed to log recovery activation:', (auditErr as Error).message);
      }

      console.log(
        `Mastery recovery activated for student ${studentId}, CLO ${cloId} (${totalFailures} failures)`,
      );
    } catch (err) {
      // Don't let recovery activation errors block the main analytics flow
      console.error(
        `Error checking mastery recovery for CLO ${cloId}:`,
        (err as Error).message,
      );
    }
  }

  return { recoveries_activated: recoveriesActivated };
}

// ─── Bloom's Progression Update ──────────────────────────────────────────────

/**
 * Computes the highest Bloom's level where the student has at least 2
 * correct answers across all attempts in the session.
 * Mirrors the logic from src/lib/bloomsClimb.ts highestBloomReached.
 */
function computeHighestBloomReached(
  questionSequence: QuestionSequenceEntry[],
  answersMap: Map<string, boolean>,
  questionBankMap: Map<string, QuestionBankRow>,
): number {
  const correctCountByLevel = new Map<number, number>();

  for (const seqEntry of questionSequence) {
    const isCorrect = answersMap.get(seqEntry.question_id);
    if (!isCorrect) continue;

    const bloomLevel = seqEntry.bloom_level;
    correctCountByLevel.set(bloomLevel, (correctCountByLevel.get(bloomLevel) ?? 0) + 1);
  }

  let highest = 0;
  for (const [level, count] of correctCountByLevel) {
    if (count >= 2 && level > highest) {
      highest = level;
    }
  }

  return highest;
}

/**
 * Updates the blooms_progression table with the highest Bloom's level reached
 * during this quiz session. Uses UPSERT on the (student_id, clo_id) unique
 * constraint. Badge flags are only set to true, never reverted to false.
 */
async function updateBloomsProgression(
  supabase: ReturnType<typeof createClient>,
  studentId: string,
  quizId: string,
  questionSequence: QuestionSequenceEntry[],
  answersMap: Map<string, boolean>,
  questionBankMap: Map<string, QuestionBankRow>,
  bloomsClimbState: BloomsClimbState | null,
): Promise<{ clos_updated: string[] }> {
  const closUpdated: string[] = [];

  // Determine highest level reached — prefer blooms_climb_state if available
  let highestLevelReached = 0;

  if (bloomsClimbState && bloomsClimbState.highest_level_reached > 0) {
    highestLevelReached = bloomsClimbState.highest_level_reached;
  } else {
    // Fallback: compute from attempt data
    highestLevelReached = computeHighestBloomReached(questionSequence, answersMap, questionBankMap);
  }

  if (highestLevelReached <= 0) {
    return { clos_updated: [] };
  }

  // Get course_id and institution_id from the quiz
  const { data: quiz } = await supabase
    .from('quizzes')
    .select('course_id')
    .eq('id', quizId)
    .maybeSingle();

  if (!quiz) return { clos_updated: [] };

  const { data: profile } = await supabase
    .from('profiles')
    .select('institution_id')
    .eq('id', studentId)
    .maybeSingle();

  if (!profile) return { clos_updated: [] };

  // Collect unique CLO IDs from the quiz questions
  const cloIds = new Set<string>();
  for (const seqEntry of questionSequence) {
    const qbRow = questionBankMap.get(seqEntry.question_id);
    if (qbRow) {
      cloIds.add(qbRow.clo_id);
    }
  }

  // Compute correct count at the highest level for this session
  let correctCountAtHighest = 0;
  for (const seqEntry of questionSequence) {
    const isCorrect = answersMap.get(seqEntry.question_id);
    if (isCorrect && seqEntry.bloom_level === highestLevelReached) {
      correctCountAtHighest++;
    }
  }

  // Badge flags based on highest level reached
  const explorerEarned = highestLevelReached >= 4;
  const challengerEarned = highestLevelReached >= 5;
  const pioneerEarned = highestLevelReached >= 6;

  // UPSERT for each CLO in the quiz
  for (const cloId of cloIds) {
    try {
      // Fetch existing row to preserve badge flags (once earned, never reverted)
      const { data: existing } = await supabase
        .from('blooms_progression')
        .select('highest_bloom_level, correct_count_at_highest, bloom_explorer_awarded, bloom_challenger_awarded, bloom_pioneer_awarded')
        .eq('student_id', studentId)
        .eq('clo_id', cloId)
        .maybeSingle();

      const existingLevel = existing?.highest_bloom_level ?? 0;
      const newHighest = Math.max(existingLevel, highestLevelReached);

      // If the new highest is the same as existing, keep the higher correct count
      const newCorrectCount = newHighest > existingLevel
        ? correctCountAtHighest
        : newHighest === existingLevel
          ? Math.max(existing?.correct_count_at_highest ?? 0, correctCountAtHighest)
          : existing?.correct_count_at_highest ?? 0;

      const { error: upsertError } = await supabase
        .from('blooms_progression')
        .upsert(
          {
            institution_id: profile.institution_id,
            student_id: studentId,
            clo_id: cloId,
            course_id: quiz.course_id,
            highest_bloom_level: newHighest,
            correct_count_at_highest: newCorrectCount,
            bloom_explorer_awarded: explorerEarned || (existing?.bloom_explorer_awarded ?? false),
            bloom_challenger_awarded: challengerEarned || (existing?.bloom_challenger_awarded ?? false),
            bloom_pioneer_awarded: pioneerEarned || (existing?.bloom_pioneer_awarded ?? false),
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'student_id,clo_id' },
        );

      if (upsertError) {
        console.error(
          `Failed to upsert blooms_progression for student ${studentId}, CLO ${cloId}:`,
          upsertError.message,
        );
        continue;
      }

      closUpdated.push(cloId);
    } catch (err) {
      console.error(
        `Error updating blooms_progression for CLO ${cloId}:`,
        (err as Error).message,
      );
    }
  }

  return { clos_updated: closUpdated };
}

// ─── Main Handler ───────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
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
      .select('id, quiz_id, student_id, answers, question_sequence, per_question_times, mode, blooms_climb_state')
      .eq('id', quiz_attempt_id)
      .maybeSingle();

    if (attemptError || !attempt) {
      return new Response(
        JSON.stringify({ error: 'Quiz attempt not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Determine if this is a practice mode attempt
    const attemptMode = (attempt.mode as string) ?? 'graded';
    const isPractice = attemptMode === 'practice';

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

    // ── Step 5: Mastery Failure Detection (skip for practice mode) ─────

    let masteryRecoveryResult: { recoveries_activated: string[] } = { recoveries_activated: [] };
    if (!isPractice) {
      try {
        masteryRecoveryResult = await checkAndActivateMasteryRecovery(
          supabase,
          quiz_attempt_id,
          attempt.student_id,
          attempt.quiz_id,
          questionSequence,
          answersMap,
          questionBankMap,
        );
      } catch (err) {
        // Mastery recovery errors must not block the analytics response
        console.error('Mastery recovery check failed:', (err as Error).message);
      }
    }

    // ── Step 6: Bloom's Progression Update (skip for practice mode) ────

    let bloomsProgressionResult: { clos_updated: string[] } = { clos_updated: [] };
    if (!isPractice) {
      try {
        // Parse blooms_climb_state from the quiz attempt
        const rawClimbState = attempt.blooms_climb_state as Record<string, unknown> | null;
        const bloomsClimbState: BloomsClimbState | null =
          rawClimbState &&
          typeof rawClimbState === 'object' &&
          typeof rawClimbState.highest_level_reached === 'number'
            ? {
                current_level: (rawClimbState.current_level as number) ?? 1,
                consecutive_correct: (rawClimbState.consecutive_correct as number) ?? 0,
                transitions: (rawClimbState.transitions as BloomsClimbState['transitions']) ?? [],
                highest_level_reached: rawClimbState.highest_level_reached as number,
                previous_level: (rawClimbState.previous_level as number) ?? 1,
                just_advanced: (rawClimbState.just_advanced as boolean) ?? false,
              }
            : null;

        bloomsProgressionResult = await updateBloomsProgression(
          supabase,
          attempt.student_id,
          attempt.quiz_id,
          questionSequence,
          answersMap,
          questionBankMap,
          bloomsClimbState,
        );
      } catch (err) {
        // Bloom's progression errors must not block the analytics response
        console.error('Blooms progression update failed:', (err as Error).message);
      }
    }

    // ── Step 7: Return summary ──────────────────────────────────────────

    return new Response(
      JSON.stringify({
        success: true,
        quiz_attempt_id,
        mode: attemptMode,
        updated: updatedSummary.length,
        analytics: updatedSummary,
        mastery_recovery: masteryRecoveryResult,
        blooms_progression: bloomsProgressionResult,
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
