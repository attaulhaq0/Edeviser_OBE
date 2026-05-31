import type {
  HeatmapDay,
  HabitType,
  WellnessHabitType,
  DayOfWeekData,
} from "@/types/habits";
import { XP_SCHEDULE } from "@/lib/xpSchedule";
import type { XPSource } from "@/types/app";

/**
 * XP transaction sources that represent daily-habit completions. Used to scope
 * the per-day XP shown on the heatmap to habit-earned XP only (R7.4), excluding
 * unrelated sources such as quiz/grade/badge XP.
 */
export const HABIT_XP_SOURCES: readonly XPSource[] = [
  "login",
  "submission",
  "journal",
  "perfect_day",
  "wellness_habit",
] as const;

const HABIT_XP_SOURCE_SET = new Set<string>(HABIT_XP_SOURCES);

/** XP awarded for completing all four academic habits in a single day. */
export const PERFECT_DAY_XP = XP_SCHEDULE.perfect_day;

/** Number of academic habits tracked per day (Login, Submit, Journal, Read). */
export const ACADEMIC_HABITS_PER_DAY = 4;

export interface HabitXpRecord {
  source: string;
  amount: number;
  /** ISO date string (YYYY-MM-DD) the XP was recorded on. */
  date: string;
}

/**
 * Aggregates habit-related XP transactions into a per-date total. Only sources
 * in {@link HABIT_XP_SOURCES} contribute, so the value shown for a day equals
 * the XP recorded for that day's habit completions (R7.1, R7.4).
 */
export const aggregateHabitXpByDate = (
  records: HabitXpRecord[]
): Record<string, number> => {
  const byDate: Record<string, number> = {};
  for (const record of records) {
    if (!HABIT_XP_SOURCE_SET.has(record.source)) continue;
    if (!record.date) continue;
    byDate[record.date] = (byDate[record.date] ?? 0) + record.amount;
  }
  return byDate;
};

export interface HabitSummary {
  /** Habit type completed most often across the period, or null when none. */
  bestHabit: HabitType | null;
  /** Completion count for the best habit. */
  bestHabitCount: number;
  /** Overall academic-habit completion rate as a percentage (0–100). */
  completionRate: number;
}

// Fixed evaluation order gives a deterministic best-habit tie-break.
const HABIT_PRIORITY: HabitType[] = [
  "login",
  "submit",
  "journal",
  "read",
  "meditation",
  "hydration",
  "exercise",
  "sleep",
];

/**
 * Computes the best-performing habit and overall completion rate across the
 * provided days (R7.2). Completion rate is based on the four academic habits.
 */
export const computeHabitSummary = (days: HeatmapDay[]): HabitSummary => {
  const counts = new Map<HabitType, number>();
  let academicCompletions = 0;

  for (const day of days) {
    academicCompletions += day.academicCount;
    for (const habit of day.habits) {
      counts.set(habit.type, (counts.get(habit.type) ?? 0) + 1);
    }
  }

  let bestHabit: HabitType | null = null;
  let bestHabitCount = 0;
  for (const habit of HABIT_PRIORITY) {
    const count = counts.get(habit) ?? 0;
    if (count > bestHabitCount) {
      bestHabit = habit;
      bestHabitCount = count;
    }
  }

  const completionRate = computeCompletionRate(
    academicCompletions,
    ACADEMIC_HABITS_PER_DAY,
    days.length
  );

  return { bestHabit, bestHabitCount, completionRate };
};

export const getIntensityLevel = (count: number): number => {
  if (count === 0) return 0;
  if (count === 1) return 1;
  if (count === 2) return 2;
  if (count === 3) return 3;
  return 4;
};

export const computeLongestStreak = (days: HeatmapDay[]): number => {
  let longest = 0;
  let current = 0;
  for (let i = 0; i < days.length; i++) {
    const day = days[i]!;
    if (day.academicCount > 0) {
      current++;
      longest = Math.max(longest, current);
    } else {
      current = 0;
    }
  }
  return longest;
};

