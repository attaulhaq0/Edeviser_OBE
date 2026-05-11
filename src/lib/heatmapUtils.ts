import type {
  HeatmapDay,
  WellnessHabitType,
  DayOfWeekData,
} from "@/types/habits";

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
  return Math.max(Math.floor(containerWidth / numWeeks), 12);
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
