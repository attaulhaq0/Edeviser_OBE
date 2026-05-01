// =============================================================================
// useStudyTimeAnalytics — Fetch multi-week study time trend data
// =============================================================================

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { queryKeys } from "@/lib/queryKeys";
import { aggregateWeeklyStudyTime } from "@/lib/plannerUtils";
import type { StudySession, WeeklyStudyData } from "@/types/planner";

// ─── Constants ───────────────────────────────────────────────────────────────

const DEFAULT_WEEK_COUNT = 8;

// ─── Types ───────────────────────────────────────────────────────────────────

export interface StudyTimeTrendData {
  weeklyData: WeeklyStudyData[];
  averageMinutesPerWeek: number;
  isLoading: boolean;
  isError: boolean;
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export const useStudyTimeTrend = (
  studentId: string | undefined,
  weekCount: number = DEFAULT_WEEK_COUNT
): StudyTimeTrendData => {
  const enabled = !!studentId && weekCount > 0;

  const query = useQuery({
    queryKey: queryKeys.studySessions.list({
      studentId: studentId ?? "",
      weekCount,
      view: "study_time_trend",
    }),
    enabled,
    queryFn: async (): Promise<WeeklyStudyData[]> => {
      if (!studentId) return [];

      const today = new Date();

      // Calculate the start date for the query range
      const rangeStart = new Date(today);
      rangeStart.setDate(
        rangeStart.getDate() - rangeStart.getDay() + 1 - (weekCount - 1) * 7
      );
      const rangeStartStr = rangeStart.toISOString().split("T")[0] as string;
      const todayStr = today.toISOString().split("T")[0] as string;

      // Fetch all completed sessions in the date range
      const { data, error } = await supabase
        .from("study_sessions")
        .select("id, planned_date, actual_duration_minutes, status")
        .eq("student_id", studentId)
        .eq("status", "completed")
        .gte("planned_date", rangeStartStr)
        .lte("planned_date", todayStr)
        .order("planned_date", { ascending: true });

      if (error) throw error;

      // Map to domain type (minimal fields needed for aggregation)
      const sessions: StudySession[] = (data ?? []).map((row) => {
        const r = row as Record<string, unknown>;
        return {
          id: r.id as string,
          studentId,
          courseId: "",
          title: "",
          description: null,
          plannedDate: (r.planned_date as string) ?? "",
          plannedStartTime: "",
          plannedDurationMinutes: 0,
          actualStartAt: null,
          actualEndAt: null,
          actualDurationMinutes: (r.actual_duration_minutes as number) ?? null,
          timerMode: "pomodoro" as const,
          status: (r.status as StudySession["status"]) ?? "completed",
          satisfactionRating: null,
          cloIds: null,
          createdAt: "",
        };
      });

      // Use the pure utility function to aggregate
      return aggregateWeeklyStudyTime(sessions, weekCount, today);
    },
  });

  const weeklyData = query.data ?? [];

  // Compute average minutes per week (only weeks with data)
  const weeksWithData = weeklyData.filter((w) => w.totalMinutes > 0);
  const averageMinutesPerWeek =
    weeksWithData.length > 0
      ? Math.round(
          weeksWithData.reduce((sum, w) => sum + w.totalMinutes, 0) /
            weeksWithData.length
        )
      : 0;

  return {
    weeklyData,
    averageMinutesPerWeek,
    isLoading: query.isLoading,
    isError: query.isError,
  };
};
