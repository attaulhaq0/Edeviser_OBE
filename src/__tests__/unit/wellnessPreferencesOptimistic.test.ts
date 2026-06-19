// @vitest-environment happy-dom
// =============================================================================
// wellnessPreferencesOptimistic.test.ts
// Feature: dashboard-and-ux-performance, Req 7 (extend optimistic UI to
// high-frequency mutations) — useUpdateWellnessPreferences.
// -----------------------------------------------------------------------------
// The enabled-habits / parent-visibility toggles are deterministic settings, so
// the hook applies them optimistically. This locks in the standard contract:
//   - APPLY:  onMutate updates the wellness.preferences cache immediately.
//   - ROLLBACK: onError restores the pre-mutation snapshot (no wrong toggle).
//   - SETTLE: onSettled invalidates the preferences query.
// supabase + sonner are mocked; the upsert resolution is controllable so the
// optimistic window can be observed before success/error.
// =============================================================================
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement, type ReactNode } from "react";

const mockSingle = vi.fn();

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: () => ({
      upsert: () => ({
        select: () => ({
          single: () => mockSingle(),
        }),
      }),
    }),
  },
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

import { queryKeys } from "@/lib/queryKeys";
import { useUpdateWellnessPreferences } from "@/hooks/useWellnessPreferences";
import type { WellnessPreferences } from "@/types/habits";

const STUDENT_ID = "student-1";
const KEY = queryKeys.wellness.preferences(STUDENT_ID);

const INITIAL: WellnessPreferences = {
  id: "pref-1",
  studentId: STUDENT_ID,
  enabledHabits: ["sleep"],
  parentVisibility: false,
  habitTargets: {},
  reminderTimes: {},
  dismissedOnboardingTips: [],
};

const makeClientAndWrapper = () => {
  const client = new QueryClient({
    defaultOptions: { mutations: { retry: false }, queries: { retry: false } },
  });
  client.setQueryData(KEY, INITIAL);
  const Wrapper = ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client }, children);
  return { client, Wrapper };
};

describe("useUpdateWellnessPreferences optimistic (dashboard-and-ux-performance Req 7)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("applies optimistically then rolls back on error", async () => {
    // Hold the upsert pending so we can observe the optimistic window, then reject.
    let rejectUpsert: (reason: unknown) => void = () => {};
    mockSingle.mockReturnValue(
      new Promise((_resolve, reject) => {
        rejectUpsert = reject;
      })
    );

    const { client, Wrapper } = makeClientAndWrapper();
    const { result } = renderHook(() => useUpdateWellnessPreferences(), {
      wrapper: Wrapper,
    });

    result.current.mutate({
      studentId: STUDENT_ID,
      enabledHabits: ["sleep", "hydration"],
      parentVisibility: true,
    });

    // APPLY: the cache reflects the new toggle state before the server responds.
    await waitFor(() => {
      const cached = client.getQueryData<WellnessPreferences>(KEY);
      expect(cached?.parentVisibility).toBe(true);
      expect(cached?.enabledHabits).toEqual(["sleep", "hydration"]);
    });

    // Now fail the server call → ROLLBACK to the snapshot.
    rejectUpsert(new Error("network down"));

    await waitFor(() => {
      const cached = client.getQueryData<WellnessPreferences>(KEY);
      expect(cached?.parentVisibility).toBe(false);
      expect(cached?.enabledHabits).toEqual(["sleep"]);
    });
  });

  it("invalidates the preferences query on settle (success path)", async () => {
    mockSingle.mockResolvedValue({
      data: { id: "pref-1", student_id: STUDENT_ID },
      error: null,
    });

    const { client, Wrapper } = makeClientAndWrapper();
    const invalidateSpy = vi.spyOn(client, "invalidateQueries");

    const { result } = renderHook(() => useUpdateWellnessPreferences(), {
      wrapper: Wrapper,
    });

    result.current.mutate({
      studentId: STUDENT_ID,
      enabledHabits: ["sleep", "hydration"],
      parentVisibility: true,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // SETTLE: the preferences query is invalidated so it revalidates.
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: KEY });
    // The optimistic value persisted through success (no wrong rollback).
    expect(
      client.getQueryData<WellnessPreferences>(KEY)?.parentVisibility
    ).toBe(true);
  });
});
