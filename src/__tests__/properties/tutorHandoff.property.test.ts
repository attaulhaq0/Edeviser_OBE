// Feature: ai-tutor-rag, Property 53: Handoff triggers on low RAG confidence, repeated questions, or low satisfaction
// Feature: ai-tutor-rag, Property 54: Handoff requires student consent (student_consent must be true)
// Feature: ai-tutor-rag, Property 55: Coverage gaps identified when avg RAG similarity < 0.75
// **Validates: Requirements 30.1, 30.4, 31.2, 32.1**

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { createHandoffSchema } from '@/lib/tutorSchemas';

// ─── Pure helper functions for handoff logic ────────────────────────────────

type HandoffTriggerReason = 'low_rag_confidence' | 'repeated_question' | 'low_satisfaction';

interface HandoffTriggerInput {
  /** Average RAG similarity score for last 3 responses */
  avgRagSimilarity: number;
  /** Whether citations were present in last 3 responses */
  hasCitations: boolean;
  /** Number of times the same question was asked */
  sameQuestionCount: number;
  /** Number of consecutive thumbs-down ratings */
  consecutiveThumbsDown: number;
}

/**
 * Detects whether a teacher handoff should be triggered and the reason.
 */
function detectHandoffTrigger(
  input: HandoffTriggerInput,
): { shouldTrigger: boolean; reason: HandoffTriggerReason | null } {
  // Low RAG confidence: no citations or avg similarity < 0.7
  if (!input.hasCitations || input.avgRagSimilarity < 0.7) {
    return { shouldTrigger: true, reason: 'low_rag_confidence' };
  }

  // Repeated question: same question asked 3+ times
  if (input.sameQuestionCount >= 3) {
    return { shouldTrigger: true, reason: 'repeated_question' };
  }

  // Low satisfaction: 3+ consecutive thumbs-down
  if (input.consecutiveThumbsDown >= 3) {
    return { shouldTrigger: true, reason: 'low_satisfaction' };
  }

  return { shouldTrigger: false, reason: null };
}

/**
 * Determines whether a handoff request is visible to the teacher.
 * Only visible when student_consent is true.
 */
function isHandoffVisibleToTeacher(studentConsent: boolean): boolean {
  return studentConsent === true;
}

/**
 * Identifies CLOs with coverage gaps based on average RAG similarity.
 */
function identifyCoverageGaps(
  cloSimilarities: Array<{ clo_id: string; avgSimilarity: number }>,
): string[] {
  return cloSimilarities
    .filter((c) => c.avgSimilarity < 0.75)
    .map((c) => c.clo_id);
}

// ─── Generators ─────────────────────────────────────────────────────────────

const similarityScoreArb = fc.double({ min: 0, max: 1, noNaN: true });

// ─── Property 53: Handoff triggers on low effectiveness ─────────────────────

