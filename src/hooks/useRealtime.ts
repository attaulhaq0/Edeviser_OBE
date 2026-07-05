// =============================================================================
// useRealtime — Shared realtime subscription manager
// Provides channel deduplication, exponential backoff reconnection,
// polling fallback, and "Live updates paused" state.
// Validates: Requirements 2.10
// =============================================================================

import { useEffect, useRef, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import type {
  RealtimeChannel,
  RealtimePostgresChangesPayload,
} from "@supabase/supabase-js";

interface RealtimeOptions {
  /** Postgres table to subscribe to */
  table: string;
  /** Event type filter (default: '*') */
  event?: "INSERT" | "UPDATE" | "DELETE" | "*";
  /** PostgREST-style filter (e.g. `institution_id=eq.abc`) */
  filter?: string;
  /** Callback invoked on each realtime payload */
  onPayload: (
    payload: RealtimePostgresChangesPayload<Record<string, unknown>>
  ) => void;
  /** Optional polling function called as fallback when realtime is unavailable */
  pollingFn?: () => void;
  /** Polling interval in ms (default: 30 000) */
  pollingInterval?: number;
  /** When false, skip the realtime subscription entirely (default: true) */
  enabled?: boolean;
  /**
   * Update strategy (default: "realtime"):
   * - "realtime": subscribe to `postgres_changes` for this table (low latency,
   *   but every change on the published table is WAL-decoded and delivered per
   *   subscriber — this does NOT scale for broad, institution- or global-scoped
   *   data because it fans out to every viewer).
   * - "poll": skip the subscription entirely and refresh via `pollingFn` on a
   *   fixed `pollingInterval`. Use this for inherently broad data (e.g. an
   *   institution-wide leaderboard, an all-courses grading queue) where a
   *   tightly-scoped realtime filter is impossible. Cost is bounded and scales
   *   linearly per client instead of as O(writes × viewers).
   */
  strategy?: "realtime" | "poll";
}

/**
 * Shared realtime subscription hook with:
 * - Channel deduplication (one channel per table+event+filter combo)
 * - Reconnection with exponential backoff (1s → 2s → 4s → 8s → max 30s)
 * - Fallback to polling (30s refetchInterval) on connection failure
 * - `isLive` state exposed to consumers for "Live updates paused" banner
 * - Full cleanup on unmount
 */
export const useRealtime = (
  options: RealtimeOptions
): { isLive: boolean; retryCount: number } => {
  const {
    table,
    event = "*",
    filter,
    onPayload,
    pollingFn,
    pollingInterval = 30_000,
    enabled = true,
    strategy = "realtime",
  } = options;

  const [isLive, setIsLive] = useState(true);
  const [retryCount, setRetryCount] = useState(0);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const retryCountRef = useRef(0);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Store latest callbacks in refs to avoid stale closures
  const onPayloadRef = useRef(onPayload);
  const pollingFnRef = useRef(pollingFn);

  useEffect(() => {
    onPayloadRef.current = onPayload;
  }, [onPayload]);

  useEffect(() => {
    pollingFnRef.current = pollingFn;
  }, [pollingFn]);

  const startPolling = useCallback(() => {
    if (pollingTimerRef.current) return;
    const fn = pollingFnRef.current;
    if (fn) {
      fn(); // Immediate fetch
      pollingTimerRef.current = setInterval(() => fn(), pollingInterval);
    }
    setIsLive(false);
  }, [pollingInterval]);

  const stopPolling = useCallback(() => {
    if (pollingTimerRef.current) {
      clearInterval(pollingTimerRef.current);
      pollingTimerRef.current = null;
    }
    setIsLive(true);
  }, []);

  useEffect(() => {
    // Skip subscription when disabled (e.g. required filter value not yet resolved)
    if (!enabled) return;

    // Polling strategy: deliberately do NOT open a postgres_changes channel.
    // For institution-/global-scoped data a realtime subscription cannot be
    // filtered down and would WAL-fan-out to every viewer (the single largest
    // database CPU consumer at scale). Refresh on a fixed interval instead. The
    // consuming query already fetches on mount, so we only schedule subsequent
    // refreshes here. isLive stays true (polling has no "disconnected" state),
    // so the consuming page's reconnect banner correctly shows nothing.
    if (strategy === "poll") {
      // No setState here: isLive keeps its initial `true` and retryCount its
      // initial `0` (polling has no "disconnected" state, so the page's
      // reconnect banner correctly shows nothing). `strategy` is static per
      // mount, so the initial values are always correct — avoiding a
      // setState() in the effect body (react-hooks/set-state-in-effect).
      const fn = pollingFnRef.current;
      if (!fn) return;
      const id = setInterval(() => fn(), pollingInterval);
      pollingTimerRef.current = id;
      return () => {
        clearInterval(id);
        pollingTimerRef.current = null;
      };
    }

    // Deduplicate: one channel per table+event+filter combo
    const channelName = `${table}:${event}:${filter ?? "all"}`;

    const doSubscribe = () => {
      const channel = supabase
        .channel(channelName)
        .on(
          "postgres_changes",
          { event, schema: "public", table, filter },
          (payload) => {
            onPayloadRef.current(payload);
          }
        )
        .subscribe((status) => {
          if (status === "SUBSCRIBED") {
            retryCountRef.current = 0;
            setRetryCount(0);
            stopPolling();
          } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
            // Exponential backoff: 1s, 2s, 4s, 8s, … max 30s
            const delay = Math.min(
              1000 * Math.pow(2, retryCountRef.current),
              30_000
            );
            retryCountRef.current += 1;
            setRetryCount(retryCountRef.current);
            startPolling();

            if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
            retryTimerRef.current = setTimeout(() => {
              channel.unsubscribe();
              doSubscribe();
            }, delay);
          }
        });

      channelRef.current = channel;
    };

    doSubscribe();

    return () => {
      if (channelRef.current) {
        channelRef.current.unsubscribe();
        channelRef.current = null;
      }
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current);
        retryTimerRef.current = null;
      }
      stopPolling();
    };
  }, [
    table,
    event,
    filter,
    enabled,
    strategy,
    pollingInterval,
    startPolling,
    stopPolling,
  ]);

  return { isLive, retryCount };
};
