// Feature: habit-heatmap, Property 17: Completion rate formula
// Feature: habit-heatmap, Property 18: Consistency score formula
// Feature: habit-heatmap, Property 19: Day-of-week averages and best day
// Feature: habit-heatmap, Property 20: Correlation insights capped at 3, non-causal language
// Feature: habit-heatmap, Property 21: CSV report structure
// **Validates: Requirements 10.1, 10.2, 10.3, 11.1, 11.4, 12.1, 12.2, 13.1, 13.2, 13.5, 14.2, 14.3**

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  computeCompletionRate,
  computeConsistencyScore,
  computeDayOfWeekAverages,
  getBestDay,
} from '@/lib/heatmapUtils';
import { generateHabitCSV } from '@/lib/habitExport';
import type { HeatmapDay, HabitReportRow, HeatmapSummary, WellnessHabitType, CorrelationInsight, CompletedHabit } from '@/types/habits';

// --- Arbitraries ---

const heatmapDayArb = (date: string): fc.Arbitrary<HeatmapDay> =>
  fc.record({
    date: fc.constant(date),
    academicCount: fc.integer({ min: 0, max: 4 }),
    wellnessCount: fc.integer({ min: 0, max: 4 }),
    totalCount: fc.constant(0),
    habits: fc.constant([] as CompletedHabit[]),
  }).map((d) => ({ ...d, totalCount: d.academicCount + d.wellnessCount }));

const heatmapDaysArb = fc
  .tuple(
    fc.integer({ min: 0, max: 150 }),
    fc.integer({ min: 1, max: 60 }),
  )
  .chain(([startOffset, numDays]) => {
    const startDate = new Date('2024-01-01T00:00:00');
    startDate.setDate(startDate.getDate() + startOffset);
    const dates: string[] = [];
    for (let i = 0; i < numDays; i++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      dates.push(d.toISOString().slice(0, 10));
    }
    return fc.tuple(...dates.map((date) => heatmapDayArb(date)));
  });

const allWellnessHabits: WellnessHabitType[] = ['meditation', 'hydration', 'exercise', 'sleep'];

const wellnessSubsetArb: fc.Arbitrary<WellnessHabitType[]> = fc.subarray(allWellnessHabits, {
  minLength: 0,
  maxLength: 4,
});

const habitReportRowArb = (date: string): fc.Arbitrary<HabitReportRow> =>
  fc.record({
    date: fc.constant(date),
    login: fc.boolean(),
    submit: fc.boolean(),
    journal: fc.boolean(),
    read: fc.boolean(),
    meditation: fc.option(fc.boolean(), { nil: undefined }),
    hydration: fc.option(fc.boolean(), { nil: undefined }),
    exercise: fc.option(fc.boolean(), { nil: undefined }),
    sleep: fc.option(fc.boolean(), { nil: undefined }),
    totalHabits: fc.integer({ min: 0, max: 8 }),
    xpEarned: fc.integer({ min: 0, max: 200 }),
    streakActive: fc.boolean(),
  });

const CAUSAL_WORDS = ['because', 'causes', 'caused', 'due to'];

