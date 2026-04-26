import { describe, it, expect } from 'vitest';
import {
  detectIntegrityViolation,
  hasIntegrityViolation,
  type IntegrityDetectionResult,
} from '@/lib/tutorIntegrityDetector';

// ── detectIntegrityViolation ────────────────────────────────────────────────

describe('detectIntegrityViolation', () => {
  // ── Edge cases ──────────────────────────────────────────────────────────

  describe('edge cases', () => {
    it('returns not detected for empty string', () => {
      const result = detectIntegrityViolation('');
      expect(result.detected).toBe(false);
      expect(result.matchedPatterns).toEqual([]);
      expect(result.flagReason).toBe('');
    });

    it('returns not detected for whitespace-only string', () => {
      const result = detectIntegrityViolation('   \n\t  ');
      expect(result.detected).toBe(false);
    });

    it('returns not detected for very short messages (< 3 chars)', () => {
      expect(detectIntegrityViolation('hi').detected).toBe(false);
      expect(detectIntegrityViolation('ok').detected).toBe(false);
      expect(detectIntegrityViolation('a').detected).toBe(false);
    });

    it('returns not detected for legitimate questions', () => {
      const result = detectIntegrityViolation(
        'Can you explain how binary search works?',
      );
      expect(result.detected).toBe(false);
    });

    it('returns not detected for general study questions', () => {
      const result = detectIntegrityViolation(
        'What is the difference between a stack and a queue?',
      );
      expect(result.detected).toBe(false);
    });
  });

  // ── Strong signal patterns (weight 3) ───────────────────────────────────

  describe('strong signal patterns', () => {
    it('detects "give me the answer"', () => {
      const result = detectIntegrityViolation('Just give me the answer to this problem');
      expect(result.detected).toBe(true);
      expect(result.confidence).toBe('high');
      expect(result.matchedPatterns).toContain('give me the answer');
    });

    it('detects "write my essay"', () => {
      const result = detectIntegrityViolation('Can you write my essay about climate change?');
      expect(result.detected).toBe(true);
      expect(result.confidence).toBe('high');
      expect(result.matchedPatterns).toContain('write my essay');
    });

    it('detects "do my homework"', () => {
      const result = detectIntegrityViolation('Please do my homework for tonight');
      expect(result.detected).toBe(true);
      expect(result.confidence).toBe('high');
      expect(result.matchedPatterns).toContain('do my homework');
    });

    it('detects "solve this for me"', () => {
      const result = detectIntegrityViolation('Can you solve this for me quickly?');
      expect(result.detected).toBe(true);
      expect(result.confidence).toBe('high');
      expect(result.matchedPatterns).toContain('solve this for me');
    });

    it('detects "complete this assignment"', () => {
      const result = detectIntegrityViolation('I need you to complete this assignment');
      expect(result.detected).toBe(true);
      expect(result.confidence).toBe('high');
      expect(result.matchedPatterns).toContain('complete this assignment');
    });

    it('detects "write the code for me"', () => {
      const result = detectIntegrityViolation('Just write the code for me please');
      expect(result.detected).toBe(true);
      expect(result.confidence).toBe('high');
      expect(result.matchedPatterns).toContain('write the code for me');
    });

    it('detects "just tell me the answer"', () => {
      const result = detectIntegrityViolation("Stop explaining and just tell me the answer");
      expect(result.detected).toBe(true);
      expect(result.confidence).toBe('high');
      expect(result.matchedPatterns).toContain('just tell me the answer');
    });

    it('detects "finish my assignment"', () => {
      const result = detectIntegrityViolation('Can you finish my assignment?');
      expect(result.detected).toBe(true);
      expect(result.confidence).toBe('high');
      expect(result.matchedPatterns).toContain('finish my assignment');
    });

    it('detects "plagiarize"', () => {
      const result = detectIntegrityViolation('Help me plagiarize this paper');
      expect(result.detected).toBe(true);
      expect(result.confidence).toBe('high');
      expect(result.matchedPatterns).toContain('plagiarize');
    });

    it('detects "plagiarise" (British spelling)', () => {
      const result = detectIntegrityViolation('I want to plagiarise this work');
      expect(result.detected).toBe(true);
      expect(result.matchedPatterns).toContain('plagiarize');
    });
  });

  // ── Moderate signal patterns (weight 2) ─────────────────────────────────

  describe('moderate signal patterns', () => {
    it('detects "answer key"', () => {
      const result = detectIntegrityViolation('Do you have the answer key for this quiz?');
      expect(result.detected).toBe(true);
      expect(result.confidence).toBe('medium');
      expect(result.matchedPatterns).toContain('answer key');
    });

    it('detects "what\'s the answer to question"', () => {
      const result = detectIntegrityViolation("What's the answer to question 5?");
      expect(result.detected).toBe(true);
      expect(result.matchedPatterns).toContain("what's the answer to question");
    });

    it('detects "cheat"', () => {
      const result = detectIntegrityViolation('How can I cheat on this exam?');
      expect(result.detected).toBe(true);
      expect(result.matchedPatterns).toContain('cheat');
    });

    it('detects "give me the solution"', () => {
      const result = detectIntegrityViolation('Just give me the full solution');
      expect(result.detected).toBe(true);
      expect(result.matchedPatterns).toContain('give me the solution');
    });
  });

  // ── Weak signal patterns (weight 1) ─────────────────────────────────────

  describe('weak signal patterns', () => {
    it('detects "just give me"', () => {
      const result = detectIntegrityViolation('Just give me something to submit');
      expect(result.detected).toBe(true);
      expect(result.confidence).toBe('low');
      expect(result.matchedPatterns).toContain('just give me');
    });

    it('detects "do it for me"', () => {
      const result = detectIntegrityViolation('Can you do it for me?');
      expect(result.detected).toBe(true);
      expect(result.matchedPatterns).toContain('do it for me');
    });
  });

  // ── Case insensitivity ──────────────────────────────────────────────────

  describe('case insensitivity', () => {
    it('detects uppercase patterns', () => {
      const result = detectIntegrityViolation('GIVE ME THE ANSWER NOW');
      expect(result.detected).toBe(true);
      expect(result.matchedPatterns).toContain('give me the answer');
    });

    it('detects mixed case patterns', () => {
      const result = detectIntegrityViolation('Write My Essay about history');
      expect(result.detected).toBe(true);
      expect(result.matchedPatterns).toContain('write my essay');
    });

    it('detects lowercase patterns', () => {
      const result = detectIntegrityViolation('do my homework please');
      expect(result.detected).toBe(true);
    });
  });

  // ── Confidence levels ───────────────────────────────────────────────────

  describe('confidence levels', () => {
    it('returns high confidence for strong signal patterns', () => {
      const result = detectIntegrityViolation('Give me the answer');
      expect(result.confidence).toBe('high');
    });

    it('returns medium confidence for moderate signal patterns', () => {
      const result = detectIntegrityViolation('Where is the answer key?');
      expect(result.confidence).toBe('medium');
    });

    it('returns low confidence for weak signal patterns only', () => {
      const result = detectIntegrityViolation('Just give me a hint');
      expect(result.confidence).toBe('low');
    });

    it('returns high confidence when multiple moderate patterns match', () => {
      const result = detectIntegrityViolation(
        'I need the answer key so I can cheat on this and give me the solution',
      );
      expect(result.confidence).toBe('high');
    });
  });

  // ── Multiple pattern matches ────────────────────────────────────────────

  describe('multiple pattern matches', () => {
    it('returns all matched patterns', () => {
      const result = detectIntegrityViolation(
        'Give me the answer and write my essay too',
      );
      expect(result.detected).toBe(true);
      expect(result.matchedPatterns).toContain('give me the answer');
      expect(result.matchedPatterns).toContain('write my essay');
      expect(result.matchedPatterns.length).toBeGreaterThanOrEqual(2);
    });

    it('builds flag reason with multiple patterns', () => {
      const result = detectIntegrityViolation(
        'Give me the answer and write my essay',
      );
      expect(result.flagReason).toContain('detected phrases');
      expect(result.flagReason).toContain('"give me the answer"');
      expect(result.flagReason).toContain('"write my essay"');
    });
  });

  // ── Flag reason format ──────────────────────────────────────────────────

  describe('flag reason', () => {
    it('returns empty string when not detected', () => {
      const result = detectIntegrityViolation('How does recursion work?');
      expect(result.flagReason).toBe('');
    });

    it('returns singular format for one match', () => {
      const result = detectIntegrityViolation('Do my homework');
      expect(result.flagReason).toContain('detected phrase');
      expect(result.flagReason).toContain('"do my homework"');
    });

    it('returns plural format for multiple matches', () => {
      const result = detectIntegrityViolation(
        'Do my homework and write my essay',
      );
      expect(result.flagReason).toContain('detected phrases');
    });
  });

  // ── Result shape ────────────────────────────────────────────────────────

  describe('result shape', () => {
    it('returns all required fields when detected', () => {
      const result: IntegrityDetectionResult = detectIntegrityViolation(
        'Give me the answer',
      );
      expect(result).toHaveProperty('detected');
      expect(result).toHaveProperty('confidence');
      expect(result).toHaveProperty('matchedPatterns');
      expect(result).toHaveProperty('flagReason');
      expect(typeof result.detected).toBe('boolean');
      expect(['low', 'medium', 'high']).toContain(result.confidence);
      expect(Array.isArray(result.matchedPatterns)).toBe(true);
      expect(typeof result.flagReason).toBe('string');
    });

    it('returns all required fields when not detected', () => {
      const result: IntegrityDetectionResult = detectIntegrityViolation(
        'Explain binary trees',
      );
      expect(result.detected).toBe(false);
      expect(result.confidence).toBe('low');
      expect(result.matchedPatterns).toEqual([]);
      expect(result.flagReason).toBe('');
    });
  });
});

// ── hasIntegrityViolation ───────────────────────────────────────────────────

describe('hasIntegrityViolation', () => {
  it('returns true for messages with violations', () => {
    expect(hasIntegrityViolation('Give me the answer')).toBe(true);
    expect(hasIntegrityViolation('Write my essay')).toBe(true);
    expect(hasIntegrityViolation('Do my homework')).toBe(true);
  });

  it('returns false for clean messages', () => {
    expect(hasIntegrityViolation('How does photosynthesis work?')).toBe(false);
    expect(hasIntegrityViolation('Explain the concept of gravity')).toBe(false);
    expect(hasIntegrityViolation('')).toBe(false);
  });
});
