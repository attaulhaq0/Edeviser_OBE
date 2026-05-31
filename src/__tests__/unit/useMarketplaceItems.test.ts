// @vitest-environment happy-dom
// =============================================================================
// useMarketplaceItems — Unit tests
// Validates: Requirements 34.1, 34.3 (bounded, paginated marketplace fetch
// with load-more capability)
// =============================================================================

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { createElement } from "react";

// ── Supabase mock ─────────────────────────────────────────────────────────────

interface MockState {
  items: Array<Record<string, unknown>>;
  itemsError: Error | null;
  saleData: Array<Record<string, unknown>>;
  saleError: Error | null;
}

const state: MockState = {
  items: [],
  itemsError: null,
  saleData: [],
  saleError: null,
};

// Builder for the bounded `marketplace_items` query. It is thenable so the hook
// can `await` the chain; it slices `state.items` to the requested `.range()`
// and returns an exact `count`, mimicking PostgREST `{ count: "exact" }`.
const makeItemsBuilder = () => {
  let rangeFrom = 0;
  let rangeTo = Number.MAX_SAFE_INTEGER;
  let categoryFilter: string | undefined;
  const builder = {
    select: () => builder,
    eq: (col: string, val: unknown) => {
      if (col === "category") categoryFilter = val as string;
      return builder;
    },
    order: () => builder,
    range: (from: number, to: number) => {
      rangeFrom = from;
      rangeTo = to;
      return builder;
    },
    then: (
      resolve: (value: {
        data: Array<Record<string, unknown>> | null;
        error: Error | null;
        count: number | null;
      }) => void
    ) =>
      // Resolve on a microtask (like a real network call) so React Query goes
      // through proper loading→success transitions and notifies observers;
      // a synchronous resolve suppresses the re-render renderHook observes.
      Promise.resolve().then(() => {
        if (state.itemsError) {
          resolve({ data: null, error: state.itemsError, count: null });
          return;
        }
        const filtered = categoryFilter
          ? state.items.filter((i) => i.category === categoryFilter)
          : state.items;
        const slice = filtered.slice(rangeFrom, rangeTo + 1);
        resolve({ data: slice, error: null, count: filtered.length });
      }),
  };
  return builder;
};

// Builder for the `sale_event_items` lookup used to compute discounts.
const makeSaleBuilder = () => {
  const builder = {
    select: () => builder,
    in: () => builder,
    filter: () => builder,
    then: (
      resolve: (value: {
        data: Array<Record<string, unknown>> | null;
        error: Error | null;
      }) => void
    ) =>
      Promise.resolve().then(() =>
        resolve({ data: state.saleData, error: state.saleError })
      ),
  };
  return builder;
};

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: vi.fn((table: string) =>
      table === "sale_event_items" ? makeSaleBuilder() : makeItemsBuilder()
    ),
  },
}));

// ── Test harness ──────────────────────────────────────────────────────────────

import { useMarketplaceItems } from "@/hooks/useMarketplace";
import type { MarketplaceItemsPage } from "@/hooks/useMarketplace";

const createWrapper = () => {
  const queryClient = new QueryClient({
    // `notifyOnChangeProps: "all"` forces the observer to re-render on any
    // cache change. Without it, React Query's tracked-props optimization skips
    // re-rendering when only `data` grows (status stays "success") — which
    // happens on `fetchNextPage` — because `renderHook` stores the whole result
    // object without destructuring tracked props during render.
    defaultOptions: {
      queries: { retry: false, notifyOnChangeProps: "all" },
    },
  });
  return ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children);
};

const makeItem = (
  i: number,
  overrides: Record<string, unknown> = {}
): Record<string, unknown> => ({
  id: `item-${i}`,
  institution_id: "inst-1",
  name: `Item ${i}`,
  description: "desc",
  category: "cosmetic",
  sub_category: "avatar",
  xp_price: 100,
  level_requirement: 1,
  stock_type: "unlimited",
  stock_quantity: null,
  icon_identifier: "icon",
  metadata: {},
  is_active: true,
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
  ...overrides,
});

beforeEach(() => {
  state.items = [];
  state.itemsError = null;
  state.saleData = [];
  state.saleError = null;
});

// ── Bounded first page ──────────────────────────────────────────────────────

