/**
 * Primary CTA selector — chooses the single dominant dashboard call-to-action
 * from a set of candidate actions, and orders the remaining applicable
 * candidates as subordinate secondary actions.
 *
 * Pure functions with no side effects; safe to call in render paths.
 *
 * Precedence convention: a LOWER `priority` value means HIGHER precedence
 * (priority 0 outranks priority 1). Only candidates marked `applicable` are
 * ever considered; non-applicable candidates are excluded from the comparison
 * so that completing or invalidating the current primary promotes the next
 * applicable candidate.
 *
 * Design: Area K — Dashboard single PrimaryCTA
 * Requirements: 16.1, 16.2, 16.3
 */

export interface CtaCandidate {
  /** Stable identifier, unique within a candidate set. */
  id: string;
  /** Precedence value; lower wins. */
  priority: number;
  /** Whether the action currently applies to the student. */
  applicable: boolean;
}

/**
 * Select the single highest-precedence applicable candidate.
 *
 * Returns `null` when no candidate is applicable (R16.1: at most one dominant
 * CTA, none when nothing applies). Non-applicable candidates are excluded from
 * the comparison (R16.2). Ties on `priority` resolve to the first such
 * candidate in input order, keeping selection deterministic.
 *
 * @example
 * selectPrimary([
 *   { id: "profile", priority: 0, applicable: false },
 *   { id: "submit", priority: 1, applicable: true },
 *   { id: "continue", priority: 2, applicable: true },
 * ]);
 * // → { id: "submit", priority: 1, applicable: true }
 */
export function selectPrimary<T extends CtaCandidate>(
  candidates: readonly T[]
): T | null {
  let best: T | null = null;
  for (const candidate of candidates) {
    if (!candidate.applicable) continue;
    if (best === null || candidate.priority < best.priority) {
      best = candidate;
    }
  }
  return best;
}

/**
 * Order the subordinate (secondary) applicable candidates by ascending
 * precedence, excluding the primary candidate.
 *
 * When `primaryId` is omitted, the primary is computed from the candidate set
 * via {@link selectPrimary}, so callers can request "everything except the
 * dominant action" in one call. Non-applicable candidates are never included.
 * The sort is stable: ties on `priority` preserve input order (R16.3 — the
 * next-highest-precedence applicable candidate is promoted predictably).
 *
 * @example
 * orderSecondary([
 *   { id: "submit", priority: 1, applicable: true },
 *   { id: "continue", priority: 2, applicable: true },
 *   { id: "feedback", priority: 3, applicable: true },
 * ], "submit");
 * // → [{ id: "continue", ... }, { id: "feedback", ... }]
 */
export function orderSecondary<T extends CtaCandidate>(
  candidates: readonly T[],
  primaryId?: string | null
): T[] {
  const excludeId =
    primaryId !== undefined && primaryId !== null
      ? primaryId
      : selectPrimary(candidates)?.id ?? null;

  return candidates
    .filter((candidate) => candidate.applicable && candidate.id !== excludeId)
    .map((candidate, index) => ({ candidate, index }))
    .sort((a, b) =>
      a.candidate.priority === b.candidate.priority
        ? a.index - b.index
        : a.candidate.priority - b.candidate.priority
    )
    .map(({ candidate }) => candidate);
}
