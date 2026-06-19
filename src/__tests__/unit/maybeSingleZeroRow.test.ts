// @vitest-environment happy-dom
// =============================================================================
// maybeSingleZeroRow.test.ts
// Feature: production-bug-fixes, Req 4 — flagged zero-row reads must use
// `.maybeSingle()` and handle the no-row case as a clean not-found/empty state
// instead of throwing a raw PostgREST `PGRST116`.
// -----------------------------------------------------------------------------
// Covered sites:
//   - useReflectionDigest: useShareDigest / useRevokeDigestShare (fetch shared_with)
//   - useTeamProfile (fetch team)
// (AcceptInvitePage's institution lookup already consumes the result null-safely
//  via `institution?.name`; switching to maybeSingle just stops it throwing.)
//
// Contract: zero rows → no PGRST116; a clean domain error surfaces. One row →
// behaviour unchanged (the write/return proceeds).
// =============================================================================
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement, type ReactNode } from "react";

// Configurable per-test results for the mocked supabase client.
let singleResult: { data: unknown; error: unknown } = {
  data: null,
  error: null,
};
let tailResult: { data: unknown; error: unknown } = { data: null, error: null };
const updateSpy = vi.fn();

const makeBuilder = (): Record<string, unknown> => {
  const builder: Record<string, unknown> = {
    select: () => builder,
    update: (...args: unknown[]) => {
      updateSpy(...args);
      return builder;
    },
    insert: () => builder,
    eq: () => builder,
    is: () => builder,
    order: () => builder,
    maybeSingle: () => Promise.resolve(singleResult),
    single: () => Promise.resolve(singleResult),
    // Chains that are awaited without maybeSingle() (e.g. update().eq().eq()).
    then: (
      resolve: (v: unknown) => unknown,
      reject?: (r: unknown) => unknown
    ) => Promise.resolve(tailResult).then(resolve, reject),
  };
  return builder;
};

vi.mock("@/lib/supabase", () => ({
  supabase: { from: () => makeBuilder() },
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: { id: "student-1" } }),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

import {
  useShareDigest,
  useRevokeDigestShare,
} from "@/hooks/useReflectionDigest";
import { useTeamProfile } from "@/hooks/useTeamProfile";

const makeWrapper = () => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client }, children);
};

describe("Req 4 — zero-row reads use maybeSingle + clean not-found", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    singleResult = { data: null, error: null };
    tailResult = { data: null, error: null };
  });

  it("useShareDigest: zero rows → clean 'not found' error, no update issued", async () => {
    singleResult = { data: null, error: null }; // digest not found
    const { result } = renderHook(() => useShareDigest(), {
      wrapper: makeWrapper(),
    });

    await expect(
      result.current.mutateAsync({ digestId: "missing", role: "parent" })
    ).rejects.toThrow(/not found/i);
    expect(updateSpy).not.toHaveBeenCalled();
  });

  it("useShareDigest: one row → proceeds to update (behaviour unchanged)", async () => {
    singleResult = { data: { shared_with: [] }, error: null };
    tailResult = { data: null, error: null }; // update succeeds
    const { result } = renderHook(() => useShareDigest(), {
      wrapper: makeWrapper(),
    });

    await result.current.mutateAsync({ digestId: "d1", role: "parent" });
    expect(updateSpy).toHaveBeenCalledTimes(1);
  });

  it("useRevokeDigestShare: zero rows → clean 'not found' error, no update", async () => {
    singleResult = { data: null, error: null };
    const { result } = renderHook(() => useRevokeDigestShare(), {
      wrapper: makeWrapper(),
    });

    await expect(
      result.current.mutateAsync({ digestId: "missing", role: "parent" })
    ).rejects.toThrow(/not found/i);
    expect(updateSpy).not.toHaveBeenCalled();
  });

  it("useTeamProfile: missing team → query errors with clean 'Team not found'", async () => {
    singleResult = { data: null, error: null }; // team not found
    const { result } = renderHook(() => useTeamProfile("missing-team"), {
      wrapper: makeWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error as Error).toEqual(
      expect.objectContaining({
        message: expect.stringMatching(/Team not found/i),
      })
    );
  });
});
