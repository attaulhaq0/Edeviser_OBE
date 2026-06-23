import { supabase } from "@/lib/supabase";
import { offlineQueue } from "@/lib/offlineQueue";
import type { ActivityLogEventType } from "@/types/app";
import type { Json } from "@/types/database";

export interface ActivityLogEntry {
  student_id: string;
  event_type: ActivityLogEventType;
  metadata?: Record<string, unknown>;
}

// ── Batch buffer: accumulate entries and flush every 30s ─────────────────────

let buffer: ActivityLogEntry[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;
const FLUSH_INTERVAL_MS = 30_000;
const MAX_BUFFER_SIZE = 20;

const flushBuffer = async (): Promise<void> => {
  if (buffer.length === 0) return;
  const batch = [...buffer];
  buffer = [];

  const rows = batch.map((entry) => ({
    student_id: entry.student_id,
    event_type: entry.event_type,
    metadata: (entry.metadata ?? null) as Json,
  }));

  const { error } = await supabase.from("student_activity_log").insert(rows);
  if (error) {
    // Re-queue to offline if the batch insert fails
    for (const entry of batch) {
      offlineQueue.enqueue("activity_log", entry);
    }
    console.error(
      "[ActivityLogger] Batch insert failed, queued for retry:",
      error
    );
  }
};

const scheduleFlush = (): void => {
  if (flushTimer) return;
  flushTimer = setTimeout(() => {
    flushTimer = null;
    flushBuffer().catch(console.error);
  }, FLUSH_INTERVAL_MS);
};

// Flush on page unload to avoid losing buffered events
if (typeof window !== "undefined") {
  window.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      flushBuffer().catch(console.error);
    }
  });
  window.addEventListener("beforeunload", () => {
    flushBuffer().catch(console.error);
  });
}

/**
 * Persist a single activity log entry to the database.
 * Used as the offline queue flush handler.
 */
const persistActivity = async (payload: unknown): Promise<void> => {
  const entry = payload as ActivityLogEntry;
  const { error } = await supabase.from("student_activity_log").insert({
    student_id: entry.student_id,
    event_type: entry.event_type,
    metadata: (entry.metadata ?? null) as Json,
  });
  if (error) throw error;
};

// Register the handler so the offline queue can flush activity events
offlineQueue.registerHandler("activity_log", persistActivity);

/**
 * Fire-and-forget logging of student behavioral events to `student_activity_log`.
 * Events are batched and flushed every 30s (or on page hide/unload) to reduce
 * DB connection pressure. When offline, events are queued to localStorage.
 */
export const logActivity = async (entry: ActivityLogEntry): Promise<void> => {
  // Queue when offline
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    offlineQueue.enqueue("activity_log", entry);
    return;
  }

  buffer.push(entry);

  // Flush immediately if buffer is full
  if (buffer.length >= MAX_BUFFER_SIZE) {
    await flushBuffer();
  } else {
    scheduleFlush();
  }
};
