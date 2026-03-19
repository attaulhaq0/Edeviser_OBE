import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { queryKeys } from '@/lib/queryKeys';
import { computeLongestStreak } from '@/lib/heatmapUtils';
import type {
  DateRange,
  HeatmapDay,
  HeatmapSummary,
  CompletedHabit,
  HabitType,
  AcademicHabitType,
  WellnessHabitType,
  LevelProgressionPoint,
} from '@/types/habits';

const ACADEMIC_HABITS: AcademicHabitType[] = ['login', 'submit', 'journal', 'read'];
const WELLNESS_HABITS: WellnessHabitType[] = ['meditation', 'hydration', 'exercise', 'sleep'];

const isAcademicHabit = (type: string): type is AcademicHabitType =>
  (ACADEMIC_HABITS as string[]).includes(type);

const isWellnessHabit = (type: string): type is WellnessHabitType =>
  (WELLNESS_HABITS as string[]).includes(type);

export const useHeatmapData = (
  studentId: string | undefined,
  semesterRange: DateRange,
  filter?: string,
) => {
  return useQuery({
    queryKey: queryKeys.heatmap.data(
      studentId ?? '',
      semesterRange.start,
      semesterRange.end,
      filter,
    ),
    enabled: !!studentId && !!semesterRange.start && !!semesterRange.end,
    queryFn: async (): Promise<HeatmapDay[]> => {
      if (!studentId) return [];

      const dateMap = new Map<string, CompletedHabit[]>();

      // Determine if we're filtering to a specific habit
      const specificFilter = filter && filter !== 'all' ? filter.toLowerCase() : undefined;
      const filterIsAcademic = specificFilter ? isAcademicHabit(specificFilter) : false;
      const filterIsWellness = specificFilter ? isWellnessHabit(specificFilter) : false;

      // Fetch academic habit logs (unless filtering to a specific wellness habit)
      if (!filterIsWellness) {
        let academicQuery = supabase
          .from('habit_logs')
          .select('date, habit_type, completed_at')
          .eq('student_id', studentId)
          .gte('date', semesterRange.start)
          .lte('date', semesterRange.end);

        if (filterIsAcademic && specificFilter) {
          academicQuery = academicQuery.eq('habit_type', specificFilter);
        }

        const { data: academicLogs, error: academicError } = await academicQuery;
        if (academicError) throw academicError;

        for (const log of academicLogs ?? []) {
          const date = log.date as string;
          const habits = dateMap.get(date) ?? [];
          habits.push({
            type: log.habit_type as HabitType,
            category: 'academic',
            completedAt: log.completed_at as string,
          });
          dateMap.set(date, habits);
        }
      }

      // Fetch wellness habit logs (unless filtering to a specific academic habit)
      if (!filterIsAcademic) {
        let wellnessQuery = supabase
          .from('wellness_habit_logs')
          .select('date, wellness_type, value, completed_at')
          .eq('student_id', studentId)
          .gte('date', semesterRange.start)
          .lte('date', semesterRange.end);

        if (filterIsWellness && specificFilter) {
          wellnessQuery = wellnessQuery.eq('wellness_type', specificFilter);
        }

        const { data: wellnessLogs, error: wellnessError } = await wellnessQuery;
        if (wellnessError) throw wellnessError;

        for (const log of wellnessLogs ?? []) {
          const date = log.date as string;
          const habits = dateMap.get(date) ?? [];
          habits.push({
            type: log.wellness_type as WellnessHabitType,
            category: 'wellness',
            value: log.value != null ? Number(log.value) : undefined,
            completedAt: log.completed_at as string,
          });
          dateMap.set(date, habits);
        }
      }

      // Build HeatmapDay array for every date in the range
      const days: HeatmapDay[] = [];
      const cursor = new Date(semesterRange.start + 'T00:00:00');
      const end = new Date(semesterRange.end + 'T00:00:00');

      while (cursor <= end) {
        const dateStr = cursor.toISOString().slice(0, 10);
        const habits = dateMap.get(dateStr) ?? [];
        const academicCount = habits.filter(h => h.category === 'academic').length;
        const wellnessCount = habits.filter(h => h.category === 'wellness').length;

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

export const useHeatmapSummary = (
  studentId: string | undefined,
  heatmapData: HeatmapDay[] | undefined,
) => {
  return useQuery({
    queryKey: queryKeys.heatmap.summary(studentId ?? ''),
    enabled: !!studentId && !!heatmapData,
    queryFn: async (): Promise<HeatmapSummary> => {
      // Fetch current streak from student_gamification
      let currentStreak = 0;
      if (studentId) {
        const { data, error } = await supabase
          .from('student_gamification')
          .select('streak_count')
          .eq('student_id', studentId)
          .maybeSingle();

        if (error) throw error;
        currentStreak = data?.streak_count ?? 0;
      }

      const days = heatmapData ?? [];
      const longestStreak = computeLongestStreak(days);
      const totalActiveDays = days.filter(d => d.totalCount > 0).length;

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
  semesterRange: DateRange,
) => {
  return useQuery({
    queryKey: queryKeys.heatmap.levelHistory(studentId ?? '', semesterRange.start, semesterRange.end),
    enabled: !!studentId && !!semesterRange.start && !!semesterRange.end,
    queryFn: async (): Promise<LevelProgressionPoint[]> => {
      if (!studentId) return [];

      try {
        const { data } = await supabase
          .from('student_habit_level_history' as never)
          .select('changed_at, new_level')
          .eq('student_id', studentId)
          .lte('changed_at', semesterRange.end)
          .order('changed_at', { ascending: true });

        if (!Array.isArray(data)) return [];

        return data
          .map((row) => {
            const r = row as Record<string, unknown>;
            const date = typeof r.changed_at === 'string' ? r.changed_at.slice(0, 10) : '';
            const level = typeof r.new_level === 'number' ? r.new_level : 4;
            return { date, level: (level >= 1 && level <= 4 ? level : 4) as 1 | 2 | 3 | 4 };
          })
          .filter((p) => p.date !== '');
      } catch {
        // Table may not exist yet — return empty history (defaults to Level 4)
        return [];
      }
    },
  });
};
