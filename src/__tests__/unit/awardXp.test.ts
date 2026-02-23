import { describe, it, expect } from 'vitest';
import {
  generateLevelThresholds,
  calculateLevel,
  applyBonusMultiplier,
  LEVEL_THRESHOLDS,
} from '@/lib/xpLevelCalculator';

describe('XP Level Calculator', () => {
  describe('generateLevelThresholds', () => {
    it('generates thresholds up to level 50', () => {
      const thresholds = generateLevelThresholds();
      expect(thresholds).toHaveLength(50);
      expect(thresholds[0]!.level).toBe(1);
      expect(thresholds[49]!.level).toBe(50);
    });

    it('has monotonically increasing XP requirements', () => {
      const thresholds = generateLevelThresholds();
      for (let i = 1; i < thresholds.length; i++) {
        expect(thresholds[i]!.xpRequired).toBeGreaterThan(thresholds[i - 1]!.xpRequired);
      }
    });

    it('matches known thresholds for levels 1-3', () => {
      const thresholds = generateLevelThresholds();
      expect(thresholds[0]!).toMatchObject({ level: 1, xpRequired: 0 });
      expect(thresholds[1]!).toMatchObject({ level: 2, xpRequired: 100 });
      expect(thresholds[2]!).toMatchObject({ level: 3, xpRequired: 250 });
    });

    it('uses floor(50 * N^1.5) formula for levels 4+', () => {
      const thresholds = generateLevelThresholds();
      for (let i = 3; i < thresholds.length; i++) {
        const t = thresholds[i]!;
        expect(t.xpRequired).toBe(Math.floor(50 * Math.pow(t.level, 1.5)));
      }
    });

    it('assigns title strings to all levels', () => {
      const thresholds = generateLevelThresholds();
      for (const t of thresholds) {
        expect(typeof t.title).toBe('string');
        expect(t.title.length).toBeGreaterThan(0);
      }
    });
  });

  describe('calculateLevel', () => {
    it('returns level 1 for 0 XP', () => {
      expect(calculateLevel(0)).toBe(1);
    });

    it('returns level 1 for negative XP', () => {
      expect(calculateLevel(-100)).toBe(1);
    });

    it('returns level 2 for exactly 100 XP', () => {
      expect(calculateLevel(100)).toBe(2);
    });

    it('returns level 2 for 99 XP (just below level 2)', () => {
      expect(calculateLevel(99)).toBe(1);
    });

    it('returns level 3 for exactly 250 XP', () => {
      expect(calculateLevel(250)).toBe(3);
    });

    it('returns level 2 for 249 XP (just below level 3)', () => {
      expect(calculateLevel(249)).toBe(2);
    });

    it('returns correct level for XP between thresholds', () => {
      // 150 XP is between level 2 (100) and level 3 (250)
      expect(calculateLevel(150)).toBe(2);
    });

    it('returns max level for very high XP', () => {
      expect(calculateLevel(999999)).toBe(50);
    });

    it('uses cached LEVEL_THRESHOLDS consistently', () => {
      expect(LEVEL_THRESHOLDS).toHaveLength(50);
      expect(calculateLevel(LEVEL_THRESHOLDS[49]!.xpRequired)).toBe(50);
    });
  });

  describe('applyBonusMultiplier', () => {
    it('returns base XP when multiplier is 1', () => {
      expect(applyBonusMultiplier(25, 1)).toBe(25);
    });

    it('doubles XP with 2x multiplier', () => {
      expect(applyBonusMultiplier(25, 2)).toBe(50);
    });

    it('floors the result for non-integer products', () => {
      expect(applyBonusMultiplier(10, 1.5)).toBe(15);
      expect(applyBonusMultiplier(7, 1.5)).toBe(10); // 7 * 1.5 = 10.5 → 10
    });

    it('returns base XP when multiplier is less than 1', () => {
      expect(applyBonusMultiplier(25, 0.5)).toBe(25);
    });

    it('handles zero XP correctly', () => {
      expect(applyBonusMultiplier(0, 2)).toBe(0);
    });

    it('handles large multipliers', () => {
      expect(applyBonusMultiplier(100, 5)).toBe(500);
    });
  });
});
