// @vitest-environment happy-dom
// =============================================================================
// useChallengeDetail — Unit tests
// Feature: student-experience-remediation, Task 7.7
// Validates: Requirements 27.1, 27.2, 28.2
//
// The hook uses `.maybeSingle()` (zero-or-one row) so the three outcomes stay
// distinct and separately handleable:
//   - a matched row        → resolves to the challenge   [R27.3 via page]
//   - zero rows (`null`)    → graceful not-found, no throw [R27.1, R27.2]
//   - a genuine query error → error state (isError)        [R28.2]
// =============================================================================

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { createElement } from "react";

// ── Supabase mock ─────────────────────────────────────────────────────────────

interface MaybeSingleResult {
  data: unknown;
  error: Error | null;
}

const state: {
  result: MaybeSingleResult;
  lastTable: string | null;
  lastEq: { col: string; val: unknown } | null;
  maybeSingleCalled: boolean;
} = {
  result: { data: null, error: null },
  lastTable: null,
  lastEq: null,
  maybeSingleCalled: false,
};

const makeBuilder = () => {
  const builder = {
    select: () => builder,
    eq: (col: string, val: unknown) => {
      state.lastEq = { col, val };
      return builder;
    },
    maybeSingle: () => {
      state.maybeSingleCalled = true;
      return Promise.resolve(state.result);
    },
  };
  return builder;
};

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: vi.fn((table: string) => {
      state.lastTable = table;
      return makeBuilder();
    }),
  },
}));

// ── Test harness ──────────────────────────────────────────────────────────────

import { useChallengeDetail } from "@/hooks/useChallengeDetail";

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children);
};

beforeEach(() => {
  state.result = { data: null, error: null };
  state.lastTable = null;
  state.lastEq = null;
  state.maybeSingleCalled = false;
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("useChallengeDetail", () => {
  it("queries social_challenges by id using a zero-or-one row query (R27.1)", async () => {
    state.result = {
      data: { id: "ch-1", title: "3-Day Streak", challenge_type: "habit" },
      error: null,
    };

    const { result } = renderHook(() => useChallengeDetail("ch-1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(state.lastTable).toBe("social_challenges");
    expect(state.lastEq).toEqual({ col: "id", val: "ch-1" });
    expect(state.maybeSingleCalled).toBe(true);
  });

  it("returns the challenge when a row matches (R27.3)", async () => {
    state.result = {
      data: { id: "ch-1", title: "3-Day Streak", challenge_type: "habit" },
      error: null,
    };

    const { result } = renderHook(() => useChallengeDetail("ch-1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toMatchObject({ id: "ch-1" });
    expect(result.current.isError).toBe(false);
  });

  it("resolves to null (graceful not-found) when zero rows match, without throwing (R27.2)", async () => {
    state.result = { data: null, error: null };

    const { result } = renderHook(() => useChallengeDetail("missing-id"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    // null is a success value, NOT an error — distinct from the error path.
    expect(result.current.data).toBeNull();
    expect(result.current.isError).toBe(false);
  });

  it("surfaces a genuine query failure as an error state, distinct from not-found (R28.2)", async () => {
    state.result = { data: null, error: new Error("rls denied") };

    const { result } = renderHook(() => useChallengeDetail("ch-1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.data).toBeUndefined();
  });

  it("does not run the query when no challenge id is provided", async () => {
    const { result } = renderHook(() => useChallengeDetail(undefined), {
      wrapper: createWrapper(),
    });

    // Disabled query stays pending and never touches supabase.
    expect(result.current.fetchStatus).toBe("idle");
    expect(state.lastTable).toBeNull();
  });
});
