import { describe, it, expect } from 'vitest';
import {
  computeExplanationConfidence,
  needsTeacherVerification,
  isFrequentlyMissed,
} from '@/lib/explanationConfidence';

describe('computeExplanationConfidence', () => {
  it('returns 0 for an empty array', () => {
    expect(computeExplanationConfidence([])).toBe(0);
  });

  it('returns the single value when given one similarity', () => {
    expect(computeExplanationConfidence([0.75])).toBe(0.75);
  });

  it('returns the average of 3 values', () => {
    const result = computeExplanationConfidence([0.9, 0.8, 0.7]);
    expect(result).toBeCloseTo(0.8, 10);
  });

  it('uses only the top 3 values when given more than 3', () => {
    // Top 3: 0.95, 0.85, 0.80 → average = 2.60 / 3 ≈ 0.8667
    const result = computeExplanationConfidence([0.5, 0.85, 0.95, 0.3, 0.80]);
    expect(result).toBeCloseTo((0.95 + 0.85 + 0.80) / 3, 10);
  });

  it('returns the correct value when all similarities are the same', () => {
    expect(computeExplanationConfidence([0.6, 0.6, 0.6, 0.6])).toBeCloseTo(0.6, 10);
  });
});

describe('needsTeacherVerification', () => {
  it('returns true when confidence is below 0.8', () => {
    expect(needsTeacherVerification(0.5)).toBe(true);
  });

  it('returns false when confidence is exactly 0.8', () => {
    expect(needsTeacherVerification(0.8)).toBe(false);
  });

  it('returns false when confidence is above 0.8', () => {
    expect(needsTeacherVerification(0.95)).toBe(false);
  });

  it('returns true when confidence is 0', () => {
    expect(needsTeacherVerification(0)).toBe(true);
  });
});

describe('isFrequentlyMissed', () => {
  it('returns true when success_rate < 0.5 and attempts >= 10', () => {
    expect(isFrequentlyMissed(0.3, 15)).toBe(true);
  });

  it('returns false when success_rate >= 0.5', () => {
    expect(isFrequentlyMissed(0.5, 20)).toBe(false);
  });

  it('returns false when attempts < 10', () => {
    expect(isFrequentlyMissed(0.2, 5)).toBe(false);
  });

  it('returns false when both conditions are false', () => {
    expect(isFrequentlyMissed(0.8, 3)).toBe(false);
  });
});
