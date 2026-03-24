// Feature: adaptive-quiz-generation, Property 1: Generation request schema validation
// **Validates: Requirements 1.1**

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { generateQuestionsSchema } from '@/lib/quizGenerationSchemas';

const questionTypeArb = fc.constantFrom('mcq', 'true_false', 'short_answer', 'fill_in_blank' as const);

describe('generateQuestionsSchema — property-based tests', () => {
  it('P1a: valid inputs (1-5 UUIDs, bloom 1-6, count 1-50, valid types) are accepted', () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        fc.array(fc.uuid(), { minLength: 1, maxLength: 5 }),
        fc.array(fc.integer({ min: 1, max: 6 }), { minLength: 1, maxLength: 6 }),
        fc.integer({ min: 1, max: 50 }),
        fc.array(questionTypeArb, { minLength: 1, maxLength: 4 }),
        (courseId, cloIds, bloomLevels, questionCount, questionTypes) => {
          const input = {
            course_id: courseId,
            clo_ids: cloIds,
            bloom_levels: bloomLevels,
            question_count: questionCount,
            question_types: questionTypes,
          };
          const result = generateQuestionsSchema.safeParse(input);
          expect(result.success).toBe(true);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('P1b: 0 CLO IDs are rejected', () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        fc.integer({ min: 1, max: 50 }),
        (courseId, questionCount) => {
          const input = {
            course_id: courseId,
            clo_ids: [],
            bloom_levels: [1],
            question_count: questionCount,
            question_types: ['mcq'],
          };
          const result = generateQuestionsSchema.safeParse(input);
          expect(result.success).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('P1c: 6+ CLO IDs are rejected', () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        fc.array(fc.uuid(), { minLength: 6, maxLength: 10 }),
        fc.integer({ min: 1, max: 50 }),
        (courseId, cloIds, questionCount) => {
          const input = {
            course_id: courseId,
            clo_ids: cloIds,
            bloom_levels: [1],
            question_count: questionCount,
            question_types: ['mcq'],
          };
          const result = generateQuestionsSchema.safeParse(input);
          expect(result.success).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('P1d: question count 0 or 51+ is rejected', () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        fc.uuid(),
        fc.oneof(fc.constant(0), fc.integer({ min: 51, max: 200 })),
        (courseId, cloId, badCount) => {
          const input = {
            course_id: courseId,
            clo_ids: [cloId],
            bloom_levels: [1],
            question_count: badCount,
            question_types: ['mcq'],
          };
          const result = generateQuestionsSchema.safeParse(input);
          expect(result.success).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('P1e: empty question_types array is rejected', () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        fc.uuid(),
        fc.integer({ min: 1, max: 50 }),
        (courseId, cloId, questionCount) => {
          const input = {
            course_id: courseId,
            clo_ids: [cloId],
            bloom_levels: [1],
            question_count: questionCount,
            question_types: [],
          };
          const result = generateQuestionsSchema.safeParse(input);
          expect(result.success).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('P1f: bloom level 0 or 7 is rejected', () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        fc.uuid(),
        fc.oneof(fc.constant(0), fc.constant(7)),
        fc.integer({ min: 1, max: 50 }),
        (courseId, cloId, badBloom, questionCount) => {
          const input = {
            course_id: courseId,
            clo_ids: [cloId],
            bloom_levels: [badBloom],
            question_count: questionCount,
            question_types: ['mcq'],
          };
          const result = generateQuestionsSchema.safeParse(input);
          expect(result.success).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });
});
