// =============================================================================
// useWeeklyProgress — Compute weekly progress summary with breakdowns
// =============================================================================

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { queryKeys } from "@/lib/queryKeys";
import { calculateGoalProgress } from "@/lib/plannerUtils";
import type {
  WeeklyProgressData,
  CourseStudyTime,
  CLOStudyTime,
  GoalProgress,
  StudySession,
  PlannerTask,
  WeeklyGoal,
} from "@/types/planner";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getWeekEndDate(weekStartDate: string): string {
  const [year, month, day] = weekStartDate.split("-").map(Number) as [
    number,
    number,
    number
  ];
  const d = new Date(Date.UTC(year, month - 1, day + 6));
  return d.toISOString().split("T")[0] as string;
}

function computeCourseBreakdown(sessions: StudySession[]): CourseStudyTime[] {
  const courseMap = new Map<
    string,
    { courseName: string; totalMinutes: number }
  >();

  for (const session of sessions) {
    if (session.status !== "completed" || !session.actualDurationMinutes)
      continue;

    const existing = courseMap.get(session.courseId);
    if (existing) {
      existing.totalMinutes += session.actualDurationMinutes;
    } else {
      courseMap.set(session.courseId, {
        courseName: session.courseName ?? "Unknown Course",
        totalMinutes: session.actualDurationMinutes,
      });
    }
  }

  return Array.from(courseMap.entries()).map(
    ([courseId, { courseName, totalMinutes }]) => ({
      courseId,
      courseName,
      totalMinutes,
    })
  );
}

function computeCLOBreakdown(sessions: StudySession[]): CLOStudyTime[] {
  const cloMap = new Map<
    string,
    { cloTitle: string; courseName: string; totalMinutes: number }
  >();

  for (const session of sessions) {
    if (
      session.status !== "completed" ||
      !session.actualDurationMinutes ||
      !session.cloIds ||
      session.cloIds.length === 0
    )
      continue;

    // Distribute time evenly across linked CLOs
    const minutesPerCLO = session.actualDurationMinutes / session.cloIds.length;

    for (const cloId of session.cloIds) {
      const existing = cloMap.get(cloId);
      if (existing) {
        existing.totalMinutes += minutesPerCLO;
      } else {
        cloMap.set(cloId, {
          cloTitle: cloId, // Will be resolved by the query if CLO data is available
          courseName: session.courseName ?? "Unknown Course",
          totalMinutes: minutesPerCLO,
        });
      }
    }
  }

  return Array.from(cloMap.entries()).map(
    ([cloId, { cloTitle, courseName, totalMinutes }]) => ({
      cloId,
      cloTitle,
      courseName,
      totalMinutes: Math.round(totalMinutes),
    })
  );
}

// ─── Types ───────────────────────────────────────────────────────────────────

