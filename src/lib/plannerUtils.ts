// =============================================================================
// Weekly Planner & Today View — Pure Utility Functions
// =============================================================================

import type {
  GoalProgress,
  PlannerTask,
  PomodoroIntervalType,
  StudySession,
  TaskPriority,
  TimelineItem,
  TimeOfDay,
  WeeklyGoal,
  WeeklyStudyData,
} from "@/types/planner";

// -----------------------------------------------------------------------------
// XP Calculation
// -----------------------------------------------------------------------------

/**
 * Calculate XP for a completed study session.
 * Base 20 + 5 per additional 15-min block, cap 50. Evidence bonus 10.
 * Zero XP for sessions < 15 min.
 */
export function calculateSessionXP(
  actualDurationMinutes: number,
  hasEvidence: boolean
): number {
  if (actualDurationMinutes < 15) return 0;
  const blocks = Math.floor(actualDurationMinutes / 15);
  const baseXP = 20 + (blocks - 1) * 5;
  const cappedXP = Math.min(baseXP, 50);
  const evidenceBonus = hasEvidence ? 10 : 0;
  return cappedXP + evidenceBonus;
}

// -----------------------------------------------------------------------------
// Today View Grouping
// -----------------------------------------------------------------------------

/** Group timeline items by time of day. Items with null time go to 'todo'. */
export function groupByTimeOfDay(
  items: TimelineItem[]
): Record<TimeOfDay | "todo", TimelineItem[]> {
  const groups: Record<TimeOfDay | "todo", TimelineItem[]> = {
    morning: [],
    afternoon: [],
    evening: [],
    todo: [],
  };
  for (const item of items) {
    if (!item.time) {
      groups.todo.push(item);
      continue;
    }
    const hour = parseInt(item.time.split(":")[0] ?? "0", 10);
    if (hour < 12) groups.morning.push(item);
    else if (hour < 17) groups.afternoon.push(item);
    else groups.evening.push(item);
  }
  return groups;
}

// -----------------------------------------------------------------------------
// Task Sorting
// -----------------------------------------------------------------------------

/** Sort tasks by priority: high → medium → low. */
export function sortTasksByPriority(tasks: PlannerTask[]): PlannerTask[] {
  const order: Record<TaskPriority, number> = { high: 0, medium: 1, low: 2 };
  return [...tasks].sort((a, b) => order[a.priority] - order[b.priority]);
}

// -----------------------------------------------------------------------------
// Deadline Urgency
// -----------------------------------------------------------------------------

/** Determine deadline urgency based on hours until due. */
export function getDeadlineUrgency(
  dueDate: string,
  now: Date
): "red" | "yellow" | "green" {
  const due = new Date(dueDate);
  const hoursUntilDue = (due.getTime() - now.getTime()) / (1000 * 60 * 60);
  if (hoursUntilDue <= 24) return "red";
  if (hoursUntilDue <= 72) return "yellow";
  return "green";
}

// -----------------------------------------------------------------------------
// Session Status
// -----------------------------------------------------------------------------

/** Check if a session is missed (past scheduled time, not started). */
export function isSessionMissed(session: StudySession, now: Date): boolean {
  if (session.status !== "planned") return false;
  const sessionDateTime = new Date(
    `${session.plannedDate}T${session.plannedStartTime}`
  );
  const endTime = new Date(
    sessionDateTime.getTime() + session.plannedDurationMinutes * 60 * 1000
  );
  return now > endTime;
}

// -----------------------------------------------------------------------------
// Goal Progress
// -----------------------------------------------------------------------------

/** Calculate goal progress from sessions and tasks. */
export function calculateGoalProgress(
  goal: WeeklyGoal,
  sessions: StudySession[],
  tasks: PlannerTask[]
): GoalProgress {
  let currentValue = 0;
  switch (goal.goalType) {
    case "study_hours":
      currentValue =
        sessions
          .filter((s) => s.status === "completed")
          .reduce((sum, s) => sum + (s.actualDurationMinutes ?? 0), 0) / 60;
      break;
    case "sessions_completed":
      currentValue = sessions.filter((s) => s.status === "completed").length;
      break;
    case "tasks_completed":
      currentValue = tasks.filter((t) => t.status === "completed").length;
      break;
  }
  const percentage =
    goal.targetValue > 0
      ? Math.min(Math.round((currentValue / goal.targetValue) * 100), 100)
      : 0;
  return {
    goal,
    currentValue,
    percentage,
    isMet: currentValue >= goal.targetValue,
  };
}

