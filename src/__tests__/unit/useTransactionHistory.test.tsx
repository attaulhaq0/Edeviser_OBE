// @vitest-environment happy-dom
// =============================================================================
// useTransactionHistory — Unit tests
// Validates: Requirements 33.1, 33.1a, 33.2, 33.3
//   - source-level pagination via get_xp_transactions_page (no .range cap)
//   - { entries, totalCount, hasMore } derived from the RPC page + count
//   - on RPC failure: surface error and refuse to show transactions
// =============================================================================

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { createElement } from "react";

// ── Supabase mock ─────────────────────────────────────────────────────────────

interface RpcRow {
  id: string;
  kind: string;
  amount: number;
  label: string;
  category: string;
  occurred_at: string;
  total_count: number;
}

interface MockState {
  rows: RpcRow[] | null;
  error: Error | null;
  lastArgs: Record<string, unknown> | null;
  lastFn: string | null;
}

const state: MockState = {
  rows: null,
  error: null,
  lastArgs: null,
  lastFn: null,
};

const rpcMock = vi.fn((fn: string, args: Record<string, unknown>) => {
  state.lastFn = fn;
  state.lastArgs = args;
  return Promise.resolve({ data: state.rows, error: state.error });
});

vi.mock("@/lib/supabase", () => ({
  supabase: {
    rpc: (fn: string, args: Record<string, unknown>) => rpcMock(fn, args),
  },
}));

// ── Test harness ──────────────────────────────────────────────────────────────

import {
  useTransactionHistory,
  type TransactionFilter,
} from "@/hooks/useTransactionHistory";

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children);
};

const STUDENT = "student-1";

beforeEach(() => {
  state.rows = null;
  state.error = null;
  state.lastArgs = null;
  state.lastFn = null;
  rpcMock.mockClear();
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("useTransactionHistory", () => {
  it("uses source-level pagination via the get_xp_transactions_page RPC (R33.1)", async () => {
    state.rows = [];
    const { result } = renderHook(
      () => useTransactionHistory(STUDENT, "all", 0),
      { wrapper: createWrapper() }
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(state.lastFn).toBe("get_xp_transactions_page");
    expect(state.lastArgs).toEqual({
      p_student_id: STUDENT,
      p_filter: "all",
      p_limit: 20,
      p_offset: 0,
    });
  });

  it("passes the zero-based page through as a source offset (R33.2)", async () => {
    state.rows = [];
    const { result } = renderHook(
      () => useTransactionHistory(STUDENT, "earnings", 3),
      { wrapper: createWrapper() }
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(state.lastArgs).toMatchObject({
      p_filter: "earnings",
      p_limit: 20,
      p_offset: 60,
    });
  });

  it("maps earning and spending rows into typed entries with the exact total_count", async () => {
    state.rows = [
      {
        id: "earn-abc",
        kind: "earning",
        amount: 25,
        label: "submission",
        category: "submission",
        occurred_at: "2026-05-30T10:00:00Z",
        total_count: 42,
      },
      {
        id: "spend-xyz",
        kind: "spending",
        amount: 200,
        label: "Streak Freeze",
        category: "power_up",
        occurred_at: "2026-05-29T09:00:00Z",
        total_count: 42,
      },
    ];
    const { result } = renderHook(
      () => useTransactionHistory(STUDENT, "all", 0),
      { wrapper: createWrapper() }
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const data = result.current.data;
    expect(data?.totalCount).toBe(42);
    expect(data?.entries).toHaveLength(2);

    expect(data?.entries[0]).toEqual({
      id: "earn-abc",
      type: "earning",
      amount: 25,
      label: "Assignment Submission", // earning source mapped to a label
      category: "submission",
      date: "2026-05-30T10:00:00Z",
    });

    expect(data?.entries[1]).toEqual({
      id: "spend-xyz",
      type: "spending",
      amount: 200,
      label: "Streak Freeze", // spending label comes straight from the RPC
      category: "power_up",
      date: "2026-05-29T09:00:00Z",
    });
  });

  it("reports hasMore when more entries exist beyond the current page (R33.2)", async () => {
    // total_count 42, page 0, page size 20 → another page exists
    state.rows = [
      {
        id: "earn-1",
        kind: "earning",
        amount: 10,
        label: "login",
        category: "login",
        occurred_at: "2026-05-30T08:00:00Z",
        total_count: 42,
      },
    ];
    const { result } = renderHook(
      () => useTransactionHistory(STUDENT, "all", 0),
      { wrapper: createWrapper() }
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.hasMore).toBe(true);
  });

  it("reports no further pages on the last page", async () => {
    // total_count 42, page 2 (offset 40) → entries 41-42, no more pages
    state.rows = [
      {
        id: "earn-41",
        kind: "earning",
        amount: 10,
        label: "login",
        category: "login",
        occurred_at: "2026-05-01T08:00:00Z",
        total_count: 42,
      },
    ];
    const { result } = renderHook(
      () => useTransactionHistory(STUDENT, "all", 2),
      { wrapper: createWrapper() }
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.hasMore).toBe(false);
  });

  it("returns an empty page with zero count when the offset is beyond the end", async () => {
    state.rows = [];
    const { result } = renderHook(
      () => useTransactionHistory(STUDENT, "all", 99),
      { wrapper: createWrapper() }
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.entries).toEqual([]);
    expect(result.current.data?.totalCount).toBe(0);
    expect(result.current.data?.hasMore).toBe(false);
  });

  it("surfaces an RPC failure as an error and refuses to show transactions (R33.1a)", async () => {
    state.error = new Error("rpc unavailable");
    const { result } = renderHook(
      () => useTransactionHistory(STUDENT, "all", 0),
      { wrapper: createWrapper() }
    );
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(Error);
    // No truncated/fallback data is exposed when the source query fails.
    expect(result.current.data).toBeUndefined();
  });

  it("is disabled until a student id is provided", () => {
    const { result } = renderHook(
      () => useTransactionHistory("", "all" as TransactionFilter, 0),
      { wrapper: createWrapper() }
    );
    expect(result.current.fetchStatus).toBe("idle");
    expect(rpcMock).not.toHaveBeenCalled();
  });
});
