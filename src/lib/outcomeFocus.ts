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

// ─── Parent-chain derivation (focus-area → PLO/ILO chain) ────────────────────
// The alignment surface also shows WHERE each focus CLO lives in the outcome
// hierarchy. Mapping direction is canonical everywhere in this repo:
//   outcome_mappings.SOURCE = parent/higher-level (PLO/ILO)
//   outcome_mappings.TARGET = child/lower-level  (CLO/PLO)

/** A mapped parent outcome (PLO or ILO) as rendered under a focus area. */
export interface OutcomeParentRef {
  id: string;
  title: string;
  type: "PLO" | "ILO";
}

/** Mapped parents of a single CLO, keyed by that CLO's id. */
export interface OutcomeParents {
  plos: OutcomeParentRef[];
  ilos: OutcomeParentRef[];
}

export type FocusAreaChainByClo = Record<string, OutcomeParents>;

/** Canonical-direction mapping row (source = parent, target = child). */
export interface OutcomeMappingLink {
  source_outcome_id: string;
  target_outcome_id: string;
}

/** The outcome columns needed to name a parent (PLO/ILO) row. */
export interface OutcomeRefRow {
  id: string;
  title: string;
  type: string;
}

/**
 * Builds the PLO/ILO chain per CLO from raw mapping + outcome rows.
 *
 * Pure (like `selectWeakestOutcomes`) so it can be unit-tested without
 * Supabase. Canonical direction only; rows whose source is not a PLO/ILO are
 * ignored defensively, and a parent reached through several paths is emitted
 * once. Order preserves evidence order (row arrival) — caller batches with
 * `.in(...)` so insertion order is stable in practice.
 */
export const buildOutcomeParentChains = (
  cloToPlos: readonly OutcomeMappingLink[],
  ploToIlos: readonly OutcomeMappingLink[],
  outcomeRows: readonly OutcomeRefRow[]
): FocusAreaChainByClo => {
  const byId = new Map(outcomeRows.map((row) => [row.id, row]));

  const pushUnique = (
    map: Map<string, OutcomeParentRef[]>,
    key: string,
    ref: OutcomeParentRef
  ) => {
    const existing = map.get(key);
    if (existing) {
      if (!existing.some((entry) => entry.id === ref.id)) existing.push(ref);
    } else {
      map.set(key, [ref]);
    }
  };

  const plosByClo = new Map<string, OutcomeParentRef[]>();
  for (const link of cloToPlos) {
    const plo = byId.get(link.source_outcome_id);
    if (!plo || plo.type !== "PLO") continue;
    pushUnique(plosByClo, link.target_outcome_id, {
      id: plo.id,
      title: plo.title,
      type: "PLO",
    });
  }

  const ilosByPlo = new Map<string, OutcomeParentRef[]>();
  for (const link of ploToIlos) {
    const ilo = byId.get(link.source_outcome_id);
    if (!ilo || ilo.type !== "ILO") continue;
    pushUnique(ilosByPlo, link.target_outcome_id, {
      id: ilo.id,
      title: ilo.title,
      type: "ILO",
    });
  }

  const result: FocusAreaChainByClo = {};
  for (const [cloId, plos] of plosByClo) {
    const ilos: OutcomeParentRef[] = [];
    const seen = new Set<string>();
    for (const plo of plos) {
      for (const ilo of ilosByPlo.get(plo.id) ?? []) {
        if (seen.has(ilo.id)) continue;
        seen.add(ilo.id);
        ilos.push(ilo);
      }
    }
    result[cloId] = { plos, ilos };
  }
  return result;
};

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
