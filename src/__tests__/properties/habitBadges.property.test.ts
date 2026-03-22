// Feature: habit-heatmap, Property 22: Habit Master badge (30+ active days in semester)
// Feature: habit-heatmap, Property 23: Wellness Warrior badge (14 consecutive wellness days)
// Feature: habit-heatmap, Property 24: Full Spectrum badge (7 days with all 4 academic + ≥1 wellness)
// **Validates: Requirements 19.1, 19.2, 19.3**

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import type { HeatmapDay, CompletedHabit } from '@/types/habits';

// --- Inline badge condition helpers (per design doc) ---
// These implement the badge conditions as specified. Task 5 will create the actual functions.

/**
 * Habit Master: true iff count of distinct dates with ≥1 habit completed is ≥ 30.
 */
const checkHabitMaster = (days: HeatmapDay[]): boolean => {
  const activeDays = days.filter((d) => d.totalCount > 0).length;
  return activeDays >= 30;
};

/**
 * Wellness Warrior: true iff there exists a consecutive subsequence of ≥14 days
 * where each day has ≥1 wellness habit logged.
 */
const checkWellnessWarrior = (days: HeatmapDay[]): boolean => {
  let consecutive = 0;
  for (const day of days) {
    if (day.wellnessCount > 0) {
      consecutive++;
      if (consecutive >= 14) return true;
    } else {
      consecutive = 0;
    }
  }
  return false;
};

/**
 * Full Spectrum: true iff there are ≥7 distinct dates where all 4 academic habits
 * AND ≥1 wellness habit are completed on the same day.
 */
const checkFullSpectrum = (days: HeatmapDay[]): boolean => {
  const fullDays = days.filter((d) => d.academicCount >= 4 && d.wellnessCount >= 1).length;
  return fullDays >= 7;
};

// --- Arbitraries ---

const heatmapDayArb = (date: string): fc.Arbitrary<HeatmapDay> =>
  fc.record({
    date: fc.constant(date),
    academicCount: fc.integer({ min: 0, max: 4 }),
    wellnessCount: fc.integer({ min: 0, max: 4 }),
    totalCount: fc.constant(0),
    habits: fc.constant([] as CompletedHabit[]),
  }).map((d) => ({ ...d, totalCount: d.academicCount + d.wellnessCount }));

const consecutiveDaysArb = (numDays: number, startDate: Date = new Date('2024-01-01')) =>
  fc.tuple(
    ...Array.from({ length: numDays }, (_, i) => {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      return heatmapDayArb(d.toISOString().slice(0, 10));
    }),
  );

describe('Habit Badges Properties', () => {
  // Feature: habit-heatmap, Property 22: Habit Master badge condition
  it('Property 22: Habit Master badge true iff ≥30 active days', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 30, max: 120 }).chain((numDays) => consecutiveDaysArb(numDays)),
        (days) => {
          const activeDays = days.filter((d) => d.totalCount > 0).length;
          const result = checkHabitMaster(days);

          if (activeDays >= 30) {
            expect(result).toBe(true);
          } else {
            expect(result).toBe(false);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('Property 22 (boundary): exactly 29 active days does not earn Habit Master', () => {
    // Create 29 active days + 1 inactive day
    const days: HeatmapDay[] = [];
    for (let i = 0; i < 30; i++) {
      const d = new Date('2024-01-01');
      d.setDate(d.getDate() + i);
      days.push({
        date: d.toISOString().slice(0, 10),
        academicCount: i < 29 ? 1 : 0,
        wellnessCount: 0,
        totalCount: i < 29 ? 1 : 0,
        habits: [],
      });
    }
    expect(checkHabitMaster(days)).toBe(false);
  });

  it('Property 22 (boundary): exactly 30 active days earns Habit Master', () => {
    const days: HeatmapDay[] = [];
    for (let i = 0; i < 30; i++) {
      const d = new Date('2024-01-01');
      d.setDate(d.getDate() + i);
      days.push({
        date: d.toISOString().slice(0, 10),
        academicCount: 1,
        wellnessCount: 0,
        totalCount: 1,
        habits: [],
      });
    }
    expect(checkHabitMaster(days)).toBe(true);
  });

  // Feature: habit-heatmap, Property 23: Wellness Warrior badge condition
  it('Property 23: Wellness Warrior badge true iff ≥14 consecutive wellness days', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 14, max: 60 }).chain((numDays) => consecutiveDaysArb(numDays)),
        (days) => {
          const result = checkWellnessWarrior(days);

          // Manually verify: find longest consecutive wellness streak
          let maxConsecutive = 0;
          let current = 0;
          for (const day of days) {
            if (day.wellnessCount > 0) {
              current++;
              maxConsecutive = Math.max(maxConsecutive, current);
            } else {
              current = 0;
            }
          }

          if (maxConsecutive >= 14) {
            expect(result).toBe(true);
          } else {
            expect(result).toBe(false);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('Property 23 (boundary): exactly 13 consecutive wellness days does not earn badge', () => {
    const days: HeatmapDay[] = [];
    for (let i = 0; i < 14; i++) {
      const d = new Date('2024-01-01');
      d.setDate(d.getDate() + i);
      days.push({
        date: d.toISOString().slice(0, 10),
        academicCount: 0,
        wellnessCount: i < 13 ? 1 : 0,
        totalCount: i < 13 ? 1 : 0,
        habits: [],
      });
    }
    expect(checkWellnessWarrior(days)).toBe(false);
  });

  it('Property 23 (boundary): exactly 14 consecutive wellness days earns badge', () => {
    const days: HeatmapDay[] = [];
    for (let i = 0; i < 14; i++) {
      const d = new Date('2024-01-01');
      d.setDate(d.getDate() + i);
      days.push({
        date: d.toISOString().slice(0, 10),
        academicCount: 0,
        wellnessCount: 1,
        totalCount: 1,
        habits: [],
      });
    }
    expect(checkWellnessWarrior(days)).toBe(true);
  });

  // Feature: habit-heatmap, Property 24: Full Spectrum badge condition
  it('Property 24: Full Spectrum badge true iff ≥7 days with all 4 academic + ≥1 wellness', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 7, max: 60 }).chain((numDays) => consecutiveDaysArb(numDays)),
        (days) => {
          const result = checkFullSpectrum(days);

          const fullDays = days.filter((d) => d.academicCount >= 4 && d.wellnessCount >= 1).length;

          if (fullDays >= 7) {
            expect(result).toBe(true);
          } else {
            expect(result).toBe(false);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('Property 24 (boundary): exactly 6 full spectrum days does not earn badge', () => {
    const days: HeatmapDay[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date('2024-01-01');
      d.setDate(d.getDate() + i);
      days.push({
        date: d.toISOString().slice(0, 10),
        academicCount: 4,
        wellnessCount: i < 6 ? 1 : 0,
        totalCount: i < 6 ? 5 : 4,
        habits: [],
      });
    }
    expect(checkFullSpectrum(days)).toBe(false);
  });

  it('Property 24 (boundary): exactly 7 full spectrum days earns badge', () => {
    const days: HeatmapDay[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date('2024-01-01');
      d.setDate(d.getDate() + i);
      days.push({
        date: d.toISOString().slice(0, 10),
        academicCount: 4,
        wellnessCount: 1,
        totalCount: 5,
        habits: [],
      });
    }
    expect(checkFullSpectrum(days)).toBe(true);
  });
});
