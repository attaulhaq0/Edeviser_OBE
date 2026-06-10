// Task 52: Read Habit Timer — tracks 30s of reading to mark 'read' habit
// Requirements: 61.1, 61.2, 61.4
import { useEffect, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { queryKeys } from "@/lib/queryKeys";
import { logActivity } from "@/lib/activityLogger";

const READ_THRESHOLD_SECONDS = 30;
const TICK_INTERVAL_MS = 1_000;

export interface UseReadHabitTimerOptions {
  pageType: "assignment_detail" | "clo_progress";
  pageId: string;
}

export interface UseReadHabitTimerReturn {
  elapsedSeconds: number;
  isCompleted: boolean;
}

/**
 * Compute YYYY-MM-DD from the current UTC calendar day. The canonical
 * `habit_logs` table keys days by midnight-UTC (matching `perfectDay.ts` and
 * `useSessionCompletion`), so the read habit must use the same convention for
 * all 4 daily habits to land on the same date key.
 */
function getUtcDateString(): string {
  return new Date().toISOString().split("T")[0] as string;
}

/**
 * Starts a 1-second interval on mount. When cumulative view time reaches 30 s
 * for the current UTC day, upserts a `habit_logs` record with
 * `habit_type:'read'` via a TanStack mutation and logs an activity event
 * with `duration_seconds`. `habit_logs` is the single canonical academic-habit
 * table that feeds the heatmap, streak, perfect-day, and `perfect_week` badge.
 *
 * On unmount the partial duration is logged as an activity event so no
 * viewing time is lost.
 */
export const useReadHabitTimer = (
  options: UseReadHabitTimerOptions
): UseReadHabitTimerReturn => {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);

  const completedRef = useRef(false);
  const elapsedRef = useRef(0);
  const optionsRef = useRef(options);
  const profileRef = useRef(profile);

  // Keep refs in sync via effects to avoid render-time ref writes
  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  useEffect(() => {
    profileRef.current = profile;
  }, [profile]);

  const upsertMutation = useMutation({
    mutationFn: async (params: { student_id: string; habit_date: string }) => {
      const { error } = await supabase.from("habit_logs").upsert(
        {
          student_id: params.student_id,
          habit_type: "read",
          date: params.habit_date,
          completed_at: new Date().toISOString(),
        },
        { onConflict: "student_id,habit_type,date" }
      );
      if (error) throw error;
    },
    onSuccess: () => {
      const studentId = profileRef.current?.id;
      if (studentId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.habitLogs.all });
      }
    },
    onError: (error) => {
      console.error(
        "[useReadHabitTimer] Failed to upsert habit_logs:",
        error instanceof Error ? error.message : error
      );
    },
  });

  const upsertRef = useRef(upsertMutation);
  useEffect(() => {
    upsertRef.current = upsertMutation;
  }, [upsertMutation]);

  useEffect(() => {
    if (!profile?.id || profile.role !== "student") return;

    // Reset refs on mount
    elapsedRef.current = 0;
    completedRef.current = false;

    const timer = setInterval(() => {
      elapsedRef.current += 1;
      setElapsedSeconds(elapsedRef.current);

      if (
        !completedRef.current &&
        elapsedRef.current >= READ_THRESHOLD_SECONDS
      ) {
        completedRef.current = true;
        setIsCompleted(true);

        const studentId = profileRef.current?.id;
        if (!studentId) return;

        const todayStr = getUtcDateString();

        // Mark 'read' habit for today in the canonical habit_logs table
        upsertRef.current.mutate({
          student_id: studentId,
          habit_date: todayStr,
        });

        // Log activity with duration_seconds metadata
        logActivity({
          student_id: studentId,
          event_type: "page_view",
          metadata: {
            page_type: optionsRef.current.pageType,
            page_id: optionsRef.current.pageId,
            duration_seconds: elapsedRef.current,
            habit_completed: true,
          },
        });
      }
    }, TICK_INTERVAL_MS);

    return () => {
      clearInterval(timer);

      // Log partial duration on unmount if habit wasn't completed
      const studentId = profileRef.current?.id;
      if (studentId && !completedRef.current && elapsedRef.current > 0) {
        logActivity({
          student_id: studentId,
          event_type: "page_view",
          metadata: {
            page_type: optionsRef.current.pageType,
            page_id: optionsRef.current.pageId,
            duration_seconds: elapsedRef.current,
            habit_completed: false,
          },
        });
      }
    };
  }, [profile?.id, profile?.role]);

  return { elapsedSeconds, isCompleted };
};
