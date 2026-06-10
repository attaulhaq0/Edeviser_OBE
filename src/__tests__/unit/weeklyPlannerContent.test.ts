// =============================================================================
// Unit Tests — weeklyPlannerContent (derived + suggested planner content)
// Covers R19.1 (derived per-day items), R19.2 (suggested sessions on empty
// days), R19.4 (example goals), and R19.6/19.7 (bilingual gate).
// =============================================================================

import { describe, it, expect } from "vitest";
import {
  buildPlannerWeek,
  getExampleGoals,
  getPlannerLocalizationState,
  SUGGESTED_SESSION_MINUTES,
} from "@/lib/weeklyPlannerContent";
import type {
  PlannerTask,
  StudySession,
  UpcomingDeadline,
} from "@/types/planner";

// ─── Factories ───────────────────────────────────────────────────────────────

const makeSession = (overrides: Partial<StudySession> = {}): StudySession => ({
  id: "session-1",
  studentId: "student-1",
  courseId: "course-1",
  courseName: "Math 101",
  title: "Review",
  description: null,
  plannedDate: "2025-06-16",
  plannedStartTime: "09:00",
  plannedDurationMinutes: 25,
  actualStartAt: null,
  actualEndAt: null,
  actualDurationMinutes: null,
  timerMode: "pomodoro",
  status: "planned",
  satisfactionRating: null,
  cloIds: null,
  createdAt: "2025-06-15T00:00:00Z",
  ...overrides,
});

const makeTask = (overrides: Partial<PlannerTask> = {}): PlannerTask => ({
  id: "task-1",
  studentId: "student-1",
  title: "Read notes",
  description: null,
  dueDate: "2025-06-16",
  priority: "medium",
  status: "todo",
  courseId: "course-1",
  courseName: "Math 101",
  completedAt: null,
  createdAt: "2025-06-15T00:00:00Z",
  ...overrides,
});

const makeDeadline = (
  overrides: Partial<UpcomingDeadline> = {}
): UpcomingDeadline => ({
  id: "deadline-1",
  title: "Assignment 3",
  courseName: "Physics 201",
  dueDate: "2025-06-18T23:59:00Z",
  urgency: "yellow",
  ...overrides,
});

// Week of Mon 2025-06-16 .. Sun 2025-06-22
const WEEK_START = "2025-06-16";

