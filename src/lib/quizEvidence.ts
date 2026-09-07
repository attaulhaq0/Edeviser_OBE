// =============================================================================
// quizEvidence.ts — Canonical quiz evidence path (continuous-verification 7.3a)
// =============================================================================
// Quiz attempts no longer generate evidence client-side. The previous
// implementation here inserted `evidence` rows directly with
// `submission_id`/`grade_id` set to the quiz-attempt UUID (an FK violation
// waiting to happen) and hand-rolled `outcome_attainment` for CLO scope only —
// a second, weaker attainment engine that bypassed
// `trigger_attainment_rollup` (no PLO/ILO rollup, no notification consistency).
//
// The canonical path is now server-side: `record_quiz_attempt_grade_v1`
// creates the real submission + grade pair for the attempt, and the ONE
// attainment trigger does the rest (evidence with denormalized PLO/ILO,
// CLO→PLO/ILO rollup, quiz-scoped notification — and deliberately no 15-XP
// award, because quiz XP remains the client-side award-xp 'quiz_completion'
// economy).
//
// Practice attempts are refused server-side (they must never generate
// evidence); the caller is still expected to skip the call for practice mode.// =============================================================================

import { supabase } from "@/lib/supabase";

/**
 * Create the canonical submission + grade pair for a *graded* quiz attempt.
 *
 * Fires `trigger_attainment_rollup` (evidence → CLO/PLO/ILO attainment) with
 * zero change to the quiz XP economy. Idempotent: calling twice returns the
 * same submission id and never duplicates grades or evidence.
 *
 * @param attemptId The graded quiz attempt (must have a score; must not be
 *                  practice mode).
 * @returns The id of the canonical submission row created for the attempt.
 */
export async function recordQuizAttemptGrade(
  attemptId: string
): Promise<string> {
  const { data, error } = await supabase.rpc("record_quiz_attempt_grade_v1", {
    p_attempt_id: attemptId,
  });

  if (error) throw error;

  const submissionId =
    typeof data === "string" ? data : (data as unknown as { id?: string })?.id;

  if (!submissionId) {
    throw new Error("Quiz evidence recording returned no submission id");
  }
  return submissionId;
}

// (legacy client-side generateQuizEvidence removed 2026-09-06 — task 7.3a;
// the canonical path is server-side via record_quiz_attempt_grade_v1)
