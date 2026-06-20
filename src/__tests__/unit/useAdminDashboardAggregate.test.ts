// @vitest-environment happy-dom
// =============================================================================
// useAdminDashboardAggregate.test.ts
// Feature: dashboard-and-ux-performance, Phase 8 Task 35 (admin aggregate)
// -----------------------------------------------------------------------------
//   1. CALL — get_admin_dashboard is called once.
//   2. HYDRATION — the EXACT cache useAdminKPIs reads is populated.
//   3. COLLAPSE — with the section hook gated on `aggregate.isError`, a SUCCESSFUL
//      aggregate fires ZERO section `supabase.from` requests; a FAILED aggregate
//      makes useAdminKPIs fall back and fetch.
// The `get_admin_dashboard` RPC is mocked; this is a hermetic unit test.
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
import { useAdminDashboardAggregate } from "@/hooks/useAdminDashboardAggregate";
import { useAdminKPIs, type AdminKPIData } from "@/hooks/useAdminDashboard";

const INSTITUTION_ID = "44444444-4444-4444-4444-444444444444";

const FIXTURE_KPIS: AdminKPIData = {
  totalUsers: 124,
  activeUsers: 124,
  totalPrograms: 7,
  totalCourses: 7,
  usersByRole: {
    admin: 3,
    parent: 36,
    student: 71,
    teacher: 8,
    coordinator: 6,
  },
};

const useBlock = () => {
  const aggregate = useAdminDashboardAggregate(INSTITUTION_ID);
  const kpisHook = useAdminKPIs({ enabled: aggregate.isError });
  return { aggregate, kpisHook };
};

const makeClient = () =>
  new QueryClient({ defaultOptions: { queries: { retry: false } } });

const makeWrapper = (client: QueryClient) => {
  const Wrapper = ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client }, children);
  return Wrapper;
};

describe("useAdminDashboardAggregate (Phase 8 Task 35)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFrom.mockImplementation(() => makeFromBuilder());
  });

  it("calls get_admin_dashboard once", async () => {
    mockRpc.mockResolvedValue({ data: FIXTURE_KPIS, error: null });
    const client = makeClient();
    const { result } = renderHook(
      () => useAdminDashboardAggregate(INSTITUTION_ID),
      { wrapper: makeWrapper(client) }
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockRpc).toHaveBeenCalledTimes(1);
    expect(mockRpc).toHaveBeenCalledWith("get_admin_dashboard", {});
  });

  it("hydrates the exact KPI cache useAdminKPIs reads", async () => {
    mockRpc.mockResolvedValue({ data: FIXTURE_KPIS, error: null });
    const client = makeClient();
    const { result } = renderHook(
      () => useAdminDashboardAggregate(INSTITUTION_ID),
      { wrapper: makeWrapper(client) }
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(
      client.getQueryData<AdminKPIData>(queryKeys.adminDashboard.list({}))
    ).toEqual(FIXTURE_KPIS);
  });

  it("collapse: a successful aggregate fires ZERO section requests", async () => {
    mockRpc.mockResolvedValue({ data: FIXTURE_KPIS, error: null });
    const client = makeClient();
    const { result } = renderHook(() => useBlock(), {
      wrapper: makeWrapper(client),
    });
    await waitFor(() => expect(result.current.aggregate.isSuccess).toBe(true));
    expect(mockRpc).toHaveBeenCalledTimes(1);
    expect(mockFrom).not.toHaveBeenCalled();
    await waitFor(() =>
      expect(result.current.kpisHook.data).toEqual(FIXTURE_KPIS)
    );
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("fallback: a failed aggregate makes useAdminKPIs fetch", async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: "boom" } });
    const client = makeClient();
    const { result } = renderHook(() => useBlock(), {
      wrapper: makeWrapper(client),
    });
    await waitFor(() => expect(result.current.aggregate.isError).toBe(true));
    await waitFor(() => expect(mockFrom).toHaveBeenCalled());
    expect(mockFrom.mock.calls.map((c) => c[0])).toContain("profiles");
  });
});
