// Feature: student-onboarding-profiling, Property 9, 10, 11
// P9: Likert [1,5] schema validation
// P10: VARK [0,3] schema validation
// P11: Baseline [0,3] schema validation
// **Validates: Requirements 3.2, 5.2, 8.2**

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  likertResponseSchema,
  varkResponseSchema,
  baselineResponseSchema,
} from '@/lib/onboardingSchemas';

const validUuid = fc.uuid();

describe('Onboarding schema validation — property-based tests', () => {
  it('P9: likertResponseSchema accepts integers in [1, 5] and rejects outside', () => {
    fc.assert(
      fc.property(validUuid, fc.integer({ min: 1, max: 5 }), (questionId, option) => {
        const result = likertResponseSchema.safeParse({ question_id: questionId, selected_option: option });
        expect(result.success).toBe(true);
      }),
      { numRuns: 100 },
    );

    fc.assert(
      fc.property(
        validUuid,
        fc.integer({ min: -100, max: 100 }).filter((n) => n < 1 || n > 5),
        (questionId, option) => {
          const result = likertResponseSchema.safeParse({ question_id: questionId, selected_option: option });
          expect(result.success).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('P9: likertResponseSchema rejects non-integer values', () => {
    fc.assert(
      fc.property(validUuid, fc.double({ min: 1.01, max: 4.99, noNaN: true }).filter((n) => !Number.isInteger(n)), (questionId, option) => {
        const result = likertResponseSchema.safeParse({ question_id: questionId, selected_option: option });
        expect(result.success).toBe(false);
      }),
      { numRuns: 100 },
    );
  });

  it('P10: varkResponseSchema accepts integers in [0, 3] and rejects outside', () => {
    fc.assert(
      fc.property(validUuid, fc.integer({ min: 0, max: 3 }), (questionId, option) => {
        const result = varkResponseSchema.safeParse({ question_id: questionId, selected_option: option });
        expect(result.success).toBe(true);
      }),
      { numRuns: 100 },
    );

    fc.assert(
      fc.property(
        validUuid,
        fc.integer({ min: -100, max: 100 }).filter((n) => n < 0 || n > 3),
        (questionId, option) => {
          const result = varkResponseSchema.safeParse({ question_id: questionId, selected_option: option });
          expect(result.success).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('P11: baselineResponseSchema accepts integers in [0, 3] and rejects outside', () => {
    fc.assert(
      fc.property(validUuid, fc.integer({ min: 0, max: 3 }), (questionId, option) => {
        const result = baselineResponseSchema.safeParse({ question_id: questionId, selected_option: option });
        expect(result.success).toBe(true);
      }),
      { numRuns: 100 },
    );

    fc.assert(
      fc.property(
        validUuid,
        fc.integer({ min: -100, max: 100 }).filter((n) => n < 0 || n > 3),
        (questionId, option) => {
          const result = baselineResponseSchema.safeParse({ question_id: questionId, selected_option: option });
          expect(result.success).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });
});
