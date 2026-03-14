// Feature: student-onboarding-profiling, Property 7
// P7: Score computation → serialize → deserialize → recompute equivalence
// **Validates: Requirements 10.4**

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  calculateBigFiveScores,
  calculateVARKScores,
  calculateSelfEfficacyScores,
  calculateStudyStrategyScores,
  type PersonalityResponse,
  type VARKResponseInput,
  type SelfEfficacyResponseInput,
  type StudyStrategyResponseInput,
} from '@/lib/scoreCalculator';

const BIG_FIVE_DIMENSIONS = ['openness', 'conscientiousness', 'extraversion', 'agreeableness', 'neuroticism'] as const;
const MODALITIES = ['visual', 'auditory', 'read_write', 'kinesthetic'] as const;
const SE_DOMAINS = ['general_academic', 'course_specific', 'self_regulated_learning'] as const;
const SS_DIMENSIONS = ['time_management', 'elaboration', 'self_testing', 'help_seeking'] as const;

const fullPersonalityArb: fc.Arbitrary<PersonalityResponse[]> =
  fc.tuple(
    ...BIG_FIVE_DIMENSIONS.map((dim) =>
      fc.array(
        fc.record({ dimension: fc.constant(dim), selected_option: fc.integer({ min: 1, max: 5 }), weight: fc.constantFrom(1, -1) }),
        { minLength: 5, maxLength: 5 },
      ),
    ),
  ).map((a) => a.flat());

const fullVarkArb: fc.Arbitrary<VARKResponseInput[]> =
  fc.array(fc.constantFrom(...MODALITIES), { minLength: 16, maxLength: 16 })
    .map((m) => m.map((mod) => ({ selected_modality: mod })));

const fullSelfEfficacyArb: fc.Arbitrary<SelfEfficacyResponseInput[]> =
  fc.tuple(
    ...SE_DOMAINS.map((d) =>
      fc.array(fc.record({ domain: fc.constant(d), selected_option: fc.integer({ min: 1, max: 5 }) }), { minLength: 2, maxLength: 2 }),
    ),
  ).map((a) => a.flat());

const fullStudyStrategyArb: fc.Arbitrary<StudyStrategyResponseInput[]> =
  fc.tuple(
    ...SS_DIMENSIONS.map((d) =>
      fc.array(fc.record({ dimension: fc.constant(d), selected_option: fc.integer({ min: 1, max: 5 }) }), { minLength: 2, maxLength: 2 }),
    ),
  ).map((a) => a.flat());

describe('Score round-trip consistency — property-based tests', () => {
  it('P7: Big Five scores survive JSON round-trip', () => {
    fc.assert(
      fc.property(fullPersonalityArb, (responses) => {
        const original = calculateBigFiveScores(responses);
        const serialized = JSON.stringify(original);
        const deserialized = JSON.parse(serialized);
        const recomputed = calculateBigFiveScores(responses);
        expect(deserialized).toEqual(recomputed);
      }),
      { numRuns: 100 },
    );
  });

  it('P7: VARK scores survive JSON round-trip', () => {
    fc.assert(
      fc.property(fullVarkArb, (responses) => {
        const original = calculateVARKScores(responses, 16);
        const serialized = JSON.stringify(original);
        const deserialized = JSON.parse(serialized);
        const recomputed = calculateVARKScores(responses, 16);
        expect(deserialized).toEqual(recomputed);
      }),
      { numRuns: 100 },
    );
  });

  it('P7: Self-efficacy scores survive JSON round-trip', () => {
    fc.assert(
      fc.property(fullSelfEfficacyArb, (responses) => {
        const original = calculateSelfEfficacyScores(responses);
        const serialized = JSON.stringify(original);
        const deserialized = JSON.parse(serialized);
        const recomputed = calculateSelfEfficacyScores(responses);
        expect(deserialized).toEqual(recomputed);
      }),
      { numRuns: 100 },
    );
  });

  it('P7: Study strategy scores survive JSON round-trip', () => {
    fc.assert(
      fc.property(fullStudyStrategyArb, (responses) => {
        const original = calculateStudyStrategyScores(responses);
        const serialized = JSON.stringify(original);
        const deserialized = JSON.parse(serialized);
        const recomputed = calculateStudyStrategyScores(responses);
        expect(deserialized).toEqual(recomputed);
      }),
      { numRuns: 100 },
    );
  });
});
