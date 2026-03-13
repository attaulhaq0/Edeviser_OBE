// Feature: student-onboarding-profiling, Property 2, 3, 5
// P2: VARK scores bounded [0,100]
// P3: VARK scores sum to 100
// P5: VARK dominant style reflects highest score
// **Validates: Requirements 5.4, 11.3, 11.5**

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { calculateVARKScores, type VARKResponseInput } from '@/lib/scoreCalculator';

const MODALITIES = ['visual', 'auditory', 'read_write', 'kinesthetic'] as const;
const TOTAL_QUESTIONS = 16;

/** Generates exactly 16 VARK responses, each selecting one modality */
const varkResponseSetArb: fc.Arbitrary<VARKResponseInput[]> =
  fc.array(fc.constantFrom(...MODALITIES), { minLength: TOTAL_QUESTIONS, maxLength: TOTAL_QUESTIONS })
    .map((modalities) => modalities.map((m) => ({ selected_modality: m })));

describe('calculateVARKScores — property-based tests', () => {
  it('P2: all VARK scores are bounded [0, 100] for any valid 16-response set', () => {
    fc.assert(
      fc.property(varkResponseSetArb, (responses) => {
        const profile = calculateVARKScores(responses, TOTAL_QUESTIONS);
        for (const mod of MODALITIES) {
          expect(profile[mod]).toBeGreaterThanOrEqual(0);
          expect(profile[mod]).toBeLessThanOrEqual(100);
          expect(Number.isInteger(profile[mod])).toBe(true);
        }
      }),
      { numRuns: 200 },
    );
  });

  it('P3: VARK scores sum to 100 when all 16 questions are answered', () => {
    fc.assert(
      fc.property(varkResponseSetArb, (responses) => {
        const profile = calculateVARKScores(responses, TOTAL_QUESTIONS);
        const sum = profile.visual + profile.auditory + profile.read_write + profile.kinesthetic;
        // Due to rounding, sum may be off by at most ±3
        // Each score = Math.round(count/16 * 100), and counts sum to 16
        // So sum of rounded values ≈ 100
        expect(sum).toBeGreaterThanOrEqual(97);
        expect(sum).toBeLessThanOrEqual(103);
      }),
      { numRuns: 200 },
    );
  });

  it('P5: dominant style is the highest-scoring modality when it leads by >10 points', () => {
    fc.assert(
      fc.property(varkResponseSetArb, (responses) => {
        const profile = calculateVARKScores(responses, TOTAL_QUESTIONS);
        const scores = { visual: profile.visual, auditory: profile.auditory, read_write: profile.read_write, kinesthetic: profile.kinesthetic };
        const maxScore = Math.max(...Object.values(scores));
        const topModalities = MODALITIES.filter((m) => maxScore - scores[m] <= 10);

        if (topModalities.length >= 2) {
          expect(profile.dominant_style).toBe('multimodal');
        } else {
          expect(profile.dominant_style).toBe(topModalities[0]);
        }
      }),
      { numRuns: 200 },
    );
  });
});