// Strips `noUncheckedIndexedAccess` `| undefined` from page access, asserting
// the page exists (the test has already awaited a successful fetch).
const pageAt = (
  pages: MarketplaceItemsPage[] | undefined,
  index: number
): MarketplaceItemsPage => {
  const page = pages?.[index];
  if (!page) throw new Error(`expected page at index ${index}`);
  return page;
};

describe("useMarketplaceItems pagination", () => {
  it("returns a bounded first page and reports more pages available", async () => {
    state.items = Array.from({ length: 5 }, (_, i) => makeItem(i));
    const { result } = renderHook(() => useMarketplaceItems(undefined, 2), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const firstPage = pageAt(result.current.data?.pages, 0);
    expect(firstPage.items).toHaveLength(2);
    expect(firstPage.total).toBe(5);
    expect(firstPage.hasMore).toBe(true);
    expect(result.current.hasNextPage).toBe(true);
  });

  it("loads additional pages and stops when the source is exhausted", async () => {
    state.items = Array.from({ length: 5 }, (_, i) => makeItem(i));
    const { result } = renderHook(() => useMarketplaceItems(undefined, 2), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // Page 2
    await act(async () => {
      await result.current.fetchNextPage();
    });
    await waitFor(() => expect(result.current.data?.pages).toHaveLength(2), {
      timeout: 3000,
    });

    // Page 3 (final partial page)
    await act(async () => {
      await result.current.fetchNextPage();
    });
    await waitFor(() => expect(result.current.data?.pages).toHaveLength(3), {
      timeout: 3000,
    });

    const pages = result.current.data?.pages ?? [];
    const allItems = pages.flatMap((p) => p.items);
    // Completeness: every item retrieved exactly once, no duplicates.
    expect(allItems).toHaveLength(5);
    expect(new Set(allItems.map((i) => i.id)).size).toBe(5);

    const lastPage = pageAt(pages, pages.length - 1);
    expect(lastPage.hasMore).toBe(false);
    expect(result.current.hasNextPage).toBe(false);
  });

  it("reports no further pages when the source fits in one page", async () => {
    state.items = Array.from({ length: 2 }, (_, i) => makeItem(i));
    const { result } = renderHook(() => useMarketplaceItems(undefined, 24), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const firstPage = pageAt(result.current.data?.pages, 0);
    expect(firstPage.items).toHaveLength(2);
    expect(firstPage.hasMore).toBe(false);
    expect(result.current.hasNextPage).toBe(false);
  });

  it("filters by category and bounds the filtered set", async () => {
    state.items = [
      makeItem(0, { category: "cosmetic" }),
      makeItem(1, { category: "power_up" }),
      makeItem(2, { category: "cosmetic" }),
      makeItem(3, { category: "cosmetic" }),
    ];
    const { result } = renderHook(() => useMarketplaceItems("cosmetic", 2), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const firstPage = pageAt(result.current.data?.pages, 0);
    expect(firstPage.total).toBe(3);
    expect(firstPage.items).toHaveLength(2);
    expect(firstPage.items.every((i) => i.category === "cosmetic")).toBe(true);
  });

  it("returns an empty page with no more pages when there are no items", async () => {
    state.items = [];
    const { result } = renderHook(() => useMarketplaceItems(undefined, 24), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const firstPage = pageAt(result.current.data?.pages, 0);
    expect(firstPage.items).toHaveLength(0);
    expect(firstPage.total).toBe(0);
    expect(firstPage.hasMore).toBe(false);
    expect(result.current.hasNextPage).toBe(false);
  });

  it("applies the highest active sale discount to effective price", async () => {
    state.items = [makeItem(0, { id: "item-0", xp_price: 100 })];
    state.saleData = [
      {
        item_id: "item-0",
        sale_event_id: "sale-1",
        sale_events: { discount_percentage: 25 },
      },
    ];
    const { result } = renderHook(() => useMarketplaceItems(undefined, 24), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const item = pageAt(result.current.data?.pages, 0).items[0];
    expect(item?.sale_discount).toBe(25);
    expect(item?.effective_price).toBe(75);
  });

  it("surfaces a query error", async () => {
    state.itemsError = new Error("boom");
    const { result } = renderHook(() => useMarketplaceItems(undefined, 24), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(Error);
  });
});