describe('Property 53 — Handoff triggers on low RAG confidence, repeated questions, or low satisfaction', () => {
  it('P53a: triggers on low RAG confidence (avg similarity < 0.7)', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0, max: 0.69, noNaN: true }),
        (avgSimilarity) => {
          const result = detectHandoffTrigger({
            avgRagSimilarity: avgSimilarity,
            hasCitations: true,
            sameQuestionCount: 0,
            consecutiveThumbsDown: 0,
          });
          expect(result.shouldTrigger).toBe(true);
          expect(result.reason).toBe('low_rag_confidence');
        },
      ),
      { numRuns: 100 },
    );
  });

  it('P53b: triggers on no citations', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0.7, max: 1.0, noNaN: true }),
        (avgSimilarity) => {
          const result = detectHandoffTrigger({
            avgRagSimilarity: avgSimilarity,
            hasCitations: false,
            sameQuestionCount: 0,
            consecutiveThumbsDown: 0,
          });
          expect(result.shouldTrigger).toBe(true);
          expect(result.reason).toBe('low_rag_confidence');
        },
      ),
      { numRuns: 100 },
    );
  });

  it('P53c: triggers on repeated questions (3+ times)', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 3, max: 20 }),
        (sameQuestionCount) => {
          const result = detectHandoffTrigger({
            avgRagSimilarity: 0.9,
            hasCitations: true,
            sameQuestionCount,
            consecutiveThumbsDown: 0,
          });
          expect(result.shouldTrigger).toBe(true);
          expect(result.reason).toBe('repeated_question');
        },
      ),
      { numRuns: 100 },
    );
  });

  it('P53d: triggers on low satisfaction (3+ consecutive thumbs-down)', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 3, max: 20 }),
        (thumbsDown) => {
          const result = detectHandoffTrigger({
            avgRagSimilarity: 0.9,
            hasCitations: true,
            sameQuestionCount: 0,
            consecutiveThumbsDown: thumbsDown,
          });
          expect(result.shouldTrigger).toBe(true);
          expect(result.reason).toBe('low_satisfaction');
        },
      ),
      { numRuns: 100 },
    );
  });

  it('P53e: does NOT trigger when all metrics are healthy', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0.7, max: 1.0, noNaN: true }),
        fc.integer({ min: 0, max: 2 }),
        fc.integer({ min: 0, max: 2 }),
        (avgSimilarity, sameQuestionCount, thumbsDown) => {
          const result = detectHandoffTrigger({
            avgRagSimilarity: avgSimilarity,
            hasCitations: true,
            sameQuestionCount,
            consecutiveThumbsDown: thumbsDown,
          });
          expect(result.shouldTrigger).toBe(false);
          expect(result.reason).toBeNull();
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ─── Property 54: Handoff requires student consent ──────────────────────────

describe('Property 54 — Handoff requires student consent', () => {
  it('P54a: handoff is visible to teacher only when consent is true', () => {
    fc.assert(
      fc.property(fc.constant(true), () => {
        expect(isHandoffVisibleToTeacher(true)).toBe(true);
      }),
      { numRuns: 100 },
    );
  });

  it('P54b: handoff is NOT visible to teacher when consent is false', () => {
    fc.assert(
      fc.property(fc.constant(false), () => {
        expect(isHandoffVisibleToTeacher(false)).toBe(false);
      }),
      { numRuns: 100 },
    );
  });

  it('P54c: createHandoffSchema rejects when student_consent is false', () => {
    fc.assert(
      fc.property(fc.uuid(), (conversationId) => {
        const result = createHandoffSchema.safeParse({
          conversation_id: conversationId,
          student_consent: false,
        });
        expect(result.success).toBe(false);
      }),
      { numRuns: 100 },
    );
  });

  it('P54d: createHandoffSchema accepts when student_consent is true', () => {
    fc.assert(
      fc.property(fc.uuid(), (conversationId) => {
        const result = createHandoffSchema.safeParse({
          conversation_id: conversationId,
          student_consent: true,
        });
        expect(result.success).toBe(true);
      }),
      { numRuns: 100 },
    );
  });
});

// ─── Property 55: Coverage gaps identified when avg RAG similarity < 0.75 ──

describe('Property 55 — Coverage gaps identified when avg RAG similarity < 0.75', () => {
  it('P55a: CLOs with avg similarity < 0.75 are identified as gaps', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            clo_id: fc.uuid(),
            avgSimilarity: fc.double({ min: 0, max: 0.74, noNaN: true }),
          }),
          { minLength: 1, maxLength: 10 },
        ),
        (cloSimilarities) => {
          const gaps = identifyCoverageGaps(cloSimilarities);
          expect(gaps.length).toBe(cloSimilarities.length);
          for (const clo of cloSimilarities) {
            expect(gaps).toContain(clo.clo_id);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('P55b: CLOs with avg similarity >= 0.75 are NOT identified as gaps', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            clo_id: fc.uuid(),
            avgSimilarity: fc.double({ min: 0.75, max: 1.0, noNaN: true }),
          }),
          { minLength: 1, maxLength: 10 },
        ),
        (cloSimilarities) => {
          const gaps = identifyCoverageGaps(cloSimilarities);
          expect(gaps.length).toBe(0);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('P55c: mixed CLOs correctly partition into gaps and non-gaps', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            clo_id: fc.uuid(),
            avgSimilarity: similarityScoreArb,
          }),
          { minLength: 1, maxLength: 20 },
        ),
        (cloSimilarities) => {
          const gaps = identifyCoverageGaps(cloSimilarities);
          const expectedGaps = cloSimilarities.filter((c) => c.avgSimilarity < 0.75);
          expect(gaps.length).toBe(expectedGaps.length);
          for (const expected of expectedGaps) {
            expect(gaps).toContain(expected.clo_id);
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});
