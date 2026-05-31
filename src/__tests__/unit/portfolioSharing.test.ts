// @vitest-environment happy-dom
// =============================================================================
// usePortfolioSharingPermission + useTogglePortfolioPublic — Unit tests
// Feature: student-experience-remediation, Task 7.9
// Validates: Requirements 24.1, 24.2
// =============================================================================

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement, type ReactNode } from "react";
import {
  usePortfolioSharingPermission,
  useTogglePortfolioPublic,
} from "@/hooks/usePortfolio";
import { queryKeys } from "@/lib/queryKeys";

// ─── Supabase mock ─────────────────────────────────────────────────────────
// The hooks issue two distinct chains against the `profiles` table:
//   read:  from("profiles").select(cols).eq("id", id).maybeSingle()
//   write: from("profiles").update(values).eq("id", id)
// `maybeSingleResult` feeds the read; `updateResult` + `updateSpy` capture the
// write so we can assert the persisted `portfolio_public` value.

let maybeSingleResult: { data: unknown; error: unknown } = {
  data: null,
  error: null,
};
let updateResult: { error: unknown } = { error: null };
const updateSpy = vi.fn();

const buildFrom = () => {
  const maybeSingle = vi.fn(async () => maybeSingleResult);
  const selectEq = vi.fn(() => ({ maybeSingle }));
  const select = vi.fn(() => ({ eq: selectEq }));

  const updateEq = vi.fn(async () => updateResult);
  const update = vi.fn((values: Record<string, unknown>) => {
    updateSpy(values);
    return { eq: updateEq };
  });

  return { select, update };
};

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: (_table: string) => buildFrom(),
  },
}));

const createWrapper = (queryClient: QueryClient) => {
  return ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children);
};

describe("usePortfolioSharingPermission", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    maybeSingleResult = { data: null, error: null };
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
  });

  it("returns the admin-granted permission flag when present", async () => {
    maybeSingleResult = {
      data: { portfolio_sharing_permitted: true },
      error: null,
    };

    const { result } = renderHook(
      () => usePortfolioSharingPermission("user-1"),
      { wrapper: createWrapper(queryClient) }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBe(true);
  });

  it("defaults to false when the flag is absent", async () => {
    maybeSingleResult = { data: {}, error: null };

    const { result } = renderHook(
      () => usePortfolioSharingPermission("user-2"),
      { wrapper: createWrapper(queryClient) }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBe(false);
  });

  it("is disabled and yields false-equivalent when no userId is given", async () => {
    const { result } = renderHook(
      () => usePortfolioSharingPermission(undefined),
      { wrapper: createWrapper(queryClient) }
    );

    // Query is disabled (enabled: !!userId) so it never fetches.
    expect(result.current.fetchStatus).toBe("idle");
    expect(result.current.data).toBeUndefined();
  });

  it("surfaces a read error", async () => {
    maybeSingleResult = { data: null, error: new Error("rls denied") };

    const { result } = renderHook(
      () => usePortfolioSharingPermission("user-3"),
      { wrapper: createWrapper(queryClient) }
    );

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

describe("useTogglePortfolioPublic", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    maybeSingleResult = { data: null, error: null };
    updateResult = { error: null };
    queryClient = new QueryClient({
      defaultOptions: { mutations: { retry: false } },
    });
  });

  it("makes public sharing effective only when permission is granted", async () => {
    maybeSingleResult = {
      data: { portfolio_sharing_permitted: true },
      error: null,
    };

    const { result } = renderHook(() => useTogglePortfolioPublic(), {
      wrapper: createWrapper(queryClient),
    });

    result.current.mutate({ userId: "user-1", isPublic: true });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(updateSpy).toHaveBeenCalledWith({ portfolio_public: true });
    expect(result.current.data).toEqual({ permitted: true, isPublic: true });
  });

  it("keeps the portfolio private when permission is absent (R24.2)", async () => {
    maybeSingleResult = {
      data: { portfolio_sharing_permitted: false },
      error: null,
    };

    const { result } = renderHook(() => useTogglePortfolioPublic(), {
      wrapper: createWrapper(queryClient),
    });

    result.current.mutate({ userId: "user-1", isPublic: true });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    // The toggle MUST NOT take effect without permission: persisted false.
    expect(updateSpy).toHaveBeenCalledWith({ portfolio_public: false });
    expect(result.current.data).toEqual({ permitted: false, isPublic: false });
  });

  it("always honors disabling public sharing regardless of permission", async () => {
    maybeSingleResult = {
      data: { portfolio_sharing_permitted: true },
      error: null,
    };

    const { result } = renderHook(() => useTogglePortfolioPublic(), {
      wrapper: createWrapper(queryClient),
    });

    result.current.mutate({ userId: "user-1", isPublic: false });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(updateSpy).toHaveBeenCalledWith({ portfolio_public: false });
    expect(result.current.data).toEqual({ permitted: true, isPublic: false });
  });

  it("invalidates profile and gamification queries on success", async () => {
    maybeSingleResult = {
      data: { portfolio_sharing_permitted: true },
      error: null,
    };
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(() => useTogglePortfolioPublic(), {
      wrapper: createWrapper(queryClient),
    });

    result.current.mutate({ userId: "user-1", isPublic: true });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.profiles.all,
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.studentGamification.lists(),
    });
  });

  it("surfaces a write error", async () => {
    maybeSingleResult = {
      data: { portfolio_sharing_permitted: true },
      error: null,
    };
    updateResult = { error: new Error("update denied") };

    const { result } = renderHook(() => useTogglePortfolioPublic(), {
      wrapper: createWrapper(queryClient),
    });

    result.current.mutate({ userId: "user-1", isPublic: true });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
