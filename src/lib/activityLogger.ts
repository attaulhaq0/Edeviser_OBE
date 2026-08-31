import { supabase } from "@/lib/supabase";
import { offlineQueue } from "@/lib/offlineQueue";
import type { ActivityLogEventType } from "@/types/app";
import type { Json } from "@/types/database";

// ── Session attribution ─────────────────────────────────────────────────────
// RLS contract: the `student_activity_log` INSERT policy requires
// `student_id = auth.uid()`. Caller-supplied ids (e.g. a teacher grading flow
// passing its own id, or a stale context id) are therefore always overridden
// with the authenticated session user; unauthenticated calls are dropped —
// they could never satisfy the policy and previously surfaced as silent
// "new row violates row-level security policy" errors.

const getSessionUserId = async (): Promise<string | null> => {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return session?.user?.id ?? null;
  } catch {
    return null;
  }
};

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
  // Re-attribute at flush time: the session may have changed since enqueue.
  const sessionUserId = await getSessionUserId();
  if (!sessionUserId) {
    // Without a session the row can never satisfy RLS; dropping avoids an
    // endless offline-queue retry loop on a permanently-failing insert.
    return;
  }
  const { error } = await supabase.from("student_activity_log").insert({
    student_id: sessionUserId,
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
  // Never trust caller-supplied student ids — attribute to the session user.
  const sessionUserId = await getSessionUserId();
  if (!sessionUserId) return;

  const ownedEntry: ActivityLogEntry = {
    ...entry,
    student_id: sessionUserId,
  };

  // Queue when offline
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    offlineQueue.enqueue("activity_log", ownedEntry);
    return;
  }

  buffer.push(ownedEntry);

  // Flush immediately if buffer is full
  if (buffer.length >= MAX_BUFFER_SIZE) {
    await flushBuffer();
  } else {
    scheduleFlush();
  }
};
