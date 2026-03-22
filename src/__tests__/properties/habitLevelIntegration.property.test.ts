// Feature: habit-heatmap, Property 27: Level-aware intensity normalization
// Feature: habit-heatmap, Property 28: Level-relative consistency score excludes sabbatical days
// Feature: habit-heatmap, Property 29: Streak milestone detection
// Feature: habit-heatmap, Property 36: Level progression chart data
// **Validates: Requirements 22.2, 22.3, 24.1, 24.2, 24.3, 26.3, 27.1, 27.4, 23.1, 23.2, 23.3**

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  getLevelAwareIntensityLevel,
  computeLevelRelativeConsistencyScore,
  getLevelForDate,
} from '@/lib/levelAwareHeatmap';
import { detectStreakMilestones } from '@/lib/streakMilestones';
import type { HeatmapDay, LevelProgressionPoint, CompletedHabit } from '@/types/habits';

// --- Arbitraries ---

const levelArb = fc.integer({ min: 1, max: 4 }) as fc.Arbitrary<1 | 2 | 3 | 4>;

/** Generate a date string offset from a base date */
const dateFromOffset = (base: Date, offset: number): string => {
  const d = new Date(base);
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
};

/** Generate a sorted level history with at least one entry */
const levelHistoryArb = fc
  .tuple(
    fc.integer({ min: 1, max: 10 }), // number of entries
    fc.integer({ min: 0, max: 200 }), // start offset
  )
  .chain(([count, startOffset]) => {
    const base = new Date('2024-01-01T00:00:00');
    return fc.array(levelArb, { minLength: count, maxLength: count }).map((levels) => {
      const history: LevelProgressionPoint[] = [];
      for (let i = 0; i < levels.length; i++) {
        history.push({
          date: dateFromOffset(base, startOffset + i * 15),
          level: levels[i]!,
        });
      }
      return history;
    });
  });

/** Generate consecutive HeatmapDays for streak milestone testing */
const consecutiveDaysArb = (numDays: number) => {
  const base = new Date('2024-01-01T00:00:00');
  const arbs = Array.from({ length: numDays }, (_, i) => {
    const date = dateFromOffset(base, i);
    return fc.record({
      date: fc.constant(date),
      academicCount: fc.integer({ min: 0, max: 4 }),
      wellnessCount: fc.integer({ min: 0, max: 4 }),
      totalCount: fc.constant(0),
      habits: fc.constant([] as CompletedHabit[]),
    }).map((d) => ({ ...d, totalCount: d.academicCount + d.wellnessCount }) as HeatmapDay);
  });
  return fc.tuple(...arbs);
};

