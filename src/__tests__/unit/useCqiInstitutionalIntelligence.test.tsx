// @vitest-environment happy-dom
import { describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";

const { rpc } = vi.hoisted(() => ({ rpc: vi.fn() }));

vi.mock("@/lib/supabase", () => ({
  supabase: { rpc },
}));

import {
  useAdminCqiEffectiveness,
  useCoordinatorCqiPatterns,
} from "@/hooks/useCqiInstitutionalIntelligence";

const wrapper = ({ children }: { children: ReactNode }) => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
};

describe("useCqiInstitutionalIntelligence", () => {
  it("does not request coordinator patterns before a program is selected", () => {
    renderHook(() => useCoordinatorCqiPatterns(), { wrapper });
    expect(rpc).not.toHaveBeenCalled();
  });

  it("parses only the scoped coordinator RPC response", async () => {
    rpc.mockResolvedValueOnce({
      data: [
        {
          id: "11111111-1111-4111-8111-111111111111",
          status: "reopened",
          pattern_identity: "institution/program/outcome",
          occurrence_version: "v1",
          outcome_id: "22222222-2222-4222-8222-222222222222",
          outcome_type: "CLO",
          course_id: null,
          baseline_attainment: 51.5,
          current_attainment: 57.5,
          target_threshold: 70,
          sample_count: 12,
          affected_population: 12,
          evidence_references: ["evidence-1"],
          last_measurement_state: "NO_MATERIAL_CHANGE",
          updated_at: "2026-08-18T00:00:00.000Z",
          cqi_action_plan_id: null,
          evaluation_state: null,
          delta: null,
          post_action_metric: null,
        },
      ],
      error: null,
    });

    const { result } = renderHook(
      () => useCoordinatorCqiPatterns("33333333-3333-4333-8333-333333333333"),
      { wrapper }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(rpc).toHaveBeenCalledWith("get_coordinator_cqi_patterns_v1", {
      p_program_id: "33333333-3333-4333-8333-333333333333",
    });
    expect(result.current.data?.[0]?.status).toBe("reopened");
  });

  it("reads the institution aggregate through the admin RPC", async () => {
    rpc.mockResolvedValueOnce({
      data: {
        openPatterns: 2,
        resolvedPatterns: 3,
        measurementStates: { IMPROVED: 3, DECLINED: 1 },
      },
      error: null,
    });

    const { result } = renderHook(() => useAdminCqiEffectiveness(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(rpc).toHaveBeenCalledWith("get_admin_cqi_effectiveness_v1");
    expect(result.current.data?.resolvedPatterns).toBe(3);
  });
});
