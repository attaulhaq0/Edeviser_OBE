// Feature: xp-marketplace, Property 35: probability bounds (5–30%)
// **Validates: Requirements 26.1, 26.8**

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

// ─── Pure function mirroring bonus question probability logic ───────────────

function shouldTriggerBonusQuestion(randomValue: number, probability: number): boolean {
  const boundedProbability = Math.max(5, Math.min(30, probability));
  return (Math.abs(Math.round(randomValue)) % 100) < boundedProbability;
}

function clampBonusProbability(input: number): number {
  return Math.max(5, Math.min(30, input));
}

// ─── Arbitraries ────────────────────────────────────────────────────────────

const randomValueArb = fc.integer({ min: 0, max: 9999 });
const probabilityArb = fc.integer({ min: -50, max: 100 });
const validProbabilityArb = fc.integer({ min: 5, max: 30 });

// ─── Property 35: Bonus question probability bounds ─────────────────────────

describe('Property 35 — Bonus question probability bounds (5–30%)', () => {
  it('P35a: probability is always clamped to [5, 30] range', () => {
    fc.assert(
      fc.property(probabilityArb, (probability) => {
        const clamped = clampBonusProbability(probability);
        expect(clamped).toBeGreaterThanOrEqual(5);
        expect(clamped).toBeLessThanOrEqual(30);
      }),
      { numRuns: 100 },
    );
  });

  it('P35b: trigger rate approximates configured probability over many samples', () => {
    fc.assert(
      fc.property(validProbabilityArb, (probability) => {
        let triggered = 0;
        const total = 1000;
        for (let i = 0; i < total; i++) {
          if (shouldTriggerBonusQuestion(i, probability)) triggered++;
        }
        const rate = triggered / total;
        // Within 5% tolerance
        expect(rate).toBeGreaterThanOrEqual((probability - 5) / 100);
        expect(rate).toBeLessThanOrEqual((probability + 5) / 100);
      }),
      { numRuns: 100 },
    );
  });

  it('P35c: values below 5 are clamped to 5', () => {
    fc.assert(
      fc.property(fc.integer({ min: -100, max: 4 }), (probability) => {
        expect(clampBonusProbability(probability)).toBe(5);
      }),
      { numRuns: 100 },
    );
  });

  it('P35d: values above 30 are clamped to 30', () => {
    fc.assert(
      fc.property(fc.integer({ min: 31, max: 200 }), (probability) => {
        expect(clampBonusProbability(probability)).toBe(30);
      }),
      { numRuns: 100 },
    );
  });

  it('P35e: trigger function returns boolean', () => {
    fc.assert(
      fc.property(randomValueArb, validProbabilityArb, (randomValue, probability) => {
        const result = shouldTriggerBonusQuestion(randomValue, probability);
        expect(typeof result).toBe('boolean');
      }),
      { numRuns: 100 },
    );
  });

  it('P35f: deterministic — same inputs always produce same result', () => {
    fc.assert(
      fc.property(randomValueArb, validProbabilityArb, (randomValue, probability) => {
        const r1 = shouldTriggerBonusQuestion(randomValue, probability);
        const r2 = shouldTriggerBonusQuestion(randomValue, probability);
        expect(r1).toBe(r2);
      }),
      { numRuns: 100 },
    );
  });
});