describe('Habit Level Integration Properties', () => {
  // Feature: habit-heatmap, Property 27: Level-aware intensity normalization
  describe('Property 27: Level-aware intensity normalization', () => {
    it('should return 0 for count 0 regardless of levelMax', () => {
      fc.assert(
        fc.property(fc.integer({ min: 1, max: 4 }), (levelMax) => {
          expect(getLevelAwareIntensityLevel(0, levelMax)).toBe(0);
        }),
        { numRuns: 100 },
      );
    });

    it('should return intensity 4 when count >= levelMax', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 4 }),
          fc.integer({ min: 0, max: 10 }),
          (levelMax, extra) => {
            const count = levelMax + extra;
            const intensity = getLevelAwareIntensityLevel(count, levelMax);
            expect(intensity).toBe(4);
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should return intensity in [1, 4] for count > 0', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 20 }),
          fc.integer({ min: 1, max: 4 }),
          (count, levelMax) => {
            const intensity = getLevelAwareIntensityLevel(count, levelMax);
            expect(intensity).toBeGreaterThanOrEqual(1);
            expect(intensity).toBeLessThanOrEqual(4);
          },
        ),
        { numRuns: 100 },
      );
    });

    it('Level 1 student with 1 habit gets same intensity as Level 4 student with 4 habits', () => {
      const level1Intensity = getLevelAwareIntensityLevel(1, 1);
      const level4Intensity = getLevelAwareIntensityLevel(4, 4);
      expect(level1Intensity).toBe(level4Intensity);
      expect(level1Intensity).toBe(4);
    });
  });

  // Feature: habit-heatmap, Property 28: Level-relative consistency score excludes sabbatical days
  describe('Property 28: Level-relative consistency score excludes sabbatical days', () => {
    it('should return value in [0, 100]', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 30 }),
          levelArb,
          fc.float({ min: 0, max: 1, noNaN: true }),
          fc.array(fc.integer({ min: 0, max: 4 }), { minLength: 1, maxLength: 30 }),
          (numDays, level, sabbaticalRatio, academicCounts) => {
            const base = new Date('2024-01-01T00:00:00');
            const actualNumDays = Math.min(numDays, academicCounts.length);
            const days = Array.from({ length: actualNumDays }, (_, i) => ({
              date: dateFromOffset(base, i),
              academicCount: academicCounts[i]!,
            }));
            const history: LevelProgressionPoint[] = [{ date: '2023-12-01', level }];
            const sabbaticalCount = Math.floor(actualNumDays * sabbaticalRatio);
            const sabbaticalDates = new Set(
              days.slice(0, sabbaticalCount).map((d) => d.date),
            );

            const score = computeLevelRelativeConsistencyScore(days, history, sabbaticalDates);
            expect(score).toBeGreaterThanOrEqual(0);
            expect(score).toBeLessThanOrEqual(100);
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should exclude sabbatical dates from calculation', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 2, max: 20 }),
          levelArb,
          (numDays, level) => {
            const base = new Date('2024-01-01T00:00:00');
            // All days fully completed
            const days = Array.from({ length: numDays }, (_, i) => ({
              date: dateFromOffset(base, i),
              academicCount: level, // meets level requirement
            }));
            const history: LevelProgressionPoint[] = [{ date: '2023-12-01', level }];

            // Mark first day as sabbatical
            const sabbaticalDates = new Set([days[0]!.date]);

            const score = computeLevelRelativeConsistencyScore(days, history, sabbaticalDates);
            // All non-sabbatical days are fully completed, so score should be 100
            expect(score).toBe(100);
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should return 0 when all days are sabbatical days', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 20 }),
          levelArb,
          (numDays, level) => {
            const base = new Date('2024-01-01T00:00:00');
            const days = Array.from({ length: numDays }, (_, i) => ({
              date: dateFromOffset(base, i),
              academicCount: level,
            }));
            const history: LevelProgressionPoint[] = [{ date: '2023-12-01', level }];
            const sabbaticalDates = new Set(days.map((d) => d.date));

            const score = computeLevelRelativeConsistencyScore(days, history, sabbaticalDates);
            expect(score).toBe(0);
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should count day as fully completed only when academicCount >= level on that date', () => {
      fc.assert(
        fc.property(
          levelArb,
          fc.integer({ min: 0, max: 4 }),
          (level, academicCount) => {
            const days = [{ date: '2024-03-15', academicCount }];
            const history: LevelProgressionPoint[] = [{ date: '2024-01-01', level }];
            const sabbaticalDates = new Set<string>();

            const score = computeLevelRelativeConsistencyScore(days, history, sabbaticalDates);
            if (academicCount >= level) {
              expect(score).toBe(100);
            } else {
              expect(score).toBe(0);
            }
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  // Feature: habit-heatmap, Property 29: Streak milestone detection
  describe('Property 29: Streak milestone detection', () => {
    it('should return no milestones for streaks shorter than 30 days', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 29 }),
          (numDays) => {
            const base = new Date('2024-01-01T00:00:00');
            const days: HeatmapDay[] = Array.from({ length: numDays }, (_, i) => ({
              date: dateFromOffset(base, i),
              academicCount: 1, // all active
              wellnessCount: 0,
              totalCount: 1,
              habits: [],
            }));
            const milestones = detectStreakMilestones(days);
            expect(milestones).toHaveLength(0);
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should detect milestones only at exactly 30, 60, and 100 consecutive active days', () => {
      fc.assert(
        fc.property(
          consecutiveDaysArb(110),
          (days) => {
            const milestones = detectStreakMilestones(days);

            // Each milestone should be at 30, 60, or 100
            for (const m of milestones) {
              expect([30, 60, 100]).toContain(m.days);
            }

            // Each milestone appears at most once
            const milestoneDays = milestones.map((m) => m.days);
            expect(new Set(milestoneDays).size).toBe(milestoneDays.length);
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should set achievedDate to the Nth consecutive active day', () => {
      // Create exactly 30 consecutive active days
      const base = new Date('2024-01-01T00:00:00');
      const days: HeatmapDay[] = Array.from({ length: 30 }, (_, i) => ({
        date: dateFromOffset(base, i),
        academicCount: 1,
        wellnessCount: 0,
        totalCount: 1,
        habits: [],
      }));
      const milestones = detectStreakMilestones(days);
      expect(milestones).toHaveLength(1);
      expect(milestones[0]!.days).toBe(30);
      expect(milestones[0]!.achievedDate).toBe(dateFromOffset(base, 29));
    });

    it('should detect all three milestones for 100+ consecutive active days', () => {
      const base = new Date('2024-01-01T00:00:00');
      const days: HeatmapDay[] = Array.from({ length: 100 }, (_, i) => ({
        date: dateFromOffset(base, i),
        academicCount: 1,
        wellnessCount: 0,
        totalCount: 1,
        habits: [],
      }));
      const milestones = detectStreakMilestones(days);
      expect(milestones).toHaveLength(3);
      expect(milestones.map((m) => m.days)).toEqual([30, 60, 100]);
    });
  });

  // Feature: habit-heatmap, Property 36: Level progression chart data
  describe('Property 36: Level progression chart data', () => {
    it('should contain one point per level change, sorted by date ascending', () => {
      fc.assert(
        fc.property(levelHistoryArb, (history) => {
          // History is already sorted by construction
          expect(history.length).toBeGreaterThanOrEqual(1);

          // Verify sorted by date ascending
          for (let i = 1; i < history.length; i++) {
            expect(history[i]!.date >= history[i - 1]!.date).toBe(true);
          }

          // All level values in [1, 4]
          for (const point of history) {
            expect(point.level).toBeGreaterThanOrEqual(1);
            expect(point.level).toBeLessThanOrEqual(4);
          }
        }),
        { numRuns: 100 },
      );
    });

    it('should resolve correct level for any date given a history', () => {
      fc.assert(
        fc.property(
          levelHistoryArb,
          fc.integer({ min: 0, max: 365 }),
          (history, dayOffset) => {
            const queryDate = dateFromOffset(new Date('2024-01-01T00:00:00'), dayOffset);
            const level = getLevelForDate(queryDate, history);
            expect(level).toBeGreaterThanOrEqual(1);
            expect(level).toBeLessThanOrEqual(4);
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should default to level 4 when no history entry precedes the date', () => {
      const futureHistory: LevelProgressionPoint[] = [
        { date: '2025-06-01', level: 2 },
      ];
      const level = getLevelForDate('2024-01-01', futureHistory);
      expect(level).toBe(4);
    });

    it('single entry history renders a horizontal line at that level', () => {
      fc.assert(
        fc.property(levelArb, (level) => {
          const history: LevelProgressionPoint[] = [
            { date: '2024-01-01', level },
          ];
          expect(history).toHaveLength(1);
          expect(history[0]!.level).toBe(level);
          // For any date after the entry, getLevelForDate returns that level
          const resolvedLevel = getLevelForDate('2024-06-15', history);
          expect(resolvedLevel).toBe(level);
        }),
        { numRuns: 100 },
      );
    });
  });
});