export const computeConsistencyScore = (
  days: HeatmapDay[],
  totalDays: number
): number => {
  if (totalDays === 0) return 0;
  const activeDays = days.filter((d) => d.totalCount > 0).length;
  return Math.round((activeDays / totalDays) * 100);
};

export const computeCompletionRate = (
  totalCompleted: number,
  possiblePerDay: number,
  daysInPeriod: number
): number => {
  const totalPossible = possiblePerDay * daysInPeriod;
  if (totalPossible === 0) return 0;
  return Math.min(Math.round((totalCompleted / totalPossible) * 100), 100);
};

export const computeDayOfWeekAverages = (
  days: HeatmapDay[]
): DayOfWeekData[] => {
  const dayNames = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  const sums = new Array(7).fill(0) as number[];
  const counts = new Array(7).fill(0) as number[];
  for (const day of days) {
    const dow = new Date(day.date + "T00:00:00").getDay();
    sums[dow] = (sums[dow] ?? 0) + day.totalCount;
    counts[dow] = (counts[dow] ?? 0) + 1;
  }
  return dayNames.map((name, i) => ({
    day: name,
    avgCompletions:
      (counts[i] ?? 0) > 0
        ? Math.round(((sums[i] ?? 0) / (counts[i] ?? 1)) * 100) / 100
        : 0,
  }));
};

export const getBestDay = (averages: DayOfWeekData[]): DayOfWeekData | null => {
  if (averages.length === 0) return null;
  return averages.reduce((best, current) =>
    current.avgCompletions > best.avgCompletions ? current : best
  );
};

export const computeCellSize = (
  containerWidth: number,
  numWeeks: number
): number => {
  if (numWeeks <= 0) return 12;
  // Account for the per-cell gap (2px) when calculating cell size.
  // Total horizontal space = numWeeks * cellSize + numWeeks * CELL_GAP
  // → cellSize = (containerWidth - numWeeks * CELL_GAP) / numWeeks
  const CELL_GAP = 2;
  const available = Math.max(0, containerWidth - numWeeks * CELL_GAP);
  // Cap at 16px so cells stay visually square; floor the result so subpixel
  // rounding can't push the SVG wider than the container (which would cause
  // a ResizeObserver feedback loop).
  return Math.max(Math.min(Math.floor(available / numWeeks), 16), 12);
};

export const generateMonthLabels = (
  startDate: string,
  endDate: string
): Array<{ month: string; weekIndex: number }> => {
  const labels: Array<{ month: string; weekIndex: number }> = [];
  const start = new Date(startDate + "T00:00:00");
  const end = new Date(endDate + "T00:00:00");
  const monthNames = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];

  let currentMonth = -1;
  const cursor = new Date(start);
  while (cursor <= end) {
    const month = cursor.getMonth();
    if (month !== currentMonth) {
      currentMonth = month;
      const daysSinceStart = Math.floor(
        (cursor.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
      );
      const weekIndex = Math.floor(daysSinceStart / 7);
      labels.push({ month: monthNames[month] ?? "", weekIndex });
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return labels;
};

export const generateGridDimensions = (
  startDate: string,
  endDate: string
): { rows: 7; columns: number } => {
  const start = new Date(startDate + "T00:00:00");
  const end = new Date(endDate + "T00:00:00");
  const totalDays =
    Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  const columns = Math.ceil(totalDays / 7);
  return { rows: 7, columns };
};

export const isDateFuture = (date: string): boolean => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(date + "T00:00:00");
  return d > today;
};

export const getFilterOptions = (
  enabledWellnessHabits: WellnessHabitType[]
): string[] => {
  const base = ["All Habits", "Login", "Submit", "Journal", "Read"];
  const wellnessLabels: Record<WellnessHabitType, string> = {
    meditation: "Meditation",
    hydration: "Hydration",
    exercise: "Exercise",
    sleep: "Sleep",
  };
  return [...base, ...enabledWellnessHabits.map((h) => wellnessLabels[h])];
};

export const generateAriaLabel = (date: string, count: number): string => {
  const d = new Date(date + "T00:00:00");
  const formatted = d.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  return `${formatted}: ${count} habit${count !== 1 ? "s" : ""} completed`;
};
