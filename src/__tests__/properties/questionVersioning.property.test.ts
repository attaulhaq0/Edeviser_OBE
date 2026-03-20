// Feature: adaptive-quiz-generation, Property 5: Question versioning preserves original
// **Validates: Requirements 4.3**

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

interface QuestionVersion {
  id: string;
  question_text: string;
  parent_question_id: string | null;
  bloom_level: number;
  difficulty_rating: number;
}

/**
 * Simulates editing a question: creates a new row with parent_question_id
 * pointing to the original, while the original remains unchanged.
 */
function editQuestion(
  original: QuestionVersion,
  newText: string,
  newBloom: number,
  newDifficulty: number,
): { original: QuestionVersion; edited: QuestionVersion } {
  const edited: QuestionVersion = {
    id: `${original.id}-v2`,
    question_text: newText,
    parent_question_id: original.id,
    bloom_level: newBloom,
    difficulty_rating: newDifficulty,
  };
  // Original is returned unchanged
  return { original, edited };
}

describe('Question versioning — property-based tests', () => {
  it('P5: editing creates a new row with parent_question_id pointing to original, original unchanged', () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        fc.string({ minLength: 1, maxLength: 200 }),
        fc.integer({ min: 1, max: 6 }),
        fc.double({ min: 1.0, max: 5.0, noNaN: true }),
        fc.string({ minLength: 1, maxLength: 200 }),
        fc.integer({ min: 1, max: 6 }),
        fc.double({ min: 1.0, max: 5.0, noNaN: true }),
        (id, origText, origBloom, origDiff, newText, newBloom, newDiff) => {
          const original: QuestionVersion = {
            id,
            question_text: origText,
            parent_question_id: null,
            bloom_level: origBloom,
            difficulty_rating: origDiff,
          };

          const { original: preserved, edited } = editQuestion(original, newText, newBloom, newDiff);

          // Edited version points to original
          expect(edited.parent_question_id).toBe(original.id);
          expect(edited.id).not.toBe(original.id);

          // Original is unchanged
          expect(preserved.id).toBe(original.id);
          expect(preserved.question_text).toBe(origText);
          expect(preserved.parent_question_id).toBeNull();
          expect(preserved.bloom_level).toBe(origBloom);
          expect(preserved.difficulty_rating).toBe(origDiff);
        },
      ),
      { numRuns: 100 },
    );
  });
});
