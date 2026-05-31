// @vitest-environment happy-dom
// =============================================================================
// useSurveyAssignmentsCount — Unit tests
// Validates: Requirements 23.1, 23.2, 23.2a (conditional Surveys nav item)
// =============================================================================

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { createElement } from "react";

// ── Supabase mock ─────────────────────────────────────────────────────────────

interface MockState {
  count: number | null;
  error: Error | null;
  lastActiveFilter: { col: string; val: unknown } | null;
  headRequested: boolean;
}

const state: MockState = {
  count: null,
  error: null,
  lastActiveFilter: null,
  headRequested: false,
};

interface CountResult {
  count: number | null;
  error: Error | null;
}

interface QueryBuilder {
  select: (
    cols: string,
    opts?: { count?: string; head?: boolean }
  ) => QueryBuilder;
  // The Supabase builder is thenable; awaiting the `.eq(...)` chain resolves here.
  eq: (col: string, val: unknown) => Promise<CountResult>;
}

const makeBuilder = (): QueryBuilder => {
  const builder: QueryBuilder = {
    select: (_cols, opts) => {
      state.headRequested = opts?.head === true;
      return builder;
    },
    eq: (col, val) => {
      state.lastActiveFilter = { col, val };
      return Promise.resolve({ count: state.count, error: state.error });
    },
  };
  return builder;
};

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: vi.fn(() => makeBuilder()),
  },
}));

// ── Test harness ──────────────────────────────────────────────────────────────

import { useSurveyAssignmentsCount } from "@/hooks/useSurveyAssignmentsCount";

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
  return ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children);
};

beforeEach(() => {
  state.count = null;
  state.error = null;
  state.lastActiveFilter = null;
  state.headRequested = false;
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("useSurveyAssignmentsCount", () => {
  it("returns 0 when the student has no assigned surveys (R23.1)", async () => {
    state.count = 0;
    const { result } = renderHook(() => useSurveyAssignmentsCount(), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBe(0);
  });

  it("returns the positive count when the student has assigned surveys (R23.2)", async () => {
    state.count = 3;
    const { result } = renderHook(() => useSurveyAssignmentsCount(), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBe(3);
  });

  it("treats a null count as 0", async () => {
    state.count = null;
    const { result } = renderHook(() => useSurveyAssignmentsCount(), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBe(0);
  });

  it("counts only active surveys via a head/count query (no full rows)", async () => {
    state.count = 1;
    const { result } = renderHook(() => useSurveyAssignmentsCount(), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(state.headRequested).toBe(true);
    expect(state.lastActiveFilter).toEqual({ col: "is_active", val: true });
  });

  it("surfaces a query failure as an error state", async () => {
    state.error = new Error("rls denied");
    const { result } = renderHook(() => useSurveyAssignmentsCount(), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(Error);
  });
});
