// @vitest-environment happy-dom
// Feature: continuous-verification, Task 7.6-QA
// Validates: coordinator analytics hooks use scoped RPC, deduplicate queries,
// transform data correctly through deterministic lib functions.
import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

const { rpc } = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock("@/lib/supabase", () => ({ supabase: { rpc } }));

import {
  useSankeyData,
  useGapAnalysis,
  useCoverageHeatmap,
} from "@/hooks/useVisualizationData";

const wrapper = ({ children }: { children: ReactNode }) => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: 0 } },
  });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
};

const mockPayload = {
  outcomes: [
    { id: "plo-1", title: "PLO 1: Critical Thinking", type: "PLO", mapped_children_count: 3, evidence_count: 12 },
    { id: "clo-1", title: "CLO 1.1: Recall", type: "CLO", mapped_children_count: 0, evidence_count: 5 },
  ],
  mappings: [
    { source_outcome_id: "plo-1", target_outcome_id: "clo-1", weight: 1 },
  ],
  courses: [{ id: "course-1", name: "Science 101" }],
  clos: [{ id: "clo-1", title: "CLO 1.1", course_id: "course-1" }],
  evidence: [{ clo_id: "clo-1", course_id: "course-1", score_percent: 85 }],
  attainment: [{ outcome_id: "plo-1", attainment_percent: 78 }, { outcome_id: "clo-1", attainment_percent: 85 }],
};

beforeEach(() => {
  vi.clearAllMocks();
  rpc.mockResolvedValue({ data: mockPayload, error: null });
});

// --- 7.6-QA: Scoped server analytics tests -------------------------------

describe("useGapAnalysis", () => {
  it("returns gap results from the scoped RPC", async () => {
    const { result } = renderHook(() => useGapAnalysis("prog-1"), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(rpc).toHaveBeenCalledWith("get_coordinator_analytics_v1", { p_program_id: "prog-1" });
    expect(result.current.data).toBeDefined();
    expect(result.current.data?.length ?? 0).toBeGreaterThan(0);
    // CLOs always return fully_mapped (they have no children to map)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const plo = result.current.data!.find((g: any) => g.outcome_type === "PLO");
    expect(plo).toBeDefined();
  });

  it("classifies unmapped outcomes", async () => {
    rpc.mockResolvedValue({
      data: { ...mockPayload, outcomes: [{ id: "plo-x", title: "Lonely PLO", type: "PLO", mapped_children_count: 0, evidence_count: 0 }], mappings: [], clos: [], evidence: [], attainment: [], courses: [] },
      error: null,
    });
    const { result } = renderHook(() => useGapAnalysis("prog-1"), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.data?.[0]?.status).toBe("unmapped");
  });

  it("is not enabled without a programId", () => {
    const { result } = renderHook(() => useGapAnalysis(), { wrapper });
    expect(result.current.isLoading).toBe(false);
    expect(rpc).not.toHaveBeenCalled();
  });
});

describe("useCoverageHeatmap", () => {
  it("returns a heatmap matrix from scoped evidence", async () => {
    const { result } = renderHook(() => useCoverageHeatmap("prog-1"), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.data).toBeDefined();
    expect(result.current.data!.cells.size).toBeGreaterThan(0);
    expect(result.current.data!.course_ids).toContain("course-1");
  });

  it("produces empty matrix when no evidence exists", async () => {
    rpc.mockResolvedValue({
      data: { ...mockPayload, courses: [], clos: [], evidence: [] },
      error: null,
    });
    const { result } = renderHook(() => useCoverageHeatmap("prog-1"), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.data!.cells.size).toBe(0);
  });
});

describe("useSankeyData", () => {
  it("returns nodes and links from the scoped RPC", async () => {
    const { result } = renderHook(() => useSankeyData("prog-1"), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.data).toBeDefined();
    expect(result.current.data!.nodes.length).toBeGreaterThan(0);
    expect(result.current.data!.links.length).toBeGreaterThan(0);
  });

  it("returns empty graph when no mappings exist", async () => {
    rpc.mockResolvedValue({
      data: { ...mockPayload, mappings: [], attainment: [] },
      error: null,
    });
    const { result } = renderHook(() => useSankeyData("prog-1"), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.data!.links).toEqual([]);
  });
});

// --- 7.6 Dedup: all three hooks share one RPC ----------------------------

describe("RPC sharing", () => {
  it("calls the analytics RPC only once when all three hooks mount together", async () => {
    // Render all three hooks simultaneously under the same QueryClient
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const shared = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
    
    rpc.mockResolvedValue({ data: mockPayload, error: null });

    const gap = renderHook(() => useGapAnalysis("prog-1"), { wrapper: shared });
    const heat = renderHook(() => useCoverageHeatmap("prog-1"), { wrapper: shared });
    const sankey = renderHook(() => useSankeyData("prog-1"), { wrapper: shared });

    await waitFor(() => {
      expect(gap.result.current.isLoading).toBe(false);
      expect(heat.result.current.isLoading).toBe(false);
      expect(sankey.result.current.isLoading).toBe(false);
    });

    // Key assertion: exactly ONE RPC call for all three hooks
    expect(rpc).toHaveBeenCalledTimes(1);
  });
});
