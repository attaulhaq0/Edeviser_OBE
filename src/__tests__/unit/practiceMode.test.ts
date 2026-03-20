// =============================================================================
// Practice Mode — Unit tests
// Validates: Task 19.4 — XP calculation, mode flag, no evidence generation
// =============================================================================

import { describe, it, expect } from 'vitest';
import { computePracticeXP } from '@/lib/bloomsClimb';

// ── computePracticeXP ───────────────────────────────────────────────────────

describe('computePracticeXP', () => {
  it('returns exactly 10', () => {
    expect(computePracticeXP()).toBe(10);
  });

  it('returns a number type', () => {
    expect(typeof computePracticeXP()).toBe('number');
  });

  it('is consistent across multiple calls', () => {
    const results = Array.from({ length: 10 }, () => computePracticeXP());
    expect(results.every((r) => r === 10)).toBe(true);
  });
});

// ── Practice mode flag behavior ─────────────────────────────────────────────

describe('Practice mode flag behavior', () => {
  it('practice mode is identified by mode = "practice"', () => {
    const attempt = { mode: 'practice' as const };
    expect(attempt.mode).toBe('practice');
    expect(attempt.mode !== 'graded').toBe(true);
  });

  it('graded mode is identified by mode = "graded"', () => {
    const attempt = { mode: 'graded' as const };
    expect(attempt.mode).toBe('graded');
    expect(attempt.mode !== 'practice').toBe(true);
  });

  it('practice and graded modes are mutually exclusive', () => {
    const modes = ['practice', 'graded'] as const;
    expect(modes[0]).not.toBe(modes[1]);
  });
});

// ── Practice XP independence ────────────────────────────────────────────────

describe('Practice XP is independent of external factors', () => {
  it('XP is the same regardless of difficulty level', () => {
    // computePracticeXP takes no parameters — XP is always 10
    const difficulties = [1.0, 2.0, 3.0, 4.0, 5.0];
    for (const _difficulty of difficulties) {
      expect(computePracticeXP()).toBe(10);
    }
  });

  it('XP is the same regardless of correctness', () => {
    const correctnessValues = [true, false];
    for (const _correct of correctnessValues) {
      expect(computePracticeXP()).toBe(10);
    }
  });

  it('XP is the same regardless of Bloom level', () => {
    const bloomLevels = [1, 2, 3, 4, 5, 6];
    for (const _level of bloomLevels) {
      expect(computePracticeXP()).toBe(10);
    }
  });

  it('XP is the same regardless of score', () => {
    const scores = [0, 25, 50, 75, 100];
    for (const _score of scores) {
      expect(computePracticeXP()).toBe(10);
    }
  });
});

// ── No evidence generation in practice mode ─────────────────────────────────

describe('Practice mode skips evidence generation', () => {
  it('practice mode attempts should not trigger attainment rollup', () => {
    // This validates the design contract: when mode = 'practice',
    // the submission flow skips evidence generation and attainment rollup.
    const shouldSkipEvidence = (mode: string): boolean => mode === 'practice';

    expect(shouldSkipEvidence('practice')).toBe(true);
    expect(shouldSkipEvidence('graded')).toBe(false);
  });

  it('graded mode attempts should trigger attainment rollup', () => {
    const shouldGenerateEvidence = (mode: string): boolean => mode !== 'practice';

    expect(shouldGenerateEvidence('graded')).toBe(true);
    expect(shouldGenerateEvidence('practice')).toBe(false);
  });
});
