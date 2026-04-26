// Feature: xp-marketplace, Property 36: comparison correctness
// **Validates: Requirements 30.2, 30.3**

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

// ─── Pure functions mirroring personal best comparison logic ────────────────

type DeltaDirection = 'up' | 'down' | 'same';

interface PersonalBestComparison {
  delta: number;
  direction: DeltaDirection;
  percentChange: number;
}

function computePersonalBestComparison(
  currentValue: number,
  previousValue: number,
): PersonalBestComparison {
  const delta = currentValue - previousValue;
  const direction: DeltaDirection = delta > 0 ? 'up' : delta < 0 ? 'down' : 'same';
  const percentChange =
    previousValue === 0
      ? currentValue > 0
        ? 100
        : 0
      : Math.round(((currentValue - previousValue) / previousValue) * 100);

  return { delta, direction, percentChange };
}

// ─── Arbitraries ────────────────────────────────────────────────────────────

const valueArb = fc.integer({ min: 0, max: 100_000 });

// ─── Property 36: Personal best comparison correctness ──────────────────────

describe('Property 36 — Personal best comparison correctness', () => {
  it('P36a: delta equals current - previous', () => {
    fc.assert(
      fc.property(valueArb, valueArb, (current, previous) => {
        const result = computePersonalBestComparison(current, previous);
        expect(result.delta).toBe(current - previous);
      }),
      { numRuns: 100 },
    );
  });

  it('P36b: direction is "up" when current > previous', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 100_000 }),
        fc.integer({ min: 0, max: 99_999 }),
        (current, previous) => {
          fc.pre(current > previous);
          const result = computePersonalBestComparison(current, previous);
          expect(result.direction).toBe('up');
        },
      ),
      { numRuns: 100 },
    );
  });

  it('P36c: direction is "down" when current < previous', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 99_999 }),
        fc.integer({ min: 1, max: 100_000 }),
        (current, previous) => {
          fc.pre(current < previous);
          const result = computePersonalBestComparison(current, previous);
          expect(result.direction).toBe('down');
        },
      ),
      { numRuns: 100 },
    );
  });

  it('P36d: direction is "same" when current equals previous', () => {
    fc.assert(
      fc.property(valueArb, (value) => {
        const result = computePersonalBestComparison(value, value);
        expect(result.direction).toBe('same');
        expect(result.delta).toBe(0);
      }),
      { numRuns: 100 },
    );
  });

  it('P36e: percent change handles zero previous without error', () => {
    fc.assert(
      fc.property(valueArb, (current) => {
        const result = computePersonalBestComparison(current, 0);
        if (current > 0) {
          expect(result.percentChange).toBe(100);
        } else {
          expect(result.percentChange).toBe(0);
        }
      }),
      { numRuns: 100 },
    );
  });

  it('P36f: comparison is deterministic', () => {
    fc.assert(
      fc.property(valueArb, valueArb, (current, previous) => {
        const r1 = computePersonalBestComparison(current, previous);
        const r2 = computePersonalBestComparison(current, previous);
        expect(r1).toEqual(r2);
      }),
      { numRuns: 100 },
    );
  });
});
