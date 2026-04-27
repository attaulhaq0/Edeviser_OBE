// =============================================================================
// useWeeklyPlanner — Fetch all planner data for a given week in parallel
// =============================================================================

import { useQueries } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { queryKeys } from "@/lib/queryKeys";
import type {
  StudySession,
  PlannerTask,
  WeeklyGoal,
  UpcomingDeadline,
} from "@/types/planner";
import { getDeadlineUrgency } from "@/lib/plannerUtils";

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

// ─── Row → Domain Mappers ────────────────────────────────────────────────────

function mapSession(row: Record<string, unknown>): StudySession {
  return {
    id: row.id as string,
    studentId: row.student_id as string,
    courseId: row.course_id as string,
    courseName: (row.course_name as string) ?? undefined,
    title: (row.title as string) ?? "",
    description: (row.description as string) ?? null,
    plannedDate: (row.planned_date as string) ?? "",
    plannedStartTime: (row.planned_start_time as string) ?? "",
    plannedDurationMinutes: (row.planned_duration_minutes as number) ?? 25,
    actualStartAt: (row.actual_start_at as string) ?? null,
    actualEndAt: (row.actual_end_at as string) ?? null,
    actualDurationMinutes: (row.actual_duration_minutes as number) ?? null,
    timerMode: (row.timer_mode as StudySession["timerMode"]) ?? "pomodoro",
    status: (row.status as StudySession["status"]) ?? "planned",
    satisfactionRating: (row.satisfaction_rating as number) ?? null,
    cloIds: (row.clo_ids as string[]) ?? null,
    createdAt: (row.created_at as string) ?? "",
  };
}

function mapTask(row: Record<string, unknown>): PlannerTask {
  return {
    id: row.id as string,
    studentId: row.student_id as string,
    title: row.title as string,
    description: (row.description as string) ?? null,
    dueDate: (row.due_date as string) ?? "",
    priority: (row.priority as PlannerTask["priority"]) ?? "medium",
    status: (row.status as PlannerTask["status"]) ?? "pending",
    courseId: (row.course_id as string) ?? null,
    courseName: (row.course_name as string) ?? undefined,
    completedAt: (row.completed_at as string) ?? null,
    createdAt: (row.created_at as string) ?? "",
  };
}

function mapGoal(row: Record<string, unknown>): WeeklyGoal {
  return {
    id: row.id as string,
    studentId: row.student_id as string,
    weekStartDate:
      (row.week_start_date as string) ?? (row.week_start as string) ?? "",
    goalType: (row.goal_type as WeeklyGoal["goalType"]) ?? "study_hours",
    targetValue: Number(row.target_value ?? 0),
  };
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export interface WeeklyPlannerData {
  sessions: StudySession[];
  tasks: PlannerTask[];
  deadlines: UpcomingDeadline[];
  goals: WeeklyGoal[];
  isLoading: boolean;
  isError: boolean;
}

export const useWeeklyPlannerData = (
  studentId: string | undefined,
  weekStartDate: string | undefined
): WeeklyPlannerData => {
  const weekEnd = weekStartDate ? getWeekEndDate(weekStartDate) : "";
  const enabled = !!studentId && !!weekStartDate;

  const results = useQueries({
    queries: [
      // 1. Study sessions for the week
      {
        queryKey: queryKeys.studySessions.list({
          studentId: studentId ?? "",
          weekStartDate: weekStartDate ?? "",
        }),
        enabled,
        queryFn: async (): Promise<StudySession[]> => {
          const { data, error } = await supabase
            .from("study_sessions")
            .select(
              "id, student_id, course_id, title, description, planned_date, planned_start_time, planned_duration_minutes, actual_start_at, actual_end_at, actual_duration_minutes, timer_mode, status, satisfaction_rating, clo_ids, created_at, courses(name)"
            )
            .eq("student_id", studentId!)
            .gte("planned_date", weekStartDate!)
            .lte("planned_date", weekEnd)
            .order("planned_start_time", { ascending: true });

          if (error) throw error;

          return (data ?? []).map((row) => {
            const r = row as Record<string, unknown>;
            const courseData = r.courses as Record<string, unknown> | null;
            return mapSession({
              ...r,
              course_name: courseData?.name ?? undefined,
            });
          });
        },
      },
      // 2. Planner tasks for the week
      {
        queryKey: queryKeys.plannerTasks.list({
          studentId: studentId ?? "",
          weekStartDate: weekStartDate ?? "",
        }),
        enabled,
        queryFn: async (): Promise<PlannerTask[]> => {
          const { data, error } = await supabase
            .from("planner_tasks")
            .select(
              "id, student_id, title, description, due_date, priority, status, course_id, completed_at, created_at, courses(name)"
            )
            .eq("student_id", studentId!)
            .gte("due_date", weekStartDate!)
            .lte("due_date", weekEnd)
            .order("due_date", { ascending: true });

          if (error) throw error;

          return (data ?? []).map((row) => {
            const r = row as Record<string, unknown>;
            const courseData = r.courses as Record<string, unknown> | null;
            return mapTask({
              ...r,
              course_name: courseData?.name ?? undefined,
            });
          });
        },
      },
      // 3. Assignment deadlines for the week (from enrolled courses)
      {
        queryKey: queryKeys.assignments.list({
          studentId: studentId ?? "",
          weekStartDate: weekStartDate ?? "",
          type: "deadlines",
        }),
        enabled,
        queryFn: async (): Promise<UpcomingDeadline[]> => {
          // First get enrolled course IDs
          const { data: enrollments, error: enrollError } = await supabase
            .from("student_courses")
            .select("course_id")
            .eq("student_id", studentId!);

          if (enrollError) throw enrollError;

          const courseIds = (enrollments ?? []).map(
            (e) => e.course_id as string
          );

          if (courseIds.length === 0) return [];

          const { data, error } = await supabase
            .from("assignments")
            .select("id, title, due_date, courses(name)")
            .in("course_id", courseIds)
            .gte("due_date", weekStartDate!)
            .lte("due_date", weekEnd)
            .order("due_date", { ascending: true });

          if (error) throw error;

          const now = new Date();
          return (data ?? []).map((row) => {
            const r = row as Record<string, unknown>;
            const courseData = r.courses as Record<string, unknown> | null;
            return {
              id: r.id as string,
              title: r.title as string,
              courseName: (courseData?.name as string) ?? "",
              dueDate: r.due_date as string,
              urgency: getDeadlineUrgency(r.due_date as string, now),
            };
          });
        },
      },
      // 4. Weekly goals
      {
        queryKey: queryKeys.weeklyGoals.list({
          studentId: studentId ?? "",
          weekStartDate: weekStartDate ?? "",
        }),
        enabled,
        queryFn: async (): Promise<WeeklyGoal[]> => {
          const { data, error } = await supabase
            .from("weekly_goals")
            .select(
              "id, student_id, week_start, week_start_date, goal_type, goal_text, target_value, created_at"
            )
            .eq("student_id", studentId!)
            .or(
              `week_start_date.eq.${weekStartDate!},week_start.eq.${weekStartDate!}`
            );

          if (error) throw error;

          return (data ?? []).map((row) =>
            mapGoal(row as Record<string, unknown>)
          );
        },
      },
    ],
  });

  const [sessionsQuery, tasksQuery, deadlinesQuery, goalsQuery] = results;

  return {
    sessions: sessionsQuery.data ?? [],
    tasks: tasksQuery.data ?? [],
    deadlines: deadlinesQuery.data ?? [],
    goals: goalsQuery.data ?? [],
    isLoading: results.some((r) => r.isLoading),
    isError: results.some((r) => r.isError),
  };
};
