// =============================================================================
// Personal Best leaderboard utility (Task 147.1)
// Groups xp_transactions by ISO week for the last 8 weeks, identifies personal best.
// Requirements: 129.1, 129.2
// =============================================================================

export interface WeeklyXP {
  weekStart: string; // ISO week start date (Monday)
  weekLabel: string;
  xp: number;
  isCurrentWeek: boolean;
  isPersonalBest: boolean;
}

/**
 * Get the Monday (ISO week start) for a given date, using UTC.
 */
export function getISOWeekStart(date: Date): Date {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  const day = d.getUTCDay();
  // ISO weeks start on Monday (1). Sunday is 0, so shift it to 7.
  const diff = day === 0 ? 6 : day - 1;
  d.setUTCDate(d.getUTCDate() - diff);
  return d;
}

/**
 * Compute weekly XP totals from xp_transactions for the last 8 ISO weeks.
 * Each week runs Monday 00:00 to Sunday 23:59:59.
 */
export function computeWeeklyXP(
  transactions: Array<{ xp_amount: number; created_at: string }>,
  referenceDate: Date = new Date(),
): WeeklyXP[] {
  const currentWeekStart = getISOWeekStart(referenceDate);

  const weeks: WeeklyXP[] = [];

  for (let i = 7; i >= 0; i--) {
    const weekStart = new Date(currentWeekStart);
    weekStart.setUTCDate(weekStart.getUTCDate() - i * 7);

    const weekEnd = new Date(weekStart);
    weekEnd.setUTCDate(weekEnd.getUTCDate() + 7);

    const weekXP = transactions
      .filter((t) => {
        const d = new Date(t.created_at);
        return d >= weekStart && d < weekEnd;
      })
      .reduce((sum, t) => sum + t.xp_amount, 0);

    weeks.push({
      weekStart: weekStart.toISOString().slice(0, 10),
      weekLabel: `Week ${8 - i}`,
      xp: weekXP,
      isCurrentWeek: i === 0,
      isPersonalBest: false,
    });
  }

  // Mark personal best — exactly one week with the highest XP (first occurrence)
  const maxXP = Math.max(...weeks.map((w) => w.xp));
  if (maxXP > 0) {
    const bestWeek = weeks.find((w) => w.xp === maxXP);
    if (bestWeek) bestWeek.isPersonalBest = true;
  }

  return weeks;
}
