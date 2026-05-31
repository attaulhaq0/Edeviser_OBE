// @vitest-environment happy-dom
// =============================================================================
// useUpdateConversationAutonomy — Unit tests
// Feature: student-experience-remediation, Task 7.6
// Validates: Requirements 28.1, 28.3
// =============================================================================

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement, type ReactNode } from "react";
import { useUpdateConversationAutonomy } from "@/hooks/useUpdateConversationAutonomy";
import { queryKeys } from "@/lib/queryKeys";

// ─── Mocks ───────────────────────────────────────────────────────────────────

const eqMock = vi.fn();
const updateMock = vi.fn(() => ({ eq: eqMock }));
const fromMock = vi.fn((_table: string) => ({ update: updateMock }));

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: (table: string) => fromMock(table),
  },
}));

const toastErrorMock = vi.fn();
vi.mock("sonner", () => ({
  toast: { error: (msg: string) => toastErrorMock(msg) },
}));

const createWrapper = (queryClient: QueryClient) => {
  return ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children);
};

describe("useUpdateConversationAutonomy", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: { mutations: { retry: false } },
    });
  });

  it("performs a typed update of autonomy_override scoped by conversation id", async () => {
    eqMock.mockResolvedValueOnce({ error: null });

    const { result } = renderHook(() => useUpdateConversationAutonomy(), {
      wrapper: createWrapper(queryClient),
    });

    result.current.mutate({ conversationId: "conv-1", level: "L1" });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(fromMock).toHaveBeenCalledWith("tutor_conversations");
    expect(updateMock).toHaveBeenCalledWith({ autonomy_override: "L1" });
    expect(eqMock).toHaveBeenCalledWith("id", "conv-1");
  });

  it("clears the override when level is null", async () => {
    eqMock.mockResolvedValueOnce({ error: null });

    const { result } = renderHook(() => useUpdateConversationAutonomy(), {
      wrapper: createWrapper(queryClient),
    });

    result.current.mutate({ conversationId: "conv-2", level: null });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(updateMock).toHaveBeenCalledWith({ autonomy_override: null });
  });

  it("invalidates conversation queries on success", async () => {
    eqMock.mockResolvedValueOnce({ error: null });
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(() => useUpdateConversationAutonomy(), {
      wrapper: createWrapper(queryClient),
    });

    result.current.mutate({ conversationId: "conv-1", level: "L3" });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.tutorConversations.all,
    });
  });

  it("surfaces a Sonner toast when the update fails", async () => {
    eqMock.mockResolvedValueOnce({ error: new Error("update denied") });

    const { result } = renderHook(() => useUpdateConversationAutonomy(), {
      wrapper: createWrapper(queryClient),
    });

    result.current.mutate({ conversationId: "conv-1", level: "L1" });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(toastErrorMock).toHaveBeenCalledWith("update denied");
  });
});
