// Task 52: Read Habit Timer — tracks 30s of reading to mark 'read' habit
// Requirements: 61.1, 61.2, 61.4
import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { logActivity } from '@/lib/activityLogger';

const READ_THRESHOLD_SECONDS = 30;
const TICK_INTERVAL_MS = 1_000;

export interface UseReadHabitTimerOptions {
  pageType: 'assignment_detail' | 'clo_progress';
  pageId: string;
}

export interface UseReadHabitTimerReturn {
  elapsedSeconds: number;
  isCompleted: boolean;
}

/**
 * Starts a 1-second interval on mount. When cumulative view time reaches 30 s
 * for the current calendar day, inserts a `habit_tracking` record with
 * `read_content = true` and logs an activity event with `duration_seconds`.
 *
 * On unmount the partial duration is logged as an activity event so no
 * viewing time is lost.
 */
export const useReadHabitTimer = (
  options: UseReadHabitTimerOptions,
): UseReadHabitTimerReturn => {
  const { profile } = useAuth();
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

  useEffect(() => {
    if (!profile?.id || profile.role !== 'student') return;

    // Reset refs on mount
    elapsedRef.current = 0;
    completedRef.current = false;

    const timer = setInterval(() => {
      elapsedRef.current += 1;
      setElapsedSeconds(elapsedRef.current);

      if (!completedRef.current && elapsedRef.current >= READ_THRESHOLD_SECONDS) {
        completedRef.current = true;
        setIsCompleted(true);

        const studentId = profileRef.current?.id;
        if (!studentId) return;

        const today = new Date().toISOString().slice(0, 10);

        // Mark read_content habit for today in habit_tracking table
        supabase
          .from('habit_tracking')
          .upsert(
            { student_id: studentId, habit_date: today, read_content: true },
            { onConflict: 'student_id,habit_date' },
          )
          .then(({ error }) => {
            if (error) {
              console.error('[useReadHabitTimer] Failed to upsert habit_tracking:', error.message);
            }
          });

        // Log activity with duration_seconds metadata
        logActivity({
          student_id: studentId,
          event_type: 'page_view',
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
          event_type: 'page_view',
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