describe("buildPlannerWeek", () => {
  it("builds exactly 7 days starting from the week start", () => {
    const days = buildPlannerWeek({
      weekStartDate: WEEK_START,
      todayStr: WEEK_START,
      sessions: [],
      tasks: [],
      deadlines: [],
      courses: [],
    });
    expect(days).toHaveLength(7);
    expect(days[0]!.date).toBe("2025-06-16");
    expect(days[6]!.date).toBe("2025-06-22");
  });

  it("places sessions, tasks, and deadlines on their matching day (R19.1)", () => {
    const days = buildPlannerWeek({
      weekStartDate: WEEK_START,
      todayStr: WEEK_START,
      sessions: [makeSession({ plannedDate: "2025-06-17" })],
      tasks: [makeTask({ dueDate: "2025-06-18" })],
      deadlines: [makeDeadline({ dueDate: "2025-06-19T10:00:00Z" })],
      courses: [],
    });

    const tue = days.find((d) => d.date === "2025-06-17")!;
    const wed = days.find((d) => d.date === "2025-06-18")!;
    const thu = days.find((d) => d.date === "2025-06-19")!;

    expect(tue.sessions).toHaveLength(1);
    expect(wed.tasks).toHaveLength(1);
    expect(thu.deadlines).toHaveLength(1);
  });

  it("adds a suggested session to empty future/today days (R19.2)", () => {
    const days = buildPlannerWeek({
      weekStartDate: WEEK_START,
      todayStr: WEEK_START,
      sessions: [],
      tasks: [],
      deadlines: [],
      courses: [{ id: "course-1", name: "Math 101" }],
    });

    for (const day of days) {
      expect(day.suggestions).toBeDefined();
      expect(day.suggestions).toHaveLength(1);
      const suggestion = day.suggestions![0]!;
      expect(suggestion.date).toBe(day.date);
      expect(suggestion.durationMinutes).toBe(SUGGESTED_SESSION_MINUTES);
      expect(suggestion.courseId).toBe("course-1");
    }
  });

  it("does not suggest on days that already have real items", () => {
    const days = buildPlannerWeek({
      weekStartDate: WEEK_START,
      todayStr: WEEK_START,
      sessions: [makeSession({ plannedDate: "2025-06-16" })],
      tasks: [],
      deadlines: [],
      courses: [{ id: "course-1", name: "Math 101" }],
    });

    const monday = days.find((d) => d.date === "2025-06-16")!;
    expect(monday.suggestions).toBeUndefined();

    const tuesday = days.find((d) => d.date === "2025-06-17")!;
    expect(tuesday.suggestions).toHaveLength(1);
  });

  it("does not suggest on past days (cannot plan in the past)", () => {
    // today is Wed 2025-06-18 — Mon/Tue are in the past
    const days = buildPlannerWeek({
      weekStartDate: WEEK_START,
      todayStr: "2025-06-18",
      sessions: [],
      tasks: [],
      deadlines: [],
      courses: [{ id: "course-1", name: "Math 101" }],
    });

    expect(
      days.find((d) => d.date === "2025-06-16")!.suggestions
    ).toBeUndefined();
    expect(
      days.find((d) => d.date === "2025-06-17")!.suggestions
    ).toBeUndefined();
    // today and later get suggestions
    expect(days.find((d) => d.date === "2025-06-18")!.suggestions).toHaveLength(
      1
    );
    expect(days.find((d) => d.date === "2025-06-22")!.suggestions).toHaveLength(
      1
    );
  });

  it("does not suggest on empty days that carry a scheduled review", () => {
    const days = buildPlannerWeek({
      weekStartDate: WEEK_START,
      todayStr: WEEK_START,
      sessions: [],
      tasks: [],
      deadlines: [],
      courses: [{ id: "course-1", name: "Math 101" }],
      reviewDates: ["2025-06-20"],
    });

    expect(
      days.find((d) => d.date === "2025-06-20")!.suggestions
    ).toBeUndefined();
  });

  it("rotates suggestions across the student's courses", () => {
    const days = buildPlannerWeek({
      weekStartDate: WEEK_START,
      todayStr: WEEK_START,
      sessions: [],
      tasks: [],
      deadlines: [],
      courses: [
        { id: "c1", name: "Course One" },
        { id: "c2", name: "Course Two" },
      ],
    });

    const courseIds = days.map((d) => d.suggestions![0]!.courseId);
    expect(courseIds[0]).toBe("c1");
    expect(courseIds[1]).toBe("c2");
    expect(courseIds[2]).toBe("c1");
  });

  it("falls back to course-less suggestions when no courses exist", () => {
    const days = buildPlannerWeek({
      weekStartDate: WEEK_START,
      todayStr: WEEK_START,
      sessions: [],
      tasks: [],
      deadlines: [],
      courses: [],
    });

    expect(days[0]!.suggestions![0]!.courseId).toBeNull();
    expect(days[0]!.suggestions![0]!.courseName).toBeNull();
  });
});

describe("getExampleGoals", () => {
  it("returns three distinct goal-type examples with positive targets (R19.4)", () => {
    const examples = getExampleGoals();
    expect(examples).toHaveLength(3);
    const types = examples.map((e) => e.goalType);
    expect(new Set(types).size).toBe(3);
    for (const example of examples) {
      expect(example.targetValue).toBeGreaterThan(0);
    }
  });
});

describe("getPlannerLocalizationState", () => {
  it("is ready when both en and ar are available", () => {
    expect(getPlannerLocalizationState(() => true)).toBe("ready");
  });

  it("withholds actions when exactly one pack is available (R19.6)", () => {
    expect(getPlannerLocalizationState((lng) => lng === "en")).toBe(
      "actions-withheld"
    );
    expect(getPlannerLocalizationState((lng) => lng === "ar")).toBe(
      "actions-withheld"
    );
  });

  it("hides content when neither pack is available (R19.7)", () => {
    expect(getPlannerLocalizationState(() => false)).toBe("hidden");
  });
});