// -----------------------------------------------------------------------------
// Timer Display
// -----------------------------------------------------------------------------

/** Format timer display as MM:SS. */
export function formatTimerDisplay(remainingMs: number): string {
  const totalSeconds = Math.max(0, Math.ceil(remainingMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(
    2,
    "0"
  )}`;
}

// -----------------------------------------------------------------------------
// Duration Calculation
// -----------------------------------------------------------------------------

/** Calculate actual duration in minutes excluding paused time. */
export function calculateActualDuration(
  startedAt: number,
  endedAt: number,
  totalPausedMs: number
): number {
  const totalMs = endedAt - startedAt - totalPausedMs;
  return Math.max(0, Math.round(totalMs / 60000));
}

// -----------------------------------------------------------------------------
// Week Utilities
// -----------------------------------------------------------------------------

/** Get the Monday of the week containing the given date (YYYY-MM-DD). */
export function getWeekStartDate(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d.toISOString().split("T")[0] as string;
}

/** Check if a week is in the past (for preventing goal edits). */
export function isWeekInPast(weekStartDate: string, today: Date): boolean {
  const weekEnd = new Date(weekStartDate);
  weekEnd.setDate(weekEnd.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);
  return today > weekEnd;
}

// -----------------------------------------------------------------------------
// Text Utilities
// -----------------------------------------------------------------------------

/** Count words in a text string. */
export function countWords(text: string): number {
  return text
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 0).length;
}

// -----------------------------------------------------------------------------
// Analytics
// -----------------------------------------------------------------------------

/** Compute weekly study time aggregation for chart data. */
export function aggregateWeeklyStudyTime(
  sessions: StudySession[],
  weekCount: number,
  today: Date
): WeeklyStudyData[] {
  const result: WeeklyStudyData[] = [];
  for (let i = weekCount - 1; i >= 0; i--) {
    const weekStart = new Date(today);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1 - i * 7);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    const weekStartStr = weekStart.toISOString().split("T")[0] as string;
    const totalMinutes = sessions
      .filter((s) => {
        if (s.status !== "completed") return false;
        const d = new Date(s.plannedDate);
        return d >= weekStart && d <= weekEnd;
      })
      .reduce((sum, s) => sum + (s.actualDurationMinutes ?? 0), 0);
    result.push({ weekStartDate: weekStartStr, totalMinutes });
  }
  return result;
}

// -----------------------------------------------------------------------------
// Pomodoro
// -----------------------------------------------------------------------------

/** Determine Pomodoro interval type based on completed intervals. */
export function getPomodoroIntervalType(
  completedIntervals: number
): PomodoroIntervalType {
  if (completedIntervals > 0 && completedIntervals % 4 === 0)
    return "long_break";
  return completedIntervals % 2 === 0 ? "work" : "break";
}

/** Get Pomodoro interval duration in milliseconds. */
export function getPomodoroIntervalDuration(
  intervalType: PomodoroIntervalType
): number {
  switch (intervalType) {
    case "work":
      return 25 * 60 * 1000;
    case "break":
      return 5 * 60 * 1000;
    case "long_break":
      return 15 * 60 * 1000;
  }
}

// -----------------------------------------------------------------------------
// Spaced Repetition Review Dates
// -----------------------------------------------------------------------------

import type {
  SimpleReflectionValues,
  GibbsReflectionValues,
  QualityCategory,
} from "@/types/planner";

/** Generate 3 review dates at 1, 3, and 7-day intervals from the given date. */
export function generateReviewDates(
  dateStr: string
): Array<{ reviewDate: string; intervalDays: number }> {
  const intervals = [1, 3, 7];
  const [year, month, day] = dateStr.split("-").map(Number) as [
    number,
    number,
    number
  ];
  return intervals.map((intervalDays) => {
    const d = new Date(Date.UTC(year, month - 1, day + intervalDays));
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, "0");
    const dd = String(d.getUTCDate()).padStart(2, "0");
    return { reviewDate: `${y}-${m}-${dd}`, intervalDays };
  });
}

/** Check if a review cycle is complete (all 3 intervals completed). */
export function isReviewCycleComplete(
  reviews: Array<{ intervalDays: number; status: string }>
): boolean {
  const requiredIntervals = [1, 3, 7];
  if (reviews.length === 0) return false;
  return requiredIntervals.every((interval) =>
    reviews.some((r) => r.intervalDays === interval && r.status === "completed")
  );
}

// -----------------------------------------------------------------------------
// Reflection Template Concatenation
// -----------------------------------------------------------------------------

const simpleLabels: Record<keyof SimpleReflectionValues, string> = {
  whatWentWell: "## What went well?",
  whatWasChallenging: "## What was challenging?",
  whatWillChange: "## What will I do differently?",
};

const gibbsLabels: Record<keyof GibbsReflectionValues, string> = {
  description: "## Description",
  feelings: "## Feelings",
  evaluation: "## Evaluation",
  analysis: "## Analysis",
  conclusion: "## Conclusion",
  actionPlan: "## Action Plan",
};

/**
 * Concatenate reflection template values into a formatted string.
 * Only includes sections with non-empty content.
 */
export function concatenateReflectionTemplate(
  type: "simple" | "gibbs",
  values: SimpleReflectionValues | GibbsReflectionValues
): string {
  if (type === "simple") {
    const v = values as SimpleReflectionValues;
    const sections: string[] = [];
    for (const key of Object.keys(simpleLabels) as Array<
      keyof SimpleReflectionValues
    >) {
      const text = v[key]?.trim();
      if (text) {
        sections.push(`${simpleLabels[key]}\n${text}`);
      }
    }
    return sections.join("\n\n");
  }

  const v = values as GibbsReflectionValues;
  const sections: string[] = [];
  for (const key of Object.keys(gibbsLabels) as Array<
    keyof GibbsReflectionValues
  >) {
    const text = v[key]?.trim();
    if (text) {
      sections.push(`${gibbsLabels[key]}\n${text}`);
    }
  }
  return sections.join("\n\n");
}

// -----------------------------------------------------------------------------
// Quality Category
// -----------------------------------------------------------------------------

/** Map a quality score to a category. */
export function getQualityCategory(score: number | null): QualityCategory {
  if (score === null) return "needs_detail";
  if (score >= 80) return "thoughtful";
  if (score >= 30) return "good_effort";
  return "needs_detail";
}

// -----------------------------------------------------------------------------
// Reflection XP Calculation
// -----------------------------------------------------------------------------

/**
 * Calculate quality-adjusted reflection XP.
 *
 * - null score → base XP (capped)
 * - score < 30 → 5 XP (minimum)
 * - score 30-79 → base XP (capped)
 * - score >= 80 → base + 10 bonus (capped)
 *
 * Relevance and depth bonuses add 5 each when >= 70.
 * Session cap: 30, Journal cap: 40.
 */
export function calculateReflectionXP(
  baseXP: number,
  score: number | null,
  relevance: number | null,
  depth: number | null,
  isJournal: boolean
): number {
  const cap = isJournal ? 40 : 30;

  // Null score → return base capped
  if (score === null) {
    return Math.min(baseXP, cap);
  }

  // Low quality → minimum 5 XP
  if (score < 30) {
    return 5;
  }

  let xp = baseXP;

  // High quality bonus
  if (score >= 80) {
    xp += 10;
  }

  // Relevance bonus
  if (relevance !== null && relevance >= 70) {
    xp += 5;
  }

  // Depth bonus
  if (depth !== null && depth >= 70) {
    xp += 5;
  }

  return Math.min(xp, cap);
}

// -----------------------------------------------------------------------------
// Timer ARIA Announcement
// -----------------------------------------------------------------------------

const ANNOUNCEMENT_MINUTES = [1, 5, 10, 15, 20, 25, 30];

/**
 * Returns an announcement string at specific minute marks, null otherwise.
 * Only announces at exact minute boundaries (no seconds remainder).
 */
export function getTimerAnnouncement(remainingMs: number): string | null {
  if (remainingMs <= 0) return null;

  const totalSeconds = Math.round(remainingMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  // Only announce at exact minute marks (no seconds)
  if (seconds !== 0) return null;

  if (!ANNOUNCEMENT_MINUTES.includes(minutes)) return null;

  if (minutes === 1) return "1 minute remaining";
  return `${minutes} minutes remaining`;
}
