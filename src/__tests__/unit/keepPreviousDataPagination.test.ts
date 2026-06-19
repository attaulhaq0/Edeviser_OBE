// @vitest-environment happy-dom
// =============================================================================
// keepPreviousDataPagination.test.ts
// Feature: dashboard-and-ux-performance, Req 5 (smooth pagination with
// keepPreviousData) — task 5.2.
// -----------------------------------------------------------------------------
// Locks in the behavioral contract of `placeholderData: keepPreviousData` on the
// paginated list hooks: when the page changes, the PREVIOUS page's rows remain
// visible (as placeholder data, `isPlaceholderData === true`) until the next
// page resolves — no flash of empty/skeleton — and the data semantics are
// unchanged once the new page lands. `usePrograms` is the representative hook;
// all 11 paginated list hooks were given the identical option in the same change.
//
// The Supabase client is mocked with a controllable per-call builder so the
// second page's fetch can be held pending to observe the placeholder window.
// =============================================================================
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement, type ReactNode } from "react";

// ─── Supabase mock ───────────────────────────────────────────────────────────
// Each `from()` returns a thenable builder backed by the next queued result
// promise, so we can resolve page 2 on demand and inspect the placeholder window.

interface QueryResult {
  data: Array<Record<string, unknown>>;
  error: null | { message: string };
  count: number;
}

const resultQueue: Array<Promise<QueryResult>> = [];
const mockFrom = vi.fn();

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}));

import { usePrograms } from "@/hooks/usePrograms";

const makeBuilder = () => {
  const pending =
    resultQueue.shift() ??
    Promise.resolve<QueryResult>({ data: [], error: null, count: 0 });
  const builder: Record<string, unknown> = {
    select: () => builder,
    order: () => builder,
    range: () => builder,
    or: () => builder,
    then: (
      resolve: (value: QueryResult) => unknown,
      reject?: (reason: unknown) => unknown
    ) => pending.then(resolve, reject),
  };
  return builder;
};

const makeWrapper = () => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const Wrapper = ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client }, children);
  return Wrapper;
};

const PAGE_1 = [{ id: "1", name: "Program One" }];
const PAGE_2 = [{ id: "2", name: "Program Two" }];

describe("paginated list hooks keepPreviousData (dashboard-and-ux-performance Req 5)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resultQueue.length = 0;
    mockFrom.mockImplementation(() => makeBuilder());
  });

  it("keeps the previous page's rows visible while the next page is fetching", async () => {
    // Page 1 resolves immediately.
    resultQueue.push(Promise.resolve({ data: PAGE_1, error: null, count: 50 }));

    const { result, rerender } = renderHook(
      ({ page }: { page: number }) => usePrograms({ page }),
      { wrapper: makeWrapper(), initialProps: { page: 1 } }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.data).toEqual(PAGE_1);
    expect(result.current.isPlaceholderData).toBe(false);

    // Queue a DEFERRED page-2 result so we can observe the placeholder window.
    let resolvePage2: (value: QueryResult) => void = () => {};
    resultQueue.push(
      new Promise<QueryResult>((resolve) => {
        resolvePage2 = resolve;
      })
    );

    // Change the page → new query key. With keepPreviousData the prior rows
    // remain as placeholder data instead of flashing empty.
    rerender({ page: 2 });

    await waitFor(() => expect(result.current.isPlaceholderData).toBe(true));
    // Prior page's rows are still the rendered data during the fetch.
    expect(result.current.data?.data).toEqual(PAGE_1);

    // Resolve page 2 → rows swap, placeholder flag clears, semantics unchanged.
    resolvePage2({ data: PAGE_2, error: null, count: 50 });

    await waitFor(() => expect(result.current.data?.data).toEqual(PAGE_2));
    expect(result.current.isPlaceholderData).toBe(false);
  });
});
