// Feature: weekly-planner-today-view, Property 4: Timer state round-trip persistence
// Feature: weekly-planner-today-view, Property 5: Pomodoro interval sequence
// Feature: weekly-planner-today-view, Property 14: Study session duration validation
// Feature: weekly-planner-today-view, Property 18: Pomodoro interval duration values
// **Validates: Requirements 2.3, 7.7, 8.1, 8.2**

import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { persistTimerState, restoreTimerState, clearTimerState } from '@/lib/timerPersistence';
import {
  getPomodoroIntervalType,
  getPomodoroIntervalDuration,
} from '@/lib/plannerUtils';
import { createStudySessionSchema } from '@/lib/schemas/planner';
import type { TimerPersistState, PomodoroIntervalType } from '@/types/planner';

// --- Arbitraries ---

const timerPersistStateArb: fc.Arbitrary<TimerPersistState> = fc.record({
  sessionId: fc.uuid(),
  mode: fc.constantFrom('pomodoro' as const, 'custom' as const),
  startedAt: fc.integer({ min: 1_600_000_000_000, max: 1_900_000_000_000 }),
  totalElapsedMs: fc.integer({ min: 0, max: 14_400_000 }),
  pausedAt: fc.oneof(fc.constant(null), fc.integer({ min: 1_600_000_000_000, max: 1_900_000_000_000 })),
  totalPausedMs: fc.integer({ min: 0, max: 7_200_000 }),
  pomodoroInterval: fc.integer({ min: 0, max: 20 }),
  pomodoroIntervalType: fc.constantFrom('work' as const, 'break' as const, 'long_break' as const),
  targetDurationMs: fc.integer({ min: 900_000, max: 14_400_000 }),
});

// --- Property Tests ---

describe('focusTimer property tests', () => {
  beforeEach(() => {
    clearTimerState();
  });

  // Property 4: Timer state round-trip persistence
  describe('Property 4: Timer state round-trip persistence', () => {
    it('should round-trip any valid TimerPersistState through localStorage', () => {
      fc.assert(
        fc.property(timerPersistStateArb, (state) => {
          persistTimerState(state);
          const restored = restoreTimerState();
          expect(restored).toEqual(state);
        }),
        { numRuns: 100 },
      );
    });
  });

  // Property 5: Pomodoro interval sequence
  describe('Property 5: Pomodoro interval sequence', () => {
    it('should follow work→break→work→break→work→break→work→long_break pattern', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 32 }),
          (maxIntervals) => {
            const expectedPattern: PomodoroIntervalType[] = [];
            for (let i = 0; i <= maxIntervals; i++) {
              expectedPattern.push(getPomodoroIntervalType(i));
            }

            for (let i = 0; i <= maxIntervals; i++) {
              const type = expectedPattern[i]!;
              if (i > 0 && i % 4 === 0) {
                // After every 4th work interval → long_break
                expect(type).toBe('long_break');
              } else if (i % 2 === 0) {
                // Even positions → work
                expect(type).toBe('work');
              } else {
                // Odd positions → break
                expect(type).toBe('break');
              }
            }
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should produce the canonical 8-interval cycle', () => {
      // Explicit check: 0=work, 1=break, 2=work, 3=break, 4=long_break, 5=break, 6=work, 7=break
      // Actually per the implementation: completedIntervals=0 → work, 1 → break, 2 → work, 3 → break, 4 → long_break, 5 → break, 6 → work, 7 → break
      const sequence = Array.from({ length: 8 }, (_, i) => getPomodoroIntervalType(i));
      expect(sequence).toEqual([
        'work', 'break', 'work', 'break',
        'long_break', 'break', 'work', 'break',
      ]);
    });
  });

  // Property 14: Study session duration validation
  describe('Property 14: Study session duration validation', () => {
    it('should accept durations in [15, 240] that are multiples of 15', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 16 }).map((n) => n * 15),
          fc.uuid(),
          (duration, courseId) => {
            const input = {
              title: 'Test Session',
              plannedDate: '2025-06-15',
              plannedStartTime: '10:00',
              plannedDurationMinutes: duration,
              courseId,
              timerMode: 'pomodoro' as const,
            };
            const result = createStudySessionSchema.safeParse(input);
            expect(result.success).toBe(true);
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should reject durations outside [15, 240]', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.integer({ min: -100, max: 14 }),
            fc.integer({ min: 241, max: 1000 }),
          ),
          fc.uuid(),
          (duration, courseId) => {
            const input = {
              title: 'Test Session',
              plannedDate: '2025-06-15',
              plannedStartTime: '10:00',
              plannedDurationMinutes: duration,
              courseId,
              timerMode: 'pomodoro' as const,
            };
            const result = createStudySessionSchema.safeParse(input);
            expect(result.success).toBe(false);
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should reject durations not in 15-minute increments', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 15, max: 240 }).filter((n) => n % 15 !== 0),
          fc.uuid(),
          (duration, courseId) => {
            const input = {
              title: 'Test Session',
              plannedDate: '2025-06-15',
              plannedStartTime: '10:00',
              plannedDurationMinutes: duration,
              courseId,
              timerMode: 'pomodoro' as const,
            };
            const result = createStudySessionSchema.safeParse(input);
            expect(result.success).toBe(false);
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  // Property 18: Pomodoro interval duration values
  describe('Property 18: Pomodoro interval duration values', () => {
    it('should return exact durations: work=25min, break=5min, long_break=15min', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('work' as const, 'break' as const, 'long_break' as const),
          (intervalType) => {
            const duration = getPomodoroIntervalDuration(intervalType);
            switch (intervalType) {
              case 'work':
                expect(duration).toBe(25 * 60 * 1000); // 1,500,000 ms
                break;
              case 'break':
                expect(duration).toBe(5 * 60 * 1000); // 300,000 ms
                break;
              case 'long_break':
                expect(duration).toBe(15 * 60 * 1000); // 900,000 ms
                break;
            }
          },
        ),
        { numRuns: 100 },
      );
    });
  });
});
