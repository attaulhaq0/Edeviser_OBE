// @vitest-environment happy-dom
// =============================================================================
// usePortfolioSharingPermission + useTogglePortfolioPublic — Unit tests
// Validates: Requirements 24.1, 24.2 (gate public sharing on school permission)
// =============================================================================

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { createElement } from "react";

// ── Supabase mock ─────────────────────────────────────────────────────────────

interface ProfileRow {
  portfolio_sharing_permitted: boolean;
}

interface MockState {
  profileRow: ProfileRow | null;
  readError: Error | null;
  updateError: Error | null;
  lastUpdatePayload: Record<string, unknown> | null;
}

const state: MockState = {
  profileRow: null,
  readError: null,
  updateError: null,
  lastUpdatePayload: null,
};

interface QueryBuilder {
  select: (cols?: string) => QueryBuilder;
  update: (payload: Record<string, unknown>) => QueryBuilder;
  eq: (col: string, val: unknown) => QueryBuilder;
  maybeSingle: () => Promise<{ data: ProfileRow | null; error: Error | null }>;
  // The Supabase builder is thenable; awaiting an update chain resolves here.
  then: (resolve: (value: { error: Error | null }) => void) => void;
}

const makeBuilder = (): QueryBuilder => {
  const builder: QueryBuilder = {
    select: () => builder,
    update: (payload) => {
      state.lastUpdatePayload = payload;
      return builder;
    },
    eq: () => builder,
    maybeSingle: () =>
      Promise.resolve({ data: state.profileRow, error: state.readError }),
    then: (resolve) => resolve({ error: state.updateError }),
  };
  return builder;
};

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: vi.fn(() => makeBuilder()),
  },
}));

// ── Test harness ──────────────────────────────────────────────────────────────

import {
  usePortfolioSharingPermission,
  useTogglePortfolioPublic,
} from "@/hooks/usePortfolio";

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children);
};

beforeEach(() => {
  state.profileRow = null;
  state.readError = null;
  state.updateError = null;
  state.lastUpdatePayload = null;
});

// ── usePortfolioSharingPermission ───────────────────────────────────────────────

describe("usePortfolioSharingPermission", () => {
  it("returns true when the admin-granted flag is set", async () => {
    state.profileRow = { portfolio_sharing_permitted: true };
    const { result } = renderHook(
      () => usePortfolioSharingPermission("user-1"),
      { wrapper: createWrapper() }
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBe(true);
  });

  it("returns false when permission has not been granted", async () => {
    state.profileRow = { portfolio_sharing_permitted: false };
    const { result } = renderHook(
      () => usePortfolioSharingPermission("user-1"),
      { wrapper: createWrapper() }
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBe(false);
  });

  it("treats a missing profile row as not permitted", async () => {
    state.profileRow = null;
    const { result } = renderHook(
      () => usePortfolioSharingPermission("user-1"),
      { wrapper: createWrapper() }
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBe(false);
  });

  it("is disabled (does not fetch) without a userId", () => {
    const { result } = renderHook(
      () => usePortfolioSharingPermission(undefined),
      { wrapper: createWrapper() }
    );
    expect(result.current.fetchStatus).toBe("idle");
    expect(result.current.data).toBeUndefined();
  });
});

// ── useTogglePortfolioPublic ────────────────────────────────────────────────────

describe("useTogglePortfolioPublic", () => {
  it("makes the portfolio public when permission is granted", async () => {
    state.profileRow = { portfolio_sharing_permitted: true };
    const { result } = renderHook(() => useTogglePortfolioPublic(), {
      wrapper: createWrapper(),
    });

    const outcome = await result.current.mutateAsync({
      userId: "user-1",
      isPublic: true,
    });

    expect(outcome).toEqual({ permitted: true, isPublic: true });
    expect(state.lastUpdatePayload).toEqual({ portfolio_public: true });
  });

  it("keeps the portfolio private when permission is NOT granted", async () => {
    state.profileRow = { portfolio_sharing_permitted: false };
    const { result } = renderHook(() => useTogglePortfolioPublic(), {
      wrapper: createWrapper(),
    });

    const outcome = await result.current.mutateAsync({
      userId: "user-1",
      isPublic: true,
    });

    // Toggle is ineffective without permission: persisted value stays false.
    expect(outcome).toEqual({ permitted: false, isPublic: false });
    expect(state.lastUpdatePayload).toEqual({ portfolio_public: false });
  });

  it("treats a missing profile row as not permitted and stays private", async () => {
    state.profileRow = null;
    const { result } = renderHook(() => useTogglePortfolioPublic(), {
      wrapper: createWrapper(),
    });

    const outcome = await result.current.mutateAsync({
      userId: "user-1",
      isPublic: true,
    });

    expect(outcome).toEqual({ permitted: false, isPublic: false });
    expect(state.lastUpdatePayload).toEqual({ portfolio_public: false });
  });

  it("always honors turning sharing OFF regardless of permission", async () => {
    state.profileRow = { portfolio_sharing_permitted: true };
    const { result } = renderHook(() => useTogglePortfolioPublic(), {
      wrapper: createWrapper(),
    });

    const outcome = await result.current.mutateAsync({
      userId: "user-1",
      isPublic: false,
    });

    expect(outcome).toEqual({ permitted: true, isPublic: false });
    expect(state.lastUpdatePayload).toEqual({ portfolio_public: false });
  });

  it("propagates a read error without updating the row", async () => {
    state.readError = new Error("read failed");
    const { result } = renderHook(() => useTogglePortfolioPublic(), {
      wrapper: createWrapper(),
    });

    await expect(
      result.current.mutateAsync({ userId: "user-1", isPublic: true })
    ).rejects.toThrow("read failed");
    expect(state.lastUpdatePayload).toBeNull();
  });

  it("propagates an update error", async () => {
    state.profileRow = { portfolio_sharing_permitted: true };
    state.updateError = new Error("update failed");
    const { result } = renderHook(() => useTogglePortfolioPublic(), {
      wrapper: createWrapper(),
    });

    await expect(
      result.current.mutateAsync({ userId: "user-1", isPublic: true })
    ).rejects.toThrow("update failed");
  });
});
