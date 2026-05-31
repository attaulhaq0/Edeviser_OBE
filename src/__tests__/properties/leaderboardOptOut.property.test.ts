// @vitest-environment happy-dom
// Feature: student-experience-remediation, Property 3: Leaderboard never reveals opted-out students
// **Validates: Requirements 6.5, 32.4**
//
// Property statement (design.md):
//   For any set of students with arbitrary opt-out flags and any page window
//   (limit/offset), the ranked rows produced by the leaderboard query path
//   contain no student whose `leaderboard_anonymous` flag is true — across both
//   the locked and unlocked states and across every page.
//
// This exercises the real query path: `useLeaderboard` reads the configurable
// cohort settings, then pages through the institution-scoped
// `get_leaderboard_page` RPC. The RPC mock below is a faithful reference of the
// server-side SQL (set-based exclusion of `leaderboard_anonymous = true`,
// ordered by rank, sliced by offset/limit, plus the eligible cohort count). The
// property asserts that the entries the hook exposes — paged to completion —
// never include an opted-out student, in the unlocked state (real rankings) and
// in the locked state (no rows surfaced at all).

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement, type ReactNode } from "react";
import * as fc from "fast-check";
import { leaderboardState } from "@/lib/leaderboardGate";

// ─── Supabase mock (faithful get_leaderboard_page + settings) ─────────────────

interface StudentRow {
  student_id: string;
  full_name: string;
  xp_total: number;
  level: number;
  streak_current: number;
  global_rank: number;
  leaderboard_anonymous: boolean;
}

interface RpcRow {
  student_id: string;
  full_name: string;
  xp_total: number;
  level: number;
  streak_current: number;
  global_rank: number;
  eligible_count: number;
}

interface RpcArgs {
  p_institution_id: string;
  p_limit: number;
  p_offset: number;
}

interface MockState {
  population: StudentRow[];
  minCohortSize: number;
  pageSize: number;
  rpcCallCount: number;
}

const state: MockState = {
  population: [],
  minCohortSize: 0,
  pageSize: 50,
  rpcCallCount: 0,
};

// Mirror the SQL: eligible = non-opted-out, ordered by rank ascending.
function eligibleSorted(): StudentRow[] {
  return state.population
    .filter((s) => !s.leaderboard_anonymous)
    .slice()
    .sort((a, b) => a.global_rank - b.global_rank);
}

const rpcMock = vi.fn((fn: string, args: RpcArgs) => {
  if (fn !== "get_leaderboard_page") {
    return Promise.resolve({
      data: null,
      error: new Error(`unexpected rpc: ${fn}`),
    });
  }
  state.rpcCallCount += 1;
  const eligible = eligibleSorted();
  const eligibleCount = eligible.length;
  const page = eligible.slice(args.p_offset, args.p_offset + args.p_limit);
  const rows: RpcRow[] = page.map((s) => ({
    student_id: s.student_id,
    full_name: s.full_name,
    xp_total: s.xp_total,
    level: s.level,
    streak_current: s.streak_current,
    global_rank: s.global_rank,
    eligible_count: eligibleCount,
  }));
  return Promise.resolve({ data: rows, error: null });
});

interface SettingsResult {
  data: {
    leaderboard_min_cohort_size: number;
    leaderboard_page_size: number;
  } | null;
  error: Error | null;
}

interface SettingsBuilder {
  select: (cols: string) => SettingsBuilder;
  eq: (col: string, val: unknown) => SettingsBuilder;
  maybeSingle: () => Promise<SettingsResult>;
}

const makeSettingsBuilder = (): SettingsBuilder => {
  const builder: SettingsBuilder = {
    select: () => builder,
    eq: () => builder,
    maybeSingle: () =>
      Promise.resolve({
        data: {
          leaderboard_min_cohort_size: state.minCohortSize,
          leaderboard_page_size: state.pageSize,
        },
        error: null,
      }),
  };
  return builder;
};

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: vi.fn(() => makeSettingsBuilder()),
    rpc: (fn: string, args: RpcArgs) => rpcMock(fn, args),
  },
}));

// ─── Test harness ─────────────────────────────────────────────────────────────

import {
  useLeaderboard,
  type UseLeaderboardResult,
} from "@/hooks/useLeaderboard";

const INSTITUTION_ID = "inst-1";

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children);
};

// ─── Arbitraries ────────────────────────────────────────────────────────────

// A student before id/rank assignment; ids and ranks are assigned by index so
// they are guaranteed unique (the RPC orders by a unique rank).
const baseStudentArb = fc.record({
  full_name: fc.string({ minLength: 1, maxLength: 20 }),
  xp_total: fc.nat({ max: 100_000 }),
  level: fc.integer({ min: 1, max: 50 }),
  streak_current: fc.nat({ max: 365 }),
  leaderboard_anonymous: fc.boolean(),
});

