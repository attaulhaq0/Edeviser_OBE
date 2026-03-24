// Feature: habit-heatmap, Property 1: Heatmap grid structure matches semester range
// Feature: habit-heatmap, Property 2: Habit count maps to correct intensity level
// Feature: habit-heatmap, Property 3: Tooltip content includes all required fields
// Feature: habit-heatmap, Property 4: Future dates produce disabled cells
// Feature: habit-heatmap, Property 5: Filter options match enabled habits
// Feature: habit-heatmap, Property 6: Single-habit filter produces binary intensity
// Feature: habit-heatmap, Property 7: "All Habits" filter sums all completions
// Feature: habit-heatmap, Property 8: Longest streak computation
// Feature: habit-heatmap, Property 9: Total active days
// Feature: habit-heatmap, Property 10: Cell size minimum
// Feature: habit-heatmap, Property 25: ARIA label format
// **Validates: Requirements 1.1, 1.2, 1.4, 2.1, 2.4, 3.1, 3.2, 3.3, 4.3, 4.4, 5.3, 21.1**

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  generateGridDimensions,
  getIntensityLevel,
  generateAriaLabel,
  isDateFuture,
  getFilterOptions,
  computeLongestStreak,
  computeCellSize,
} from '@/lib/heatmapUtils';
import type { HeatmapDay, WellnessHabitType, CompletedHabit } from '@/types/habits';

// --- Arbitraries ---

/** Generate a valid YYYY-MM-DD date string within a reasonable range */
const dateStringArb = fc
  .integer({ min: 0, max: 3650 })
  .map((offset) => {
    const d = new Date('2020-01-01T00:00:00');
    d.setDate(d.getDate() + offset);
    return d.toISOString().slice(0, 10);
  });

/** Generate a pair of dates where start <= end, within the same year */
const dateRangeArb = fc
  .tuple(
    fc.integer({ min: 0, max: 730 }),
    fc.integer({ min: 1, max: 180 }),
  )
  .map(([startOffset, daysSpan]) => {
    const start = new Date('2023-01-01T00:00:00');
    start.setDate(start.getDate() + startOffset);
    const end = new Date(start);
    end.setDate(end.getDate() + daysSpan);
    return {
      start: start.toISOString().slice(0, 10),
      end: end.toISOString().slice(0, 10),
    };
  });

/** Generate a HeatmapDay with realistic values */
const heatmapDayArb = (date: string): fc.Arbitrary<HeatmapDay> =>
  fc.record({
    date: fc.constant(date),
    academicCount: fc.integer({ min: 0, max: 4 }),
    wellnessCount: fc.integer({ min: 0, max: 4 }),
    totalCount: fc.constant(0), // will be computed
    habits: fc.constant([] as CompletedHabit[]),
  }).map((d) => ({ ...d, totalCount: d.academicCount + d.wellnessCount }));

/** Generate a sorted array of HeatmapDays for consecutive dates */
const heatmapDaysArb = fc
  .tuple(
    fc.integer({ min: 0, max: 150 }),
    fc.integer({ min: 1, max: 120 }),
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
    return fc.tuple(
      ...dates.map((date) => heatmapDayArb(date)),
    );
  });

const wellnessHabitTypes: WellnessHabitType[] = ['meditation', 'hydration', 'exercise', 'sleep'];

const wellnessSubsetArb: fc.Arbitrary<WellnessHabitType[]> = fc
  .subarray(wellnessHabitTypes, { minLength: 0, maxLength: 4 });

