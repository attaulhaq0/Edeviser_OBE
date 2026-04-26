import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { queryKeys } from '@/lib/queryKeys';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { generateReviewDates, isReviewCycleComplete } from '@/lib/plannerUtils';
import type { ReviewSchedule } from '@/types/planner';

export const useWeeklyReviews = (weekStartDate: string) => {
  const { user } = useAuth();
  const studentId = user?.id ?? '';

  const weekEnd = new Date(weekStartDate);
  weekEnd.setDate(weekEnd.getDate() + 6);
  const weekEndDate = weekEnd.toISOString().split('T')[0] as string;

  return useQuery({
    queryKey: queryKeys.reviewSchedules.list({ studentId, weekStartDate, weekEndDate } as Record<string, unknown>),
    queryFn: async (): Promise<ReviewSchedule[]> => {
      const { data, error } = await supabase
        .from('review_schedules')
        .select('*, courses(name)')
        .eq('student_id', studentId)
        .gte('review_date', weekStartDate)
        .lte('review_date', weekEndDate)
        .order('review_date');
      if (error) throw error;
      return (data ?? []).map((r: Record<string, unknown>) => ({
        id: r.id as string,
        studentId: r.student_id as string,
        cloId: r.clo_id as string,
        courseId: r.course_id as string,
        sourceSessionId: r.source_session_id as string,
        reviewDate: r.review_date as string,
        intervalDays: r.interval_days as 1 | 3 | 7,
        status: r.status as 'pending' | 'completed' | 'skipped',
        reviewSessionId: r.review_session_id as string | null,
        createdAt: r.created_at as string,
        updatedAt: r.updated_at as string,
        courseName: (r.courses as Record<string, unknown> | null)?.name as string | undefined,
      }));
    },
    enabled: !!studentId && !!weekStartDate,
  });
};

export const useCreateReviewSchedules = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: { sessionDate: string; cloIds: string[]; courseId: string; sourceSessionId: string }) => {
      const studentId = user!.id;
      const records: Array<Record<string, unknown>> = [];

      for (const cloId of input.cloIds) {
        const reviewDates = generateReviewDates(input.sessionDate);
        for (const { reviewDate, intervalDays } of reviewDates) {
          records.push({
            student_id: studentId,
            clo_id: cloId,
            course_id: input.courseId,
            source_session_id: input.sourceSessionId,
            review_date: reviewDate,
            interval_days: intervalDays,
          });
        }
      }

      if (records.length > 0) {
        // ON CONFLICT DO NOTHING — prevent duplicates
        const { error } = await supabase
          .from('review_schedules')
          .upsert(records, {
            onConflict: 'student_id,clo_id,review_date,interval_days',
            ignoreDuplicates: true,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.reviewSchedules.all });
    },
  });
};

export const useCreateReviewSession = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (review: ReviewSchedule) => {
      const studentId = user!.id;

      // Create a study session for this review
      const { data: session, error: sessionErr } = await supabase
        .from('study_sessions')
        .insert({
          student_id: studentId,
          course_id: review.courseId,
          title: `Review: ${review.cloTitle ?? 'CLO'}`,
          planned_date: review.reviewDate,
          planned_start_time: new Date().toTimeString().slice(0, 5),
          planned_duration_minutes: 25,
          timer_mode: 'pomodoro',
          status: 'planned',
          clo_ids: [review.cloId],
        })
        .select()
        .single();
      if (sessionErr) throw sessionErr;

      // Update review schedule with the session ID
      const { error: updateErr } = await supabase
        .from('review_schedules')
        .update({
          review_session_id: session.id,
          status: 'completed',
          updated_at: new Date().toISOString(),
        })
        .eq('id', review.id);
      if (updateErr) throw updateErr;

      return session;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.reviewSchedules.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.studySessions.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.weeklyPlanner.all });
    },
    onError: (err: Error) => toast.error(err.message),
  });
};

export const useSkipReview = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (reviewId: string) => {
      const { error } = await supabase
        .from('review_schedules')
        .update({ status: 'skipped', updated_at: new Date().toISOString() })
        .eq('id', reviewId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.reviewSchedules.all });
      toast.success('Review skipped');
    },
    onError: (err: Error) => toast.error(err.message),
  });
};

export const useCheckReviewCycleComplete = () => {
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: { cloId: string; studentId?: string }) => {
      const studentId = input.studentId ?? user!.id;

      const { data, error } = await supabase
        .from('review_schedules')
        .select('interval_days, status')
        .eq('student_id', studentId)
        .eq('clo_id', input.cloId);
      if (error) throw error;

      const reviews = (data ?? []).map((r: Record<string, unknown>) => ({
        intervalDays: r.interval_days as number,
        status: r.status as string,
      }));

      if (isReviewCycleComplete(reviews)) {
        // Award 25 XP for completing the review cycle
        await supabase.functions.invoke('award-xp', {
          body: {
            student_id: studentId,
            xp_amount: 25,
            source: 'review_cycle_complete',
            reference_id: `review_cycle:${studentId}:${input.cloId}`,
            note: 'Completed all 3 review intervals for CLO',
          },
        });
        return true;
      }
      return false;
    },
  });
};
