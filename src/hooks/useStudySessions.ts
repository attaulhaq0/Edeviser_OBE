// =============================================================================
// useStudySessions — CRUD mutations for study sessions
// =============================================================================

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { queryKeys } from "@/lib/queryKeys";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import type { StudySession } from "@/types/planner";
import type { CreateStudySessionInput } from "@/lib/schemas/planner";

// ─── Row → Domain Mapper ────────────────────────────────────────────────────

function mapSession(row: Record<string, unknown>): StudySession {
  return {
    id: row.id as string,
    studentId: row.student_id as string,
    courseId: row.course_id as string,
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

// ─── useStudySession — fetch a single study session by id ────────────────────

/**
 * Fetch one study session by id, mapped to the `StudySession` domain shape.
 *
 * Relocated from the in-page `useStudySession` hook in `FocusModePage.tsx`.
 * Uses `.maybeSingle()` so a missing session resolves to `null` (zero-or-one
 * row) rather than throwing; a genuine query failure still surfaces as the
 * query's error state.
 *
 * _Requirements: 25.1, 25.2, 25.3, 25.3a, 25.4_
 */
export const useStudySession = (sessionId: string | undefined) => {
  return useQuery({
    queryKey: queryKeys.studySessions.detail(sessionId ?? ""),
    queryFn: async (): Promise<StudySession | null> => {
      if (!sessionId) return null;
      const { data, error } = await supabase
        .from("study_sessions")
        .select("*")
        .eq("id", sessionId)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      return mapSession(data as Record<string, unknown>);
    },
    enabled: !!sessionId,
    // Sessions change via mutations which invalidate; staleTime prevents
    // redundant fetches on FocusMode page re-mounts.
    staleTime: 60_000,
  });
};

// ─── Invalidation helper ─────────────────────────────────────────────────────
function invalidateSessionQueries(
  queryClient: ReturnType<typeof useQueryClient>
) {
  queryClient.invalidateQueries({ queryKey: queryKeys.studySessions.lists() });
  queryClient.invalidateQueries({ queryKey: queryKeys.plannerTasks.lists() });
}

// ─── useCreateStudySession ───────────────────────────────────────────────────

export const useCreateStudySession = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (
      input: CreateStudySessionInput
    ): Promise<StudySession> => {
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("study_sessions")
        .insert({
          student_id: user.id,
          course_id: input.courseId,
          title: input.title,
          description: input.description ?? null,
          planned_date: input.plannedDate,
          planned_start_time: input.plannedStartTime,
          planned_duration_minutes: input.plannedDurationMinutes,
          timer_mode: input.timerMode,
          status: "planned",
          clo_ids: input.cloIds ?? null,
          started_at: new Date().toISOString(),
        } as never)
        .select()
        .single();

      if (error) throw error;
      return mapSession(data as Record<string, unknown>);
    },
    onSuccess: () => {
      invalidateSessionQueries(queryClient);
      toast.success("Study session created");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
};

// ─── useUpdateStudySession ───────────────────────────────────────────────────

export interface UpdateStudySessionInput {
  id: string;
  title?: string;
  description?: string | null;
  plannedDate?: string;
  plannedStartTime?: string;
  plannedDurationMinutes?: number;
  courseId?: string;
  timerMode?: StudySession["timerMode"];
  status?: StudySession["status"];
  actualStartAt?: string | null;
  actualEndAt?: string | null;
  actualDurationMinutes?: number | null;
  satisfactionRating?: number | null;
  cloIds?: string[] | null;
}

export const useUpdateStudySession = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (
      input: UpdateStudySessionInput
    ): Promise<StudySession> => {
      if (!user) throw new Error("Not authenticated");

      const updates: Record<string, unknown> = {};

      if (input.title !== undefined) updates.title = input.title;
      if (input.description !== undefined)
        updates.description = input.description;
      if (input.plannedDate !== undefined)
        updates.planned_date = input.plannedDate;
      if (input.plannedStartTime !== undefined)
        updates.planned_start_time = input.plannedStartTime;
      if (input.plannedDurationMinutes !== undefined)
        updates.planned_duration_minutes = input.plannedDurationMinutes;
      if (input.courseId !== undefined) updates.course_id = input.courseId;
      if (input.timerMode !== undefined) updates.timer_mode = input.timerMode;
      if (input.status !== undefined) updates.status = input.status;
      if (input.actualStartAt !== undefined)
        updates.actual_start_at = input.actualStartAt;
      if (input.actualEndAt !== undefined)
        updates.actual_end_at = input.actualEndAt;
      if (input.actualDurationMinutes !== undefined)
        updates.actual_duration_minutes = input.actualDurationMinutes;
      if (input.satisfactionRating !== undefined)
        updates.satisfaction_rating = input.satisfactionRating;
      if (input.cloIds !== undefined) updates.clo_ids = input.cloIds;

      const { data, error } = await supabase
        .from("study_sessions")
        .update(updates as never)
        .eq("id", input.id)
        .eq("student_id", user.id)
        .select()
        .single();

      if (error) throw error;
      return mapSession(data as Record<string, unknown>);
    },
    onMutate: async (input) => {
      // Optimistic update: cancel in-flight queries and snapshot
      await queryClient.cancelQueries({
        queryKey: queryKeys.studySessions.lists(),
      });

      const previousSessions = queryClient.getQueriesData({
        queryKey: queryKeys.studySessions.lists(),
      });

      // Optimistically update cached session lists
      queryClient.setQueriesData(
        { queryKey: queryKeys.studySessions.lists() },
        (old: StudySession[] | undefined) => {
          if (!old) return old;
          return old.map((s) =>
            s.id === input.id
              ? {
                  ...s,
                  ...(input.title !== undefined && { title: input.title }),
                  ...(input.status !== undefined && { status: input.status }),
                  ...(input.plannedDate !== undefined && {
                    plannedDate: input.plannedDate,
                  }),
                  ...(input.plannedStartTime !== undefined && {
                    plannedStartTime: input.plannedStartTime,
                  }),
                  ...(input.plannedDurationMinutes !== undefined && {
                    plannedDurationMinutes: input.plannedDurationMinutes,
                  }),
                }
              : s
          );
        }
      );

      return { previousSessions };
    },
    onError: (_err, _input, context) => {
      // Rollback on error
      if (context?.previousSessions) {
        for (const [key, data] of context.previousSessions) {
          queryClient.setQueryData(key, data);
        }
      }
      toast.error("Failed to update session");
    },
    onSettled: () => {
      invalidateSessionQueries(queryClient);
    },
  });
};

