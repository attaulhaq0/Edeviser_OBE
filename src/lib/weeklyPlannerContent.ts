// =============================================================================
// Weekly Planner — Derived & Suggested Content (pure, testable)
// =============================================================================
//
// Builds the seven-day `WeekDay[]` model for the weekly planner, attaching
// derived assignments/deadlines per day and — for days that have no real
// student-created work — a suggested study session so an empty week still
// helps a student plan instead of showing seven blank "No items" columns.
//
// Kept free of React and Supabase so it can be unit-tested directly and reused
// by `WeeklyPlannerPage`. The seven-day model and example-goal builders are
// pure data transforms; the surface-level localization gate delegates to the
// shared `resolveLocalizationGate` policy helper in `@/lib/localization` so the
// planner and timetable share one source of truth for i18n gating. All
// user-facing labels are produced by the consumer; this module only emits
// structured data.
//
// Satisfies Requirements 19.1, 19.2, 19.4, 19.6, 19.7.
// =============================================================================

import type {
  GoalType,
  PlannerTask,
  StudySession,
  SuggestedStudySession,
  UpcomingDeadline,
  WeekDay,
} from "@/types/planner";
import {
  resolveLocalizationGate,
  type LocalizationGateState,
} from "@/lib/localization";

/** Default focus-block length, in minutes, used for suggested sessions. */
export const SUGGESTED_SESSION_MINUTES = 25;

/** Minimal course shape needed to scope a suggested study session. */
export interface SuggestionCourse {
  id: string;
  name: string;
}

export interface BuildPlannerWeekInput {
  /** Monday of the week being rendered (YYYY-MM-DD). */
  weekStartDate: string;
  /** Today's date (YYYY-MM-DD) — suggestions are only offered today or later. */
  todayStr: string;
  sessions: StudySession[];
  tasks: PlannerTask[];
  deadlines: UpcomingDeadline[];
  /** Enrolled courses used to scope suggestions; may be empty. */
  courses: SuggestionCourse[];
  /** Dates (YYYY-MM-DD) that already carry a scheduled review, if any. */
  reviewDates?: readonly string[];
}

/**
 * Add `days` whole days to a `YYYY-MM-DD` string using UTC arithmetic, so the
 * result is stable regardless of the host timezone.
 */
function addDaysToISO(dateStr: string, days: number): string {
  const [year, month, day] = dateStr.split("-").map(Number) as [
    number,
    number,
    number
  ];
  const d = new Date(Date.UTC(year, month - 1, day + days));
  return d.toISOString().split("T")[0] as string;
}

/** True when an ISO `dueDate` (date or datetime) falls on the given day. */
function deadlineFallsOn(dueDate: string, date: string): boolean {
  return typeof dueDate === "string" && dueDate.startsWith(date);
}

/**
 * Produce a single suggested study session for an empty day, rotating through
 * the student's courses so suggestions feel varied across the week. When the
 * student has no courses, a generic (course-less) suggestion is returned.
 */
function buildSuggestion(
  date: string,
  courses: SuggestionCourse[],
  index: number
): SuggestedStudySession {
  const course =
    courses.length > 0 ? courses[index % courses.length] ?? null : null;
  return {
    id: `suggestion-${date}`,
    date,
    courseId: course?.id ?? null,
    courseName: course?.name ?? null,
    durationMinutes: SUGGESTED_SESSION_MINUTES,
  };
}

/**
 * Build the seven-day planner model for a week.
 *
 * - Each day surfaces the sessions, tasks, and deadlines that fall on it
 *   (deadlines are drawn from the student's enrolled courses — R19.1).
 * - A day with no real items (no sessions, tasks, deadlines, or reviews) that
 *   is today or in the future is given one suggested study session instead of
 *   a bare empty state (R19.2). Past empty days carry no suggestion, since a
 *   study session cannot be planned in the past.
 */
export function buildPlannerWeek(input: BuildPlannerWeekInput): WeekDay[] {
  const {
    weekStartDate,
    todayStr,
    sessions,
    tasks,
    deadlines,
    courses,
    reviewDates = [],
  } = input;

  const reviewDateSet = new Set(reviewDates);
  const days: WeekDay[] = [];
  let suggestionIndex = 0;

  for (let i = 0; i < 7; i++) {
    const date = addDaysToISO(weekStartDate, i);
    const daySessions = sessions.filter((s) => s.plannedDate === date);
    const dayTasks = tasks.filter((t) => t.dueDate === date);
    const dayDeadlines = deadlines.filter((d) =>
      deadlineFallsOn(d.dueDate, date)
    );
    const hasReview = reviewDateSet.has(date);

    const hasRealItems =
      daySessions.length > 0 ||
      dayTasks.length > 0 ||
      dayDeadlines.length > 0 ||
      hasReview;

    const day: WeekDay = {
      date,
      sessions: daySessions,
      tasks: dayTasks,
      deadlines: dayDeadlines,
      isToday: date === todayStr,
    };

    if (!hasRealItems && date >= todayStr) {
      day.suggestions = [buildSuggestion(date, courses, suggestionIndex)];
      suggestionIndex += 1;
    }

    days.push(day);
  }

  return days;
}

// -----------------------------------------------------------------------------
// Example goals (shown when a student has set no weekly goals — R19.4)
// -----------------------------------------------------------------------------

export interface ExampleGoal {
  goalType: GoalType;
  targetValue: number;
}

/**
 * Example weekly goals used to guide goal-setting when the student has none.
 * Returned as structured data; the consumer renders localized labels.
 */
export function getExampleGoals(): ExampleGoal[] {
  return [
    { goalType: "study_hours", targetValue: 5 },
    { goalType: "sessions_completed", targetValue: 3 },
    { goalType: "tasks_completed", targetValue: 5 },
  ];
}

// -----------------------------------------------------------------------------
// Bilingual-availability gate (R19.5, R19.6, R19.7)
// -----------------------------------------------------------------------------

/**
 * Planner localization readiness:
 * - `ready`           — both English and Arabic packs are available.
 * - `actions-withheld`— exactly one of the two packs is available; derived
 *                       content and planner actions are withheld until both
 *                       load (R19.6).
 * - `hidden`          — neither pack is available; planner content is hidden
 *                       entirely (R19.7).
 */
export type PlannerLocalizationState = "ready" | "actions-withheld" | "hidden";

/**
 * Decide the planner localization state from per-language pack availability.
 *
 * Pure with respect to its inputs: the caller supplies a predicate (e.g.
 * `i18n.hasResourceBundle`). The en/ar-vs-actions decision is delegated to the
 * centralized `resolveLocalizationGate` policy helper (the planner uses the
 * `withhold-actions` policy) so the timetable and planner share one source of
 * truth for surface-level i18n gating; only the `blocked → hidden` label is
 * remapped to the planner's existing contract.
 */
export function getPlannerLocalizationState(
  hasBundle: (language: string) => boolean
): PlannerLocalizationState {
  const gate: LocalizationGateState = resolveLocalizationGate(
    hasBundle,
    "withhold-actions"
  );
  return gate === "blocked" ? "hidden" : gate;
}
