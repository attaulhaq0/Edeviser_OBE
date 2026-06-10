import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { queryKeys } from "@/lib/queryKeys";
import {
  computeLongestStreak,
  aggregateHabitXpByDate,
} from "@/lib/heatmapUtils";
import type {
  DateRange,
  HeatmapDay,
  HeatmapSummary,
  CompletedHabit,
  AcademicHabitType,
  WellnessHabitType,
  LevelProgressionPoint,
} from "@/types/habits";

const ACADEMIC_HABITS: AcademicHabitType[] = [
  "login",
  "submit",
  "journal",
  "read",
];
const WELLNESS_HABITS: WellnessHabitType[] = [
  "meditation",
  "hydration",
  "exercise",
  "sleep",
];

const isAcademicHabit = (type: string): type is AcademicHabitType =>
  (ACADEMIC_HABITS as string[]).includes(type);

const isWellnessHabit = (type: string): type is WellnessHabitType =>
  (WELLNESS_HABITS as string[]).includes(type);

export const useHeatmapData = (
  studentId: string | undefined,
  semesterRange: DateRange,
  filter?: string
) => {
  return useQuery({
    queryKey: queryKeys.heatmap.data(
      studentId ?? "",
      semesterRange.start,
      semesterRange.end,
      filter
    ),
    enabled: !!studentId && !!semesterRange.start && !!semesterRange.end,
    queryFn: async (): Promise<HeatmapDay[]> => {
      if (!studentId) return [];

      const dateMap = new Map<string, CompletedHabit[]>();

      // Determine if we're filtering to a specific habit
      const specificFilter =
        filter && filter !== "all" ? filter.toLowerCase() : undefined;
      const filterIsAcademic = specificFilter
        ? isAcademicHabit(specificFilter)
        : false;
      const filterIsWellness = specificFilter
        ? isWellnessHabit(specificFilter)
        : false;

      // Fetch academic habit logs (unless filtering to a specific wellness habit)
      // Academic habits live in the canonical long-format `habit_logs` table
      // (one row per completed habit per UTC day), keyed by `habit_type`.
      if (!filterIsWellness) {
        const { data: academicRows, error: academicError } = await supabase
          .from("habit_logs")
          .select("date, habit_type, completed_at, created_at")
          .eq("student_id", studentId)
          .gte("date", semesterRange.start)
          .lte("date", semesterRange.end);

        if (academicError) throw academicError;

        for (const row of academicRows ?? []) {
          if (!isAcademicHabit(row.habit_type)) continue;
          const habitType: AcademicHabitType = row.habit_type;

          if (
            filterIsAcademic &&
            specificFilter &&
            specificFilter !== habitType
          )
            continue;

          const date = row.date;
          const habits = dateMap.get(date) ?? [];
          habits.push({
            type: habitType,
            category: "academic",
            completedAt: row.completed_at ?? row.created_at,
          });
          dateMap.set(date, habits);
        }
      }

      // Fetch wellness habit logs (unless filtering to a specific academic habit)
      if (!filterIsAcademic) {
        let wellnessQuery = supabase
          .from("wellness_habit_logs")
          .select("date, wellness_type, value, completed_at")
          .eq("student_id", studentId)
          .gte("date", semesterRange.start)
          .lte("date", semesterRange.end);

        if (filterIsWellness && specificFilter) {
          wellnessQuery = wellnessQuery.eq(
            "wellness_type",
            specificFilter as WellnessHabitType
          );
        }

        const { data: wellnessLogs, error: wellnessError } =
          await wellnessQuery;
        if (wellnessError) throw wellnessError;

        for (const log of wellnessLogs ?? []) {
          const date = log.date as string;
          const habits = dateMap.get(date) ?? [];
          habits.push({
            type: log.wellness_type as WellnessHabitType,
            category: "wellness",
            value: log.value != null ? Number(log.value) : undefined,
            completedAt: log.completed_at as string,
          });
          dateMap.set(date, habits);
        }
      }

      // Build HeatmapDay array for every date in the range
      const days: HeatmapDay[] = [];
      const cursor = new Date(semesterRange.start + "T00:00:00");
      const end = new Date(semesterRange.end + "T00:00:00");

      while (cursor <= end) {
        const dateStr = cursor.toISOString().slice(0, 10);
        const habits = dateMap.get(dateStr) ?? [];
        const academicCount = habits.filter(
          (h) => h.category === "academic"
        ).length;
        const wellnessCount = habits.filter(
          (h) => h.category === "wellness"
        ).length;

        days.push({
          date: dateStr,
          academicCount,
          wellnessCount,
          totalCount: academicCount + wellnessCount,
          habits,
        });

        cursor.setDate(cursor.getDate() + 1);
      }

      return days;
    },
  });
};

