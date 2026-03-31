import { describe, it, expect } from 'vitest';
import {
  getRequiredHabitsForLevel,
  checkLevelPromotion,
  getPerfectDayThreshold,
} from '@/lib/habitDifficulty';

describe('habitDifficulty', () => {
  describe('getRequiredHabitsForLevel', () => {
    it('returns 1 for level 1', () => {
      expect(getRequiredHabitsForLevel(1)).toBe(1);
    });

    it('returns 2 for level 2', () => {
      expect(getRequiredHabitsForLevel(2)).toBe(2);
    });

    it('returns 6 for level 3', () => {
      expect(getRequiredHabitsForLevel(3)).toBe(6);
    });

    it('returns 1 for level 0 or below', () => {
      expect(getRequiredHabitsForLevel(0)).toBe(1);
      expect(getRequiredHabitsForLevel(-1)).toBe(1);
    });

    it('returns 6 for level above 3', () => {
      expect(getRequiredHabitsForLevel(4)).toBe(6);
    });
  });

  describe('checkLevelPromotion', () => {
    it('returns true when streak >= 7 and level < 3', () => {
      expect(checkLevelPromotion(1, 7)).toBe(true);
      expect(checkLevelPromotion(2, 7)).toBe(true);
      expect(checkLevelPromotion(1, 10)).toBe(true);
    });

    it('returns false when level is 3 (max)', () => {
      expect(checkLevelPromotion(3, 7)).toBe(false);
      expect(checkLevelPromotion(3, 100)).toBe(false);
    });

    it('returns false when streak < 7', () => {
      expect(checkLevelPromotion(1, 6)).toBe(false);
      expect(checkLevelPromotion(2, 0)).toBe(false);
    });
  });

  describe('getPerfectDayThreshold', () => {
    it('returns same values as getRequiredHabitsForLevel', () => {
      expect(getPerfectDayThreshold(1)).toBe(1);
      expect(getPerfectDayThreshold(2)).toBe(2);
      expect(getPerfectDayThreshold(3)).toBe(6);
    });
  });
});
