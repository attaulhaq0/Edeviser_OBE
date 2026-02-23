import { describe, it, expect } from 'vitest';
import {
  calculateStreakUpdate,
  daysBetween,
  checkMilestone,
  STREAK_MILESTONES,
  MILESTONE_XP,
  type StreakState,
} from '@/lib/streakCalculator';

describe('Streak Calculator', () => {
  describe('daysBetween', () => {
    it('returns 0 for the same date', () => {
      expect(daysBetween('2024-01-15', '2024-01-15')).toBe(0);
    });

    it('returns 1 for consecutive days', () => {
      expect(daysBetween('2024-01-15', '2024-01-16')).toBe(1);
    });

    it('returns correct difference for multi-day gap', () => {
      expect(daysBetween('2024-01-10', '2024-01-15')).toBe(5);
    });

    it('is commutative (order does not matter)', () => {
      expect(daysBetween('2024-01-10', '2024-01-15')).toBe(
        daysBetween('2024-01-15', '2024-01-10'),
      );
    });

    it('handles month boundaries', () => {
      expect(daysBetween('2024-01-31', '2024-02-01')).toBe(1);
    });

    it('handles year boundaries', () => {
      expect(daysBetween('2023-12-31', '2024-01-01')).toBe(1);
    });
  });

  describe('checkMilestone', () => {
    it('returns the milestone number for valid milestones', () => {
      expect(checkMilestone(7)).toBe(7);
      expect(checkMilestone(14)).toBe(14);
      expect(checkMilestone(30)).toBe(30);
      expect(checkMilestone(60)).toBe(60);
      expect(checkMilestone(100)).toBe(100);
    });

    it('returns null for non-milestone counts', () => {
      expect(checkMilestone(1)).toBeNull();
      expect(checkMilestone(6)).toBeNull();
      expect(checkMilestone(8)).toBeNull();
      expect(checkMilestone(15)).toBeNull();
      expect(checkMilestone(50)).toBeNull();
      expect(checkMilestone(99)).toBeNull();
    });
  });

  describe('STREAK_MILESTONES and MILESTONE_XP', () => {
    it('has XP defined for every milestone', () => {
      for (const m of STREAK_MILESTONES) {
        expect(MILESTONE_XP[m]).toBeDefined();
        expect(MILESTONE_XP[m]).toBeGreaterThan(0);
      }
    });

    it('has correct XP values per milestone', () => {
      expect(MILESTONE_XP[7]).toBe(100);
      expect(MILESTONE_XP[14]).toBe(100);
      expect(MILESTONE_XP[30]).toBe(250);
      expect(MILESTONE_XP[60]).toBe(250);
      expect(MILESTONE_XP[100]).toBe(500);
    });
  });

  describe('calculateStreakUpdate', () => {
    const makeState = (overrides: Partial<StreakState> = {}): StreakState => ({
      streak_count: 1,
      last_login_date: '2024-01-15',
      streak_freezes_available: 0,
      ...overrides,
    });

    describe('first login ever', () => {
      it('returns streak = 1 when current is null', () => {
        const result = calculateStreakUpdate(null, '2024-01-15');
        expect(result.new_streak_count).toBe(1);
        expect(result.is_new_day).toBe(true);
        expect(result.should_reset).toBe(false);
        expect(result.streak_frozen).toBe(false);
        expect(result.milestone_reached).toBeNull();
      });

      it('returns streak = 1 when last_login_date is null', () => {
        const state = makeState({ last_login_date: null });
        const result = calculateStreakUpdate(state, '2024-01-15');
        expect(result.new_streak_count).toBe(1);
        expect(result.is_new_day).toBe(true);
      });
    });

    describe('same day login', () => {
      it('returns no change when logging in on the same day', () => {
        const state = makeState({ streak_count: 5, last_login_date: '2024-01-15' });
        const result = calculateStreakUpdate(state, '2024-01-15');
        expect(result.new_streak_count).toBe(5);
        expect(result.is_new_day).toBe(false);
        expect(result.should_reset).toBe(false);
        expect(result.streak_frozen).toBe(false);
        expect(result.milestone_reached).toBeNull();
      });
    });

    describe('consecutive day login', () => {
      it('increments streak by 1', () => {
        const state = makeState({ streak_count: 3, last_login_date: '2024-01-15' });
        const result = calculateStreakUpdate(state, '2024-01-16');
        expect(result.new_streak_count).toBe(4);
        expect(result.is_new_day).toBe(true);
        expect(result.should_reset).toBe(false);
        expect(result.streak_frozen).toBe(false);
      });

      it('detects milestone at 7 days', () => {
        const state = makeState({ streak_count: 6, last_login_date: '2024-01-15' });
        const result = calculateStreakUpdate(state, '2024-01-16');
        expect(result.new_streak_count).toBe(7);
        expect(result.milestone_reached).toBe(7);
      });

      it('detects milestone at 14 days', () => {
        const state = makeState({ streak_count: 13, last_login_date: '2024-01-15' });
        const result = calculateStreakUpdate(state, '2024-01-16');
        expect(result.milestone_reached).toBe(14);
      });

      it('detects milestone at 30 days', () => {
        const state = makeState({ streak_count: 29, last_login_date: '2024-01-15' });
        const result = calculateStreakUpdate(state, '2024-01-16');
        expect(result.milestone_reached).toBe(30);
      });

      it('detects milestone at 60 days', () => {
        const state = makeState({ streak_count: 59, last_login_date: '2024-01-15' });
        const result = calculateStreakUpdate(state, '2024-01-16');
        expect(result.milestone_reached).toBe(60);
      });

      it('detects milestone at 100 days', () => {
        const state = makeState({ streak_count: 99, last_login_date: '2024-01-15' });
        const result = calculateStreakUpdate(state, '2024-01-16');
        expect(result.milestone_reached).toBe(100);
      });

      it('returns no milestone for non-milestone counts', () => {
        const state = makeState({ streak_count: 4, last_login_date: '2024-01-15' });
        const result = calculateStreakUpdate(state, '2024-01-16');
        expect(result.new_streak_count).toBe(5);
        expect(result.milestone_reached).toBeNull();
      });
    });

    describe('missed 1 day with freeze available', () => {
      it('preserves streak and consumes freeze', () => {
        const state = makeState({
          streak_count: 10,
          last_login_date: '2024-01-15',
          streak_freezes_available: 2,
        });
        // Missed Jan 16, logging in Jan 17 (dayDiff = 2)
        const result = calculateStreakUpdate(state, '2024-01-17');
        expect(result.new_streak_count).toBe(11);
        expect(result.streak_frozen).toBe(true);
        expect(result.freeze_consumed).toBe(true);
        expect(result.should_reset).toBe(false);
        expect(result.is_new_day).toBe(true);
      });

      it('detects milestone when freeze preserves streak to milestone', () => {
        const state = makeState({
          streak_count: 6,
          last_login_date: '2024-01-15',
          streak_freezes_available: 1,
        });
        const result = calculateStreakUpdate(state, '2024-01-17');
        expect(result.new_streak_count).toBe(7);
        expect(result.milestone_reached).toBe(7);
        expect(result.streak_frozen).toBe(true);
      });
    });

    describe('missed 1 day without freeze', () => {
      it('resets streak to 1', () => {
        const state = makeState({
          streak_count: 10,
          last_login_date: '2024-01-15',
          streak_freezes_available: 0,
        });
        const result = calculateStreakUpdate(state, '2024-01-17');
        expect(result.new_streak_count).toBe(1);
        expect(result.should_reset).toBe(true);
        expect(result.streak_frozen).toBe(false);
        expect(result.freeze_consumed).toBe(false);
        expect(result.milestone_reached).toBeNull();
      });
    });

    describe('missed multiple days', () => {
      it('resets streak to 1 even with freezes available', () => {
        const state = makeState({
          streak_count: 20,
          last_login_date: '2024-01-10',
          streak_freezes_available: 2,
        });
        // Missed 4 days (Jan 11, 12, 13, 14), logging in Jan 15 (dayDiff = 5)
        const result = calculateStreakUpdate(state, '2024-01-15');
        expect(result.new_streak_count).toBe(1);
        expect(result.should_reset).toBe(true);
        expect(result.streak_frozen).toBe(false);
        expect(result.freeze_consumed).toBe(false);
      });

      it('resets streak to 1 when missed 2 days without freeze', () => {
        const state = makeState({
          streak_count: 5,
          last_login_date: '2024-01-10',
          streak_freezes_available: 0,
        });
        // dayDiff = 3 (missed 2 days)
        const result = calculateStreakUpdate(state, '2024-01-13');
        expect(result.new_streak_count).toBe(1);
        expect(result.should_reset).toBe(true);
      });
    });
  });
});