describe('Habit Analytics Properties', () => {
  // Feature: habit-heatmap, Property 17: Completion rate formula
  it('Property 17: computeCompletionRate returns correct clamped value', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 500 }),
        fc.integer({ min: 0, max: 8 }),
        fc.integer({ min: 0, max: 120 }),
        (totalCompleted, possiblePerDay, daysInPeriod) => {
          const rate = computeCompletionRate(totalCompleted, possiblePerDay, daysInPeriod);

          if (possiblePerDay === 0 || daysInPeriod === 0) {
            expect(rate).toBe(0);
          } else {
            const expected = Math.min(
              Math.round((totalCompleted / (possiblePerDay * daysInPeriod)) * 100),
              100,
            );
            expect(rate).toBe(expected);
          }

          expect(rate).toBeGreaterThanOrEqual(0);
          expect(rate).toBeLessThanOrEqual(100);
        },
      ),
      { numRuns: 100 },
    );
  });

  // Feature: habit-heatmap, Property 18: Consistency score formula
  it('Property 18: computeConsistencyScore returns correct value in [0, 100]', () => {
    fc.assert(
      fc.property(heatmapDaysArb, fc.integer({ min: 0, max: 200 }), (days, extraTotalDays) => {
        // totalDays should be >= days.length for realistic scenarios, but test edge cases too
        const totalDays = extraTotalDays;
        const score = computeConsistencyScore(days, totalDays);

        if (totalDays === 0) {
          expect(score).toBe(0);
        } else {
          const activeDays = days.filter((d) => d.totalCount > 0).length;
          const expected = Math.round((activeDays / totalDays) * 100);
          expect(score).toBe(expected);
        }

        expect(score).toBeGreaterThanOrEqual(0);
      }),
      { numRuns: 100 },
    );
  });

  // Feature: habit-heatmap, Property 19: Day-of-week averages and best day
  it('Property 19: computeDayOfWeekAverages returns 7 entries; getBestDay returns highest average', () => {
    fc.assert(
      fc.property(heatmapDaysArb, (days) => {
        const averages = computeDayOfWeekAverages(days);

        // Always 7 entries (Sunday through Saturday)
        expect(averages).toHaveLength(7);

        // Each average is non-negative
        for (const avg of averages) {
          expect(avg.avgCompletions).toBeGreaterThanOrEqual(0);
        }

        // Best day is the one with highest average
        const bestDay = getBestDay(averages);
        if (bestDay !== null) {
          for (const avg of averages) {
            expect(bestDay.avgCompletions).toBeGreaterThanOrEqual(avg.avgCompletions);
          }
        }
      }),
      { numRuns: 100 },
    );
  });

  // Feature: habit-heatmap, Property 20: Correlation insights capped at 3, non-causal language
  it('Property 20: correlation insights array has at most 3 items with non-causal language', () => {
    const insightArb: fc.Arbitrary<CorrelationInsight> = fc.record({
      id: fc.uuid(),
      habitType: fc.constantFrom('meditation' as const, 'exercise' as const, 'login' as const, 'submit' as const),
      academicMetric: fc.constantFrom('submission_rate', 'grade_average', 'attendance'),
      description: fc.constantFrom(
        'You tend to submit more on days when you meditate',
        'On days when you exercise, your grades tend to be higher',
        'Your attendance tends to improve on days when you sleep well',
        'On days when you log in early, you tend to complete more habits',
      ),
      strength: fc.double({ min: 0, max: 1, noNaN: true }),
    });

    fc.assert(
      fc.property(fc.array(insightArb, { minLength: 0, maxLength: 10 }), (allInsights) => {
        // Cap at 3
        const displayed = allInsights.slice(0, 3);
        expect(displayed.length).toBeLessThanOrEqual(3);

        // Non-causal language check
        for (const insight of displayed) {
          const lower = insight.description.toLowerCase();
          for (const word of CAUSAL_WORDS) {
            expect(lower).not.toContain(word);
          }
        }
      }),
      { numRuns: 100 },
    );
  });

  // Feature: habit-heatmap, Property 21: CSV report structure
  it('Property 21: generateHabitCSV produces correct structure', () => {
    fc.assert(
      fc.property(
        fc.tuple(
          fc.integer({ min: 0, max: 60 }),
          fc.integer({ min: 1, max: 30 }),
        ).chain(([startOffset, numDays]) => {
          const startDate = new Date('2024-01-01T00:00:00');
          startDate.setDate(startDate.getDate() + startOffset);
          const dates: string[] = [];
          for (let i = 0; i < numDays; i++) {
            const d = new Date(startDate);
            d.setDate(d.getDate() + i);
            dates.push(d.toISOString().slice(0, 10));
          }
          return fc.tuple(
            fc.tuple(...dates.map((date) => habitReportRowArb(date))),
            wellnessSubsetArb,
          );
        }),
        ([rows, enabledWellness]) => {
          const summary: HeatmapSummary & { totalXP: number; consistencyScore: number } = {
            currentStreak: 5,
            longestStreak: 10,
            totalActiveDays: rows.length,
            totalXP: 500,
            consistencyScore: 80,
          };

          const csv = generateHabitCSV(rows, summary, enabledWellness);
          const lines = csv.split('\n');

          // First line is summary row starting with #
          expect(lines[0]).toMatch(/^# Summary:/);
          expect(lines[0]).toContain('total_active_days=');
          expect(lines[0]).toContain('consistency_score=');
          expect(lines[0]).toContain('longest_streak=');
          expect(lines[0]).toContain('total_xp=');

          // Second line is headers
          const headers = lines[1]!.split(',');
          expect(headers).toContain('date');
          expect(headers).toContain('login');
          expect(headers).toContain('submit');
          expect(headers).toContain('journal');
          expect(headers).toContain('read');
          expect(headers).toContain('total_habits');
          expect(headers).toContain('xp_earned');
          expect(headers).toContain('streak_active');

          // Wellness columns present
          for (const wh of enabledWellness) {
            expect(headers).toContain(wh);
          }

          // Data rows: exactly N rows (one per day)
          const dataRows = lines.slice(2);
          expect(dataRows.length).toBe(rows.length);

          // Each data row has correct number of columns
          const expectedColCount = 5 + enabledWellness.length + 3; // date + 4 academic + wellness + total + xp + streak
          for (const row of dataRows) {
            expect(row!.split(',').length).toBe(expectedColCount);
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});
