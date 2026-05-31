// Feature: student-experience-remediation, Property 9: Practice feedback
// correctness matches the evaluation and the recorded value.
//
// For any submitted practice answer, the single value produced by
// `deriveCorrectness` (the server-evaluated value when present, otherwise
// equality against the question's correct answer, and never a constant `true`)
// is what drives the Correct/Incorrect feedback, the recorded
// `previous_answer_correct`, and the correct-count increment. Because the
// function is the single source of that value, validating its derivation
// validates that the displayed feedback always matches the recorded value.
//
// **Validates: Requirements 2.1, 2.4, 2.6**

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { deriveCorrectness } from "@/lib/quizCorrectness";

// Mirror of the implementation's tolerant comparison, used here as the
// specification oracle for "equality against the correct answer".
const normalizedEqual = (a: string, b: string): boolean =>
  a.trim().toLowerCase() === b.trim().toLowerCase();

// A small alphabet so that independently-generated answers collide often,
// exercising both the matching and non-matching equality branches.
const answerArb = fc.stringMatching(/^[ aAbBcC]{0,4}$/);

describe("Practice correctness derivation — Property 9", () => {
  // R2.1 / R2.6: the server's authoritative evaluation, when present, is
  // returned verbatim and is never overridden by a coincidental answer match.
  it("returns the server-evaluated boolean verbatim when present", () => {
    fc.assert(
      fc.property(
        answerArb,
        fc.option(answerArb, { nil: undefined }),
        fc.boolean(),
        (selectedAnswer, correctAnswer, serverEvaluated) => {
          expect(
            deriveCorrectness({
              selectedAnswer,
              correctAnswer,
              serverEvaluated,
            })
          ).toBe(serverEvaluated);
        }
      ),
      { numRuns: 200 }
    );
  });

  // R2.4: with no server evaluation, correctness is equality against the
  // question's correct answer.
  it("derives correctness by equality against the correct answer when no server evaluation", () => {
    fc.assert(
      fc.property(
        answerArb,
        answerArb,
        // serverEvaluated absent: null or undefined (non-boolean)
        fc.constantFrom<null | undefined>(null, undefined),
        (selectedAnswer, correctAnswer, serverEvaluated) => {
          expect(
            deriveCorrectness({
              selectedAnswer,
              correctAnswer,
              serverEvaluated,
            })
          ).toBe(normalizedEqual(selectedAnswer, correctAnswer));
        }
      ),
      { numRuns: 200 }
    );
  });

  // R2.6: with neither evidence (no server evaluation and no correct answer),
  // the system never silently reports "correct".
  it("never returns true without any evaluation evidence", () => {
    fc.assert(
      fc.property(
        answerArb,
        fc.constantFrom<null | undefined>(null, undefined),
        fc.constantFrom<null | undefined>(null, undefined),
        (selectedAnswer, correctAnswer, serverEvaluated) => {
          expect(
            deriveCorrectness({
              selectedAnswer,
              correctAnswer,
              serverEvaluated,
            })
          ).toBe(false);
        }
      ),
      { numRuns: 200 }
    );
  });

  // Totality + determinism: every input yields a defined boolean, and the same
  // input always yields the same value — so the one value can safely drive the
  // UI, the recorded response, and the count without divergence (R2.4).
  it("is total and deterministic for any input shape", () => {
    fc.assert(
      fc.property(
        answerArb,
        fc.option(answerArb, { nil: undefined }),
        fc.option(fc.boolean(), { nil: undefined }),
        (selectedAnswer, correctAnswer, serverEvaluated) => {
          const input = { selectedAnswer, correctAnswer, serverEvaluated };
          const first = deriveCorrectness(input);
          const second = deriveCorrectness(input);
          expect(typeof first).toBe("boolean");
          expect(second).toBe(first);
        }
      ),
      { numRuns: 200 }
    );
  });
});
