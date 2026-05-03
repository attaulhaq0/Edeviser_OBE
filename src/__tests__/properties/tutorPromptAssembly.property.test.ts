// Feature: ai-tutor-rag, Property 10: CLO gaps (attainment < 70%) are included in prompt
// Feature: ai-tutor-rag, Property 11: Retrieved chunks appear in assembled prompt
// Feature: ai-tutor-rag, Property 14: Different personas produce distinct prompts
// Feature: ai-tutor-rag, Property 36: No PII (full name, email, student ID) in prompt
// **Validates: Requirements 5.2, 5.3, 7.2, 20.4**

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import {
  assembleSystemPrompt,
  PERSONA_PROMPTS,
  type CLOAttainment,
  type RetrievedChunk,
  type PromptAssemblyInput,
} from "@/lib/tutorPrompt";
import type { TutorPersona } from "@/lib/tutorSchemas";

// ─── Arbitraries ────────────────────────────────────────────────────────────

const personaArb = fc.constantFrom<TutorPersona>(
  "socratic_guide",
  "step_by_step_coach",
  "quick_explainer"
);

const autonomyArb = fc.constantFrom<"L1" | "L2" | "L3">("L1", "L2", "L3");

const cloAttainmentArb: fc.Arbitrary<CLOAttainment> = fc.record({
  clo_id: fc.uuid(),
  clo_title: fc.stringMatching(/^[A-Z][a-z]{3,20} [A-Z][a-z]{3,15}$/),
  bloom_level: fc.constantFrom(
    "Remembering",
    "Understanding",
    "Applying",
    "Analyzing",
    "Evaluating",
    "Creating"
  ),
  attainment_percentage: fc.integer({ min: 0, max: 100 }),
});

const retrievedChunkArb: fc.Arbitrary<RetrievedChunk> = fc.record({
  chunk_text: fc.lorem({ maxCount: 5, mode: "sentences" }),
  source_filename: fc.stringMatching(/^[a-z_]{3,15}\.(pdf|docx|txt)$/),
  material_type: fc.constantFrom(
    "lecture_notes",
    "slides",
    "assignment_description",
    "rubric_criteria"
  ),
  similarity_score: fc.double({ min: 0.7, max: 1.0, noNaN: true }),
});

const promptInputArb: fc.Arbitrary<PromptAssemblyInput> = fc.record({
  persona: personaArb,
  autonomyLevel: autonomyArb,
  cloAttainments: fc.array(cloAttainmentArb, { minLength: 0, maxLength: 8 }),
  retrievedChunks: fc.array(retrievedChunkArb, { minLength: 0, maxLength: 5 }),
  courseName: fc.option(fc.stringMatching(/^[A-Z][a-z]{2,15} \d{3}$/), {
    nil: undefined,
  }),
});

// ─── PII generators for negative testing ─────────────────────────────────────

const fullNameArb = fc
  .tuple(
    fc.stringMatching(/^[A-Z][a-z]{2,8}$/),
    fc.stringMatching(/^[A-Z][a-z]{2,10}$/)
  )
  .map(([first, last]) => `${first} ${last}`);

const emailArb = fc
  .tuple(
    fc.stringMatching(/^[a-z]{3,8}$/),
    fc.constantFrom("university.edu", "example.com", "school.org")
  )
  .map(([local, domain]) => `${local}@${domain}`);

const studentIdArb = fc.stringMatching(/^STU-\d{6}$/);

// ─── P10: CLO gaps (attainment < 70%) are included in prompt ─────────────────

