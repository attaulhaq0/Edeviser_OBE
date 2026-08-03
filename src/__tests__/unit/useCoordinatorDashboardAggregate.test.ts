// @vitest-environment happy-dom
// =============================================================================
// useCoordinatorDashboardAggregate.test.ts
// Feature: dashboard-and-ux-performance, Phase 8 Task 34 (coordinator aggregate)
// -----------------------------------------------------------------------------
//   1. CALL — get_coordinator_workspace is called once.
//   2. HYDRATION — the EXACT cache useCoordinatorKPIs reads is populated.
//   3. COLLAPSE — with the section hook gated on `aggregate.isError`, a SUCCESSFUL
//      aggregate fires ZERO section `supabase.from` requests; a FAILED aggregate
//      makes useCoordinatorKPIs fall back and fetch.
// The `get_coordinator_workspace` RPC is mocked; this is a hermetic unit test.
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

const makeFromBuilder = () => {
  const builder: Record<string, unknown> = {
    select: () => builder,
    eq: () => builder,
    in: () => builder,
    then: (resolve: (value: unknown) => unknown) =>
      resolve({ data: [], count: 0, error: null }),
  };
  return builder;
};

import { queryKeys } from "@/lib/queryKeys";
import { useCoordinatorDashboardAggregate } from "@/hooks/useCoordinatorDashboardAggregate";
import {
  useCoordinatorKPIs,
  type CoordinatorKPIData,
  type CoordinatorWorkspaceData,
} from "@/hooks/useCoordinatorDashboard";

const INSTITUTION_ID = "33333333-3333-3333-3333-333333333333";

const FIXTURE_WORKSPACE: CoordinatorWorkspaceData = {
  assignedPrograms: 4,
  courseCount: 4,
  ploCount: 4,
  targetAttainment: 80,
  belowTargetCount: 2,
  ploAttainment: [
    {
      id: "plo-1",
      title: "Communication",
      program: "English",
      attainment: 74,
      evidenceCount: 10,
      belowTarget: true,
    },
    {
      id: "plo-2",
      title: "Reasoning",
      program: "Mathematics",
      attainment: 76,
      evidenceCount: 10,
      belowTarget: true,
    },
  ],
  coverage: {
    totalClos: 4,
    mappedClos: 4,
    coveragePercent: 100,
    status: "complete",
  },
  cqi: { planned: 1, inProgress: 1, evaluated: 0, total: 2, closed: 0 },
  accreditation: {
    configurations: 1,
    approvedStages: 1,
    pendingStages: 0,
    reportJobs: 0,
    generatedReports: 0,
  },
  teacherCompliance: { courses: 4, coursesWithClo: 4, percent: 100 },
  calculatedAt: "2026-08-02T00:00:00.000Z",
};

const FIXTURE_KPIS: CoordinatorKPIData = {
  totalPLOs: 4,
  totalCourses: 4,
  cloCoveragePercent: 100,
  avgAttainmentPercent: 75,
  atRiskStudents: 2,
  teacherCompliancePercent: 100,
};

const useBlock = () => {
  const aggregate = useCoordinatorDashboardAggregate(INSTITUTION_ID);
  const kpisHook = useCoordinatorKPIs({
    enabled: aggregate.isError,
    institutionId: INSTITUTION_ID,
  });
  return { aggregate, kpisHook };
};

const makeClient = () =>
  new QueryClient({ defaultOptions: { queries: { retry: false } } });

const makeWrapper = (client: QueryClient) => {
  const Wrapper = ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client }, children);
  return Wrapper;
};

describe("useCoordinatorDashboardAggregate (Phase 8 Task 34)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFrom.mockImplementation(() => makeFromBuilder());
  });

  it("calls get_coordinator_workspace once", async () => {
    mockRpc.mockResolvedValue({ data: FIXTURE_WORKSPACE, error: null });
    const client = makeClient();
    const { result } = renderHook(
      () => useCoordinatorDashboardAggregate(INSTITUTION_ID),
      { wrapper: makeWrapper(client) }
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockRpc).toHaveBeenCalledTimes(1);
    expect(mockRpc).toHaveBeenCalledWith("get_coordinator_workspace", {});
  });

  it("hydrates the exact KPI cache useCoordinatorKPIs reads", async () => {
    mockRpc.mockResolvedValue({ data: FIXTURE_WORKSPACE, error: null });
    const client = makeClient();
    const { result } = renderHook(
      () => useCoordinatorDashboardAggregate(INSTITUTION_ID),
      { wrapper: makeWrapper(client) }
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(
      client.getQueryData<CoordinatorKPIData>(
        queryKeys.coordinatorDashboard.list({ institutionId: INSTITUTION_ID })
      )
    ).toMatchObject(FIXTURE_KPIS);
  });

  it("collapse: a successful aggregate fires ZERO section requests", async () => {
    mockRpc.mockResolvedValue({ data: FIXTURE_WORKSPACE, error: null });
    const client = makeClient();
    const { result } = renderHook(() => useBlock(), {
      wrapper: makeWrapper(client),
    });
    await waitFor(() => expect(result.current.aggregate.isSuccess).toBe(true));
    expect(mockRpc).toHaveBeenCalledTimes(1);
    expect(mockFrom).not.toHaveBeenCalled();
    await waitFor(() =>
      expect(result.current.kpisHook.data).toMatchObject(FIXTURE_KPIS)
    );
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("fallback: a failed aggregate makes useCoordinatorKPIs fetch", async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: "boom" } });
    const client = makeClient();
    const { result } = renderHook(() => useBlock(), {
      wrapper: makeWrapper(client),
    });
    await waitFor(() => expect(result.current.aggregate.isError).toBe(true));
    await waitFor(() => expect(mockFrom).toHaveBeenCalled());
    expect(mockFrom.mock.calls.map((c) => c[0])).toContain("learning_outcomes");
  });
});
