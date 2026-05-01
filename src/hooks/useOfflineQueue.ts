// =============================================================================
// useOfflineQueue — Queue-and-retry pattern for API calls during network loss
// =============================================================================

import { useCallback, useEffect, useRef, useState } from "react";
import { offlineQueue } from "@/lib/offlineQueue";

// ─── Constants ───────────────────────────────────────────────────────────────

const INITIAL_RETRY_DELAY_MS = 1000;
const MAX_RETRY_DELAY_MS = 30000;
const BACKOFF_MULTIPLIER = 2;

// ─── Types ───────────────────────────────────────────────────────────────────

export interface OfflineQueueReturn {
  /** Whether the browser is currently online */
  isOnline: boolean;
  /** Number of queued items waiting to be flushed */
  queueSize: number;
  /** Whether a flush is currently in progress */
  isFlushing: boolean;
  /** Enqueue an API call for later execution */
  enqueue: (handlerName: string, payload: unknown) => void;
  /** Manually trigger a flush of the queue */
  flush: () => Promise<{ flushed: number; failed: number }>;
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export const useOfflineQueue = (): OfflineQueueReturn => {
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== "undefined" ? navigator.onLine : true
  );
  const [queueSize, setQueueSize] = useState<number>(offlineQueue.size());
  const [isFlushing, setIsFlushing] = useState<boolean>(false);

  const retryDelayRef = useRef<number>(INITIAL_RETRY_DELAY_MS);
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ─── Update queue size ─────────────────────────────────────────────────

  const refreshQueueSize = useCallback(() => {
    setQueueSize(offlineQueue.size());
  }, []);

  // ─── Flush with exponential backoff ────────────────────────────────────

  const flush = useCallback(async (): Promise<{
    flushed: number;
    failed: number;
  }> => {
    if (!navigator.onLine) {
      return { flushed: 0, failed: 0 };
    }

    setIsFlushing(true);
    try {
      const result = await offlineQueue.flush();
      refreshQueueSize();

      if (result.failed === 0) {
        // Reset backoff on success
        retryDelayRef.current = INITIAL_RETRY_DELAY_MS;
      } else {
        // Schedule retry with exponential backoff
        const delay = retryDelayRef.current;
        retryDelayRef.current = Math.min(
          delay * BACKOFF_MULTIPLIER,
          MAX_RETRY_DELAY_MS
        );

        retryTimeoutRef.current = setTimeout(() => {
          flush().catch((err) =>
            console.error("[useOfflineQueue] retry flush failed:", err)
          );
        }, delay);
      }

      return result;
    } finally {
      setIsFlushing(false);
    }
  }, [refreshQueueSize]);

  // ─── Enqueue ───────────────────────────────────────────────────────────

  const enqueue = useCallback(
    (handlerName: string, payload: unknown) => {
      offlineQueue.enqueue(handlerName, payload);
      refreshQueueSize();
    },
    [refreshQueueSize]
  );

  // ─── Online/offline event listeners ────────────────────────────────────

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      retryDelayRef.current = INITIAL_RETRY_DELAY_MS;
      // Auto-flush when coming back online
      flush().catch((err) =>
        console.error("[useOfflineQueue] auto-flush failed:", err)
      );
    };

    const handleOffline = () => {
      setIsOnline(false);
      // Clear any pending retry timeouts
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Initialize the offlineQueue's own listener
    const cleanup = offlineQueue.init();

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      cleanup();
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, [flush]);

  // ─── Periodic queue size refresh ───────────────────────────────────────

  useEffect(() => {
    const interval = setInterval(refreshQueueSize, 5000);
    return () => clearInterval(interval);
  }, [refreshQueueSize]);

  return {
    isOnline,
    queueSize,
    isFlushing,
    enqueue,
    flush,
  };
};
