// =============================================================================
// gradingInsights — E2.A rubric-coverage confidence + deterministic score
// explanation (platform-hardening-and-integration, T17)
//
// Design rule: coverage/confidence is computed from EXISTING rubric criteria
// vs the teacher's selections — no new AI call, no parallel data. The score
// explanation is a deterministic composition of the rubric selections so the
// teacher can always answer "why this score?".
// =============================================================================

/** Structural shape shared with the rubric criteria used by the grading UI. */
export interface RubricCriterionLike {
  readonly id: string;
  readonly criterion_name: string;
  readonly sort_order: number;
  readonly levels: ReadonlyArray<{ readonly label: string }>;
  readonly max_points: number;
}

export interface RubricCoverage {
  /** Criteria with a selected level. */
  readonly covered: number;
  /** Total rubric criteria. */
  readonly total: number;
  /** covered / total as a 0–100 percent (0 when no criteria exist). */
  readonly percent: number;
}

/**
 * Rubric-coverage confidence (E2.A): criteria assessed / total criteria.
 */
export const computeRubricCoverage = (
  criteria: readonly RubricCriterionLike[],
  selections: ReadonlyMap<string, unknown>
): RubricCoverage => {
  const total = criteria.length;
  const covered = criteria.filter((criterion) =>
    selections.has(criterion.id)
  ).length;
  return {
    covered,
    total,
    percent: total > 0 ? Math.round((covered / total) * 100) : 0,
  };
};

export interface ScoreExplanationRow {
  readonly criterionName: string;
  readonly levelLabel: string;
  readonly points: number;
  readonly maxPoints: number;
}

/**
 * Deterministic per-criterion breakdown of the rubric score (E2.A
 * "Why-explains-score"): one row per ASSESSED criterion, in rubric order,
 * with the selected level's label and points. Unassessed criteria are
 * omitted — they contribute zero.
 */
export const buildScoreExplanation = (
  criteria: readonly RubricCriterionLike[],
  selections: ReadonlyMap<string, { levelIndex: number; points: number }>
): ScoreExplanationRow[] => {
  const sorted = [...criteria].sort((a, b) => a.sort_order - b.sort_order);
  const rows: ScoreExplanationRow[] = [];
  for (const criterion of sorted) {
    const selection = selections.get(criterion.id);
    if (!selection) continue;
    rows.push({
      criterionName: criterion.criterion_name,
      levelLabel: criterion.levels[selection.levelIndex]?.label ?? "—",
      points: selection.points,
      maxPoints: criterion.max_points,
    });
  }
  return rows;
};
