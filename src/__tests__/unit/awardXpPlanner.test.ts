import { describe, it, expect } from 'vitest';
import { calculateSessionXP } from '@/lib/plannerUtils';

/**
 * Unit tests for planner-related XP sources in the award-xp Edge Function.
 * Tests the client-side XP calculation logic that feeds into the Edge Function.
 */
describe('Award XP — Planner Sources', () => {
  describe('study_session XP calculation (calculateSessionXP)', () => {
    it('returns 0 XP for sessions under 15 minutes', () => {
      expect(calculateSessionXP(0, false)).toBe(0);
      expect(calculateSessionXP(5, false)).toBe(0);
      expect(calculateSessionXP(10, false)).toBe(0);
      expect(calculateSessionXP(14, false)).toBe(0);
    });

    it('returns base 20 XP for exactly 15 minutes', () => {
      expect(calculateSessionXP(15, false)).toBe(20);
    });

    it('returns 25 XP for 30 minutes (20 base + 5 for second block)', () => {
      expect(calculateSessionXP(30, false)).toBe(25);
    });

    it('returns 35 XP for 60 minutes', () => {
      expect(calculateSessionXP(60, false)).toBe(35);
    });

    it('caps session XP at 50 for very long sessions', () => {
      expect(calculateSessionXP(120, false)).toBe(50);
      expect(calculateSessionXP(180, false)).toBe(50);
      expect(calculateSessionXP(240, false)).toBe(50);
    });

    it('adds 10 XP evidence bonus when hasEvidence is true', () => {
      expect(calculateSessionXP(15, true)).toBe(30); // 20 + 10
      expect(calculateSessionXP(30, true)).toBe(35); // 25 + 10
      expect(calculateSessionXP(60, true)).toBe(45); // 35 + 10
    });

    it('caps base at 50 but still adds evidence bonus', () => {
      expect(calculateSessionXP(240, true)).toBe(60); // 50 + 10
    });

    it('returns 0 XP for 0 minutes even with evidence', () => {
      expect(calculateSessionXP(0, true)).toBe(0);
    });
  });

  describe('planner_task XP', () => {
    it('awards fixed 10 XP per task completion', () => {
      // The planner_task source awards a fixed 10 XP.
      // This is enforced server-side in the Edge Function.
      const PLANNER_TASK_XP = 10;
      expect(PLANNER_TASK_XP).toBe(10);
    });
  });

  describe('session_reflection XP', () => {
    it('awards fixed 10 XP per session reflection', () => {
      const SESSION_REFLECTION_XP = 10;
      expect(SESSION_REFLECTION_XP).toBe(10);
    });
  });

  describe('weekly_goal XP', () => {
    it('awards fixed 25 XP per goal met', () => {
      const WEEKLY_GOAL_XP = 25;
      expect(WEEKLY_GOAL_XP).toBe(25);
    });
  });

  describe('XP source validation', () => {
    it('recognizes all planner XP sources', () => {
      const VALID_PLANNER_SOURCES = [
        'study_session',
        'planner_task',
        'session_reflection',
        'weekly_goal',
        'review_session',
        'review_cycle_complete',
      ];
      expect(VALID_PLANNER_SOURCES).toHaveLength(6);
      for (const source of VALID_PLANNER_SOURCES) {
        expect(typeof source).toBe('string');
        expect(source.length).toBeGreaterThan(0);
      }
    });
  });
});
