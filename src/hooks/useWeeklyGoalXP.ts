// =============================================================================
// useWeeklyGoalXP — Awards 25 XP per weekly goal that crosses its target.
// Idempotent: relies on award-xp Edge Function reference_id deduplication.
// Triggered after session/task completion mutations.
// =============================================================================

import { supabase } from "@/lib/supabase";
import { calculateGoalProgress, getWeekStartDate } from "@/lib/plannerUtils";
import type { GoalProgress, GoalType, PlannerTask } from "@/types/planner";

interface MetGoalRow {
  id: string;
  student_id: string;
  week_start_date: string | null;
  week_start: string | null;
  goal_type: GoalType;
  target_value: number;
}

/**
 * After a session or task completion, fetch this week's goals and award
 * 25 XP for each goal whose progress now meets the target.
 *
 * The award-xp Edge Function dedupes by reference_id (`weekly_goal:{goalId}`),
 * so re-invocation across multiple completions on the same goal is safe.
 *
 * Returns the goals that were just met (for badge check / toast handling).
 */
export async function awardWeeklyGoalXPIfMet(
  studentId: string
): Promise<GoalProgress[]> {
  const weekStartDate = getWeekStartDate(new Date());

  // 1. Fetch this week's goals
  const { data: goalRows, error: goalsErr } = await supabase
    .from("weekly_goals")
    .select(
      "id, student_id, week_start, week_start_date, goal_type, target_value"
    )
    .eq("student_id", studentId)
    .or(`week_start_date.eq.${weekStartDate},week_start.eq.${weekStartDate}`);

  if (goalsErr || !goalRows || goalRows.length === 0) return [];

  // 2. Fetch this week's sessions and tasks for progress calculation
  const weekEnd = new Date(weekStartDate);
  weekEnd.setUTCDate(weekEnd.getUTCDate() + 7);
  const weekEndStr = weekEnd.toISOString().slice(0, 10);

  const [sessionsRes, tasksRes] = await Promise.all([
    supabase
      .from("study_sessions")
      .select("id, status, actual_duration_minutes, planned_date")
      .eq("student_id", studentId)
      .gte("planned_date", weekStartDate)
      .lt("planned_date", weekEndStr),
    supabase
      .from("planner_tasks")
      .select("id, status, due_date")
      .eq("student_id", studentId)
      .gte("due_date", weekStartDate)
      .lt("due_date", weekEndStr),
  ]);

  if (sessionsRes.error || tasksRes.error) return [];

  // Map to domain shape used by calculateGoalProgress
  const sessions = (sessionsRes.data ?? []).map((s) => ({
    id: s.id as string,
    studentId,
    courseId: null as string | null,
    title: "",
    description: null,
    plannedDate: s.planned_date as string,
    plannedStartTime: null,
    plannedDurationMinutes: 0,
    actualStartAt: null,
    actualEndAt: null,
    actualDurationMinutes: (s.actual_duration_minutes as number) ?? null,
    timerMode: "pomodoro" as const,
    status: s.status as "planned" | "in_progress" | "completed" | "cancelled",
    satisfactionRating: null,
    cloIds: null,
    createdAt: "",
  }));

  const tasks = (tasksRes.data ?? []).map((t) => ({
    id: t.id as string,
    studentId,
    title: "",
    description: null,
    dueDate: t.due_date as string,
    priority: "medium" as const,
    status: t.status as PlannerTask["status"],
    courseId: null,
    completedAt: null,
    createdAt: "",
  }));

  // 3. For each goal, calculate progress and award XP if met
  const metGoals: GoalProgress[] = [];

  for (const row of goalRows as MetGoalRow[]) {
    const goalWeek = row.week_start_date ?? row.week_start ?? weekStartDate;
    const progress = calculateGoalProgress(
      {
        id: row.id,
        studentId,
        weekStartDate: goalWeek,
        goalType: row.goal_type,
        targetValue: row.target_value,
      },
      sessions,
      tasks
    );

    if (!progress.isMet) continue;

    // Fire-and-forget XP award. Idempotent via reference_id.
    try {
      await supabase.functions.invoke("award-xp", {
        body: {
          student_id: studentId,
          xp_amount: 25,
          source: "weekly_goal",
          reference_id: `weekly_goal:${row.id}`,
          note: `Weekly goal met: ${row.goal_type}`,
          is_milestone: true,
        },
      });
    } catch {
      console.error(
        "[awardWeeklyGoalXPIfMet] award-xp invocation failed for goal:",
        row.id
      );
    }

    metGoals.push(progress);
  }

  // 4. Trigger study_session badge check (Weekly Warrior fires when all 3 goals met)
  if (metGoals.length > 0) {
    try {
      await supabase.functions.invoke("check-badges", {
        body: { student_id: studentId, trigger: "study_session" },
      });
    } catch {
      console.error("[awardWeeklyGoalXPIfMet] check-badges invocation failed");
    }
  }

  return metGoals;
}
