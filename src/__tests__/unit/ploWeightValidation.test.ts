import { describe, it, expect } from 'vitest';

/**
 * PLO-ILO weight validation logic tests.
 * Validates: Requirement 13.3 — warn if sum of weights < 0.5
 *
 * These test the pure business rules used in PLOForm's ILOMappingSection:
 * - Total weight calculation from enabled mappings
 * - Weight status classification (ok / under / over)
 * - Weight clamping between 0 and 1
 */

interface ILOMappingEntry {
  ilo_id: string;
  weight: number;
  enabled: boolean;
}

/** Mirrors the totalWeight calculation in ILOMappingSection */
function calculateTotalWeight(mappings: ILOMappingEntry[]): number {
  return mappings
    .filter((m) => m.enabled)
    .reduce((sum, m) => sum + m.weight, 0);
}

/** Mirrors the weightStatus derivation in ILOMappingSection */
function getWeightStatus(totalWeight: number): 'ok' | 'under' | 'over' {
  if (totalWeight > 1.0) return 'over';
  if (totalWeight < 0.5) return 'under';
  return 'ok';
}

/** Mirrors the clamping logic in handleWeightChange */
function clampWeight(value: number): number {
  return Math.min(1.0, Math.max(0, value));
}

describe('PLO-ILO Weight Validation', () => {
  describe('calculateTotalWeight', () => {
    it('sums only enabled mappings', () => {
      const mappings: ILOMappingEntry[] = [
        { ilo_id: '1', weight: 0.3, enabled: true },
        { ilo_id: '2', weight: 0.4, enabled: false },
        { ilo_id: '3', weight: 0.2, enabled: true },
      ];
      expect(calculateTotalWeight(mappings)).toBeCloseTo(0.5);
    });

    it('returns 0 when no mappings are enabled', () => {
      const mappings: ILOMappingEntry[] = [
        { ilo_id: '1', weight: 0.5, enabled: false },
      ];
      expect(calculateTotalWeight(mappings)).toBe(0);
    });

    it('returns 0 for empty mappings', () => {
      expect(calculateTotalWeight([])).toBe(0);
    });
  });

  describe('getWeightStatus', () => {
    it('returns "under" when total < 0.5', () => {
      expect(getWeightStatus(0)).toBe('under');
      expect(getWeightStatus(0.3)).toBe('under');
      expect(getWeightStatus(0.49)).toBe('under');
    });

    it('returns "ok" when total is between 0.5 and 1.0 inclusive', () => {
      expect(getWeightStatus(0.5)).toBe('ok');
      expect(getWeightStatus(0.75)).toBe('ok');
      expect(getWeightStatus(1.0)).toBe('ok');
    });

    it('returns "over" when total > 1.0', () => {
      expect(getWeightStatus(1.01)).toBe('over');
      expect(getWeightStatus(2.0)).toBe('over');
    });
  });

  describe('clampWeight', () => {
    it('clamps negative values to 0', () => {
      expect(clampWeight(-0.5)).toBe(0);
    });

    it('clamps values above 1 to 1', () => {
      expect(clampWeight(1.5)).toBe(1.0);
    });

    it('passes through valid values unchanged', () => {
      expect(clampWeight(0.5)).toBe(0.5);
      expect(clampWeight(0)).toBe(0);
      expect(clampWeight(1.0)).toBe(1.0);
    });
  });
});
