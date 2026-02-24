// =============================================================================
// useLeaderboardRealtime — Unit tests
// Validates: Requirements 25.4
// =============================================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement, type ReactNode } from 'react';

// ─── Supabase mock ───────────────────────────────────────────────────────────
// vi.mock factories are hoisted — avoid referencing outer `const` variables.

const mockState = {
  onCalls: [] as Array<[string, Record<string, string>, () => void]>,
  subscribeCalled: false,
  removeChannelArg: null as unknown,
};

const channelObj = {
  on: vi.fn((...args: unknown[]) => {
    mockState.onCalls.push(args as [string, Record<string, string>, () => void]);
    return channelObj;
  }),
  subscribe: vi.fn(() => {
    mockState.subscribeCalled = true;
    return channelObj;
  }),
};

vi.mock('@/lib/supabase', () => ({
  supabase: {
    channel: vi.fn(() => channelObj),
    removeChannel: vi.fn((ch: unknown) => {
      mockState.removeChannelArg = ch;
    }),
  },
}));

vi.mock('@/lib/queryKeys', () => ({
  queryKeys: {
    leaderboard: {
      lists: () => ['leaderboard', 'list'] as const,
    },
  },
}));

// ─── Helpers ─────────────────────────────────────────────────────────────────

import { useLeaderboardRealtime } from '@/hooks/useLeaderboardRealtime';
import { supabase } from '@/lib/supabase';

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children);
};

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('useLeaderboardRealtime', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockState.onCalls = [];
    mockState.subscribeCalled = false;
    mockState.removeChannelArg = null;
    // Re-wire chainable returns after clearAllMocks
    channelObj.on.mockImplementation((...args: unknown[]) => {
      mockState.onCalls.push(args as [string, Record<string, string>, () => void]);
      return channelObj;
    });
    channelObj.subscribe.mockImplementation(() => {
      mockState.subscribeCalled = true;
      return channelObj;
    });
  });

  it('subscribes to the leaderboard-realtime channel on mount', () => {
    renderHook(() => useLeaderboardRealtime(), { wrapper: createWrapper() });

    expect(supabase.channel).toHaveBeenCalledWith('leaderboard-realtime');
    expect(channelObj.on).toHaveBeenCalledWith(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'student_gamification' },
      expect.any(Function),
    );
    expect(mockState.subscribeCalled).toBe(true);
  });

  it('removes the channel on unmount', () => {
    const { unmount } = renderHook(() => useLeaderboardRealtime(), {
      wrapper: createWrapper(),
    });

    unmount();

    expect(supabase.removeChannel).toHaveBeenCalledWith(channelObj);
  });

  it('invalidates leaderboard queries when a change event fires', () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const wrapper = ({ children }: { children: ReactNode }) =>
      createElement(QueryClientProvider, { client: queryClient }, children);

    renderHook(() => useLeaderboardRealtime(), { wrapper });

    // Extract the callback passed to `.on()` and invoke it
    const onCallback = mockState.onCalls[0]?.[2];
    expect(onCallback).toBeDefined();
    onCallback?.();

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ['leaderboard', 'list'],
    });
  });
});