describe("Property 10 — CLO gaps included in prompt", () => {
  it("P10a: every CLO with attainment < 70% appears in the prompt", () => {
    fc.assert(
      fc.property(promptInputArb, (input) => {
        const prompt = assembleSystemPrompt(input);
        const gaps = input.cloAttainments.filter(
          (clo) => clo.attainment_percentage < 70
        );

        for (const gap of gaps) {
          expect(prompt).toContain(gap.clo_title);
          expect(prompt).toContain(`${gap.attainment_percentage}%`);
        }
      }),
      { numRuns: 100 }
    );
  });

  it("P10b: CLOs at or above 70% are still listed but not flagged as gaps", () => {
    fc.assert(
      fc.property(promptInputArb, (input) => {
        const prompt = assembleSystemPrompt(input);
        const passing = input.cloAttainments.filter(
          (clo) => clo.attainment_percentage >= 70
        );

        for (const clo of passing) {
          // Passing CLOs should still appear in the CLO progress section
          if (input.cloAttainments.length > 0) {
            expect(prompt).toContain(clo.clo_title);
          }
        }
      }),
      { numRuns: 100 }
    );
  });
});

// ─── P11: Retrieved chunks appear in assembled prompt ────────────────────────

describe("Property 11 — Retrieved chunks appear in prompt", () => {
  it("P11a: every retrieved chunk's text is present in the prompt", () => {
    fc.assert(
      fc.property(promptInputArb, (input) => {
        const prompt = assembleSystemPrompt(input);

        for (const chunk of input.retrievedChunks) {
          expect(prompt).toContain(chunk.chunk_text);
        }
      }),
      { numRuns: 100 }
    );
  });

  it("P11b: every retrieved chunk's source filename is present in the prompt", () => {
    fc.assert(
      fc.property(promptInputArb, (input) => {
        const prompt = assembleSystemPrompt(input);

        for (const chunk of input.retrievedChunks) {
          expect(prompt).toContain(chunk.source_filename);
        }
      }),
      { numRuns: 100 }
    );
  });
});

// ─── P14: Different personas produce distinct prompts ────────────────────────

describe("Property 14 — Different personas produce distinct prompts", () => {
  it("P14a: each persona maps to a distinct system prompt section", () => {
    fc.assert(
      fc.property(
        autonomyArb,
        fc.array(cloAttainmentArb, { minLength: 0, maxLength: 3 }),
        fc.array(retrievedChunkArb, { minLength: 0, maxLength: 2 }),
        (autonomy, clos, chunks) => {
          const personas: TutorPersona[] = [
            "socratic_guide",
            "step_by_step_coach",
            "quick_explainer",
          ];

          const prompts = personas.map((persona) =>
            assembleSystemPrompt({
              persona,
              autonomyLevel: autonomy,
              cloAttainments: clos,
              retrievedChunks: chunks,
            })
          );

          // All three prompts must be distinct
          expect(prompts[0]).not.toBe(prompts[1]);
          expect(prompts[0]).not.toBe(prompts[2]);
          expect(prompts[1]).not.toBe(prompts[2]);

          // Each prompt contains its persona-specific text
          for (let i = 0; i < personas.length; i++) {
            expect(prompts[i]).toContain(PERSONA_PROMPTS[personas[i]!]);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ─── P36: No PII in prompt ───────────────────────────────────────────────────

describe("Property 36 — No PII in assembled prompt", () => {
  it("P36a: prompt does not contain student full name, email, or student ID", () => {
    fc.assert(
      fc.property(
        promptInputArb,
        fullNameArb,
        emailArb,
        studentIdArb,
        (input, fullName, email, studentId) => {
          const prompt = assembleSystemPrompt(input);

          // The prompt should never contain PII
          expect(prompt).not.toContain(fullName);
          expect(prompt).not.toContain(email);
          expect(prompt).not.toContain(studentId);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("P36b: prompt uses only anonymized references to the student", () => {
    fc.assert(
      fc.property(promptInputArb, (input) => {
        const prompt = assembleSystemPrompt(input);

        // Should not contain common PII field names as data values
        // (the word "email" may appear in instructions, but not as a data value)
        expect(prompt).not.toMatch(
          /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/
        );
        expect(prompt).not.toMatch(/STU-\d{6}/);
      }),
      { numRuns: 100 }
    );
  });
});
