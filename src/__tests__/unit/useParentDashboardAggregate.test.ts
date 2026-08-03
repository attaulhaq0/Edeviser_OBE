// @vitest-environment happy-dom
// =============================================================================
// useParentDashboardAggregate.test.ts
// Feature: dashboard-and-ux-performance, Phase 8 Task 36 (parent aggregate)
// -----------------------------------------------------------------------------
//   1. CALL — get_parent_dashboard is called once.
//   2. HYDRATION — the EXACT caches useParentKPIs AND useLinkedChildren read are
//      both populated (kpis → parentDashboard.detail; children → parentStudentLinks.list).
//   3. ENRICHMENT — a successful aggregate refreshes linked learners from live
//      tables so institution and link metadata are authoritative, while still
//      hydrating the section-hook cache.
// The `get_parent_dashboard` RPC is mocked; this is a hermetic unit test.
// =============================================================================
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement, type ReactNode } from "react";

const mockRpc = vi.fn();
const mockFrom = vi.fn();

vi.mock("@/lib/supabase", () => ({
  supabase: {
    rpc: (...args: unknown[]) => mockRpc(...args),
    from: (...args: unknown[]) => mockFrom(...args),
  },
}));

const tableData: Record<string, unknown[]> = {
  parent_student_links: [
    {
      student_id: "00699cf9-6ab1-487c-8652-179757eb6462",
      created_at: "2024-09-01T00:00:00.000Z",
    },
  ],
  profiles: [
    {
      id: "00699cf9-6ab1-487c-8652-179757eb6462",
      full_name: "Yusuf Ahmadi",
      institution_id: "institution-1",
    },
  ],
  institutions: [{ id: "institution-1", name: "Noor International School" }],
  student_gamification: [
    {
      student_id: "00699cf9-6ab1-487c-8652-179757eb6462",
      level: 11,
      xp_total: 1986,
      streak_current: 3,
    },
  ],
  student_courses: [
    { student_id: "00699cf9-6ab1-487c-8652-179757eb6462" },
    { student_id: "00699cf9-6ab1-487c-8652-179757eb6462" },
    { student_id: "00699cf9-6ab1-487c-8652-179757eb6462" },
  ],
  outcome_attainment: [
    {
      student_id: "00699cf9-6ab1-487c-8652-179757eb6462",
      attainment_percent: 92,
    },
  ],
};

const makeFromBuilder = (table: string) => {
  const builder: Record<string, unknown> = {
    select: () => builder,
    eq: () => builder,
    in: () => builder,
    gte: () => builder,
    then: (resolve: (value: unknown) => unknown) =>
      resolve({ data: tableData[table] ?? [], count: 0, error: null }),
  };
  return builder;
};

import { queryKeys } from "@/lib/queryKeys";
import {
  useParentDashboardAggregate,
  type ParentDashboardAggregate,
} from "@/hooks/useParentDashboardAggregate";
import { useParentKPIs, useLinkedChildren } from "@/hooks/useParentDashboard";

const PARENT_ID = "66f40d1b-8012-4352-b23e-6a65fbdf846d";

const FIXTURE: ParentDashboardAggregate = {
  kpis: {
    linkedChildren: 1,
    totalCourses: 3,
    avgAttainment: 92,
    upcomingDeadlines: 0,
  },
  children: [
    {
      student_id: "00699cf9-6ab1-487c-8652-179757eb6462",
      student_name: "Yusuf Ahmadi",
      institution_name: "Noor International School",
      linked_at: "2024-09-01T00:00:00.000Z",
      current_level: 11,
      xp_total: 1986,
      current_streak: 3,
      enrolled_courses: 3,
      avg_attainment: 92,
    },
  ],
};

const useBlock = () => {
  const aggregate = useParentDashboardAggregate(PARENT_ID);
  const kpisHook = useParentKPIs(PARENT_ID, { enabled: aggregate.isError });
  const childrenHook = useLinkedChildren(PARENT_ID, {
    enabled: aggregate.isError,
  });
  return { aggregate, kpisHook, childrenHook };
};

const makeClient = () =>
  new QueryClient({ defaultOptions: { queries: { retry: false } } });

const makeWrapper = (client: QueryClient) => {
  const Wrapper = ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client }, children);
  return Wrapper;
};

describe("useParentDashboardAggregate (Phase 8 Task 36)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFrom.mockImplementation((table: string) => makeFromBuilder(table));
  });

  it("calls get_parent_dashboard once", async () => {
    mockRpc.mockResolvedValue({ data: FIXTURE, error: null });
    const client = makeClient();
    const { result } = renderHook(
      () => useParentDashboardAggregate(PARENT_ID),
      { wrapper: makeWrapper(client) }
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockRpc).toHaveBeenCalledTimes(1);
    expect(mockRpc).toHaveBeenCalledWith("get_parent_dashboard", {});
  });

  it("hydrates the exact caches both parent section hooks read", async () => {
    mockRpc.mockResolvedValue({ data: FIXTURE, error: null });
    const client = makeClient();
    const { result } = renderHook(
      () => useParentDashboardAggregate(PARENT_ID),
      { wrapper: makeWrapper(client) }
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(
      client.getQueryData(queryKeys.parentDashboard.detail(PARENT_ID))
    ).toEqual(FIXTURE.kpis);
    expect(
      client.getQueryData(
        queryKeys.parentStudentLinks.list({ parentId: PARENT_ID })
      )
    ).toEqual(FIXTURE.children);
  });

  it("enriches linked learners once and avoids duplicate section requests", async () => {
    mockRpc.mockResolvedValue({ data: FIXTURE, error: null });
    const client = makeClient();
    const { result } = renderHook(() => useBlock(), {
      wrapper: makeWrapper(client),
    });
    await waitFor(() => expect(result.current.aggregate.isSuccess).toBe(true));
    expect(mockRpc).toHaveBeenCalledTimes(1);
    expect(mockFrom).toHaveBeenCalledTimes(6);
    await waitFor(() =>
      expect(result.current.kpisHook.data).toEqual(FIXTURE.kpis)
    );
    await waitFor(() =>
      expect(result.current.childrenHook.data).toEqual(FIXTURE.children)
    );
    expect(mockFrom).toHaveBeenCalledTimes(6);
  });

  it("fallback: a failed aggregate makes the section hooks fetch", async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: "boom" } });
    const client = makeClient();
    const { result } = renderHook(() => useBlock(), {
      wrapper: makeWrapper(client),
    });
    await waitFor(() => expect(result.current.aggregate.isError).toBe(true));
    await waitFor(() => expect(mockFrom).toHaveBeenCalled());
    // Both section hooks resolve verified children first via parent_student_links.
    expect(mockFrom.mock.calls.map((c) => c[0])).toContain(
      "parent_student_links"
    );
  });
});
