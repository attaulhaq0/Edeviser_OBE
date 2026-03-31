// =============================================================================
// mostImprovedLeaderboard — Unit tests
// =============================================================================

import { describe, it, expect } from 'vitest';
import { calculateImprovement, rankMostImproved } from '@/lib/mostImprovedLeaderboard';

describe('calculateImprovement', () => {
  it('calculates positive improvement correctly', () => {
    expect(calculateImprovement(300, 200)).toBe(50);
  });

  it('calculates negative improvement correctly', () => {
    expect(calculateImprovement(100, 200)).toBe(-50);
  });

  it('returns null for zero previous XP', () => {
    expect(calculateImprovement(100, 0)).toBeNull();
  });

  it('returns null for negative previous XP', () => {
    expect(calculateImprovement(100, -10)).toBeNull();
  });

  it('returns 0 for equal current and previous', () => {
    expect(calculateImprovement(200, 200)).toBe(0);
  });

  it('handles large improvement percentages', () => {
    expect(calculateImprovement(1000, 10)).toBe(9900);
  });
});

describe('rankMostImproved', () => {
  it('returns top 20 sorted by improvement percentage', () => {
    const entries = Array.from({ length: 25 }, (_, i) => ({
      student_id: `s${i}`,
      student_name: `Student ${i}`,
      current_4_week_xp: 200 + i * 10,
      previous_4_week_xp: 100,
    }));

    const result = rankMostImproved(entries);
    expect(result).toHaveLength(20);
    // First entry should have highest improvement
    expect(result[0].improvement_percent).toBeGreaterThan(result[1].improvement_percent);
  });

  it('excludes students with zero previous XP', () => {
    const entries = [
      { student_id: 's1', student_name: 'A', current_4_week_xp: 500, previous_4_week_xp: 0 },
      { student_id: 's2', student_name: 'B', current_4_week_xp: 300, previous_4_week_xp: 200 },
    ];

    const result = rankMostImproved(entries);
    expect(result).toHaveLength(1);
    expect(result[0].student_id).toBe('s2');
  });

  it('calculates xp_delta correctly', () => {
    const entries = [
      { student_id: 's1', student_name: 'A', current_4_week_xp: 500, previous_4_week_xp: 200 },
    ];

    const result = rankMostImproved(entries);
    expect(result[0].xp_delta).toBe(300);
  });

  it('returns empty array when all students have zero previous XP', () => {
    const entries = [
      { student_id: 's1', student_name: 'A', current_4_week_xp: 500, previous_4_week_xp: 0 },
      { student_id: 's2', student_name: 'B', current_4_week_xp: 300, previous_4_week_xp: 0 },
    ];

    const result = rankMostImproved(entries);
    expect(result).toHaveLength(0);
  });

  it('rounds improvement percentage to 2 decimal places', () => {
    const entries = [
      { student_id: 's1', student_name: 'A', current_4_week_xp: 333, previous_4_week_xp: 200 },
    ];

    const result = rankMostImproved(entries);
    // (333 - 200) / 200 * 100 = 66.5
    expect(result[0].improvement_percent).toBe(66.5);
  });
});
