// Feature: ai-tutor-rag, Property 23: Academic integrity detection
// **Validates: Requirements 13.2, 13.3**

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { detectIntegrityViolation } from "@/lib/tutorIntegrityDetector";

// ─── Arbitraries ────────────────────────────────────────────────────────────

/** Messages that should trigger integrity flags */
const flaggedMessageArb = fc.constantFrom(
  "Can you write my essay for me?",
  "Please solve this for me",
  "Just give me the answer",
  "Do my homework please",
  "Complete my assignment",
  "Write my paper on quantum physics",
  "Finish my report for tomorrow",
  "Do it for me I'm tired",
  "Give me the solution to problem 3",
  "Write my assignment about OBE",
  "Just tell me the answer already",
  "Can you do my assignment?",
  "Write this for me please",
  "Solve my math problem",
  "Complete this for me",
  "Finish this for me please",
  "Give me the answers to the quiz",
  "Submit for me",
  "Copy paste this into my submission"
);

/** Normal academic questions that should NOT trigger integrity flags */
const normalQuestionArb = fc.constantFrom(
  "Can you explain how photosynthesis works?",
  "What is the difference between TCP and UDP?",
  "How do I approach this type of problem?",
  "I don't understand the concept of recursion",
  "What are the key principles of OBE?",
  "Can you help me understand this formula?",
  "Why does this algorithm have O(n log n) complexity?",
  "What is the relationship between CLOs and PLOs?",
  "How should I structure my study plan?",
  "Can you break down this concept step by step?",
  "I'm confused about Bloom's taxonomy levels",
  "What does attainment percentage mean?",
  "How do I improve my understanding of this topic?",
  "Can you give me a hint about this problem?",
  "What resources should I review for this CLO?"
);

// ─── P23: Academic integrity detection ───────────────────────────────────────

describe("Property 23 — Academic integrity detection", () => {
  it("P23a: messages with assignment-solving intent are flagged", () => {
    fc.assert(
      fc.property(flaggedMessageArb, (message) => {
        const result = detectIntegrityViolation(message);
        expect(result.flagged).toBe(true);
        expect(result.matchedKeywords.length).toBeGreaterThan(0);
      }),
      { numRuns: 100 }
    );
  });

  it("P23b: normal academic questions are NOT flagged", () => {
    fc.assert(
      fc.property(normalQuestionArb, (message) => {
        const result = detectIntegrityViolation(message);
        expect(result.flagged).toBe(false);
        expect(result.matchedKeywords.length).toBe(0);
      }),
      { numRuns: 100 }
    );
  });

  it("P23c: empty or whitespace messages are not flagged", () => {
    fc.assert(
      fc.property(fc.constantFrom("", "   ", "\n", "\t"), (message) => {
        const result = detectIntegrityViolation(message);
        expect(result.flagged).toBe(false);
        expect(result.matchedKeywords.length).toBe(0);
      }),
      { numRuns: 100 }
    );
  });

  it("P23d: detection is case-insensitive", () => {
    fc.assert(
      fc.property(
        fc.constantFrom(
          "WRITE MY ESSAY",
          "Write My Essay",
          "write my essay",
          "SOLVE THIS FOR ME",
          "Do My Homework",
          "GIVE ME THE ANSWER"
        ),
        (message) => {
          const result = detectIntegrityViolation(message);
          expect(result.flagged).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("P23e: matched keywords are returned for flagged messages", () => {
    fc.assert(
      fc.property(flaggedMessageArb, (message) => {
        const result = detectIntegrityViolation(message);
        if (result.flagged) {
          // Each matched keyword should be a non-empty string
          for (const keyword of result.matchedKeywords) {
            expect(keyword.length).toBeGreaterThan(0);
            // The keyword should relate to the message content (case-insensitive)
            expect(message.toLowerCase()).toContain(
              keyword.toLowerCase().split(" ").slice(0, 2).join(" ")
            );
          }
        }
      }),
      { numRuns: 100 }
    );
  });

  it("P23f: result always has the correct shape", () => {
    fc.assert(
      fc.property(fc.oneof(flaggedMessageArb, normalQuestionArb), (message) => {
        const result = detectIntegrityViolation(message);
        expect(typeof result.flagged).toBe("boolean");
        expect(Array.isArray(result.matchedKeywords)).toBe(true);

        // If flagged, must have keywords; if not flagged, must have empty keywords
        if (result.flagged) {
          expect(result.matchedKeywords.length).toBeGreaterThan(0);
        } else {
          expect(result.matchedKeywords.length).toBe(0);
        }
      }),
      { numRuns: 100 }
    );
  });
});
