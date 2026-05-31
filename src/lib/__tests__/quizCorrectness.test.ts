import { describe, it, expect } from "vitest";
import { deriveCorrectness } from "../quizCorrectness";

describe("quizCorrectness", () => {
  describe("deriveCorrectness", () => {
    it("uses the server-authoritative evaluation when present (R2.1)", () => {
      expect(
        deriveCorrectness({
          selectedAnswer: "A",
          correctAnswer: "B",
          serverEvaluated: true,
        })
      ).toBe(true);

      expect(
        deriveCorrectness({
          selectedAnswer: "B",
          correctAnswer: "B",
          serverEvaluated: false,
        })
      ).toBe(false);
    });

    it("falls back to equality against the correct answer (R2.4)", () => {
      expect(
        deriveCorrectness({ selectedAnswer: "B", correctAnswer: "B" })
      ).toBe(true);
      expect(
        deriveCorrectness({ selectedAnswer: "A", correctAnswer: "B" })
      ).toBe(false);
    });

    it("compares answers tolerantly (trim + case-insensitive)", () => {
      expect(
        deriveCorrectness({ selectedAnswer: " b ", correctAnswer: "B" })
      ).toBe(true);
    });

    it("never reports correct without evidence (R2.6)", () => {
      // No server evaluation and no correct answer ⇒ must not be "correct".
      expect(deriveCorrectness({ selectedAnswer: "anything" })).toBe(false);
      expect(
        deriveCorrectness({ selectedAnswer: "anything", correctAnswer: null })
      ).toBe(false);
    });

    it("prefers a false server evaluation over a coincidental answer match", () => {
      expect(
        deriveCorrectness({
          selectedAnswer: "B",
          correctAnswer: "B",
          serverEvaluated: false,
        })
      ).toBe(false);
    });
  });
});
