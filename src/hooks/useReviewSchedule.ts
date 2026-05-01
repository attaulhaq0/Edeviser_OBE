// =============================================================================
// useReviewSchedule — Fetch weekly reviews, create review sessions, skip reviews
// =============================================================================

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { queryKeys } from "@/lib/queryKeys";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import type { ReviewSchedule } from "@/types/planner";

// ─── Row → Domain Mapper ────────────────────────────────────────────────────

function mapReviewSchedule(row: Record<string, unknown>): ReviewSchedule {
  return {
    id: row.id as string,
    studentId: row.student_id as string,
    cloId: row.clo_id as string,
    courseId: (row.course_id as string) ?? null,
    sourceSessionId: (row.source_session_id as string) ?? null,
    reviewDate: row.review_date as string,
    intervalDays: row.interval_days as 1 | 3 | 7,
    status: (row.status as ReviewSchedule["status"]) ?? "pending",
    reviewSessionId: (row.review_session_id as string) ?? null,
    createdAt: (row.created_at as string) ?? "",
    updatedAt: (row.updated_at as string) ?? "",
  };
}

// ─── useWeeklyReviews ────────────────────────────────────────────────────────

/**
 * Fetch review_schedules for a given week (review_date between weekStartDate
 * and weekStartDate + 6 days), ordered by review_date ascending.
 */
export const useWeeklyReviews = (
  studentId: string | undefined,
  weekStartDate: string | undefined
) => {
  return useQuery({
    queryKey: queryKeys.reviewSchedules.list({
      studentId: studentId ?? "",
      weekStartDate: weekStartDate ?? "",
    }),
    enabled: !!studentId && !!weekStartDate,
    queryFn: async (): Promise<ReviewSchedule[]> => {
      if (!studentId || !weekStartDate) return [];

      // Calculate week end date (weekStartDate + 6 days)
      const [year, month, day] = weekStartDate.split("-").map(Number) as [
        number,
        number,
        number
      ];
      const weekEnd = new Date(Date.UTC(year, month - 1, day + 6));
      const weekEndDate = `${weekEnd.getUTCFullYear()}-${String(
        weekEnd.getUTCMonth() + 1
      ).padStart(2, "0")}-${String(weekEnd.getUTCDate()).padStart(2, "0")}`;

      const { data, error } = await supabase
        .from("review_schedules" as never)
        .select("*")
        .eq("student_id", studentId)
        .gte("review_date", weekStartDate)
        .lte("review_date", weekEndDate)
        .order("review_date", { ascending: true });

      if (error) throw error;

      return ((data as Record<string, unknown>[]) ?? []).map(mapReviewSchedule);
    },
  });
};

// ─── useCreateReviewSession ──────────────────────────────────────────────────

export interface CreateReviewSessionInput {
  reviewScheduleId: string;
  cloId: string;
  cloTitle: string;
  courseId: string;
}

/**
 * Creates a new study_session for a review (title: "Review: {CLO title}",
 * timer_mode: "pomodoro", planned_duration_minutes: 25) AND updates the
 * review_schedule status to "completed" with the new session's ID.
 */
export const useCreateReviewSession = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (
      input: CreateReviewSessionInput
    ): Promise<{ sessionId: string; reviewSchedule: ReviewSchedule }> => {
      if (!user) throw new Error("Not authenticated");

      const today = new Date().toISOString().split("T")[0] as string;
      const now = new Date();
      const startTime = `${String(now.getHours()).padStart(2, "0")}:${String(
        now.getMinutes()
      ).padStart(2, "0")}`;

      // 1. Create a new study session for the review
      const { data: sessionData, error: sessionError } = await supabase
        .from("study_sessions")
        .insert({
          student_id: user.id,
          course_id: input.courseId,
          title: `Review: ${input.cloTitle}`,
          planned_date: today,
          planned_start_time: startTime,
          planned_duration_minutes: 25,
          timer_mode: "pomodoro",
          status: "planned",
          clo_ids: [input.cloId],
        } as never)
        .select()
        .single();

      if (sessionError) throw sessionError;

      const sessionId = (sessionData as Record<string, unknown>).id as string;

      // 2. Update the review_schedule to completed with the new session ID
      const { data: reviewData, error: reviewError } = await supabase
        .from("review_schedules" as never)
        .update({
          status: "completed",
          review_session_id: sessionId,
        } as never)
        .eq("id", input.reviewScheduleId)
        .eq("student_id", user.id)
        .select()
        .single();

      if (reviewError) throw reviewError;

      return {
        sessionId,
        reviewSchedule: mapReviewSchedule(
          reviewData as Record<string, unknown>
        ),
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.reviewSchedules.lists(),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.studySessions.lists(),
      });
      toast.success("Review session created");
    },
    onError: (error: Error) => {
      toast.error(`Failed to create review session: ${error.message}`);
    },
  });
};

// ─── useSkipReview ───────────────────────────────────────────────────────────

/**
 * Updates a review_schedule status to "skipped".
 */
export const useSkipReview = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (reviewScheduleId: string): Promise<ReviewSchedule> => {
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("review_schedules" as never)
        .update({ status: "skipped" } as never)
        .eq("id", reviewScheduleId)
        .eq("student_id", user.id)
        .select()
        .single();

      if (error) throw error;
      return mapReviewSchedule(data as Record<string, unknown>);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.reviewSchedules.lists(),
      });
      toast.success("Review skipped");
    },
    onError: (error: Error) => {
      toast.error(`Failed to skip review: ${error.message}`);
    },
  });
};
