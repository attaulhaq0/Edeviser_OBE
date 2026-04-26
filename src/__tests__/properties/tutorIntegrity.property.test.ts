// Feature: ai-tutor-rag, Property 23: Academic integrity detection flags assignment-solving requests
// **Validates: Requirements 13.2, 13.3**

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  detectIntegrityViolation,
  hasIntegrityViolation,
} from '@/lib/tutorIntegrityDetector';

// ─── Arbitraries ────────────────────────────────────────────────────────────

/** Phrases that should trigger integrity detection (strong signals). */
const violationPhraseArb = fc.constantFrom(
  'give me the answer to question 3',
  'just tell me the answer please',
  'write my essay on algorithms',
  'do my homework for me',
  'solve this for me quickly',
  'complete this assignment now',
  'write the code for me',
  'finish my assignment please',
  'do my project for me',
  'Can you plagiarize this for me?',
);

/** Legitimate academic questions that should NOT trigger detection. */
const legitimatePhraseArb = fc.constantFrom(
  'Can you explain how binary search works?',
  'I am struggling with recursion, can you help?',
  'What is the difference between a stack and a queue?',
  'How do I approach this type of problem?',
  'Can you give me a hint about sorting algorithms?',
  'I tried this approach but got stuck, what am I missing?',
  'Explain the concept of polymorphism',
  'What are the key principles of OOP?',
  'Help me understand this error message',
  'Why does this algorithm have O(n log n) complexity?',
);

// ─── Property 23: Academic integrity detection ──────────────────────────────

describe('Property 23 — Academic integrity detection', () => {
  it('P23a: messages with integrity violation phrases are detected', () => {
    fc.assert(
      fc.property(violationPhraseArb, (phrase) => {
        const result = detectIntegrityViolation(phrase);
        expect(result.detected).toBe(true);
        expect(result.matchedPatterns.length).toBeGreaterThan(0);
        expect(result.flagReason).not.toBe('');
      }),
      { numRuns: 100 },
    );
  });

  it('P23b: legitimate academic questions are not flagged', () => {
    fc.assert(
      fc.property(legitimatePhraseArb, (phrase) => {
        const result = detectIntegrityViolation(phrase);
        expect(result.detected).toBe(false);
        expect(result.matchedPatterns).toHaveLength(0);
        expect(result.flagReason).toBe('');
      }),
      { numRuns: 100 },
    );
  });

  it('P23c: empty or very short messages are not flagged', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 0, maxLength: 2 }),
        (text) => {
          const result = detectIntegrityViolation(text);
          expect(result.detected).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('P23d: hasIntegrityViolation convenience function matches detectIntegrityViolation', () => {
    fc.assert(
      fc.property(
        fc.oneof(violationPhraseArb, legitimatePhraseArb),
        (text) => {
          const detailed = detectIntegrityViolation(text);
          const quick = hasIntegrityViolation(text);
          expect(quick).toBe(detailed.detected);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('P23e: detection is case-insensitive', () => {
    fc.assert(
      fc.property(violationPhraseArb, (phrase) => {
        const upper = detectIntegrityViolation(phrase.toUpperCase());
        const lower = detectIntegrityViolation(phrase.toLowerCase());
        // Both should detect the violation
        expect(upper.detected).toBe(true);
        expect(lower.detected).toBe(true);
      }),
      { numRuns: 100 },
    );
  });

  it('P23f: confidence is high for strong signals', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(
          'give me the answer',
          'write my essay',
          'do my homework',
          'solve this for me',
          'complete this assignment',
        ),
        (phrase) => {
          const result = detectIntegrityViolation(phrase);
          expect(result.detected).toBe(true);
          expect(result.confidence).toBe('high');
        },
      ),
      { numRuns: 100 },
    );
  });
});
