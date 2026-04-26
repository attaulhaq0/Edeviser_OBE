import { describe, it, expect } from 'vitest';
import { createHandoffSchema, respondToHandoffSchema } from '@/lib/tutorSchemas';

// ─── Pure helper functions for handoff trigger detection ────────────────────

type HandoffTriggerReason = 'low_rag_confidence' | 'repeated_question' | 'low_satisfaction';

interface HandoffTriggerInput {
  avgRagSimilarity: number;
  hasCitations: boolean;
  sameQuestionCount: number;
  consecutiveThumbsDown: number;
}

function detectHandoffTrigger(
  input: HandoffTriggerInput,
): { shouldTrigger: boolean; reason: HandoffTriggerReason | null } {
  if (!input.hasCitations || input.avgRagSimilarity < 0.7) {
    return { shouldTrigger: true, reason: 'low_rag_confidence' };
  }
  if (input.sameQuestionCount >= 3) {
    return { shouldTrigger: true, reason: 'repeated_question' };
  }
  if (input.consecutiveThumbsDown >= 3) {
    return { shouldTrigger: true, reason: 'low_satisfaction' };
  }
  return { shouldTrigger: false, reason: null };
}

describe('tutorHandoffTrigger', () => {
  // ─── Low RAG confidence detection ─────────────────────────────────────

  describe('low RAG confidence detection', () => {
    it('triggers when no citations are present', () => {
      const result = detectHandoffTrigger({
        avgRagSimilarity: 0.9,
        hasCitations: false,
        sameQuestionCount: 0,
        consecutiveThumbsDown: 0,
      });
      expect(result.shouldTrigger).toBe(true);
      expect(result.reason).toBe('low_rag_confidence');
    });

    it('triggers when avg similarity is below 0.7', () => {
      const result = detectHandoffTrigger({
        avgRagSimilarity: 0.5,
        hasCitations: true,
        sameQuestionCount: 0,
        consecutiveThumbsDown: 0,
      });
      expect(result.shouldTrigger).toBe(true);
      expect(result.reason).toBe('low_rag_confidence');
    });

    it('triggers when avg similarity is 0', () => {
      const result = detectHandoffTrigger({
        avgRagSimilarity: 0,
        hasCitations: true,
        sameQuestionCount: 0,
        consecutiveThumbsDown: 0,
      });
      expect(result.shouldTrigger).toBe(true);
      expect(result.reason).toBe('low_rag_confidence');
    });

    it('does NOT trigger when similarity is exactly 0.7 with citations', () => {
      const result = detectHandoffTrigger({
        avgRagSimilarity: 0.7,
        hasCitations: true,
        sameQuestionCount: 0,
        consecutiveThumbsDown: 0,
      });
      expect(result.shouldTrigger).toBe(false);
    });

    it('triggers when both no citations AND low similarity', () => {
      const result = detectHandoffTrigger({
        avgRagSimilarity: 0.3,
        hasCitations: false,
        sameQuestionCount: 0,
        consecutiveThumbsDown: 0,
      });
      expect(result.shouldTrigger).toBe(true);
      expect(result.reason).toBe('low_rag_confidence');
    });
  });

  // ─── Repeated question detection ──────────────────────────────────────

  describe('repeated question detection', () => {
    it('triggers when same question asked 3 times', () => {
      const result = detectHandoffTrigger({
        avgRagSimilarity: 0.9,
        hasCitations: true,
        sameQuestionCount: 3,
        consecutiveThumbsDown: 0,
      });
      expect(result.shouldTrigger).toBe(true);
      expect(result.reason).toBe('repeated_question');
    });

    it('triggers when same question asked more than 3 times', () => {
      const result = detectHandoffTrigger({
        avgRagSimilarity: 0.9,
        hasCitations: true,
        sameQuestionCount: 5,
        consecutiveThumbsDown: 0,
      });
      expect(result.shouldTrigger).toBe(true);
      expect(result.reason).toBe('repeated_question');
    });

    it('does NOT trigger when same question asked fewer than 3 times', () => {
      const result = detectHandoffTrigger({
        avgRagSimilarity: 0.9,
        hasCitations: true,
        sameQuestionCount: 2,
        consecutiveThumbsDown: 0,
      });
      expect(result.shouldTrigger).toBe(false);
    });
  });

  // ─── Low satisfaction detection ───────────────────────────────────────

  describe('low satisfaction detection (3 consecutive thumbs-down)', () => {
    it('triggers on 3 consecutive thumbs-down', () => {
      const result = detectHandoffTrigger({
        avgRagSimilarity: 0.9,
        hasCitations: true,
        sameQuestionCount: 0,
        consecutiveThumbsDown: 3,
      });
      expect(result.shouldTrigger).toBe(true);
      expect(result.reason).toBe('low_satisfaction');
    });

    it('triggers on more than 3 consecutive thumbs-down', () => {
      const result = detectHandoffTrigger({
        avgRagSimilarity: 0.9,
        hasCitations: true,
        sameQuestionCount: 0,
        consecutiveThumbsDown: 5,
      });
      expect(result.shouldTrigger).toBe(true);
      expect(result.reason).toBe('low_satisfaction');
    });

    it('does NOT trigger on fewer than 3 consecutive thumbs-down', () => {
      const result = detectHandoffTrigger({
        avgRagSimilarity: 0.9,
        hasCitations: true,
        sameQuestionCount: 0,
        consecutiveThumbsDown: 2,
      });
      expect(result.shouldTrigger).toBe(false);
    });
  });

  // ─── No trigger when all healthy ──────────────────────────────────────

  describe('no trigger when all metrics are healthy', () => {
    it('does NOT trigger with good similarity, citations, no repeats, no thumbs-down', () => {
      const result = detectHandoffTrigger({
        avgRagSimilarity: 0.85,
        hasCitations: true,
        sameQuestionCount: 1,
        consecutiveThumbsDown: 0,
      });
      expect(result.shouldTrigger).toBe(false);
      expect(result.reason).toBeNull();
    });
  });

  // ─── Priority: low RAG confidence checked first ───────────────────────

  describe('trigger priority', () => {
    it('low RAG confidence takes priority over repeated questions', () => {
      const result = detectHandoffTrigger({
        avgRagSimilarity: 0.5,
        hasCitations: true,
        sameQuestionCount: 5,
        consecutiveThumbsDown: 5,
      });
      expect(result.reason).toBe('low_rag_confidence');
    });
  });

  // ─── Consent validation ───────────────────────────────────────────────

  describe('consent validation', () => {
    it('createHandoffSchema requires student_consent to be true', () => {
      const validResult = createHandoffSchema.safeParse({
        conversation_id: '550e8400-e29b-41d4-a716-446655440000',
        student_consent: true,
      });
      expect(validResult.success).toBe(true);
    });

    it('createHandoffSchema rejects student_consent false', () => {
      const invalidResult = createHandoffSchema.safeParse({
        conversation_id: '550e8400-e29b-41d4-a716-446655440000',
        student_consent: false,
      });
      expect(invalidResult.success).toBe(false);
    });

    it('createHandoffSchema rejects missing student_consent', () => {
      const invalidResult = createHandoffSchema.safeParse({
        conversation_id: '550e8400-e29b-41d4-a716-446655440000',
      });
      expect(invalidResult.success).toBe(false);
    });

    it('respondToHandoffSchema validates correctly', () => {
      const validResult = respondToHandoffSchema.safeParse({
        handoff_id: '550e8400-e29b-41d4-a716-446655440000',
        response_message: 'I can help with this topic.',
      });
      expect(validResult.success).toBe(true);
    });

    it('respondToHandoffSchema rejects empty response', () => {
      const invalidResult = respondToHandoffSchema.safeParse({
        handoff_id: '550e8400-e29b-41d4-a716-446655440000',
        response_message: '',
      });
      expect(invalidResult.success).toBe(false);
    });
  });
});
