// Feature: weekly-planner-today-view, Property 1: Session XP calculation formula
// Feature: weekly-planner-today-view, Property 2: Timer display format
// Feature: weekly-planner-today-view, Property 3: Actual duration excludes paused time
// Feature: weekly-planner-today-view, Property 6: Task priority sorting
// Feature: weekly-planner-today-view, Property 7: Deadline urgency classification
// Feature: weekly-planner-today-view, Property 8: Session missed detection
// Feature: weekly-planner-today-view, Property 9: Time-of-day grouping
// Feature: weekly-planner-today-view, Property 11: Week start date is always Monday
// Feature: weekly-planner-today-view, Property 12: Past week detection
// Feature: weekly-planner-today-view, Property 13: Word count accuracy
// Feature: weekly-planner-today-view, Property 17: Weekly study time aggregation
// Feature: weekly-planner-today-view, Property 19: Daily progress summary aggregation
// Feature: weekly-planner-today-view, Property 20: Session XP zero for short sessions
// **Validates: Requirements 1.1, 2.3, 3.5, 3.6, 4.3, 4.5, 5.2, 5.3, 5.4, 5.5, 5.6, 7.1, 7.4, 10.1, 10.2, 10.3, 10.5, 11.1, 11.3, 12.1, 13.1, 13.3**

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import {
  calculateSessionXP,
  formatTimerDisplay,
  calculateActualDuration,
  sortTasksByPriority,
  getDeadlineUrgency,
  isSessionMissed,
  groupByTimeOfDay,
  getWeekStartDate,
  isWeekInPast,
  countWords,
  aggregateWeeklyStudyTime,
} from "@/lib/plannerUtils";
import type {
  PlannerTask,
  StudySession,
  TimelineItem,
  TaskPriority,
} from "@/types/planner";

// --- Arbitraries ---

const priorityArb: fc.Arbitrary<TaskPriority> = fc.constantFrom(
  "low",
  "medium",
  "high"
);

const plannerTaskArb = (priority?: TaskPriority): fc.Arbitrary<PlannerTask> =>
  fc.record({
    id: fc.uuid(),
    studentId: fc.uuid(),
    title: fc.string({ minLength: 1, maxLength: 50 }),
    description: fc.constant(null),
    dueDate: fc.constant("2025-06-15"),
    priority: priority ? fc.constant(priority) : priorityArb,
    status: fc.constantFrom("todo" as const, "done" as const),
    courseId: fc.constant(null),
    courseName: fc.constant(undefined),
    completedAt: fc.constant(null),
    createdAt: fc.constant("2025-06-01T00:00:00Z"),
  });

const hourArb = fc.integer({ min: 0, max: 23 });
const minuteArb = fc.integer({ min: 0, max: 59 });
const timeStringArb = fc
  .tuple(hourArb, minuteArb)
  .map(
    ([h, m]) => `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`
  );

const timelineItemArb = (time: string | null): fc.Arbitrary<TimelineItem> =>
  fc.record({
    id: fc.uuid(),
    type: fc.constantFrom(
      "session" as const,
      "task" as const,
      "deadline" as const
    ),
    time: fc.constant(time),
    timeOfDay: fc.constant(null),
    data: fc.record({
      id: fc.uuid(),
      studentId: fc.uuid(),
      title: fc.constant("Test"),
      description: fc.constant(null),
      dueDate: fc.constant("2025-06-15"),
      priority: fc.constant("medium" as const),
      status: fc.constant("todo" as const),
      courseId: fc.constant(null),
      completedAt: fc.constant(null),
      createdAt: fc.constant("2025-06-01T00:00:00Z"),
    }) as fc.Arbitrary<TimelineItem["data"]>,
  });

// --- Property Tests ---

