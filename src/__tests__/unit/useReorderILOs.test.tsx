// @vitest-environment happy-dom
// Feature: edeviser-agentic-intelligence, task 1.8.
// Contract: useReorderILOs MUST delegate to the atomic DB-side RPC
// `reorder_learning_outcomes` (single statement, validated) instead of a
// client-side batch of row updates, and must surface RPC errors.
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi, beforeEach } from "vitest";

const mockRpc = vi.fn();

vi.mock("@/lib/supabase", () => ({
  supabase: {
    rpc: (...args: unknown[]) => mockRpc(...args),
  },
}));

vi.mock("@/lib/auditLogger", () => ({
  logAuditEvent: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: { id: "admin-user" } }),
}));

import { logAuditEvent } from "@/lib/auditLogger";
import { useReorderILOs } from "@/hooks/useILOs";

const items = [
  { id: "11111111-1111-1111-1111-111111111111", sort_order: 2 },
  { id: "22222222-2222-2222-2222-222222222222", sort_order: 1 },
];

function renderReorderHook() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return renderHook(() => useReorderILOs(), { wrapper });
}

describe("useReorderILOs — atomic reorder RPC contract (task 1.8)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRpc.mockResolvedValue({ data: items.length, error: null });
  });

  it("calls the reorder_learning_outcomes RPC with the payload items", async () => {
    const { result } = renderReorderHook();

    await act(async () => {
      await result.current.mutateAsync({ items });
    });

    expect(mockRpc).toHaveBeenCalledTimes(1);
    expect(mockRpc).toHaveBeenCalledWith("reorder_learning_outcomes", {
      p_items: items,
    });
    await waitFor(() => {
      expect(logAuditEvent).toHaveBeenCalledWith(
        expect.objectContaining({ action: "reorder", entity_type: "ilo" })
      );
    });
  });

  it("propagates RPC errors (no silent partial reorders)", async () => {
    mockRpc.mockResolvedValue({
      data: null,
      error: {
        message: "All outcomes must be ILOs of your institution",
        code: "23514",
      },
    });
    const { result } = renderReorderHook();

    await expect(
      act(async () => {
        await result.current.mutateAsync({ items });
      })
    ).rejects.toThrow(/ILOs of your institution/);

    expect(logAuditEvent).not.toHaveBeenCalled();
  });
});
