// =============================================================================
// usePlannerTasks — CRUD mutations for planner tasks with XP on completion
// =============================================================================

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { queryKeys } from "@/lib/queryKeys";
import { useAuth } from "@/hooks/useAuth";
import { awardWeeklyGoalXPIfMet } from "@/hooks/useWeeklyGoalXP";
import { toast } from "sonner";
import type { PlannerTask } from "@/types/planner";
import type { CreatePlannerTaskInput } from "@/lib/schemas/planner";

// ─── Row → Domain Mapper ────────────────────────────────────────────────────

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
    completedAt: (row.completed_at as string) ?? null,
    createdAt: (row.created_at as string) ?? "",
  };
}

// ─── Invalidation helper ─────────────────────────────────────────────────────

function invalidateTaskQueries(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: queryKeys.plannerTasks.lists() });
  queryClient.invalidateQueries({ queryKey: queryKeys.weeklyGoals.lists() });
  queryClient.invalidateQueries({
    queryKey: queryKeys.studentGamification.lists(),
  });
}

// ─── useCreatePlannerTask ────────────────────────────────────────────────────

export const useCreatePlannerTask = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: CreatePlannerTaskInput): Promise<PlannerTask> => {
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("planner_tasks")
        .insert({
          student_id: user.id,
          title: input.title,
          description: input.description ?? null,
          due_date: input.dueDate,
          priority: input.priority ?? "medium",
          status: "pending",
          course_id: input.courseId ?? null,
        } as never)
        .select()
        .single();

      if (error) throw error;
      return mapTask(data as Record<string, unknown>);
    },
    onSuccess: () => {
      invalidateTaskQueries(queryClient);
      toast.success("Task created");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
};

// ─── useUpdatePlannerTask ────────────────────────────────────────────────────

export interface UpdatePlannerTaskInput {
  id: string;
  title?: string;
  description?: string | null;
  dueDate?: string;
  priority?: PlannerTask["priority"];
  courseId?: string | null;
}

export const useUpdatePlannerTask = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: UpdatePlannerTaskInput): Promise<PlannerTask> => {
      if (!user) throw new Error("Not authenticated");

      const updates: Record<string, unknown> = {};

      if (input.title !== undefined) updates.title = input.title;
      if (input.description !== undefined)
        updates.description = input.description;
      if (input.dueDate !== undefined) updates.due_date = input.dueDate;
      if (input.priority !== undefined) updates.priority = input.priority;
      if (input.courseId !== undefined) updates.course_id = input.courseId;

      const { data, error } = await supabase
        .from("planner_tasks")
        .update(updates as never)
        .eq("id", input.id)
        .eq("student_id", user.id)
        .select()
        .single();

      if (error) throw error;
      return mapTask(data as Record<string, unknown>);
    },
    onSuccess: () => {
      invalidateTaskQueries(queryClient);
      toast.success("Task updated");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
};

// ─── useDeletePlannerTask ────────────────────────────────────────────────────

export const useDeletePlannerTask = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (taskId: string): Promise<void> => {
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("planner_tasks")
        .delete()
        .eq("id", taskId)
        .eq("student_id", user.id);

      if (error) throw error;
    },
    onMutate: async (taskId) => {
      await queryClient.cancelQueries({
        queryKey: queryKeys.plannerTasks.lists(),
      });

      const previousTasks = queryClient.getQueriesData({
        queryKey: queryKeys.plannerTasks.lists(),
      });

      queryClient.setQueriesData(
        { queryKey: queryKeys.plannerTasks.lists() },
        (old: PlannerTask[] | undefined) => {
          if (!old) return old;
          return old.filter((t) => t.id !== taskId);
        }
      );

      return { previousTasks };
    },
    onError: (_err, _taskId, context) => {
      if (context?.previousTasks) {
        for (const [key, data] of context.previousTasks) {
          queryClient.setQueryData(key, data);
        }
      }
      toast.error("Failed to delete task");
    },
    onSettled: () => {
      invalidateTaskQueries(queryClient);
    },
    onSuccess: () => {
      toast.success("Task deleted");
    },
  });
};

// ─── useCompleteTask — marks task complete + awards XP via award-xp ──────────

export const useCompleteTask = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (
      taskId: string
    ): Promise<{ task: PlannerTask; xpAwarded: number }> => {
      if (!user) throw new Error("Not authenticated");

      // 1. Update task status to completed
      const { data, error } = await supabase
        .from("planner_tasks")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
        } as never)
        .eq("id", taskId)
        .eq("student_id", user.id)
        .select()
        .single();

      if (error) throw error;

      const task = mapTask(data as Record<string, unknown>);

      // 2. Award XP via award-xp Edge Function with source 'planner_task'
      let xpAwarded = 0;
      try {
        const { data: xpResult } = await supabase.functions.invoke("award-xp", {
          body: {
            student_id: user.id,
            xp_amount: 10,
            source: "planner_task",
            reference_id: taskId,
          },
        });
        xpAwarded = xpResult?.xp_awarded ?? 0;
      } catch {
        console.error("[useCompleteTask] award-xp invocation failed");
      }

      // 3. Check badges
      try {
        await supabase.functions.invoke("check-badges", {
          body: {
            student_id: user.id,
            trigger: "planner_task",
          },
        });
      } catch {
        console.error("[useCompleteTask] check-badges invocation failed");
      }

      // 4. Award XP for any weekly goals just met (idempotent)
      try {
        await awardWeeklyGoalXPIfMet(user.id);
      } catch {
        console.error("[useCompleteTask] weekly goal XP award failed");
      }

      return { task, xpAwarded };
    },
    onMutate: async (taskId) => {
      await queryClient.cancelQueries({
        queryKey: queryKeys.plannerTasks.lists(),
      });

      const previousTasks = queryClient.getQueriesData({
        queryKey: queryKeys.plannerTasks.lists(),
      });

      queryClient.setQueriesData(
        { queryKey: queryKeys.plannerTasks.lists() },
        (old: PlannerTask[] | undefined) => {
          if (!old) return old;
          return old.map((t) =>
            t.id === taskId
              ? {
                  ...t,
                  status: "completed" as const,
                  completedAt: new Date().toISOString(),
                }
              : t
          );
        }
      );

      return { previousTasks };
    },
    onError: (_err, _taskId, context) => {
      if (context?.previousTasks) {
        for (const [key, data] of context.previousTasks) {
          queryClient.setQueryData(key, data);
        }
      }
      toast.error("Failed to complete task");
    },
    onSettled: () => {
      invalidateTaskQueries(queryClient);
      queryClient.invalidateQueries({ queryKey: queryKeys.badges.lists() });
    },
    onSuccess: ({ xpAwarded }) => {
      if (xpAwarded > 0) {
        toast.success(`Task completed! +${xpAwarded} XP`);
      } else {
        toast.success("Task completed!");
      }
    },
  });
};