const populationArb: fc.Arbitrary<StudentRow[]> = fc
  .array(baseStudentArb, { minLength: 0, maxLength: 10 })
  .map((arr) =>
    arr.map(
      (s, i): StudentRow => ({
        ...s,
        student_id: `student-${i}`,
        global_rank: i + 1,
      })
    )
  );

// Small page sizes so the property genuinely traverses multiple page windows.
const pageSizeArb = fc.integer({ min: 1, max: 6 });

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function loadFirstPage(result: {
  current: UseLeaderboardResult;
}): Promise<void> {
  const before = state.rpcCallCount;
  await waitFor(() => {
    // The RPC for THIS render has resolved and the hook has settled.
    expect(state.rpcCallCount).toBeGreaterThan(before);
    expect(result.current.isLoading).toBe(false);
  });
}

async function loadAllPages(result: {
  current: UseLeaderboardResult;
}): Promise<void> {
  await loadFirstPage(result);
  let guard = 0;
  while (result.current.hasMore && guard < 200) {
    await act(async () => {
      result.current.fetchNextPage();
    });
    await waitFor(() => expect(result.current.isFetchingNextPage).toBe(false));
    guard += 1;
  }
}

beforeEach(() => {
  state.population = [];
  state.minCohortSize = 0;
  state.pageSize = 50;
  state.rpcCallCount = 0;
  rpcMock.mockClear();
});

// ─── Property 3 ────────────────────────────────────────────────────────────────

describe("leaderboard opt-out invariant (query path)", () => {
  // Property 3: Leaderboard never reveals opted-out students — across both the
  // locked and unlocked states and across every page.
  it("never surfaces an opted-out student through the paged query path, in any cohort state", async () => {
    await fc.assert(
      fc.asyncProperty(
        populationArb,
        pageSizeArb,
        fc.integer({ min: 0, max: 12 }), // arbitrary configurable minimum cohort
        async (population, pageSize, minCohortSize) => {
          state.population = population;
          state.pageSize = pageSize;
          state.minCohortSize = minCohortSize;

          const { result, unmount } = renderHook(
            () =>
              useLeaderboard(
                "all",
                "weekly",
                undefined,
                undefined,
                INSTITUTION_ID
              ),
            { wrapper: createWrapper() }
          );

          try {
            await loadAllPages(result);

            const entries = result.current.data.entries;
            const optedOutIds = new Set(
              population
                .filter((s) => s.leaderboard_anonymous)
                .map((s) => s.student_id)
            );
            const eligibleIds = population
              .filter((s) => !s.leaderboard_anonymous)
              .map((s) => s.student_id);
            const eligibleCount = eligibleIds.length;

            // Core invariant (R6.5 / R32.4): no opted-out student ever appears,
            // regardless of how many pages were traversed or the gate state.
            for (const entry of entries) {
              expect(optedOutIds.has(entry.student_id)).toBe(false);
            }

            // The gate state the hook resolved must match the pure model.
            const expectedState = leaderboardState(
              eligibleCount,
              minCohortSize
            );
            expect(result.current.data.state).toBe(expectedState);
            expect(result.current.data.eligibleCount).toBe(eligibleCount);

            if (expectedState === "locked") {
              // R6.1/R6.4: locked surfaces no ranked rows — so the opt-out
              // invariant holds vacuously and no rank/medal can be awarded.
              expect(entries).toEqual([]);
            } else {
              // Unlocked: the paged union is exactly the eligible cohort — no
              // opted-out leak AND no eligible student silently dropped.
              const seen = entries.map((e) => e.student_id).sort();
              expect(seen).toEqual([...eligibleIds].sort());
            }
          } finally {
            unmount();
          }
        }
      ),
      { numRuns: 100 }
    );
  }, 60_000);

  // A focused, cheaper check on a single arbitrary first-page window in the
  // unlocked state: the page the student actually sees first never contains an
  // opted-out student for any page size.
  it("excludes opted-out students from the first page window for any page size (unlocked)", async () => {
    await fc.assert(
      fc.asyncProperty(
        populationArb,
        pageSizeArb,
        async (population, pageSize) => {
          state.population = population;
          state.pageSize = pageSize;
          state.minCohortSize = 0; // force unlocked whenever any eligible student exists

          const { result, unmount } = renderHook(
            () =>
              useLeaderboard(
                "all",
                "weekly",
                undefined,
                undefined,
                INSTITUTION_ID
              ),
            { wrapper: createWrapper() }
          );

          try {
            await loadFirstPage(result);

            const optedOutIds = new Set(
              population
                .filter((s) => s.leaderboard_anonymous)
                .map((s) => s.student_id)
            );
            for (const entry of result.current.data.entries) {
              expect(optedOutIds.has(entry.student_id)).toBe(false);
            }
          } finally {
            unmount();
          }
        }
      ),
      { numRuns: 150 }
    );
  }, 60_000);
});
