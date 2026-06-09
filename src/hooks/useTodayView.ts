// =============================================================================
// useTodayView — Fetch today's sessions, tasks, deadlines, and habit status
// =============================================================================

import { useQueries } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { queryKeys } from "@/lib/queryKeys";
import type {
  StudySession,
  PlannerTask,
  UpcomingDeadline,
  HabitStatus,
} from "@/types/planner";
import { getDeadlineUrgency } from "@/lib/plannerUtils";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getTodayStr(): string {
  return new Date().toISOString().split("T")[0] as string;
}

function getDatePlusDays(dateStr: string, days: number): string {
  const [year, month, day] = dateStr.split("-").map(Number) as [
    number,
    number,
    number
  ];
  const d = new Date(Date.UTC(year, month - 1, day + days));
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
    status: (row.status as PlannerTask["status"]) ?? "todo",
    courseId: (row.course_id as string) ?? null,
    courseName: (row.course_name as string) ?? undefined,
    completedAt: (row.completed_at as string) ?? null,
    createdAt: (row.created_at as string) ?? "",
  };
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export interface TodayViewData {
  sessions: StudySession[];
  tasks: PlannerTask[];
  deadlines: UpcomingDeadline[];
  habits: HabitStatus;
  isLoading: boolean;
  isError: boolean;
}

export const useTodayViewData = (
  studentId: string | undefined
): TodayViewData => {
  const today = getTodayStr();
  const threeDaysOut = getDatePlusDays(today, 3);
  const enabled = !!studentId;

  const results = useQueries({
    queries: [
      // 1. Today's study sessions
      {
        queryKey: queryKeys.studySessions.list({
          studentId: studentId ?? "",
          date: today,
          view: "today",
        }),
        enabled,
        queryFn: async (): Promise<StudySession[]> => {
          const { data, error } = await supabase
            .from("study_sessions")
            .select(
              "id, student_id, course_id, title, description, planned_date, planned_start_time, planned_duration_minutes, actual_start_at, actual_end_at, actual_duration_minutes, timer_mode, status, satisfaction_rating, clo_ids, created_at, courses(name)"
            )
            .eq("student_id", studentId!)
            .eq("planned_date", today)
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
      // 2. Tasks due today
      {
        queryKey: queryKeys.plannerTasks.list({
          studentId: studentId ?? "",
          date: today,
          view: "today",
        }),
        enabled,
        queryFn: async (): Promise<PlannerTask[]> => {
          const { data, error } = await supabase
            .from("planner_tasks")
            .select(
              "id, student_id, title, description, due_date, priority, status, course_id, completed_at, created_at, courses(name)"
            )
            .eq("student_id", studentId!)
            .eq("due_date", today)
            .order("created_at", { ascending: true });

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
      // 3. Upcoming deadlines within 3 days
      {
        queryKey: queryKeys.assignments.list({
          studentId: studentId ?? "",
          from: today,
          to: threeDaysOut,
          type: "upcoming_deadlines",
        }),
        enabled,
        queryFn: async (): Promise<UpcomingDeadline[]> => {
          // Get enrolled course IDs
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
            .gte("due_date", today)
            .lte("due_date", threeDaysOut)
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
      // 4. Habit status for today
      {
        queryKey: queryKeys.habitLogs.list({
          studentId: studentId ?? "",
          date: today,
          view: "today_status",
        }),
        enabled,
        queryFn: async (): Promise<HabitStatus> => {
          const status: HabitStatus = {
            login: false,
            submit: false,
            journal: false,
            read: false,
          };

          // Query academic habit_logs for today
          const { data, error } = await supabase
            .from("habit_logs" as never)
            .select("habit_type")
            .eq("student_id", studentId!)
            .eq("date", today);

          if (error) {
            // Table may not exist in some environments — return defaults
            console.error(
              "[useTodayView] habit_logs query failed:",
              error.message
            );
            return status;
          }

          for (const row of data ?? []) {
            const r = row as Record<string, unknown>;
            const habitType = r.habit_type as string;
            if (habitType === "login") status.login = true;
            if (habitType === "submit") status.submit = true;
            if (habitType === "journal") status.journal = true;
            if (habitType === "read") status.read = true;
          }

          return status;
        },
      },
    ],
  });

  const [sessionsQuery, tasksQuery, deadlinesQuery, habitsQuery] = results;

  return {
    sessions: sessionsQuery.data ?? [],
    tasks: tasksQuery.data ?? [],
    deadlines: deadlinesQuery.data ?? [],
    habits: habitsQuery.data ?? {
      login: false,
      submit: false,
      journal: false,
      read: false,
    },
    isLoading: results.some((r) => r.isLoading),
    isError: results.some((r) => r.isError),
  };
};
