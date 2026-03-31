// =============================================================================
// personalBestLeaderboard — Unit tests
// =============================================================================

import { describe, it, expect } from 'vitest';
import { computeWeeklyXP, getISOWeekStart } from '@/lib/personalBestLeaderboard';

describe('getISOWeekStart', () => {
  it('returns Monday for a Wednesday', () => {
    // Use UTC dates to match the UTC-based implementation
    const wed = new Date(Date.UTC(2025, 6, 23)); // July 23, 2025 is a Wednesday (UTC)
    const result = getISOWeekStart(wed);
    expect(result.getUTCDay()).toBe(1); // Monday
    expect(result.getUTCFullYear()).toBe(2025);
    expect(result.getUTCMonth()).toBe(6); // July
    expect(result.getUTCDate()).toBe(21);
  });

  it('returns Monday for a Monday', () => {
    const mon = new Date(Date.UTC(2025, 6, 21)); // July 21, 2025 is a Monday (UTC)
    const result = getISOWeekStart(mon);
    expect(result.getUTCDay()).toBe(1);
    expect(result.getUTCDate()).toBe(21);
  });

  it('returns Monday for a Sunday', () => {
    const sun = new Date(Date.UTC(2025, 6, 27)); // July 27, 2025 is a Sunday (UTC)
    const result = getISOWeekStart(sun);
    expect(result.getUTCDay()).toBe(1);
    expect(result.getUTCDate()).toBe(21);
  });
});

describe('computeWeeklyXP', () => {
  // Use UTC dates to match the UTC-based implementation
  const refDate = new Date(Date.UTC(2025, 6, 23, 12, 0, 0)); // July 23, 2025 Wednesday UTC

  it('returns 8 weeks of data', () => {
    const result = computeWeeklyXP([], refDate);
    expect(result).toHaveLength(8);
  });

  it('marks the last week as current week', () => {
    const result = computeWeeklyXP([], refDate);
    expect(result[7].isCurrentWeek).toBe(true);
    expect(result[0].isCurrentWeek).toBe(false);
  });

  it('correctly sums XP for each week', () => {
    // Current week starts Monday July 21, 2025
    const mon = new Date(Date.UTC(2025, 6, 21, 10, 0, 0));
    const tue = new Date(Date.UTC(2025, 6, 22, 10, 0, 0));
    const prevWeek = new Date(Date.UTC(2025, 6, 15, 10, 0, 0));

    const transactions = [
      { xp_amount: 50, created_at: mon.toISOString() },
      { xp_amount: 30, created_at: tue.toISOString() },
      { xp_amount: 100, created_at: prevWeek.toISOString() },
    ];

    const result = computeWeeklyXP(transactions, refDate);
    expect(result[7].xp).toBe(80);
    expect(result[6].xp).toBe(100);
  });

  it('marks the week with highest XP as personal best', () => {
    const mon = new Date(Date.UTC(2025, 6, 21, 10, 0, 0));
    const prevWeek = new Date(Date.UTC(2025, 6, 15, 10, 0, 0));

    const transactions = [
      { xp_amount: 50, created_at: mon.toISOString() },
      { xp_amount: 200, created_at: prevWeek.toISOString() },
    ];

    const result = computeWeeklyXP(transactions, refDate);
    const bestWeek = result.find((w) => w.isPersonalBest);
    expect(bestWeek).toBeDefined();
    expect(bestWeek!.xp).toBe(200);
  });

  it('does not mark personal best when all weeks have 0 XP', () => {
    const result = computeWeeklyXP([], refDate);
    const bestWeek = result.find((w) => w.isPersonalBest);
    expect(bestWeek).toBeUndefined();
  });

  it('marks exactly one week as personal best', () => {
    const mon = new Date(Date.UTC(2025, 6, 21, 10, 0, 0));
    const prevWeek = new Date(Date.UTC(2025, 6, 15, 10, 0, 0));

    const transactions = [
      { xp_amount: 100, created_at: mon.toISOString() },
      { xp_amount: 100, created_at: prevWeek.toISOString() },
    ];

    const result = computeWeeklyXP(transactions, refDate);
    const bestWeeks = result.filter((w) => w.isPersonalBest);
    expect(bestWeeks).toHaveLength(1);
  });
});
