/**
 * T18 (E2.B) Curriculum Studio readiness: pure rollup of CLO review statuses
 * for one course. "Curriculum ready" = at least one CLO and every CLO
 * confirmed — the explicit state coordinators/attainment can rely on.
 */
export interface CurriculumReadiness {
  confirmed: number;
  inReview: number;
  draft: number;
  total: number;
  /** 0–100, rounded; 0 when there are no CLOs. */
  percent: number;
  ready: boolean;
}

export const computeCurriculumReadiness = (
  statuses: readonly ("draft" | "in_review" | "confirmed")[]
): CurriculumReadiness => {
  const confirmed = statuses.filter((s) => s === "confirmed").length;
  const inReview = statuses.filter((s) => s === "in_review").length;
  const draft = statuses.filter((s) => s === "draft").length;
  const total = statuses.length;
  return {
    confirmed,
    inReview,
    draft,
    total,
    percent: total === 0 ? 0 : Math.round((confirmed / total) * 100),
    ready: total > 0 && confirmed === total,
  };
};

/**
 * T18 (E2.B) readiness rollup from lightweight head-counts (no row transfer).
 * Same semantics as computeCurriculumReadiness; draft is derived.
 */
export const readinessFromCounts = (
  confirmed: number,
  inReview: number,
  total: number
): CurriculumReadiness => {
  const draft = Math.max(0, total - confirmed - inReview);
  return {
    confirmed,
    inReview,
    draft,
    total,
    percent: total === 0 ? 0 : Math.round((confirmed / total) * 100),
    ready: total > 0 && confirmed === total,
  };
};