/**
 * Fetches habit-related XP transactions for the student within the semester
 * range and aggregates them into a per-date total. Backs the heatmap tooltip
 * and bottom sheet so each day shows its actually-recorded habit XP rather than
 * a hardcoded zero (R7.1, R7.4).
 */
export const useHeatmapXpByDate = (
  studentId: string | undefined,
  semesterRange: DateRange
) => {
  return useQuery({
    queryKey: queryKeys.heatmap.xpByDate(
      studentId ?? "",
      semesterRange.start,
      semesterRange.end
    ),
    enabled: !!studentId && !!semesterRange.start && !!semesterRange.end,
    queryFn: async (): Promise<Record<string, number>> => {
      if (!studentId) return {};

      const startIso = semesterRange.start + "T00:00:00.000Z";
      // Include the entire end day by extending to the next midnight.
      const endExclusive = new Date(semesterRange.end + "T00:00:00.000Z");
      endExclusive.setUTCDate(endExclusive.getUTCDate() + 1);

      const { data, error } = await supabase
        .from("xp_transactions")
        .select("source, xp_amount, created_at")
        .eq("student_id", studentId)
        .gte("created_at", startIso)
        .lt("created_at", endExclusive.toISOString());

      if (error) throw error;

      const records = (data ?? []).map((row) => ({
        source: row.source,
        amount: row.xp_amount,
        date:
          typeof row.created_at === "string" ? row.created_at.slice(0, 10) : "",
      }));

      return aggregateHabitXpByDate(records);
    },
  });
};

export const useHeatmapSummary = (
  studentId: string | undefined,
  heatmapData: HeatmapDay[] | undefined
) => {
  return useQuery({
    queryKey: queryKeys.heatmap.summary(studentId ?? ""),
    enabled: !!studentId && !!heatmapData,
    queryFn: async (): Promise<HeatmapSummary> => {
      // Fetch current streak from student_gamification
      let currentStreak = 0;
      if (studentId) {
        const { data, error } = await supabase
          .from("student_gamification")
          .select("streak_current")
          .eq("student_id", studentId)
          .maybeSingle();

        if (error) throw error;
        currentStreak = data?.streak_current ?? 0;
      }

      const days = heatmapData ?? [];
      const longestStreak = computeLongestStreak(days);
      const totalActiveDays = days.filter((d) => d.totalCount > 0).length;

      return {
        currentStreak,
        longestStreak,
        totalActiveDays,
      };
    },
  });
};

/**
 * Fetches the student's habit level history for per-date level resolution.
 * Used by HeatmapGrid to determine the level active on each date.
 * Falls back to empty array if the table doesn't exist yet.
 */
export const useHeatmapLevelHistory = (
  studentId: string | undefined,
  semesterRange: DateRange
) => {
  return useQuery({
    queryKey: queryKeys.heatmap.levelHistory(
      studentId ?? "",
      semesterRange.start,
      semesterRange.end
    ),
    enabled: !!studentId && !!semesterRange.start && !!semesterRange.end,
    queryFn: async (): Promise<LevelProgressionPoint[]> => {
      if (!studentId) return [];

      try {
        const { data } = await supabase
          .from("student_habit_level_history" as never)
          .select("changed_at, new_level")
          .eq("student_id", studentId)
          .lte("changed_at", semesterRange.end)
          .order("changed_at", { ascending: true });

        if (!Array.isArray(data)) return [];

        return data
          .map((row) => {
            const r = row as Record<string, unknown>;
            const date =
              typeof r.changed_at === "string" ? r.changed_at.slice(0, 10) : "";
            const level = typeof r.new_level === "number" ? r.new_level : 4;
            return {
              date,
              level: (level >= 1 && level <= 4 ? level : 4) as 1 | 2 | 3 | 4,
            };
          })
          .filter((p) => p.date !== "");
      } catch {
        // Table may not exist yet — return empty history (defaults to Level 4)
        return [];
      }
    },
  });
};
