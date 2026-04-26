import { describe, it, expect } from 'vitest';
import { generateReviewDates, isReviewCycleComplete } from '@/lib/plannerUtils';

describe('generateReviewDates', () => {
  it('generates 3 review dates at 1, 3, and 7 day intervals', () => {
    const dates = generateReviewDates('2026-04-10');
    expect(dates).toHaveLength(3);
    expect(dates[0]).toEqual({ reviewDate: '2026-04-11', intervalDays: 1 });
    expect(dates[1]).toEqual({ reviewDate: '2026-04-13', intervalDays: 3 });
    expect(dates[2]).toEqual({ reviewDate: '2026-04-17', intervalDays: 7 });
  });

  it('handles month boundaries correctly', () => {
    const dates = generateReviewDates('2026-04-29');
    expect(dates[0]!.reviewDate).toBe('2026-04-30');
    expect(dates[1]!.reviewDate).toBe('2026-05-02');
    expect(dates[2]!.reviewDate).toBe('2026-05-06');
  });

  it('handles year boundaries correctly', () => {
    const dates = generateReviewDates('2026-12-28');
    expect(dates[0]!.reviewDate).toBe('2026-12-29');
    expect(dates[1]!.reviewDate).toBe('2026-12-31');
    expect(dates[2]!.reviewDate).toBe('2027-01-04');
  });
});

describe('isReviewCycleComplete', () => {
  it('returns true when all 3 intervals are completed', () => {
    const reviews = [
      { intervalDays: 1, status: 'completed' },
      { intervalDays: 3, status: 'completed' },
      { intervalDays: 7, status: 'completed' },
    ];
    expect(isReviewCycleComplete(reviews)).toBe(true);
  });

  it('returns false when only some intervals are completed', () => {
    const reviews = [
      { intervalDays: 1, status: 'completed' },
      { intervalDays: 3, status: 'pending' },
      { intervalDays: 7, status: 'completed' },
    ];
    expect(isReviewCycleComplete(reviews)).toBe(false);
  });

  it('returns false when no intervals are completed', () => {
    const reviews = [
      { intervalDays: 1, status: 'pending' },
      { intervalDays: 3, status: 'pending' },
      { intervalDays: 7, status: 'pending' },
    ];
    expect(isReviewCycleComplete(reviews)).toBe(false);
  });

  it('returns false for empty array', () => {
    expect(isReviewCycleComplete([])).toBe(false);
  });

  it('ignores skipped reviews', () => {
    const reviews = [
      { intervalDays: 1, status: 'completed' },
      { intervalDays: 3, status: 'skipped' },
      { intervalDays: 7, status: 'completed' },
    ];
    expect(isReviewCycleComplete(reviews)).toBe(false);
  });
});
