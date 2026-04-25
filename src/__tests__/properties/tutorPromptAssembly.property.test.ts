// Feature: ai-tutor-rag, Property 10: CLO gaps (attainment below 70%) are included in prompt
// Feature: ai-tutor-rag, Property 11: Retrieved chunks appear in prompt
// Feature: ai-tutor-rag, Property 14: Each persona produces distinct system prompts
// Feature: ai-tutor-rag, Property 36: No PII (full name, email, student ID) in system prompt
// **Validates: Requirements 5.2, 5.3, 7.2, 20.4**

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { assembleSystemPrompt, containsPII } from "@/lib/tutorPrompt";
import type { TutorPersona, AutonomyLevel } from "@/lib/tutorSchemas";

// ─── Arbitraries ────────────────────────────────────────────────────────────

const personaArb = fc.constantFrom<TutorPersona>(
  "socratic_guide",
  "step_by_step_coach",
  "quick_explainer"
);

const autonomyArb = fc.constantFrom<AutonomyLevel>("L1", "L2", "L3");

const cloAttainmentArb = fc.record({
  clo_id: fc.uuid(),
  clo_title: fc.lorem({ mode: "words", maxCount: 5 }).map((w) => `CLO: ${w}`),
  bloom_level: fc.constantFrom(
    "Remembering",
    "Understanding",
    "Applying",
    "Analyzing",
    "Evaluating",
    "Creating"
  ),
  attainment_percent: fc.integer({ min: 0, max: 100 }),
});

const ragChunkArb = fc.record({
  chunk_id: fc.uuid(),
  chunk_text: fc.lorem({ mode: "sentences", maxCount: 3 }),
  source_filename: fc
    .lorem({ mode: "words", maxCount: 2 })
    .map((w) => `${w}.pdf`),
  material_type: fc.constantFrom(
    "lecture_notes",
    "slides",
    "assignment_description"
  ),
  similarity_score: fc.double({ min: 0.7, max: 1.0, noNaN: true }),
});

const promptOptionsArb = fc.record({
  persona: personaArb,
  autonomyLevel: autonomyArb,
  cloAttainments: fc.array(cloAttainmentArb, { minLength: 0, maxLength: 8 }),
  ragChunks: fc.array(ragChunkArb, { minLength: 0, maxLength: 5 }),
});

// ─── Property 10: CLO gaps included in prompt ───────────────────────────────

describe("Property 10 — CLO gaps (attainment below 70%) are included in prompt", () => {
  it("P10: every CLO with attainment < 70% appears in the system prompt", () => {
    fc.assert(
      fc.property(promptOptionsArb, (opts) => {
        const prompt = assembleSystemPrompt(opts);
        const gaps = opts.cloAttainments.filter(
          (a) => a.attainment_percent < 70
        );

        for (const gap of gaps) {
          // The CLO title should appear in the prompt (PII-stripped version)
          expect(prompt).toContain(gap.clo_title);
          // The attainment percentage should appear
          expect(prompt).toContain(`${gap.attainment_percent}%`);
        }
      }),
      { numRuns: 100 }
    );
  });
});

// ─── Property 11: Retrieved chunks appear in prompt ─────────────────────────

describe("Property 11 — Retrieved chunks appear in prompt", () => {
  it("P11: every retrieved chunk text appears in the assembled system prompt", () => {
    fc.assert(
      fc.property(promptOptionsArb, (opts) => {
        const prompt = assembleSystemPrompt(opts);

        for (const chunk of opts.ragChunks) {
          // Chunk text should be present in the prompt (may be PII-stripped)
          // Since our generated chunks don't contain PII, they should appear verbatim
          expect(prompt).toContain(chunk.chunk_text);
        }
      }),
      { numRuns: 100 }
    );
  });
});

// ─── Property 14: Each persona produces distinct system prompts ─────────────

describe("Property 14 — Each persona produces distinct system prompts", () => {
  it("P14: different personas produce different system prompt instructions", () => {
    fc.assert(
      fc.property(
        autonomyArb,
        fc.array(cloAttainmentArb, { maxLength: 3 }),
        fc.array(ragChunkArb, { maxLength: 2 }),
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
              ragChunks: chunks,
            })
          );

          // All three prompts must be distinct from each other
          expect(prompts[0]).not.toBe(prompts[1]);
          expect(prompts[0]).not.toBe(prompts[2]);
          expect(prompts[1]).not.toBe(prompts[2]);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ─── Property 36: No PII in system prompt ───────────────────────────────────

describe("Property 36 — No PII (full name, email, student ID) in system prompt", () => {
  it("P36: system prompt never contains email addresses, UUIDs, or phone numbers", () => {
    // Generate CLO attainments that might contain PII in titles
    const cloWithPIIArb = fc.record({
      clo_id: fc.uuid(),
      clo_title: fc.oneof(
        fc.constant("John Smith CLO on Algorithms"),
        fc.constant("Contact: student@university.edu"),
        fc.constant("Student ID: 550e8400-e29b-41d4-a716-446655440000"),
        fc.lorem({ mode: "words", maxCount: 4 })
      ),
      bloom_level: fc.constantFrom("Remembering", "Understanding", "Applying"),
      attainment_percent: fc.integer({ min: 0, max: 100 }),
    });

    const chunkWithPIIArb = fc.record({
      chunk_id: fc.uuid(),
      chunk_text: fc.oneof(
        fc.constant("Email the professor at prof@uni.edu for help"),
        fc.constant("Student 550e8400-e29b-41d4-a716-446655440000 scored well"),
        fc.lorem({ mode: "sentences", maxCount: 2 })
      ),
      source_filename: fc.constant("lecture.pdf"),
      material_type: fc.constant("lecture_notes"),
      similarity_score: fc.double({ min: 0.7, max: 1.0, noNaN: true }),
    });

    fc.assert(
      fc.property(
        personaArb,
        autonomyArb,
        fc.array(cloWithPIIArb, { minLength: 1, maxLength: 5 }),
        fc.array(chunkWithPIIArb, { minLength: 0, maxLength: 3 }),
        (persona, autonomy, clos, chunks) => {
          const prompt = assembleSystemPrompt({
            persona,
            autonomyLevel: autonomy,
            cloAttainments: clos,
            ragChunks: chunks,
          });

          // The assembled prompt must not contain any PII
          expect(containsPII(prompt)).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });
});