export interface WeeklyProgressSummary {
  progress: WeeklyProgressData;
  goalProgress: GoalProgress[];
  isLoading: boolean;
  isError: boolean;
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export const useWeeklyProgressSummary = (
  studentId: string | undefined,
  weekStartDate: string | undefined
): WeeklyProgressSummary => {
  const weekEnd = weekStartDate ? getWeekEndDate(weekStartDate) : "";
  const enabled = !!studentId && !!weekStartDate;

  // Fetch sessions for the week
  const sessionsQuery = useQuery({
    queryKey: queryKeys.studySessions.list({
      studentId: studentId ?? "",
      weekStartDate: weekStartDate ?? "",
      view: "progress",
    }),
    enabled,
    queryFn: async (): Promise<StudySession[]> => {
      const { data, error } = await supabase
        .from("study_sessions")
        .select(
          "id, student_id, course_id, title, planned_date, planned_start_time, planned_duration_minutes, actual_start_at, actual_end_at, actual_duration_minutes, timer_mode, status, satisfaction_rating, clo_ids, created_at, courses(name)"
        )
        .eq("student_id", studentId!)
        .gte("planned_date", weekStartDate!)
        .lte("planned_date", weekEnd)
        .order("planned_start_time", { ascending: true });

      if (error) throw error;

      return (data ?? []).map((row) => {
        const r = row as Record<string, unknown>;
        const courseData = r.courses as Record<string, unknown> | null;
        return {
          id: r.id as string,
          studentId: r.student_id as string,
          courseId: r.course_id as string,
          courseName: (courseData?.name as string) ?? undefined,
          title: (r.title as string) ?? "",
          description: (r.description as string) ?? null,
          plannedDate: (r.planned_date as string) ?? "",
          plannedStartTime: (r.planned_start_time as string) ?? "",
          plannedDurationMinutes: (r.planned_duration_minutes as number) ?? 25,
          actualStartAt: (r.actual_start_at as string) ?? null,
          actualEndAt: (r.actual_end_at as string) ?? null,
          actualDurationMinutes: (r.actual_duration_minutes as number) ?? null,
          timerMode: (r.timer_mode as StudySession["timerMode"]) ?? "pomodoro",
          status: (r.status as StudySession["status"]) ?? "planned",
          satisfactionRating: (r.satisfaction_rating as number) ?? null,
          cloIds: (r.clo_ids as string[]) ?? null,
          createdAt: (r.created_at as string) ?? "",
        };
      });
    },
  });

  // Fetch tasks for the week
  const tasksQuery = useQuery({
    queryKey: queryKeys.plannerTasks.list({
      studentId: studentId ?? "",
      weekStartDate: weekStartDate ?? "",
      view: "progress",
    }),
    enabled,
    queryFn: async (): Promise<PlannerTask[]> => {
      const { data, error } = await supabase
        .from("planner_tasks")
        .select(
          "id, student_id, title, description, due_date, priority, status, course_id, completed_at, created_at"
        )
        .eq("student_id", studentId!)
        .gte("due_date", weekStartDate!)
        .lte("due_date", weekEnd);

      if (error) throw error;

      return (data ?? []).map((row) => {
        const r = row as Record<string, unknown>;
        return {
          id: r.id as string,
          studentId: r.student_id as string,
          title: r.title as string,
          description: (r.description as string) ?? null,
          dueDate: (r.due_date as string) ?? "",
          priority: (r.priority as PlannerTask["priority"]) ?? "medium",
          status: (r.status as PlannerTask["status"]) ?? "pending",
          courseId: (r.course_id as string) ?? null,
          completedAt: (r.completed_at as string) ?? null,
          createdAt: (r.created_at as string) ?? "",
        };
      });
    },
  });

  // Fetch goals for the week
  const goalsQuery = useQuery({
    queryKey: queryKeys.weeklyGoals.list({
      studentId: studentId ?? "",
      weekStartDate: weekStartDate ?? "",
      view: "progress",
    }),
    enabled,
    queryFn: async (): Promise<WeeklyGoal[]> => {
      const { data, error } = await supabase
        .from("weekly_goals")
        .select(
          "id, student_id, week_start, week_start_date, goal_type, target_value"
        )
        .eq("student_id", studentId!)
        .or(
          `week_start_date.eq.${weekStartDate!},week_start.eq.${weekStartDate!}`
        );

      if (error) throw error;

      return (data ?? []).map((row) => {
        const r = row as Record<string, unknown>;
        return {
          id: r.id as string,
          studentId: r.student_id as string,
          weekStartDate:
            (r.week_start_date as string) ?? (r.week_start as string) ?? "",
          goalType: (r.goal_type as WeeklyGoal["goalType"]) ?? "study_hours",
          targetValue: Number(r.target_value ?? 0),
        };
      });
    },
  });

  // Compute progress data
  const sessions = sessionsQuery.data ?? [];
  const tasks = tasksQuery.data ?? [];
  const goals = goalsQuery.data ?? [];

  const completedSessions = sessions.filter((s) => s.status === "completed");
  const completedTasks = tasks.filter((t) => t.status === "completed");

  const totalStudyMinutes = completedSessions.reduce(
    (sum, s) => sum + (s.actualDurationMinutes ?? 0),
    0
  );

  const courseBreakdown = computeCourseBreakdown(sessions);
  const cloBreakdown = computeCLOBreakdown(sessions);

  const goalProgress = goals.map((goal) =>
    calculateGoalProgress(goal, sessions, tasks)
  );

  const progress: WeeklyProgressData = {
    totalStudyMinutes,
    sessionsCompleted: completedSessions.length,
    tasksCompleted: completedTasks.length,
    courseBreakdown,
    cloBreakdown,
  };

  return {
    progress,
    goalProgress,
    isLoading:
      sessionsQuery.isLoading || tasksQuery.isLoading || goalsQuery.isLoading,
    isError: sessionsQuery.isError || tasksQuery.isError || goalsQuery.isError,
  };
};
