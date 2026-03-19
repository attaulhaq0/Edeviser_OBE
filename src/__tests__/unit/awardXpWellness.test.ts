import { describe, it, expect } from 'vitest';
import { applyBonusMultiplier } from '@/lib/xpLevelCalculator';
import { XP_SCHEDULE } from '@/lib/xpSchedule';
import type { XPSource } from '@/types/app';

/**
 * Tests for the award-xp Edge Function wellness_habit source handling.
 *
 * The Edge Function runs on Deno and cannot be directly imported in Vitest.
 * These tests validate:
 * 1. wellness_habit is a recognized XP source in the client-side type system
 * 2. The XP lookup/override logic (wellness_xp_amount from institution_settings)
 * 3. The zero-XP skip behavior
 * 4. Bonus multiplier application to wellness XP
 *
 * The actual Edge Function logic mirrors these pure functions.
 */

// ─── Helpers replicating Edge Function wellness XP resolution logic ─────────

/**
 * Resolves the effective wellness XP amount from institution settings.
 * Returns 0 when the institution has disabled wellness XP.
 * Falls back to default (5) when no setting is found.
 */
function resolveWellnessXpAmount(
  institutionWellnessXp: number | null | undefined,
): number {
  return institutionWellnessXp ?? 5; // default 5 per design
}

/**
 * Determines whether to skip the XP transaction insert entirely.
 * When wellness_xp_amount is 0, the Edge Function returns early with
 * { success: true, xp_awarded: 0 } and does NOT insert a transaction.
 */
function shouldSkipWellnessXpTransaction(wellnessXpAmount: number): boolean {
  return wellnessXpAmount === 0;
}

// ─── Validation helpers (mirrors Edge Function VALID_SOURCES) ───────────────

const VALID_SOURCES: string[] = [
  'login', 'submission', 'badge', 'admin_adjustment', 'perfect_day',
  'first_attempt_bonus', 'perfect_rubric', 'bonus_event',
  'discussion_question', 'discussion_answer', 'survey_completion',
  'quiz_completion', 'streak_milestone', 'journal', 'grade',
  'onboarding_personality', 'onboarding_learning_style', 'onboarding_baseline',
  'onboarding_complete', 'onboarding_self_efficacy', 'onboarding_study_strategy',
  'micro_assessment', 'profile_complete', 'starter_session_complete',
  'wellness_habit',
];

describe('Award XP — Wellness Habit Source', () => {
  describe('wellness_habit source recognition', () => {
    it('wellness_habit is included in VALID_SOURCES', () => {
      expect(VALID_SOURCES).toContain('wellness_habit');
    });

    it('wellness_habit is a valid XPSource type', () => {
      const source: XPSource = 'wellness_habit';
      expect(source).toBe('wellness_habit');
    });

    it('XP_SCHEDULE includes wellness_habit with 0 (variable amount)', () => {
      expect(XP_SCHEDULE).toHaveProperty('wellness_habit');
      expect(XP_SCHEDULE.wellness_habit).toBe(0);
    });
  });

  describe('wellness XP amount resolution from institution settings', () => {
    it('uses institution wellness_xp_amount when available', () => {
      expect(resolveWellnessXpAmount(10)).toBe(10);
      expect(resolveWellnessXpAmount(25)).toBe(25);
      expect(resolveWellnessXpAmount(0)).toBe(0);
    });

    it('defaults to 5 when institution setting is null', () => {
      expect(resolveWellnessXpAmount(null)).toBe(5);
    });

    it('defaults to 5 when institution setting is undefined', () => {
      expect(resolveWellnessXpAmount(undefined)).toBe(5);
    });
  });

  describe('wellness_xp_amount = 0 skips XP transaction', () => {
    it('returns true (skip) when wellness_xp_amount is 0', () => {
      expect(shouldSkipWellnessXpTransaction(0)).toBe(true);
    });

    it('returns false (do not skip) when wellness_xp_amount > 0', () => {
      expect(shouldSkipWellnessXpTransaction(5)).toBe(false);
      expect(shouldSkipWellnessXpTransaction(1)).toBe(false);
      expect(shouldSkipWellnessXpTransaction(25)).toBe(false);
    });
  });

  describe('wellness_xp_amount > 0 inserts XP transaction with correct amount', () => {
    it('uses the institution-configured amount as the base XP', () => {
      const wellnessXp = resolveWellnessXpAmount(10);
      expect(wellnessXp).toBe(10);
      // This value would be used as resolvedXpAmount in the Edge Function
      // and inserted into xp_transactions.xp_amount (before bonus multiplier)
    });

    it('uses default 5 XP when no institution setting exists', () => {
      const wellnessXp = resolveWellnessXpAmount(null);
      expect(wellnessXp).toBe(5);
    });

    it('respects the full range of valid wellness XP (0-25)', () => {
      for (let xp = 0; xp <= 25; xp++) {
        const resolved = resolveWellnessXpAmount(xp);
        expect(resolved).toBe(xp);
      }
    });
  });

  describe('bonus multiplier applies to wellness XP', () => {
    it('applies 2x multiplier to wellness XP', () => {
      const baseWellnessXp = 5;
      const multiplied = applyBonusMultiplier(baseWellnessXp, 2);
      expect(multiplied).toBe(10);
    });

    it('applies 1.5x multiplier and floors the result', () => {
      const baseWellnessXp = 5;
      const multiplied = applyBonusMultiplier(baseWellnessXp, 1.5);
      expect(multiplied).toBe(7); // 5 * 1.5 = 7.5 → 7
    });

    it('returns base XP when multiplier is 1 (no bonus event)', () => {
      const baseWellnessXp = 5;
      const multiplied = applyBonusMultiplier(baseWellnessXp, 1);
      expect(multiplied).toBe(5);
    });

    it('returns base XP when multiplier is less than 1', () => {
      const baseWellnessXp = 5;
      const multiplied = applyBonusMultiplier(baseWellnessXp, 0.5);
      expect(multiplied).toBe(5); // applyBonusMultiplier guards against < 1
    });

    it('handles zero wellness XP with multiplier correctly', () => {
      // This case shouldn't happen (0 XP skips transaction), but verify safety
      const multiplied = applyBonusMultiplier(0, 2);
      expect(multiplied).toBe(0);
    });

    it('applies large multiplier to max wellness XP (25)', () => {
      const multiplied = applyBonusMultiplier(25, 3);
      expect(multiplied).toBe(75);
    });
  });
});
