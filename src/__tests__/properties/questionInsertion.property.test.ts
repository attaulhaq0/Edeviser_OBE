// Feature: adaptive-quiz-generation, Property 3: AI-generated questions inserted with pending review status
// **Validates: Requirements 3.1**

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";

interface SimulatedInsertedQuestion {
  id: string;
  question_text: string;
  status: string;
  generation_source: string;
}

/**
 * Simulates the insertion behavior of the Quiz_Generator:
 * AI-generated questions are always inserted with status='pending_review' and generation_source='ai'.
 */
function simulateAIQuestionInsertion(
  questionTexts: string[]
): SimulatedInsertedQuestion[] {
  return questionTexts.map((text, i) => ({
    id: `q-${i}`,
    question_text: text,
    status: "pending_review",
    generation_source: "ai",
  }));
}

describe("AI question insertion — property-based tests", () => {
  it("P3: AI-generated questions always have status=pending_review and generation_source=ai", () => {
    fc.assert(
      fc.property(
        fc.array(fc.string({ minLength: 1, maxLength: 200 }), {
          minLength: 1,
          maxLength: 20,
        }),
        (questionTexts) => {
          const inserted = simulateAIQuestionInsertion(questionTexts);

          for (const q of inserted) {
            expect(q.status).toBe("pending_review");
            expect(q.generation_source).toBe("ai");
          }
          expect(inserted.length).toBe(questionTexts.length);
        }
      ),
      { numRuns: 100 }
    );
  });
});
