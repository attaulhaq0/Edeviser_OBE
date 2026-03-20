// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import {
  classifyAbility,
  abilityToTargetDifficulty,
  adjustDifficulty,
  preferredBloomLevels,
} from '@/lib/adaptiveEngine';
import type { AbilityLevel } from '@/lib/adaptiveEngine';

// ── classifyAbility ─────────────────────────────────────────────────

describe('classifyAbility', () => {
  it('returns "low" for 0%', () => {
    expect(classifyAbility(0)).toBe('low');
  });

  it('returns "low" for 49.99%', () => {
    expect(classifyAbility(49.99)).toBe('low');
  });

  it('returns "medium" for exactly 50%', () => {
    expect(classifyAbility(50)).toBe('medium');
  });

  it('returns "medium" for 84.99%', () => {
    expect(classifyAbility(84.99)).toBe('medium');
  });

  it('returns "high" for exactly 85%', () => {
    expect(classifyAbility(85)).toBe('high');
  });

  it('returns "high" for 100%', () => {
    expect(classifyAbility(100)).toBe('high');
  });
});

// ── abilityToTargetDifficulty ───────────────────────────────────────

describe('abilityToTargetDifficulty', () => {
  it('maps "high" to 3.5', () => {
    expect(abilityToTargetDifficulty('high')).toBe(3.5);
  });

  it('maps "medium" to 2.5', () => {
    expect(abilityToTargetDifficulty('medium')).toBe(2.5);
  });

  it('maps "low" to 1.5', () => {
    expect(abilityToTargetDifficulty('low')).toBe(1.5);
  });
});


// ── adjustDifficulty ────────────────────────────────────────────────

describe('adjustDifficulty', () => {
  it('stays at 5.0 when correct at 5.0 (cap)', () => {
    expect(adjustDifficulty(5.0, true)).toBe(5.0);
  });

  it('stays at 1.0 when incorrect at 1.0 (floor)', () => {
    expect(adjustDifficulty(1.0, false)).toBe(1.0);
  });

  it('caps at 5.0 when correct at 4.8 (would be 5.1)', () => {
    expect(adjustDifficulty(4.8, true)).toBe(5.0);
  });

  it('floors at 1.0 when incorrect at 1.3 (would be 0.8)', () => {
    expect(adjustDifficulty(1.3, false)).toBe(1.0);
  });

  it('uses custom step values', () => {
    expect(adjustDifficulty(3.0, true, 0.5, 0.5)).toBe(3.5);
    expect(adjustDifficulty(3.0, false, 0.5, 1.0)).toBe(2.0);
  });

  it('uses default step +0.3 for correct', () => {
    expect(adjustDifficulty(2.0, true)).toBeCloseTo(2.3);
  });

  it('uses default step -0.5 for incorrect', () => {
    expect(adjustDifficulty(3.0, false)).toBeCloseTo(2.5);
  });
});

// ── preferredBloomLevels ────────────────────────────────────────────

describe('preferredBloomLevels', () => {
  it('returns [4, 5, 6] for "high"', () => {
    expect(preferredBloomLevels('high')).toEqual([4, 5, 6]);
  });

  it('returns [2, 3, 4] for "medium"', () => {
    expect(preferredBloomLevels('medium')).toEqual([2, 3, 4]);
  });

  it('returns [1, 2] for "low"', () => {
    expect(preferredBloomLevels('low')).toEqual([1, 2]);
  });
});
