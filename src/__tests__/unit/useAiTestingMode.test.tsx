// @vitest-environment happy-dom
import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

const { rpc } = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock("@/lib/supabase", () => ({ supabase: { rpc } }));

import {
  useAiTestingStatus,
  useActivateAiTesting,
  useDeactivateAiTesting,
} from "@/hooks/useAiTestingMode";

const wrapper = ({ children }: { children: ReactNode }) => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("useAiTestingStatus", () => {
  it("reports inactive when no session exists", async () => {
    rpc.mockResolvedValueOnce({ data: { active: false }, error: null });
    const { result } = renderHook(() => useAiTestingStatus(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.active).toBe(false);
    expect(rpc).toHaveBeenCalledWith("get_ai_testing_status", {});
  });

  it("reports active with session details when a session exists", async () => {
    rpc.mockResolvedValueOnce({
      data: { active: true, sessionId: "s1", startedAt: "2026-09-09T10:00:00Z", expiresAt: "2026-09-09T12:00:00Z", minutesRemaining: 45, maxCostUsd: 0.1 },
      error: null,
    });
    const { result } = renderHook(() => useAiTestingStatus(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.active).toBe(true);
    expect(result.current.data?.sessionId).toBe("s1");
    expect(result.current.data?.minutesRemaining).toBe(45);
  });

  it("handles RPC errors gracefully", async () => {
    rpc.mockResolvedValueOnce({ data: null, error: new Error("RPC error") });
    const { result } = renderHook(() => useAiTestingStatus(), { wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

describe("useActivateAiTesting", () => {
  it("activates testing with default parameters", async () => {
    rpc.mockResolvedValueOnce({ data: { sessionId: "s2", expiresAt: "2026-09-09T14:00:00Z", durationHours: 2, maxCostUsd: 0.1 }, error: null });
    const { result } = renderHook(() => useActivateAiTesting(), { wrapper });
    const output = await result.current.mutateAsync(undefined);
    expect(output.sessionId).toBe("s2");
    expect(output.durationHours).toBe(2);
    expect(rpc).toHaveBeenCalledWith("activate_ai_testing", { p_duration_hours: 2, p_max_cost_usd: 0.1 });
  });

  it("accepts custom duration and cost", async () => {
    rpc.mockResolvedValueOnce({ data: { sessionId: "s3", expiresAt: "2026-09-09T14:00:00Z", durationHours: 4, maxCostUsd: 0.5 }, error: null });
    const { result } = renderHook(() => useActivateAiTesting(), { wrapper });
    await result.current.mutateAsync({ durationHours: 4, maxCostUsd: 0.5 });
    expect(rpc).toHaveBeenCalledWith("activate_ai_testing", { p_duration_hours: 4, p_max_cost_usd: 0.5 });
  });
});

describe("useDeactivateAiTesting", () => {
  it("deactivates the active session", async () => {
    rpc.mockResolvedValueOnce({ data: null, error: null });
    const { result } = renderHook(() => useDeactivateAiTesting(), { wrapper });
    await result.current.mutateAsync();
    expect(rpc).toHaveBeenCalledWith("deactivate_ai_testing", {});
  });

  it("propagates RPC errors", async () => {
    rpc.mockResolvedValueOnce({ data: null, error: new Error("Deactivation failed") });
    const { result } = renderHook(() => useDeactivateAiTesting(), { wrapper });
    await expect(result.current.mutateAsync()).rejects.toThrow();
  });
});
