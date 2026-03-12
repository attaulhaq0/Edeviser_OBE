// =============================================================================
// useRealtime — Shared realtime subscription manager
// Provides channel deduplication, exponential backoff reconnection,
// polling fallback, and "Live updates paused" state.
// Validates: Requirements 2.10
// =============================================================================

import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';

interface RealtimeOptions {
  /** Postgres table to subscribe to */
  table: string;
  /** Event type filter (default: '*') */
  event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
  /** PostgREST-style filter (e.g. `institution_id=eq.abc`) */
  filter?: string;
  /** Callback invoked on each realtime payload */
  onPayload: (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => void;
  /** Optional polling function called as fallback when realtime is unavailable */
  pollingFn?: () => void;
  /** Polling interval in ms (default: 30 000) */
  pollingInterval?: number;
}

/**
 * Shared realtime subscription hook with:
 * - Channel deduplication (one channel per table+event+filter combo)
 * - Reconnection with exponential backoff (1s → 2s → 4s → 8s → max 30s)
 * - Fallback to polling (30s refetchInterval) on connection failure
 * - `isLive` state exposed to consumers for "Live updates paused" banner
 * - Full cleanup on unmount
 */
export const useRealtime = (options: RealtimeOptions): { isLive: boolean } => {
  const { table, event = '*', filter, onPayload, pollingFn, pollingInterval = 30_000 } = options;

  const [isLive, setIsLive] = useState(true);
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
    // Deduplicate: one channel per table+event+filter combo
    const channelName = `${table}:${event}:${filter ?? 'all'}`;

    const doSubscribe = () => {
      const channel = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          { event, schema: 'public', table, filter },
          (payload) => {
            onPayloadRef.current(payload);
          },
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            retryCountRef.current = 0;
            stopPolling();
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            // Exponential backoff: 1s, 2s, 4s, 8s, … max 30s
            const delay = Math.min(1000 * Math.pow(2, retryCountRef.current), 30_000);
            retryCountRef.current += 1;
            startPolling();

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
  }, [table, event, filter, startPolling, stopPolling]);

  return { isLive };
};
