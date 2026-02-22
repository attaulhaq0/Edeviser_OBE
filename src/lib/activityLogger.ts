import { supabase } from '@/lib/supabase';
import type { ActivityLogEventType } from '@/types/app';

export interface ActivityLogEntry {
  student_id: string;
  event_type: ActivityLogEventType;
  metadata?: Record<string, unknown>;
}

/**
 * Fire-and-forget logging of student behavioral events to `student_activity_log`.
 * Never blocks user-facing flows — errors are logged to console.
 */
export const logActivity = async (entry: ActivityLogEntry): Promise<void> => {
  try {
    const { error } = await supabase.from('student_activity_log').insert({
      student_id: entry.student_id,
      event_type: entry.event_type,
      metadata: entry.metadata ?? null,
    });

    if (error) {
      console.error('[ActivityLogger] Failed to log activity:', error.message);
    }
  } catch (err) {
    console.error('[ActivityLogger] Unexpected error:', err);
  }
};
