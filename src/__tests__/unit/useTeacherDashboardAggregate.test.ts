// @vitest-environment happy-dom
// =============================================================================
// useTeacherDashboardAggregate.test.ts
// Feature: dashboard-and-ux-performance, Phase 8 Task 33 (teacher aggregate RPC)
// -----------------------------------------------------------------------------
// Proves the teacher dashboard always-on block (KPIs + Bloom's distribution):
//   1. CALL — get_teacher_dashboard is called once with the documented param.
//   2. HYDRATION — the EXACT caches useTeacherKPIs / useTeacherBloomsDistribution
//      read are populated, so those section hooks become cache hits.
//   3. COLLAPSE — with the section hooks gated on `aggregate.isError` (as the page
//      wires them), a SUCCESSFUL aggregate fires ZERO section `supabase.from`
//      requests; a FAILED aggregate makes them fall back and fetch.
// The `get_teacher_dashboard` RPC is mocked; this is a hermetic unit test.
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

// useTeacherKPIs / useTeacherBloomsDistribution read `useAuth().user?.id`; stub it
// so the section hooks resolve the same teacherId the aggregate is called with.
const TEACHER_ID = "22222222-2222-2222-2222-222222222222";
vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: { id: TEACHER_ID } }),
}));

const makeFromBuilder = () => {
  const builder: Record<string, unknown> = {
    select: () => builder,
    eq: () => builder,
    in: () => builder,
    gte: () => builder,
    order: () => builder,
    limit: () => builder,
    maybeSingle: () => Promise.resolve({ data: null, error: null }),
    then: (resolve: (value: unknown) => unknown) =>
      resolve({ data: [], count: 0, error: null }),
  };
  return builder;
};

import { queryKeys } from "@/lib/queryKeys";
import { useTeacherDashboardAggregate } from "@/hooks/useTeacherDashboardAggregate";
import {
  useTeacherKPIs,
  useTeacherBloomsDistribution,
  type TeacherKPIData,
  type BloomsDistributionRow,
} from "@/hooks/useTeacherDashboard";

const FIXTURE_KPIS: TeacherKPIData = {
  pendingSubmissions: 4,
  gradedThisWeek: 7,
  avgAttainment: 75,
  atRiskCount: 3,
  totalStudents: 30,
};

const FIXTURE_BLOOMS: BloomsDistributionRow[] = [
  { level: "remembering", count: 2 },
  { level: "applying", count: 1 },
];

const FIXTURE_AGGREGATE = {
  kpis: FIXTURE_KPIS,
  bloomsDistribution: FIXTURE_BLOOMS,
};

// Composes the aggregate + section hooks EXACTLY as TeacherDashboard wires them.
const useBlock = () => {
  const aggregate = useTeacherDashboardAggregate(TEACHER_ID);
  const kpisHook = useTeacherKPIs({ enabled: aggregate.isError });
  const bloomsHook = useTeacherBloomsDistribution({
    enabled: aggregate.isError,
  });
  return { aggregate, kpisHook, bloomsHook };
};

const makeClient = () =>
  new QueryClient({ defaultOptions: { queries: { retry: false } } });

const makeWrapper = (client: QueryClient) => {
  const Wrapper = ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client }, children);
  return Wrapper;
};

describe("useTeacherDashboardAggregate (Phase 8 Task 33)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFrom.mockImplementation(() => makeFromBuilder());
  });

  it("calls get_teacher_dashboard once with the documented param name", async () => {
    mockRpc.mockResolvedValue({ data: FIXTURE_AGGREGATE, error: null });

    const client = makeClient();
    const { result } = renderHook(
      () => useTeacherDashboardAggregate(TEACHER_ID),
      { wrapper: makeWrapper(client) }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockRpc).toHaveBeenCalledTimes(1);
    expect(mockRpc).toHaveBeenCalledWith("get_teacher_dashboard", {
      p_teacher_id: TEACHER_ID,
    });
  });

  it("hydrates the exact KPI + Bloom's caches the section hooks read", async () => {
    mockRpc.mockResolvedValue({ data: FIXTURE_AGGREGATE, error: null });

    const client = makeClient();
    const { result } = renderHook(
      () => useTeacherDashboardAggregate(TEACHER_ID),
      { wrapper: makeWrapper(client) }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(
      client.getQueryData<TeacherKPIData>(
        queryKeys.teacherDashboard.list({ type: "kpis", teacherId: TEACHER_ID })
      )
    ).toEqual(FIXTURE_KPIS);
    expect(
      client.getQueryData<BloomsDistributionRow[]>(
        queryKeys.teacherDashboard.list({
          type: "bloomsDistribution",
          teacherId: TEACHER_ID,
        })
      )
    ).toEqual(FIXTURE_BLOOMS);
  });

  it("collapse: a successful aggregate fires ZERO section requests", async () => {
    mockRpc.mockResolvedValue({ data: FIXTURE_AGGREGATE, error: null });

    const client = makeClient();
    const { result } = renderHook(() => useBlock(), {
      wrapper: makeWrapper(client),
    });

    await waitFor(() => expect(result.current.aggregate.isSuccess).toBe(true));
    expect(mockRpc).toHaveBeenCalledTimes(1);
    expect(mockFrom).not.toHaveBeenCalled();
    // Section hooks resolve from hydrated cache without fetching.
    await waitFor(() => {
      expect(result.current.kpisHook.data).toEqual(FIXTURE_KPIS);
      expect(result.current.bloomsHook.data).toEqual(FIXTURE_BLOOMS);
    });
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("fallback: a failed aggregate makes the section hooks fetch", async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: "boom" } });

    const client = makeClient();
    const { result } = renderHook(() => useBlock(), {
      wrapper: makeWrapper(client),
    });

    await waitFor(() => expect(result.current.aggregate.isError).toBe(true));
    // Once the aggregate errors, the gated section hooks enable and read `courses`.
    await waitFor(() => expect(mockFrom).toHaveBeenCalled());
    expect(mockFrom.mock.calls.map((c) => c[0])).toContain("courses");
  });
});