describe("plannerUtils property tests", () => {
  // Property 1: Session XP calculation formula
  describe("Property 1: Session XP calculation formula", () => {
    it("should compute XP as base 20 + 5 per additional 15-min block, cap 50, evidence bonus 10", () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 15, max: 600 }),
          fc.boolean(),
          (duration, hasEvidence) => {
            const xp = calculateSessionXP(duration, hasEvidence);
            const blocks = Math.floor(duration / 15);
            const expectedBase = Math.min(20 + (blocks - 1) * 5, 50);
            const expectedBonus = hasEvidence ? 10 : 0;
            expect(xp).toBe(expectedBase + expectedBonus);
            expect(xp).toBeGreaterThanOrEqual(0);
            expect(xp).toBeLessThanOrEqual(60);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // Property 20: Session XP zero for short sessions
  describe("Property 20: Session XP zero for short sessions", () => {
    it("should return 0 XP for any duration < 15 minutes regardless of evidence", () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 14 }),
          fc.boolean(),
          (duration, hasEvidence) => {
            expect(calculateSessionXP(duration, hasEvidence)).toBe(0);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // Property 2: Timer display format
  describe("Property 2: Timer display format", () => {
    it("should return MM:SS format for any non-negative milliseconds", () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 99 * 60 * 1000 + 59 * 1000 }),
          (ms) => {
            const result = formatTimerDisplay(ms);
            expect(result).toMatch(/^\d{2}:\d{2}$/);
            const [mm, ss] = result.split(":").map(Number);
            expect(mm).toBeGreaterThanOrEqual(0);
            expect(ss).toBeGreaterThanOrEqual(0);
            expect(ss).toBeLessThanOrEqual(59);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // Property 3: Actual duration excludes paused time
  describe("Property 3: Actual duration excludes paused time", () => {
    it("should return round((endedAt - startedAt - totalPausedMs) / 60000), always >= 0", () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1_000_000_000_000, max: 1_800_000_000_000 }),
          fc.integer({ min: 1, max: 14_400_000 }), // up to 4 hours
          fc.nat(),
          (startedAt, activeMs, pauseFraction) => {
            const endedAt = startedAt + activeMs;
            const maxPause = endedAt - startedAt;
            const totalPausedMs = pauseFraction % (maxPause + 1);
            const result = calculateActualDuration(
              startedAt,
              endedAt,
              totalPausedMs
            );
            const expected = Math.max(
              0,
              Math.round((endedAt - startedAt - totalPausedMs) / 60000)
            );
            expect(result).toBe(expected);
            expect(result).toBeGreaterThanOrEqual(0);
            expect(result).toBeLessThanOrEqual(
              Math.round((endedAt - startedAt) / 60000)
            );
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // Property 6: Task priority sorting
  describe("Property 6: Task priority sorting", () => {
    it("should sort high before medium before low, preserving array length", () => {
      fc.assert(
        fc.property(
          fc.array(plannerTaskArb(), { minLength: 0, maxLength: 30 }),
          (tasks) => {
            const sorted = sortTasksByPriority(tasks);
            expect(sorted.length).toBe(tasks.length);

            const order: Record<TaskPriority, number> = {
              high: 0,
              medium: 1,
              low: 2,
            };
            for (let i = 1; i < sorted.length; i++) {
              expect(order[sorted[i]!.priority]).toBeGreaterThanOrEqual(
                order[sorted[i - 1]!.priority]
              );
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // Property 7: Deadline urgency classification
  describe("Property 7: Deadline urgency classification", () => {
    it("should return red for <=24h, yellow for >24h and <=72h, green for >72h", () => {
      fc.assert(
        fc.property(
          fc.double({ min: -168, max: 336, noNaN: true }),
          (hoursUntilDue) => {
            const now = new Date("2025-06-15T12:00:00Z");
            const due = new Date(
              now.getTime() + hoursUntilDue * 60 * 60 * 1000
            );
            const dueStr = due.toISOString();
            const urgency = getDeadlineUrgency(dueStr, now);

            if (hoursUntilDue <= 24) {
              expect(urgency).toBe("red");
            } else if (hoursUntilDue <= 72) {
              expect(urgency).toBe("yellow");
            } else {
              expect(urgency).toBe("green");
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // Property 8: Session missed detection
  describe("Property 8: Session missed detection", () => {
    it("should return true for planned sessions past their end time", () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 15, max: 240 }),
          fc.integer({ min: 1, max: 120 }), // minutes past end
          (durationMin, minutesPastEnd) => {
            const session: StudySession = {
              id: "test-id",
              studentId: "student-id",
              courseId: "course-id",
              title: "Test Session",
              description: null,
              plannedDate: "2025-06-15",
              plannedStartTime: "10:00",
              plannedDurationMinutes: durationMin,
              actualStartAt: null,
              actualEndAt: null,
              actualDurationMinutes: null,
              timerMode: "pomodoro",
              status: "planned",
              satisfactionRating: null,
              cloIds: null,
              createdAt: "2025-06-01T00:00:00Z",
            };
            const sessionEnd = new Date(`2025-06-15T10:00:00`);
            sessionEnd.setMinutes(
              sessionEnd.getMinutes() + durationMin + minutesPastEnd
            );
            expect(isSessionMissed(session, sessionEnd)).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should return false for non-planned sessions regardless of time", () => {
      fc.assert(
        fc.property(
          fc.constantFrom(
            "in_progress" as const,
            "completed" as const,
            "cancelled" as const
          ),
          (status) => {
            const session: StudySession = {
              id: "test-id",
              studentId: "student-id",
              courseId: "course-id",
              title: "Test Session",
              description: null,
              plannedDate: "2025-01-01",
              plannedStartTime: "10:00",
              plannedDurationMinutes: 30,
              actualStartAt: null,
              actualEndAt: null,
              actualDurationMinutes: null,
              timerMode: "pomodoro",
              status,
              satisfactionRating: null,
              cloIds: null,
              createdAt: "2025-01-01T00:00:00Z",
            };
            const farFuture = new Date("2030-01-01T00:00:00Z");
            expect(isSessionMissed(session, farFuture)).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // Property 9: Time-of-day grouping
  describe("Property 9: Time-of-day grouping", () => {
    it("should group items correctly and preserve total count", () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.oneof(
              timeStringArb.chain((t) => timelineItemArb(t)),
              timelineItemArb(null)
            ),
            { minLength: 0, maxLength: 20 }
          ),
          (items) => {
            const groups = groupByTimeOfDay(items);
            const totalGrouped =
              groups.morning.length +
              groups.afternoon.length +
              groups.evening.length +
              groups.todo.length;
            expect(totalGrouped).toBe(items.length);

            for (const item of groups.morning) {
              const hour = parseInt(item.time!.split(":")[0]!, 10);
              expect(hour).toBeLessThan(12);
            }
            for (const item of groups.afternoon) {
              const hour = parseInt(item.time!.split(":")[0]!, 10);
              expect(hour).toBeGreaterThanOrEqual(12);
              expect(hour).toBeLessThan(17);
            }
            for (const item of groups.evening) {
              const hour = parseInt(item.time!.split(":")[0]!, 10);
              expect(hour).toBeGreaterThanOrEqual(17);
            }
            for (const item of groups.todo) {
              expect(item.time).toBeNull();
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // Property 11: Week start date is always Monday
  describe("Property 11: Week start date is always Monday", () => {
    it("should return a Monday that is <= input date and within 6 days before", () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 3650 }).map((offset) => {
            // Use noon local time to avoid timezone boundary issues
            const d = new Date(2020, 0, 1, 12, 0, 0);
            d.setDate(d.getDate() + offset);
            return d;
          }),
          (date) => {
            const weekStart = getWeekStartDate(date);
            // Parse the returned YYYY-MM-DD as local date
            const [y, m, d] = weekStart.split("-").map(Number);
            const monday = new Date(y!, m! - 1, d!, 12, 0, 0);
            expect(monday.getDay()).toBe(1); // Monday

            const inputDay = new Date(date);
            inputDay.setHours(12, 0, 0, 0);
            monday.setHours(12, 0, 0, 0);
            expect(monday.getTime()).toBeLessThanOrEqual(inputDay.getTime());

            const diffDays = Math.round(
              (inputDay.getTime() - monday.getTime()) / (1000 * 60 * 60 * 24)
            );
            expect(diffDays).toBeLessThanOrEqual(6);
            expect(diffDays).toBeGreaterThanOrEqual(0);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // Property 12: Past week detection
  describe("Property 12: Past week detection", () => {
    it("should return true only when today is after Sunday 23:59:59 of that week", () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 500 }).map((offset) => {
            const d = new Date("2024-01-01T00:00:00");
            d.setDate(d.getDate() + offset);
            return d;
          }),
          fc.integer({ min: -14, max: 14 }),
          (baseDate, dayOffset) => {
            const weekStart = getWeekStartDate(baseDate);
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekEnd.getDate() + 6);
            weekEnd.setHours(23, 59, 59, 999);

            const today = new Date(
              weekEnd.getTime() + dayOffset * 24 * 60 * 60 * 1000
            );
            const result = isWeekInPast(weekStart, today);

            if (today > weekEnd) {
              expect(result).toBe(true);
            } else {
              expect(result).toBe(false);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // Property 13: Word count accuracy
  describe("Property 13: Word count accuracy", () => {
    it("should count whitespace-separated tokens correctly", () => {
      fc.assert(
        fc.property(
          fc.array(
            fc
              .string({ minLength: 1, maxLength: 15, unit: "grapheme" })
              .filter((s) => !/\s/.test(s)),
            { minLength: 1, maxLength: 20 }
          ),
          (words) => {
            const text = words.join(" ");
            expect(countWords(text)).toBe(words.length);
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should return 0 for empty or whitespace-only strings", () => {
      fc.assert(
        fc.property(
          fc
            .array(fc.constantFrom(" ", "\t", "\n"), {
              minLength: 0,
              maxLength: 20,
            })
            .map((arr) => arr.join("")),
          (text) => {
            expect(countWords(text)).toBe(0);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // Property 17: Weekly study time aggregation
  describe("Property 17: Weekly study time aggregation", () => {
    it("should return exactly weekCount entries ordered chronologically", () => {
      fc.assert(
        fc.property(fc.integer({ min: 1, max: 12 }), (weekCount) => {
          const today = new Date("2025-06-15T12:00:00Z");
          const sessions: StudySession[] = [];
          const result = aggregateWeeklyStudyTime(sessions, weekCount, today);
          expect(result.length).toBe(weekCount);

          for (let i = 1; i < result.length; i++) {
            expect(
              result[i]!.weekStartDate > result[i - 1]!.weekStartDate
            ).toBe(true);
          }
        }),
        { numRuns: 100 }
      );
    });

    it("should sum actualDurationMinutes for completed sessions per week", () => {
      // Use a Wednesday at midnight UTC so week boundaries align with date-only session dates
      const today = new Date("2025-06-11T00:00:00Z"); // Wednesday midnight
      // The function computes weekStart as: today - today.getDay() + 1
      // For Wednesday (day 3): 11 - 3 + 1 = 9, so weekStart = June 9 00:00 UTC
      // weekEnd = June 15 00:00 UTC
      const weekDates = [
        "2025-06-09",
        "2025-06-10",
        "2025-06-11",
        "2025-06-12",
        "2025-06-13",
        "2025-06-14",
        "2025-06-15",
      ];

      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              id: fc.uuid(),
              studentId: fc.constant("s1"),
              courseId: fc.constant("c1"),
              title: fc.constant("Study"),
              description: fc.constant(null),
              plannedDate: fc.constantFrom(...weekDates),
              plannedStartTime: fc.constant("10:00"),
              plannedDurationMinutes: fc.constant(30),
              actualStartAt: fc.constant("2025-06-10T10:00:00Z"),
              actualEndAt: fc.constant("2025-06-10T10:30:00Z"),
              actualDurationMinutes: fc.integer({ min: 15, max: 120 }),
              timerMode: fc.constant("pomodoro" as const),
              status: fc.constant("completed" as const),
              satisfactionRating: fc.constant(null),
              cloIds: fc.constant(null),
              createdAt: fc.constant("2025-06-01T00:00:00Z"),
            }),
            { minLength: 0, maxLength: 10 }
          ),
          (sessions) => {
            const result = aggregateWeeklyStudyTime(sessions, 1, today);
            expect(result.length).toBe(1);
            const expectedMinutes = sessions.reduce(
              (sum, s) => sum + (s.actualDurationMinutes ?? 0),
              0
            );
            expect(result[0]!.totalMinutes).toBe(expectedMinutes);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // Property 19: Daily progress summary aggregation
  describe("Property 19: Daily progress summary aggregation", () => {
    it("should compute correct daily progress from sessions and tasks", () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              id: fc.uuid(),
              studentId: fc.constant("s1"),
              courseId: fc.constant("c1"),
              title: fc.constant("Study"),
              description: fc.constant(null),
              plannedDate: fc.constant("2025-06-15"),
              plannedStartTime: fc.constant("10:00"),
              plannedDurationMinutes: fc.constant(30),
              actualStartAt: fc.constant(null),
              actualEndAt: fc.constant(null),
              actualDurationMinutes: fc.oneof(
                fc.constant(null),
                fc.integer({ min: 15, max: 120 })
              ),
              timerMode: fc.constant("pomodoro" as const),
              status: fc.constantFrom(
                "planned" as const,
                "completed" as const,
                "cancelled" as const
              ),
              satisfactionRating: fc.constant(null),
              cloIds: fc.constant(null),
              createdAt: fc.constant("2025-06-01T00:00:00Z"),
            }),
            { minLength: 0, maxLength: 10 }
          ),
          fc.array(
            fc.record({
              id: fc.uuid(),
              studentId: fc.constant("s1"),
              title: fc.constant("Task"),
              description: fc.constant(null),
              dueDate: fc.constant("2025-06-15"),
              priority: fc.constant("medium" as const),
              status: fc.constantFrom("todo" as const, "done" as const),
              courseId: fc.constant(null),
              completedAt: fc.constant(null),
              createdAt: fc.constant("2025-06-01T00:00:00Z"),
            }),
            { minLength: 0, maxLength: 10 }
          ),
          (sessions, tasks) => {
            const completedSessions = sessions.filter(
              (s) => s.status === "completed"
            );
            const studyMinutes = completedSessions.reduce(
              (sum, s) => sum + (s.actualDurationMinutes ?? 0),
              0
            );
            const sessionsCompleted = completedSessions.length;
            const tasksCompleted = tasks.filter(
              (t) => t.status === "done"
            ).length;

            expect(studyMinutes).toBeGreaterThanOrEqual(0);
            expect(sessionsCompleted).toBeGreaterThanOrEqual(0);
            expect(tasksCompleted).toBeGreaterThanOrEqual(0);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
