// Feature: pre-deployment-e2e-audit
// Shared generator for outcome-mapping weight trees used by Property 1
// (outcome-mapping weights sum to 100) and Property 3 (attainment cascade).

import fc from "fast-check";

export interface OutcomeMapping {
  readonly parentOutcomeId: string;
  readonly weight: number;
}

/**
 * A set of 1..=10 mapping weights that always sum to exactly 100.
 * fast-check's integer generator lets us pick a partition then normalise.
 *
 * Strategy: generate N-1 cut points in [1, 99], sort, and compute gaps.
 * Resulting partition is N positive integers summing to 100. Matches the
 * real-world UX: a coordinator can't save mappings that don't total 100.
 */
export const arbitraryWeightPartition = (): fc.Arbitrary<number[]> =>
  fc.integer({ min: 1, max: 10 }).chain((n) =>
    n === 1
      ? fc.constant([100])
      : fc
          .array(fc.integer({ min: 1, max: 99 }), {
            minLength: n - 1,
            maxLength: n - 1,
          })
          .map((cuts) => {
            const sorted = [...cuts].sort((a, b) => a - b);
            const weights: number[] = [];
            let prev = 0;
            for (const cut of sorted) {
              weights.push(cut - prev);
              prev = cut;
            }
            weights.push(100 - prev);
            // Filter out zero-weight mappings (the UI doesn't render them
            // and the sum still holds). If all slots collapsed to a single
            // non-zero bucket we still sum to 100.
            return weights.filter((w) => w > 0);
          })
  );

/**
 * A child outcome with its mapping weights. parentIds are uuid strings.
 */
export const arbitraryChildOutcomeMappings = (): fc.Arbitrary<
  ReadonlyArray<OutcomeMapping>
> =>
  arbitraryWeightPartition().chain((weights) =>
    fc
      .array(fc.uuid({ version: 4 }), {
        minLength: weights.length,
        maxLength: weights.length,
      })
      .map((parentIds) =>
        weights.map((weight, i) => ({
          parentOutcomeId: parentIds[i] as string,
          weight,
        }))
      )
  );

/**
 * A bundle of child outcomes each with their own well-formed mapping set.
 * Used by Property 3 to exercise the cascade.
 */
export const arbitraryOutcomeTree = (): fc.Arbitrary<
  ReadonlyArray<{
    readonly childId: string;
    readonly mappings: ReadonlyArray<OutcomeMapping>;
  }>
> =>
  fc.array(
    fc
      .record({
        childId: fc.uuid({ version: 4 }),
        mappings: arbitraryChildOutcomeMappings(),
      })
      .map((entry) => ({ childId: entry.childId, mappings: entry.mappings })),
    { minLength: 1, maxLength: 8 }
  );
