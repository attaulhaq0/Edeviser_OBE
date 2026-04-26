// =============================================================================
// Challenge Types — Unit tests (Task 10.2)
// =============================================================================

import { describe, it, expect } from 'vitest';
import {
  CHALLENGE_TYPES,
  CHALLENGE_TYPE_OPTIONS,
  isValidGoalTarget,
  wouldExceedConcurrentLimit,
  getChallengeType,
  type ChallengeTypeId,
} from '@/lib/challengeTypes';

describe('CHALLENGE_TYPES', () => {
  const expectedTypes: ChallengeTypeId[] = [
    'academic',
    'habit',
    'xp_race',
    'blooms_climb',
    'cooperative',
  ];

  it('defines all 5 challenge types', () => {
    expect(Object.keys(CHALLENGE_TYPES)).toHaveLength(5);
  });

  it.each(expectedTypes)('includes the "%s" type', (typeId) => {
    expect(CHALLENGE_TYPES[typeId]).toBeDefined();
    expect(CHALLENGE_TYPES[typeId].id).toBe(typeId);
  });

  it('blooms_climb has fixedTarget of 6', () => {
    expect(CHALLENGE_TYPES.blooms_climb.fixedTarget).toBe(6);
    expect(CHALLENGE_TYPES.blooms_climb.minTarget).toBe(6);
    expect(CHALLENGE_TYPES.blooms_climb.maxTarget).toBe(6);
  });

  it('cooperative has showsLeaderboard = false', () => {
    expect(CHALLENGE_TYPES.cooperative.showsLeaderboard).toBe(false);
  });

  it('xp_race has requiresAcknowledgment = true', () => {
    expect(CHALLENGE_TYPES.xp_race.requiresAcknowledgment).toBe(true);
  });

  it('xp_race has maxConcurrentPerCourse = 2', () => {
    expect(CHALLENGE_TYPES.xp_race.maxConcurrentPerCourse).toBe(2);
  });

  it('every type has required fields', () => {
    for (const config of Object.values(CHALLENGE_TYPES)) {
      expect(config.id).toBeTruthy();
      expect(config.label).toBeTruthy();
      expect(config.description).toBeTruthy();
      expect(config.goalDescription).toBeTruthy();
      expect(config.goalUnit).toBeTruthy();
      expect(typeof config.showsLeaderboard).toBe('boolean');
      expect(typeof config.maxConcurrentPerCourse).toBe('number');
      expect(typeof config.requiresAcknowledgment).toBe('boolean');
      expect(config.minTarget).toBeLessThanOrEqual(config.maxTarget);
    }
  });
});

describe('CHALLENGE_TYPE_OPTIONS', () => {
  it('has cooperative as the first option (default)', () => {
    expect(CHALLENGE_TYPE_OPTIONS[0]).toBe('cooperative');
  });

  it('contains all 5 types', () => {
    expect(CHALLENGE_TYPE_OPTIONS).toHaveLength(5);
    expect(CHALLENGE_TYPE_OPTIONS).toContain('academic');
    expect(CHALLENGE_TYPE_OPTIONS).toContain('habit');
    expect(CHALLENGE_TYPE_OPTIONS).toContain('xp_race');
    expect(CHALLENGE_TYPE_OPTIONS).toContain('blooms_climb');
    expect(CHALLENGE_TYPE_OPTIONS).toContain('cooperative');
  });
});

describe('getChallengeType', () => {
  it('returns the correct config for each type', () => {
    const config = getChallengeType('academic');
    expect(config.id).toBe('academic');
    expect(config.label).toBe('Academic');
  });
});

describe('isValidGoalTarget', () => {
  it('accepts a target within bounds for academic', () => {
    expect(isValidGoalTarget('academic', 10)).toBe(true);
  });

  it('rejects a target below minimum for academic', () => {
    expect(isValidGoalTarget('academic', 0)).toBe(false);
  });

  it('rejects a target above maximum for academic', () => {
    expect(isValidGoalTarget('academic', 100)).toBe(false);
  });

  it('rejects non-integer targets', () => {
    expect(isValidGoalTarget('academic', 5.5)).toBe(false);
  });

  it('only accepts fixedTarget for blooms_climb', () => {
    expect(isValidGoalTarget('blooms_climb', 6)).toBe(true);
    expect(isValidGoalTarget('blooms_climb', 5)).toBe(false);
    expect(isValidGoalTarget('blooms_climb', 7)).toBe(false);
  });

  it('accepts boundary values', () => {
    expect(isValidGoalTarget('habit', 3)).toBe(true);   // minTarget
    expect(isValidGoalTarget('habit', 90)).toBe(true);  // maxTarget
  });
});

describe('wouldExceedConcurrentLimit', () => {
  it('returns false when under the limit', () => {
    expect(wouldExceedConcurrentLimit('academic', 0)).toBe(false);
    expect(wouldExceedConcurrentLimit('academic', 4)).toBe(false);
  });

  it('returns true when at the limit', () => {
    expect(wouldExceedConcurrentLimit('academic', 5)).toBe(true);
  });

  it('returns true when over the limit', () => {
    expect(wouldExceedConcurrentLimit('academic', 10)).toBe(true);
  });

  it('respects xp_race limit of 2', () => {
    expect(wouldExceedConcurrentLimit('xp_race', 1)).toBe(false);
    expect(wouldExceedConcurrentLimit('xp_race', 2)).toBe(true);
  });
});
