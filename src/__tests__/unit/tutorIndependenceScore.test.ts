import { describe, it, expect } from 'vitest';
import {
  calculateIndependenceScore,
  classifyIndependenceScore,
} from '@/lib/independenceCalculator';

describe('tutorIndependenceScore', () => {
  // ─── Zero submissions returns 1.0 ─────────────────────────────────────

  describe('zero submissions', () => {
    it('returns 1.0 for zero total submissions', () => {
      expect(
        calculateIndependenceScore({ totalSubmissions: 0, aiAssistedSubmissions: 0 }),
      ).toBe(1.0);
    });

    it('returns 1.0 for negative total submissions', () => {
      expect(
        calculateIndependenceScore({ totalSubmissions: -1, aiAssistedSubmissions: 0 }),
      ).toBe(1.0);
    });

    it('returns 1.0 for zero total even with non-zero AI-assisted', () => {
      expect(
        calculateIndependenceScore({ totalSubmissions: 0, aiAssistedSubmissions: 5 }),
      ).toBe(1.0);
    });
  });

  // ─── All AI-assisted returns 0.0 ──────────────────────────────────────

  describe('all AI-assisted', () => {
    it('returns 0.0 when all submissions are AI-assisted', () => {
      expect(
        calculateIndependenceScore({ totalSubmissions: 10, aiAssistedSubmissions: 10 }),
      ).toBe(0);
    });

    it('returns 0.0 for single AI-assisted submission', () => {
      expect(
        calculateIndependenceScore({ totalSubmissions: 1, aiAssistedSubmissions: 1 }),
      ).toBe(0);
    });

    it('clamps AI-assisted to total when AI-assisted exceeds total', () => {
      const score = calculateIndependenceScore({
        totalSubmissions: 5,
        aiAssistedSubmissions: 10,
      });
      expect(score).toBe(0);
    });
  });

  // ─── No AI-assisted returns 1.0 ───────────────────────────────────────

  describe('no AI-assisted', () => {
    it('returns 1.0 when no submissions are AI-assisted', () => {
      expect(
        calculateIndependenceScore({ totalSubmissions: 10, aiAssistedSubmissions: 0 }),
      ).toBe(1.0);
    });

    it('returns 1.0 for single independent submission', () => {
      expect(
        calculateIndependenceScore({ totalSubmissions: 1, aiAssistedSubmissions: 0 }),
      ).toBe(1.0);
    });

    it('returns 1.0 for many independent submissions', () => {
      expect(
        calculateIndependenceScore({ totalSubmissions: 100, aiAssistedSubmissions: 0 }),
      ).toBe(1.0);
    });
  });

  // ─── Mixed submissions ────────────────────────────────────────────────

  describe('mixed submissions', () => {
    it('returns 0.5 for half AI-assisted', () => {
      expect(
        calculateIndependenceScore({ totalSubmissions: 10, aiAssistedSubmissions: 5 }),
      ).toBe(0.5);
    });

    it('returns 0.8 for 20% AI-assisted', () => {
      expect(
        calculateIndependenceScore({ totalSubmissions: 10, aiAssistedSubmissions: 2 }),
      ).toBeCloseTo(0.8);
    });

    it('returns 0.7 for 30% AI-assisted', () => {
      expect(
        calculateIndependenceScore({ totalSubmissions: 10, aiAssistedSubmissions: 3 }),
      ).toBeCloseTo(0.7);
    });

    it('returns correct score for 1 out of 4 AI-assisted', () => {
      expect(
        calculateIndependenceScore({ totalSubmissions: 4, aiAssistedSubmissions: 1 }),
      ).toBe(0.75);
    });

    it('handles negative AI-assisted by clamping to 0', () => {
      const score = calculateIndependenceScore({
        totalSubmissions: 10,
        aiAssistedSubmissions: -5,
      });
      expect(score).toBe(1.0);
    });
  });

  // ─── classifyIndependenceScore color coding ───────────────────────────

  describe('classifyIndependenceScore', () => {
    it('returns green for score ≥ 0.7', () => {
      expect(classifyIndependenceScore(0.7)).toBe('green');
      expect(classifyIndependenceScore(0.85)).toBe('green');
      expect(classifyIndependenceScore(1.0)).toBe('green');
    });

    it('returns yellow for score 0.4–0.69', () => {
      expect(classifyIndependenceScore(0.4)).toBe('yellow');
      expect(classifyIndependenceScore(0.5)).toBe('yellow');
      expect(classifyIndependenceScore(0.69)).toBe('yellow');
    });

    it('returns red for score < 0.4', () => {
      expect(classifyIndependenceScore(0.0)).toBe('red');
      expect(classifyIndependenceScore(0.2)).toBe('red');
      expect(classifyIndependenceScore(0.39)).toBe('red');
    });

    it('boundary: 0.7 is green', () => {
      expect(classifyIndependenceScore(0.7)).toBe('green');
    });

    it('boundary: 0.4 is yellow', () => {
      expect(classifyIndependenceScore(0.4)).toBe('yellow');
    });

    it('boundary: 0.0 is red', () => {
      expect(classifyIndependenceScore(0.0)).toBe('red');
    });
  });
});
