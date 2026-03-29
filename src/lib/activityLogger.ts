import { supabase } from '@/lib/supabase';
import { offlineQueue } from '@/lib/offlineQueue';
import type { ActivityLogEventType } from '@/types/app';
import type { Json } from '@/types/database';

export interface ActivityLogEntry {
  student_id: string;
  event_type: ActivityLogEventType;
  metadata?: Record<string, unknown>;
}

/**
 * Persist a single activity log entry to the database.
 * Used both directly and as the offline queue flush handler.
 */
const persistActivity = async (payload: unknown): Promise<void> => {
  const entry = payload as ActivityLogEntry;
  const { error } = await supabase.from('student_activity_log').insert({
    student_id: entry.student_id,
    event_type: entry.event_type,
    metadata: (entry.metadata ?? null) as Json,
  });
  if (error) throw error;
};

// Register the handler so the offline queue can flush activity events
offlineQueue.registerHandler('activity_log', persistActivity);

/**
 * Fire-and-forget logging of student behavioral events to `student_activity_log`.
 * When offline, events are queued to localStorage and flushed when connectivity returns.
 * Never blocks user-facing flows — errors are logged to console.
 */
export const logActivity = async (entry: ActivityLogEntry): Promise<void> => {
  // Queue when offline
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    offlineQueue.enqueue('activity_log', entry);
    return;
  }

  try {
    await persistActivity(entry);
  } catch (err) {
    // Network error at runtime — queue for later
    offlineQueue.enqueue('activity_log', entry);
    console.error('[ActivityLogger] Queued for offline retry:', err);
  }
};
