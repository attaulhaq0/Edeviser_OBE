// =============================================================================
// useRealtime — Unit tests
// Validates: Requirements 2.10 (centralized subscription manager)
// =============================================================================

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// ─── Supabase mock ───────────────────────────────────────────────────────────

type SubscribeCallback = (status: string) => void;

const mockState = {
  subscribeCallback: null as SubscribeCallback | null,
  onPayloadCallback: null as ((payload: unknown) => void) | null,
  unsubscribeCalled: false,
};

const channelObj = {
  on: vi.fn((_type: string, _opts: unknown, cb: (payload: unknown) => void) => {
    mockState.onPayloadCallback = cb;
    return channelObj;
  }),
  subscribe: vi.fn((cb?: SubscribeCallback) => {
    mockState.subscribeCallback = cb ?? null;
    return channelObj;
  }),
  unsubscribe: vi.fn(() => {
    mockState.unsubscribeCalled = true;
  }),
};

vi.mock('@/lib/supabase', () => ({
  supabase: {
    channel: vi.fn(() => channelObj),
  },
}));

// ─── Helpers ─────────────────────────────────────────────────────────────────

import { useRealtime } from '@/hooks/useRealtime';
import { supabase } from '@/lib/supabase';

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('useRealtime', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    mockState.subscribeCallback = null;
    mockState.onPayloadCallback = null;
    mockState.unsubscribeCalled = false;

    // Re-wire chainable returns after clearAllMocks
    channelObj.on.mockImplementation((_type: string, _opts: unknown, cb: (payload: unknown) => void) => {
      mockState.onPayloadCallback = cb;
      return channelObj;
    });
    channelObj.subscribe.mockImplementation((cb?: SubscribeCallback) => {
      mockState.subscribeCallback = cb ?? null;
      return channelObj;
    });
    channelObj.unsubscribe.mockImplementation(() => {
      mockState.unsubscribeCalled = true;
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('creates a channel with deduplication key from table+event+filter', () => {
    const onPayload = vi.fn();
    renderHook(() =>
      useRealtime({
        table: 'student_gamification',
        event: 'UPDATE',
        filter: 'institution_id=eq.abc',
        onPayload,
      }),
    );

    expect(supabase.channel).toHaveBeenCalledWith('student_gamification:UPDATE:institution_id=eq.abc');
  });

  it('uses default event * and filter "all" when not specified', () => {
    const onPayload = vi.fn();
    renderHook(() =>
      useRealtime({
        table: 'my_table',
        onPayload,
      }),
    );

    expect(supabase.channel).toHaveBeenCalledWith('my_table:*:all');
  });

  it('starts with isLive = true', () => {
    const onPayload = vi.fn();
    const { result } = renderHook(() =>
      useRealtime({ table: 'test', onPayload }),
    );

    expect(result.current.isLive).toBe(true);
  });

  it('sets isLive = true when subscription succeeds', () => {
    const onPayload = vi.fn();
    const { result } = renderHook(() =>
      useRealtime({ table: 'test', onPayload }),
    );

    act(() => {
      mockState.subscribeCallback?.('SUBSCRIBED');
    });

    expect(result.current.isLive).toBe(true);
  });

  it('sets isLive = false on CHANNEL_ERROR and starts polling', () => {
    const pollingFn = vi.fn();
    const onPayload = vi.fn();
    const { result } = renderHook(() =>
      useRealtime({ table: 'test', onPayload, pollingFn, pollingInterval: 30_000 }),
    );

    act(() => {
      mockState.subscribeCallback?.('CHANNEL_ERROR');
    });

    expect(result.current.isLive).toBe(false);

    // Advance time to trigger polling
    act(() => {
      vi.advanceTimersByTime(30_000);
    });

    expect(pollingFn).toHaveBeenCalled();
  });

  it('applies exponential backoff on reconnection: 1s, 2s, 4s', () => {
    const onPayload = vi.fn();
    renderHook(() =>
      useRealtime({ table: 'test', onPayload }),
    );

    // First error → 1s backoff
    act(() => {
      mockState.subscribeCallback?.('CHANNEL_ERROR');
    });
    expect(channelObj.unsubscribe).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    // After 1s, should have unsubscribed and re-subscribed
    expect(channelObj.unsubscribe).toHaveBeenCalled();

    // Reset for next error
    channelObj.unsubscribe.mockClear();

    // Second error → 2s backoff
    act(() => {
      mockState.subscribeCallback?.('CHANNEL_ERROR');
    });

    act(() => {
      vi.advanceTimersByTime(1999);
    });
    expect(channelObj.unsubscribe).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(channelObj.unsubscribe).toHaveBeenCalled();
  });

  it('caps backoff at 30s', () => {
    const onPayload = vi.fn();
    renderHook(() =>
      useRealtime({ table: 'test', onPayload }),
    );

    // Simulate many errors to push backoff past 30s
    for (let i = 0; i < 10; i++) {
      act(() => {
        mockState.subscribeCallback?.('CHANNEL_ERROR');
      });
      act(() => {
        vi.advanceTimersByTime(30_000);
      });
    }

    // The backoff should be capped at 30s (Math.min(1000 * 2^10, 30000) = 30000)
    channelObj.unsubscribe.mockClear();
    act(() => {
      mockState.subscribeCallback?.('CHANNEL_ERROR');
    });
    act(() => {
      vi.advanceTimersByTime(30_000);
    });
    expect(channelObj.unsubscribe).toHaveBeenCalled();
  });

  it('resets retry count on successful subscription', () => {
    const onPayload = vi.fn();
    renderHook(() =>
      useRealtime({ table: 'test', onPayload }),
    );

    // Error → backoff
    act(() => {
      mockState.subscribeCallback?.('CHANNEL_ERROR');
    });
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    // Successful reconnection
    act(() => {
      mockState.subscribeCallback?.('SUBSCRIBED');
    });

    // Next error should start at 1s again (retry count reset)
    channelObj.unsubscribe.mockClear();
    act(() => {
      mockState.subscribeCallback?.('CHANNEL_ERROR');
    });
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(channelObj.unsubscribe).toHaveBeenCalled();
  });

  it('stops polling when subscription succeeds', () => {
    const pollingFn = vi.fn();
    const onPayload = vi.fn();
    const { result } = renderHook(() =>
      useRealtime({ table: 'test', onPayload, pollingFn, pollingInterval: 30_000 }),
    );

    // Error → starts polling
    act(() => {
      mockState.subscribeCallback?.('CHANNEL_ERROR');
    });
    expect(result.current.isLive).toBe(false);

    // Successful reconnection → stops polling
    act(() => {
      mockState.subscribeCallback?.('SUBSCRIBED');
    });
    expect(result.current.isLive).toBe(true);

    // Advance time — polling should NOT fire
    pollingFn.mockClear();
    act(() => {
      vi.advanceTimersByTime(60_000);
    });
    expect(pollingFn).not.toHaveBeenCalled();
  });

  it('cleans up channel and timers on unmount', () => {
    const onPayload = vi.fn();
    const { unmount } = renderHook(() =>
      useRealtime({ table: 'test', onPayload }),
    );

    unmount();

    expect(channelObj.unsubscribe).toHaveBeenCalled();
  });

  it('invokes onPayload callback when realtime event fires', () => {
    const onPayload = vi.fn();
    renderHook(() =>
      useRealtime({ table: 'test', onPayload }),
    );

    const fakePayload = { eventType: 'UPDATE', new: { id: '1' } };
    act(() => {
      mockState.onPayloadCallback?.(fakePayload);
    });

    expect(onPayload).toHaveBeenCalledWith(fakePayload);
  });

  it('handles TIMED_OUT status same as CHANNEL_ERROR', () => {
    const pollingFn = vi.fn();
    const onPayload = vi.fn();
    const { result } = renderHook(() =>
      useRealtime({ table: 'test', onPayload, pollingFn }),
    );

    act(() => {
      mockState.subscribeCallback?.('TIMED_OUT');
    });

    expect(result.current.isLive).toBe(false);
  });
});
