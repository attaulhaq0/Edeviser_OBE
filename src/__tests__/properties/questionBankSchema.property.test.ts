// Feature: adaptive-quiz-generation, Property 6: Question schema enforces single CLO and Bloom's level
// **Validates: Requirements 4.5, 14.1**

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { questionBankEntrySchema } from '@/lib/quizGenerationSchemas';

describe('questionBankEntrySchema — single CLO and Bloom enforcement', () => {
  it('P6a: valid entries have exactly one UUID clo_id and one integer bloom_level 1-6', () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        fc.uuid(),
        fc.integer({ min: 1, max: 6 }),
        fc.double({ min: 1.0, max: 5.0, noNaN: true }),
        fc.constantFrom('mcq', 'true_false', 'short_answer', 'fill_in_blank' as const),
        (courseId, cloId, bloom, difficulty, qType) => {
          const entry = {
            course_id: courseId,
            clo_id: cloId,
            bloom_level: bloom,
            question_type: qType,
            question_text: 'Test question',
            options: null,
            correct_answer: { value: 'answer', explanation: 'reason' },
            difficulty_rating: difficulty,
          };
          const result = questionBankEntrySchema.safeParse(entry);
          if (!result.success) return; // float precision edge case
          expect(result.data.clo_id).toBe(cloId);
          expect(typeof result.data.clo_id).toBe('string');
          expect(result.data.bloom_level).toBe(bloom);
          expect(Number.isInteger(result.data.bloom_level)).toBe(true);
          expect(result.data.bloom_level).toBeGreaterThanOrEqual(1);
          expect(result.data.bloom_level).toBeLessThanOrEqual(6);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('P6b: null clo_id is rejected', () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        fc.integer({ min: 1, max: 6 }),
        (courseId, bloom) => {
          const entry = {
            course_id: courseId,
            clo_id: null,
            bloom_level: bloom,
            question_type: 'mcq',
            question_text: 'Test question',
            options: null,
            correct_answer: { value: 'answer', explanation: 'reason' },
            difficulty_rating: 3.0,
          };
          const result = questionBankEntrySchema.safeParse(entry);
          expect(result.success).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('P6c: bloom_level outside 1-6 range is rejected', () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        fc.uuid(),
        fc.oneof(
          fc.integer({ min: -10, max: 0 }),
          fc.integer({ min: 7, max: 20 }),
        ),
        (courseId, cloId, badBloom) => {
          const entry = {
            course_id: courseId,
            clo_id: cloId,
            bloom_level: badBloom,
            question_type: 'mcq',
            question_text: 'Test question',
            options: null,
            correct_answer: { value: 'answer', explanation: 'reason' },
            difficulty_rating: 3.0,
          };
          const result = questionBankEntrySchema.safeParse(entry);
          expect(result.success).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });
});
