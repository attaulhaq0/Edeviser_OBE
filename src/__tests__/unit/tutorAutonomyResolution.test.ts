import { describe, it, expect } from 'vitest';
import {
  resolveAutonomyLevel,
  isValidAutonomyLevel,
  DEFAULT_AUTONOMY_LEVEL,
  AUTONOMY_LABELS,
  AUTONOMY_DESCRIPTIONS,
} from '@/lib/tutorAutonomy';

describe('tutorAutonomyResolution', () => {
  // ─── Null assignment level ──────────────────────────────────────────────

  describe('null assignment level', () => {
    it('falls back to CLO level when assignment level is null', () => {
      expect(resolveAutonomyLevel(null, 'L1')).toBe('L1');
      expect(resolveAutonomyLevel(null, 'L2')).toBe('L2');
      expect(resolveAutonomyLevel(null, 'L3')).toBe('L3');
    });

    it('falls back to CLO level with undefined assignment level', () => {
      expect(resolveAutonomyLevel(undefined, 'L3')).toBe('L3');
    });
  });

  // ─── Null CLO level ────────────────────────────────────────────────────

  describe('null CLO level', () => {
    it('uses assignment level when CLO level is null', () => {
      expect(resolveAutonomyLevel('L1', null)).toBe('L1');
      expect(resolveAutonomyLevel('L3', null)).toBe('L3');
    });

    it('uses assignment level when CLO level is undefined', () => {
      expect(resolveAutonomyLevel('L2', undefined)).toBe('L2');
    });
  });

  // ─── Both null ─────────────────────────────────────────────────────────

  describe('both null', () => {
    it('defaults to L2 when both assignment and CLO levels are null', () => {
      expect(resolveAutonomyLevel(null, null)).toBe('L2');
    });

    it('defaults to L2 when both are undefined', () => {
      expect(resolveAutonomyLevel(undefined, undefined)).toBe('L2');
    });

    it('defaults to L2 when called with no arguments', () => {
      expect(resolveAutonomyLevel()).toBe('L2');
    });

    it('DEFAULT_AUTONOMY_LEVEL constant is L2', () => {
      expect(DEFAULT_AUTONOMY_LEVEL).toBe('L2');
    });
  });

  // ─── Student override L3 capped by teacher L1 ceiling ─────────────────

  describe('student override L3 capped by teacher L1 ceiling', () => {
    it('caps L3 override to L1 when teacher ceiling is L1', () => {
      expect(resolveAutonomyLevel('L1', null, 'L3')).toBe('L1');
    });

    it('caps L3 override to L2 when teacher ceiling is L2', () => {
      expect(resolveAutonomyLevel('L2', null, 'L3')).toBe('L2');
    });

    it('allows L3 override when teacher ceiling is L3', () => {
      expect(resolveAutonomyLevel('L3', null, 'L3')).toBe('L3');
    });

    it('uses assignment ceiling over CLO ceiling', () => {
      // Assignment is L1, CLO is L3 — assignment takes precedence
      expect(resolveAutonomyLevel('L1', 'L3', 'L3')).toBe('L1');
    });
  });

  // ─── Student override L1 always allowed ────────────────────────────────

  describe('student override L1 always allowed (more restrictive)', () => {
    it('L1 override allowed when teacher ceiling is L1', () => {
      expect(resolveAutonomyLevel('L1', null, 'L1')).toBe('L1');
    });

    it('L1 override allowed when teacher ceiling is L2', () => {
      expect(resolveAutonomyLevel('L2', null, 'L1')).toBe('L1');
    });

    it('L1 override allowed when teacher ceiling is L3', () => {
      expect(resolveAutonomyLevel('L3', null, 'L1')).toBe('L1');
    });

    it('L1 override allowed when both levels are null (default L2 ceiling)', () => {
      expect(resolveAutonomyLevel(null, null, 'L1')).toBe('L1');
    });
  });

  // ─── No student override ──────────────────────────────────────────────

  describe('no student override', () => {
    it('returns teacher ceiling directly when no override', () => {
      expect(resolveAutonomyLevel('L1', null, null)).toBe('L1');
      expect(resolveAutonomyLevel('L2', null, null)).toBe('L2');
      expect(resolveAutonomyLevel('L3', null, null)).toBe('L3');
    });
  });

  // ─── isValidAutonomyLevel ─────────────────────────────────────────────

  describe('isValidAutonomyLevel', () => {
    it('returns true for valid levels', () => {
      expect(isValidAutonomyLevel('L1')).toBe(true);
      expect(isValidAutonomyLevel('L2')).toBe(true);
      expect(isValidAutonomyLevel('L3')).toBe(true);
    });

    it('returns false for invalid values', () => {
      expect(isValidAutonomyLevel('L0')).toBe(false);
      expect(isValidAutonomyLevel('L4')).toBe(false);
      expect(isValidAutonomyLevel('')).toBe(false);
      expect(isValidAutonomyLevel(null)).toBe(false);
      expect(isValidAutonomyLevel(undefined)).toBe(false);
      expect(isValidAutonomyLevel(1)).toBe(false);
    });
  });

  // ─── Labels and descriptions ──────────────────────────────────────────

  describe('labels and descriptions', () => {
    it('has labels for all levels', () => {
      expect(AUTONOMY_LABELS.L1).toBe('Hints Only');
      expect(AUTONOMY_LABELS.L2).toBe('Guided Discovery');
      expect(AUTONOMY_LABELS.L3).toBe('Direct Explanation');
    });

    it('has descriptions for all levels', () => {
      expect(AUTONOMY_DESCRIPTIONS.L1).toContain('hints');
      expect(AUTONOMY_DESCRIPTIONS.L2).toContain('scaffolded');
      expect(AUTONOMY_DESCRIPTIONS.L3).toContain('direct');
    });
  });
});
