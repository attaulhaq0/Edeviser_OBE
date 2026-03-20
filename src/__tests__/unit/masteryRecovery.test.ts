// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import {
  countMasteryFailures,
  shouldActivateRecovery,
  recoveryBloomLevel,
  isRecoveryComplete,
} from '@/lib/masteryRecovery';

// ── countMasteryFailures ────────────────────────────────────────────

describe('countMasteryFailures', () => {
  it('returns 0 for empty attempts array', () => {
    expect(countMasteryFailures([], 'clo-1')).toBe(0);
  });

  it('returns 0 when all attempts are above threshold', () => {
    const attempts = [
      { clo_scores: { 'clo-1': 80 } },
      { clo_scores: { 'clo-1': 90 } },
    ];
    expect(countMasteryFailures(attempts, 'clo-1')).toBe(0);
  });

  it('counts attempts below default 70% threshold', () => {
    const attempts = [
      { clo_scores: { 'clo-1': 60 } },
      { clo_scores: { 'clo-1': 80 } },
      { clo_scores: { 'clo-1': 50 } },
    ];
    expect(countMasteryFailures(attempts, 'clo-1')).toBe(2);
  });

  it('treats missing CLO score as 0 (below threshold)', () => {
    const attempts = [
      { clo_scores: { 'clo-2': 90 } },
    ];
    expect(countMasteryFailures(attempts, 'clo-1')).toBe(1);
  });

  it('uses custom mastery threshold', () => {
    const attempts = [
      { clo_scores: { 'clo-1': 75 } },
      { clo_scores: { 'clo-1': 85 } },
    ];
    expect(countMasteryFailures(attempts, 'clo-1', 80)).toBe(1);
  });

  it('score exactly at threshold is not a failure', () => {
    const attempts = [
      { clo_scores: { 'clo-1': 70 } },
    ];
    expect(countMasteryFailures(attempts, 'clo-1')).toBe(0);
  });

  it('score just below threshold is a failure', () => {
    const attempts = [
      { clo_scores: { 'clo-1': 69 } },
    ];
    expect(countMasteryFailures(attempts, 'clo-1')).toBe(1);
  });

  it('only counts failures for the specified CLO', () => {
    const attempts = [
      { clo_scores: { 'clo-1': 50, 'clo-2': 90 } },
      { clo_scores: { 'clo-1': 80, 'clo-2': 40 } },
    ];
    expect(countMasteryFailures(attempts, 'clo-1')).toBe(1);
    expect(countMasteryFailures(attempts, 'clo-2')).toBe(1);
  });
});

// ── shouldActivateRecovery ──────────────────────────────────────────

describe('shouldActivateRecovery', () => {
  it('returns false for 0 failures', () => {
    expect(shouldActivateRecovery(0)).toBe(false);
  });

  it('returns false for 1 failure', () => {
    expect(shouldActivateRecovery(1)).toBe(false);
  });

  it('returns true for exactly 2 failures (default threshold)', () => {
    expect(shouldActivateRecovery(2)).toBe(true);
  });

  it('returns true for more than 2 failures', () => {
    expect(shouldActivateRecovery(5)).toBe(true);
  });

  it('supports custom threshold', () => {
    expect(shouldActivateRecovery(2, 3)).toBe(false);
    expect(shouldActivateRecovery(3, 3)).toBe(true);
  });
});

// ── recoveryBloomLevel ──────────────────────────────────────────────

describe('recoveryBloomLevel', () => {
  it('returns 1 for Remembering (level 1) — floored at 1', () => {
    expect(recoveryBloomLevel(1)).toBe(1);
  });

  it('returns 1 for Understanding (level 2)', () => {
    expect(recoveryBloomLevel(2)).toBe(1);
  });

  it('returns 2 for Applying (level 3)', () => {
    expect(recoveryBloomLevel(3)).toBe(2);
  });

  it('returns 3 for Analyzing (level 4)', () => {
    expect(recoveryBloomLevel(4)).toBe(3);
  });

  it('returns 4 for Evaluating (level 5)', () => {
    expect(recoveryBloomLevel(5)).toBe(4);
  });

  it('returns 5 for Creating (level 6)', () => {
    expect(recoveryBloomLevel(6)).toBe(5);
  });
});

// ── isRecoveryComplete ──────────────────────────────────────────────

describe('isRecoveryComplete', () => {
  it('returns false when neither step is completed', () => {
    expect(isRecoveryComplete({ ai_tutor_completed: false, practice_completed: false })).toBe(false);
  });

  it('returns false when only AI Tutor is completed', () => {
    expect(isRecoveryComplete({ ai_tutor_completed: true, practice_completed: false })).toBe(false);
  });

  it('returns false when only practice is completed', () => {
    expect(isRecoveryComplete({ ai_tutor_completed: false, practice_completed: true })).toBe(false);
  });

  it('returns true when both steps are completed', () => {
    expect(isRecoveryComplete({ ai_tutor_completed: true, practice_completed: true })).toBe(true);
  });
});
