// ─── Question Analytics ──────────────────────────────────────────────────────
// Helpers for per-CLO scoring, discrepancy detection, approval rates, and bonus XP.

/**
 * Computes per-CLO score as a percentage of correct answers per CLO.
 * Returns Record<clo_id, percentage>.
 */
export function computePerCLOScore(
  answers: { clo_id: string; is_correct: boolean }[]
): Record<string, number> {
  const totals: Record<string, number> = {};
  const corrects: Record<string, number> = {};

  for (const a of answers) {
    totals[a.clo_id] = (totals[a.clo_id] ?? 0) + 1;
    if (a.is_correct) {
      corrects[a.clo_id] = (corrects[a.clo_id] ?? 0) + 1;
    }
  }

  const result: Record<string, number> = {};
  for (const cloId of Object.keys(totals)) {
    result[cloId] = ((corrects[cloId] ?? 0) / totals[cloId]!) * 100;
  }
  return result;
}

/**
 * Detects a discrepancy between quiz score and CLO attainment.
 * Returns true if the absolute difference exceeds 15 percentage points.
 */
export function detectCLODiscrepancy(
  quizScorePercent: number,
  cloAttainmentPercent: number
): boolean {
  return Math.abs(quizScorePercent - cloAttainmentPercent) > 15;
}

/**
 * Computes approval rate for a generation batch.
 * Returns 0 when total is 0 to avoid division by zero.
 */
export function computeApprovalRate(approved: number, total: number): number {
  if (total === 0) return 0;
  return approved / total;
}

/**
 * Computes bonus XP for correctly answered hard questions (difficulty ≥ 4.0).
 * Awards 10 XP per qualifying question, capped at 50.
 */
export function computeBonusXP(
  correctQuestions: { difficulty_rating: number }[]
): number {
  const hardCount = correctQuestions.filter(
    (q) => q.difficulty_rating >= 4.0
  ).length;
  return Math.min(hardCount * 10, 50);
}
