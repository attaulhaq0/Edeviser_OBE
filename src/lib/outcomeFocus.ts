// =============================================================================
// outcomeFocus — student outcome focus-area selection rule (pure business logic)
// =============================================================================
// Feature: Alignment summary ranking (frontend-plan.md; Wave D4 review fix).
//
// Owns the deterministic rule that picks a student's focus areas from their
// CLO attainment bundles: flatten → drop unrated outcomes → rank weakest-first
// → cap. Lives in src/lib/ per repo convention ("business logic lives in
// src/lib/, not in components"); rendered by OutcomeAlignmentSummary only.
//
// Determinism guarantees relied upon by tests and UI:
// - Array.prototype.sort is stable (ES2019+), so attainment TIES preserve the
//   underlying evidence order instead of shuffling between renders.
// - Unrated outcomes (attainment_percent === null) never surface — we never
//   invent a score, matching the Digital Twin display/hint-only guardrail.

/** Fields consumed from a single course outcome row (structural subset). */
export interface OutcomeFocusEntry {
  clo_id: string;
  clo_title: string;
  course_name?: string;
  attainment_percent: number | null;
}

/** Structural subset of a course-progress bundle from useCLOProgress. */
export interface OutcomeFocusCourseLike {
  entries: readonly OutcomeFocusEntry[];
}

/** A rendered focus area: rated outcome with its percentage intact. */
export interface WeakestOutcome {
  cloId: string;
  title: string;
  courseName: string;
  percent: number;
}

/**
 * Selects the student's weakest rated outcomes, weakest first.
 * @param courses course progress bundles (may be empty)
 * @param limit maximum focus areas returned (default 3)
 */
export const selectWeakestOutcomes = (
  courses: readonly OutcomeFocusCourseLike[],
  limit = 3
): WeakestOutcome[] =>
  courses
    .flatMap((course) =>
      course.entries.map((entry) => ({
        cloId: entry.clo_id,
        title: entry.clo_title,
        courseName: entry.course_name ?? "",
        percent: entry.attainment_percent,
      }))
    )
    // Unrated outcomes are excluded outright — null never becomes 0%.
    .filter(
      (candidate): candidate is WeakestOutcome => candidate.percent !== null
    )
    // Stable ascending sort: lowest attainment leads, ties keep evidence order.
    .sort((a, b) => a.percent - b.percent)
    .slice(0, limit);