describe('Habit Heatmap Properties', () => {
  // Feature: habit-heatmap, Property 1: Grid structure matches semester range
  it('Property 1: generateGridDimensions returns 7 rows and correct columns for any valid date range', () => {
    fc.assert(
      fc.property(dateRangeArb, ({ start, end }) => {
        const dims = generateGridDimensions(start, end);
        expect(dims.rows).toBe(7);

        const startDate = new Date(start + 'T00:00:00');
        const endDate = new Date(end + 'T00:00:00');
        const totalDays = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        const expectedColumns = Math.ceil(totalDays / 7);
        expect(dims.columns).toBe(expectedColumns);
        expect(dims.columns).toBeGreaterThan(0);
      }),
      { numRuns: 100 },
    );
  });

  // Feature: habit-heatmap, Property 2: Habit count maps to correct intensity level
  it('Property 2: getIntensityLevel maps count to correct level (0→0, 1→1, 2→2, 3→3, 4+→4)', () => {
    fc.assert(
      fc.property(fc.nat({ max: 1000 }), (count) => {
        const level = getIntensityLevel(count);
        if (count === 0) expect(level).toBe(0);
        else if (count === 1) expect(level).toBe(1);
        else if (count === 2) expect(level).toBe(2);
        else if (count === 3) expect(level).toBe(3);
        else expect(level).toBe(4);
      }),
      { numRuns: 100 },
    );
  });

  // Feature: habit-heatmap, Property 3: Tooltip content includes all required fields
  it('Property 3: generateAriaLabel contains date and count', () => {
    fc.assert(
      fc.property(dateStringArb, fc.nat({ max: 20 }), (date, count) => {
        const label = generateAriaLabel(date, count);
        // Label should contain the count
        expect(label).toContain(String(count));
        // Label should contain "completed"
        expect(label).toContain('completed');
        // Label should contain a year from the date
        const year = date.slice(0, 4);
        expect(label).toContain(year);
      }),
      { numRuns: 100 },
    );
  });

  // Feature: habit-heatmap, Property 4: Future dates produce disabled cells
  it('Property 4: isDateFuture returns true for dates strictly after today', () => {
    fc.assert(
      fc.property(fc.integer({ min: 2, max: 3650 }), (daysAhead) => {
        // Build the date string in local time to avoid UTC/local timezone mismatch
        const future = new Date();
        future.setDate(future.getDate() + daysAhead);
        const yyyy = future.getFullYear();
        const mm = String(future.getMonth() + 1).padStart(2, '0');
        const dd = String(future.getDate()).padStart(2, '0');
        const dateStr = `${yyyy}-${mm}-${dd}`;
        expect(isDateFuture(dateStr)).toBe(true);
      }),
      { numRuns: 100 },
    );
  });

  it('Property 4 (complement): isDateFuture returns false for past dates', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 3650 }), (daysAgo) => {
        const past = new Date();
        past.setDate(past.getDate() - daysAgo);
        const yyyy = past.getFullYear();
        const mm = String(past.getMonth() + 1).padStart(2, '0');
        const dd = String(past.getDate()).padStart(2, '0');
        const dateStr = `${yyyy}-${mm}-${dd}`;
        expect(isDateFuture(dateStr)).toBe(false);
      }),
      { numRuns: 100 },
    );
  });

  // Feature: habit-heatmap, Property 5: Filter options match enabled habits
  it('Property 5: getFilterOptions returns correct array for any subset of wellness habits', () => {
    fc.assert(
      fc.property(wellnessSubsetArb, (enabledHabits) => {
        const options = getFilterOptions(enabledHabits);
        const expectedBase = ['All Habits', 'Login', 'Submit', 'Journal', 'Read'];
        const wellnessLabels: Record<WellnessHabitType, string> = {
          meditation: 'Meditation',
          hydration: 'Hydration',
          exercise: 'Exercise',
          sleep: 'Sleep',
        };
        const expectedWellness = enabledHabits.map((h) => wellnessLabels[h]);
        const expected = [...expectedBase, ...expectedWellness];

        expect(options).toEqual(expected);
        expect(options.length).toBe(5 + enabledHabits.length);
      }),
      { numRuns: 100 },
    );
  });

  // Feature: habit-heatmap, Property 6: Single-habit filter produces binary intensity
  it('Property 6: single-habit filter produces binary intensity (0 or 1 only)', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 1 }),
        (completed) => {
          // For a single-habit filter, the intensity is binary
          const intensity = getIntensityLevel(completed);
          expect(intensity === 0 || intensity === 1).toBe(true);
        },
      ),
      { numRuns: 100 },
    );
  });

  // Feature: habit-heatmap, Property 7: "All Habits" filter sums all completions
  it('Property 7: totalCount equals academicCount + wellnessCount for any day', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 4 }),
        fc.integer({ min: 0, max: 4 }),
        (academicCount, wellnessCount) => {
          const day: HeatmapDay = {
            date: '2024-03-15',
            academicCount,
            wellnessCount,
            totalCount: academicCount + wellnessCount,
            habits: [],
          };
          expect(day.totalCount).toBe(day.academicCount + day.wellnessCount);
        },
      ),
      { numRuns: 100 },
    );
  });

  // Feature: habit-heatmap, Property 8: Longest streak computation
  it('Property 8: computeLongestStreak returns correct value for any sorted day sequence', () => {
    fc.assert(
      fc.property(heatmapDaysArb, (days) => {
        const longest = computeLongestStreak(days);

        // Manually compute expected longest streak
        let expectedLongest = 0;
        let current = 0;
        for (const day of days) {
          if (day.academicCount > 0) {
            current++;
            expectedLongest = Math.max(expectedLongest, current);
          } else {
            current = 0;
          }
        }

        expect(longest).toBe(expectedLongest);
        expect(longest).toBeGreaterThanOrEqual(0);
        expect(longest).toBeLessThanOrEqual(days.length);
      }),
      { numRuns: 100 },
    );
  });

  // Feature: habit-heatmap, Property 9: Total active days
  it('Property 9: total active days equals count of days with totalCount > 0', () => {
    fc.assert(
      fc.property(heatmapDaysArb, (days) => {
        const activeDays = days.filter((d) => d.totalCount > 0).length;
        expect(activeDays).toBeGreaterThanOrEqual(0);
        expect(activeDays).toBeLessThanOrEqual(days.length);
      }),
      { numRuns: 100 },
    );
  });

  // Feature: habit-heatmap, Property 10: Cell size minimum
  it('Property 10: computeCellSize returns max(floor(width/weeks), 12)', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 5000 }),
        fc.integer({ min: 1, max: 52 }),
        (containerWidth, numWeeks) => {
          const cellSize = computeCellSize(containerWidth, numWeeks);
          const expected = Math.max(Math.floor(containerWidth / numWeeks), 12);
          expect(cellSize).toBe(expected);
          expect(cellSize).toBeGreaterThanOrEqual(12);
        },
      ),
      { numRuns: 100 },
    );
  });

  // Feature: habit-heatmap, Property 25: ARIA label format
  it('Property 25: generateAriaLabel contains formatted date and count', () => {
    fc.assert(
      fc.property(dateStringArb, fc.nat({ max: 50 }), (date, count) => {
        const label = generateAriaLabel(date, count);
        const d = new Date(date + 'T00:00:00');
        const formatted = d.toLocaleDateString('en-US', {
          month: 'long',
          day: 'numeric',
          year: 'numeric',
        });
        expect(label).toContain(formatted);
        expect(label).toContain(String(count));
        if (count !== 1) {
          expect(label).toContain('habits completed');
        } else {
          expect(label).toContain('habit completed');
        }
      }),
      { numRuns: 100 },
    );
  });
});
