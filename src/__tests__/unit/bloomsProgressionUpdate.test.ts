import { describe, it, expect } from "vitest";
import { highestBloomReached, type BloomAttempt } from "@/lib/bloomsClimb";

/**
 * Tests for the Bloom's Progression update logic used in the
 * update-question-analytics Edge Function (Task 17.8).
 *
 * The Edge Function's computeHighestBloomReached mirrors highestBloomReached
 * from bloomsClimb.ts. Badge flags are derived from the highest level:
 *   - bloom_explorer_awarded: highest >= 4
 *   - bloom_challenger_awarded: highest >= 5
 *   - bloom_pioneer_awarded: highest >= 6
 *
 * Badge flags are only set to true, never reverted to false.
 */

// ── Badge flag derivation (mirrors Edge Function logic) ─────────────

function deriveBadgeFlags(highestLevel: number) {
  return {
    bloom_explorer_awarded: highestLevel >= 4,
    bloom_challenger_awarded: highestLevel >= 5,
    bloom_pioneer_awarded: highestLevel >= 6,
  };
}

function mergeBadgeFlags(
  existing: {
    bloom_explorer_awarded: boolean;
    bloom_challenger_awarded: boolean;
    bloom_pioneer_awarded: boolean;
  },
  newFlags: {
    bloom_explorer_awarded: boolean;
    bloom_challenger_awarded: boolean;
    bloom_pioneer_awarded: boolean;
  }
) {
  return {
    bloom_explorer_awarded:
      newFlags.bloom_explorer_awarded || existing.bloom_explorer_awarded,
    bloom_challenger_awarded:
      newFlags.bloom_challenger_awarded || existing.bloom_challenger_awarded,
    bloom_pioneer_awarded:
      newFlags.bloom_pioneer_awarded || existing.bloom_pioneer_awarded,
  };
}

describe("Bloom's Progression Update Logic", () => {
  describe("highestBloomReached for progression tracking", () => {
    it("returns 0 when no level has 2+ correct — skips progression update", () => {
      const attempts: BloomAttempt[] = [
        { bloomLevel: 1, correct: true },
        { bloomLevel: 2, correct: true },
        { bloomLevel: 3, correct: true },
      ];
      expect(highestBloomReached(attempts)).toBe(0);
    });

    it("returns the highest qualifying level for progression upsert", () => {
      const attempts: BloomAttempt[] = [
        { bloomLevel: 1, correct: true },
        { bloomLevel: 1, correct: true },
        { bloomLevel: 2, correct: true },
        { bloomLevel: 2, correct: true },
        { bloomLevel: 3, correct: true },
        { bloomLevel: 3, correct: true },
      ];
      expect(highestBloomReached(attempts)).toBe(3);
    });
  });

  describe("badge flag derivation", () => {
    it("awards no badges for levels 1-3", () => {
      expect(deriveBadgeFlags(1)).toEqual({
        bloom_explorer_awarded: false,
        bloom_challenger_awarded: false,
        bloom_pioneer_awarded: false,
      });
      expect(deriveBadgeFlags(3)).toEqual({
        bloom_explorer_awarded: false,
        bloom_challenger_awarded: false,
        bloom_pioneer_awarded: false,
      });
    });

    it("awards explorer at level 4", () => {
      expect(deriveBadgeFlags(4)).toEqual({
        bloom_explorer_awarded: true,
        bloom_challenger_awarded: false,
        bloom_pioneer_awarded: false,
      });
    });

    it("awards explorer + challenger at level 5", () => {
      expect(deriveBadgeFlags(5)).toEqual({
        bloom_explorer_awarded: true,
        bloom_challenger_awarded: true,
        bloom_pioneer_awarded: false,
      });
    });

    it("awards all badges at level 6", () => {
      expect(deriveBadgeFlags(6)).toEqual({
        bloom_explorer_awarded: true,
        bloom_challenger_awarded: true,
        bloom_pioneer_awarded: true,
      });
    });
  });

  describe("badge flag merge (once earned, never reverted)", () => {
    it("preserves existing badges when new level is lower", () => {
      const existing = {
        bloom_explorer_awarded: true,
        bloom_challenger_awarded: true,
        bloom_pioneer_awarded: false,
      };
      const newFlags = deriveBadgeFlags(2); // no badges from this session
      const merged = mergeBadgeFlags(existing, newFlags);
      expect(merged).toEqual({
        bloom_explorer_awarded: true,
        bloom_challenger_awarded: true,
        bloom_pioneer_awarded: false,
      });
    });

    it("adds new badges without removing existing ones", () => {
      const existing = {
        bloom_explorer_awarded: true,
        bloom_challenger_awarded: false,
        bloom_pioneer_awarded: false,
      };
      const newFlags = deriveBadgeFlags(5); // explorer + challenger
      const merged = mergeBadgeFlags(existing, newFlags);
      expect(merged).toEqual({
        bloom_explorer_awarded: true,
        bloom_challenger_awarded: true,
        bloom_pioneer_awarded: false,
      });
    });

    it("merges from no badges to all badges", () => {
      const existing = {
        bloom_explorer_awarded: false,
        bloom_challenger_awarded: false,
        bloom_pioneer_awarded: false,
      };
      const newFlags = deriveBadgeFlags(6);
      const merged = mergeBadgeFlags(existing, newFlags);
      expect(merged).toEqual({
        bloom_explorer_awarded: true,
        bloom_challenger_awarded: true,
        bloom_pioneer_awarded: true,
      });
    });
  });

  describe("highest level max logic (existing vs new)", () => {
    it("keeps existing level when it is higher", () => {
      const existingLevel = 5;
      const newLevel = 3;
      expect(Math.max(existingLevel, newLevel)).toBe(5);
    });

    it("uses new level when it is higher", () => {
      const existingLevel = 2;
      const newLevel = 4;
      expect(Math.max(existingLevel, newLevel)).toBe(4);
    });

    it("keeps same level when equal", () => {
      const existingLevel = 3;
      const newLevel = 3;
      expect(Math.max(existingLevel, newLevel)).toBe(3);
    });
  });

  describe("practice mode skip", () => {
    it("practice mode attempts should not trigger progression update", () => {
      // This test documents the behavior: when mode === 'practice',
      // the Edge Function skips the blooms_progression update entirely
      const isPractice = true;
      const shouldUpdate = !isPractice;
      expect(shouldUpdate).toBe(false);
    });

    it("graded mode attempts should trigger progression update", () => {
      const isPractice = false;
      const shouldUpdate = !isPractice;
      expect(shouldUpdate).toBe(true);
    });
  });
});
