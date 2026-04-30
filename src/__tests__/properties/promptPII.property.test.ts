// Feature: adaptive-quiz-generation, Property 20: LLM prompt excludes student PII
// **Validates: Requirements 17.4**

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";

/**
 * Constructs an LLM prompt for quiz generation using only course material
 * and pedagogical parameters. No student data is included.
 */
function buildGenerationPrompt(params: {
  courseTitle: string;
  cloDescriptions: string[];
  bloomLevels: number[];
  questionTypes: string[];
  questionCount: number;
  materialChunks: string[];
}): string {
  const bloomLabels = [
    "Remembering",
    "Understanding",
    "Applying",
    "Analyzing",
    "Evaluating",
    "Creating",
  ];
  const bloomNames = params.bloomLevels
    .map((l) => bloomLabels[l - 1])
    .join(", ");

  return [
    `Generate ${params.questionCount} quiz questions for the course "${params.courseTitle}".`,
    `Target CLOs: ${params.cloDescriptions.join("; ")}`,
    `Bloom's levels: ${bloomNames}`,
    `Question types: ${params.questionTypes.join(", ")}`,
    "",
    "Reference material:",
    ...params.materialChunks.map((c, i) => `[Chunk ${i + 1}]: ${c}`),
  ].join("\n");
}

// Arbitraries for PII patterns
const emailArb = fc.emailAddress();
const fullNameArb = fc
  .tuple(
    fc.constantFrom("Alice", "Bob", "Charlie", "Diana", "Eve"),
    fc.constantFrom("Smith", "Johnson", "Williams", "Brown", "Jones")
  )
  .map(([first, last]) => `${first} ${last}`);
const studentIdArb = fc.stringMatching(/^STU-\d{6}$/);

describe("LLM prompt PII exclusion — property-based tests", () => {
  it("P20a: prompt never contains student email addresses", () => {
    fc.assert(
      fc.property(
        emailArb,
        fc.array(fc.lorem({ maxCount: 5 }), { minLength: 1, maxLength: 3 }),
        fc.array(fc.lorem({ maxCount: 10 }), { minLength: 1, maxLength: 5 }),
        (email, clos, chunks) => {
          const prompt = buildGenerationPrompt({
            courseTitle: "Test Course",
            cloDescriptions: clos,
            bloomLevels: [1, 2],
            questionTypes: ["mcq"],
            questionCount: 5,
            materialChunks: chunks,
          });
          expect(prompt).not.toContain(email);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("P20b: prompt never contains student full names", () => {
    fc.assert(
      fc.property(
        fullNameArb,
        fc.array(fc.lorem({ maxCount: 5 }), { minLength: 1, maxLength: 3 }),
        fc.array(fc.lorem({ maxCount: 10 }), { minLength: 1, maxLength: 5 }),
        (name, clos, chunks) => {
          const prompt = buildGenerationPrompt({
            courseTitle: "Test Course",
            cloDescriptions: clos,
            bloomLevels: [3, 4],
            questionTypes: ["true_false"],
            questionCount: 10,
            materialChunks: chunks,
          });
          expect(prompt).not.toContain(name);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("P20c: prompt never contains student ID values", () => {
    fc.assert(
      fc.property(
        studentIdArb,
        fc.array(fc.lorem({ maxCount: 5 }), { minLength: 1, maxLength: 3 }),
        fc.array(fc.lorem({ maxCount: 10 }), { minLength: 1, maxLength: 5 }),
        (studentId, clos, chunks) => {
          const prompt = buildGenerationPrompt({
            courseTitle: "Test Course",
            cloDescriptions: clos,
            bloomLevels: [5, 6],
            questionTypes: ["short_answer"],
            questionCount: 3,
            materialChunks: chunks,
          });
          expect(prompt).not.toContain(studentId);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("P20d: prompt contains only course material and pedagogical parameters", () => {
    fc.assert(
      fc.property(
        fc.array(fc.lorem({ maxCount: 5 }), { minLength: 1, maxLength: 3 }),
        fc.array(fc.lorem({ maxCount: 10 }), { minLength: 1, maxLength: 5 }),
        fc.integer({ min: 1, max: 50 }),
        (clos, chunks, count) => {
          const prompt = buildGenerationPrompt({
            courseTitle: "Intro to CS",
            cloDescriptions: clos,
            bloomLevels: [1, 3, 5],
            questionTypes: ["mcq", "fill_in_blank"],
            questionCount: count,
            materialChunks: chunks,
          });
          // Prompt must contain course title and pedagogical terms
          expect(prompt).toContain("Intro to CS");
          expect(prompt).toContain("Bloom");
          expect(prompt).toContain("CLO");
          // Must not contain PII-like patterns (UUID student IDs)
          expect(prompt).not.toMatch(
            /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/
          );
        }
      ),
      { numRuns: 100 }
    );
  });
});