// ─── useCancelStudySession ───────────────────────────────────────────────────

export const useCancelStudySession = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (sessionId: string): Promise<StudySession> => {
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("study_sessions")
        .update({ status: "cancelled" } as never)
        .eq("id", sessionId)
        .eq("student_id", user.id)
        .select()
        .single();

      if (error) throw error;
      return mapSession(data as Record<string, unknown>);
    },
    onMutate: async (sessionId) => {
      await queryClient.cancelQueries({
        queryKey: queryKeys.studySessions.lists(),
      });

      const previousSessions = queryClient.getQueriesData({
        queryKey: queryKeys.studySessions.lists(),
      });

      queryClient.setQueriesData(
        { queryKey: queryKeys.studySessions.lists() },
        (old: StudySession[] | undefined) => {
          if (!old) return old;
          return old.map((s) =>
            s.id === sessionId ? { ...s, status: "cancelled" as const } : s
          );
        }
      );

      return { previousSessions };
    },
    onError: (_err, _sessionId, context) => {
      if (context?.previousSessions) {
        for (const [key, data] of context.previousSessions) {
          queryClient.setQueryData(key, data);
        }
      }
      toast.error("Failed to cancel session");
    },
    onSettled: () => {
      invalidateSessionQueries(queryClient);
    },
    onSuccess: () => {
      toast.success("Session cancelled");
    },
  });
};
