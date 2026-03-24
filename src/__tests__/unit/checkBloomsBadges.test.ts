import { describe, it, expect } from 'vitest';

/**
 * Tests for the Bloom's badge check logic integrated into the
 * check-badges Edge Function (Task 17.9).
 *
 * The Edge Function queries blooms_progression for the student and
 * checks badge flags:
 *   - bloom_explorer_awarded = true → award "bloom_explorer" badge
 *   - bloom_challenger_awarded = true → award "bloom_challenger" badge
 *   - bloom_pioneer_awarded = true → award "bloom_pioneer" badge
 *
 * Badge checks are idempotent — existing badges in student_badges are
 * skipped. The function mirrors the logic in checkBloomsBadges().
 */

// ── Pure logic extracted from the Edge Function ─────────────────────

interface BloomsProgressionRow {
  bloom_explorer_awarded: boolean;
  bloom_challenger_awarded: boolean;
  bloom_pioneer_awarded: boolean;
}

/**
 * Determines which Bloom's badges should be awarded based on
 * blooms_progression rows and existing badge IDs.
 * Mirrors the checkBloomsBadges function in check-badges/index.ts.
 */
function deriveBloomsBadges(
  progressions: BloomsProgressionRow[],
  existingBadgeIds: Set<string>,
): string[] {
  const newBadges: string[] = [];

  if (
    existingBadgeIds.has('bloom_explorer') &&
    existingBadgeIds.has('bloom_challenger') &&
    existingBadgeIds.has('bloom_pioneer')
  ) {
    return newBadges;
  }

  if (!progressions || progressions.length === 0) return newBadges;

  let hasExplorer = false;
  let hasChallenger = false;
  let hasPioneer = false;

  for (const row of progressions) {
    if (row.bloom_explorer_awarded) hasExplorer = true;
    if (row.bloom_challenger_awarded) hasChallenger = true;
    if (row.bloom_pioneer_awarded) hasPioneer = true;
  }

  if (hasExplorer && !existingBadgeIds.has('bloom_explorer')) {
    newBadges.push('bloom_explorer');
  }
  if (hasChallenger && !existingBadgeIds.has('bloom_challenger')) {
    newBadges.push('bloom_challenger');
  }
  if (hasPioneer && !existingBadgeIds.has('bloom_pioneer')) {
    newBadges.push('bloom_pioneer');
  }

  return newBadges;
}

describe("Bloom's Badge Check Logic (check-badges Edge Function)", () => {
  describe('deriveBloomsBadges', () => {
    it('returns empty when no progression rows exist', () => {
      const result = deriveBloomsBadges([], new Set());
      expect(result).toEqual([]);
    });

    it('awards bloom_explorer when explorer flag is set', () => {
      const progressions: BloomsProgressionRow[] = [
        { bloom_explorer_awarded: true, bloom_challenger_awarded: false, bloom_pioneer_awarded: false },
      ];
      const result = deriveBloomsBadges(progressions, new Set());
      expect(result).toEqual(['bloom_explorer']);
    });

    it('awards bloom_challenger when challenger flag is set', () => {
      const progressions: BloomsProgressionRow[] = [
        { bloom_explorer_awarded: false, bloom_challenger_awarded: true, bloom_pioneer_awarded: false },
      ];
      const result = deriveBloomsBadges(progressions, new Set());
      expect(result).toEqual(['bloom_challenger']);
    });

    it('awards bloom_pioneer when pioneer flag is set', () => {
      const progressions: BloomsProgressionRow[] = [
        { bloom_explorer_awarded: false, bloom_challenger_awarded: false, bloom_pioneer_awarded: true },
      ];
      const result = deriveBloomsBadges(progressions, new Set());
      expect(result).toEqual(['bloom_pioneer']);
    });

    it('awards all three badges when all flags are set', () => {
      const progressions: BloomsProgressionRow[] = [
        { bloom_explorer_awarded: true, bloom_challenger_awarded: true, bloom_pioneer_awarded: true },
      ];
      const result = deriveBloomsBadges(progressions, new Set());
      expect(result).toEqual(['bloom_explorer', 'bloom_challenger', 'bloom_pioneer']);
    });

    it('skips badges that already exist in student_badges', () => {
      const progressions: BloomsProgressionRow[] = [
        { bloom_explorer_awarded: true, bloom_challenger_awarded: true, bloom_pioneer_awarded: true },
      ];
      const existing = new Set(['bloom_explorer', 'bloom_challenger']);
      const result = deriveBloomsBadges(progressions, existing);
      expect(result).toEqual(['bloom_pioneer']);
    });

    it('returns empty when all badges already awarded (early exit)', () => {
      const progressions: BloomsProgressionRow[] = [
        { bloom_explorer_awarded: true, bloom_challenger_awarded: true, bloom_pioneer_awarded: true },
      ];
      const existing = new Set(['bloom_explorer', 'bloom_challenger', 'bloom_pioneer']);
      const result = deriveBloomsBadges(progressions, existing);
      expect(result).toEqual([]);
    });

    it('aggregates flags across multiple CLO progression rows', () => {
      const progressions: BloomsProgressionRow[] = [
        { bloom_explorer_awarded: true, bloom_challenger_awarded: false, bloom_pioneer_awarded: false },
        { bloom_explorer_awarded: false, bloom_challenger_awarded: true, bloom_pioneer_awarded: false },
        { bloom_explorer_awarded: false, bloom_challenger_awarded: false, bloom_pioneer_awarded: true },
      ];
      const result = deriveBloomsBadges(progressions, new Set());
      expect(result).toEqual(['bloom_explorer', 'bloom_challenger', 'bloom_pioneer']);
    });

    it('handles rows where no flags are set', () => {
      const progressions: BloomsProgressionRow[] = [
        { bloom_explorer_awarded: false, bloom_challenger_awarded: false, bloom_pioneer_awarded: false },
        { bloom_explorer_awarded: false, bloom_challenger_awarded: false, bloom_pioneer_awarded: false },
      ];
      const result = deriveBloomsBadges(progressions, new Set());
      expect(result).toEqual([]);
    });

    it('is idempotent — calling twice with same data returns same result', () => {
      const progressions: BloomsProgressionRow[] = [
        { bloom_explorer_awarded: true, bloom_challenger_awarded: true, bloom_pioneer_awarded: false },
      ];
      const existing = new Set<string>();
      const first = deriveBloomsBadges(progressions, existing);
      const second = deriveBloomsBadges(progressions, existing);
      expect(first).toEqual(second);
    });

    it('does not award explorer if only challenger is flagged', () => {
      const progressions: BloomsProgressionRow[] = [
        { bloom_explorer_awarded: false, bloom_challenger_awarded: true, bloom_pioneer_awarded: false },
      ];
      const result = deriveBloomsBadges(progressions, new Set());
      expect(result).not.toContain('bloom_explorer');
      expect(result).toContain('bloom_challenger');
    });
  });
});
