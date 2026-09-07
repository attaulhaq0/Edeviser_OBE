// @vitest-environment happy-dom
// =============================================================================
// useProblemCaseExplanation — 8.9 AI explanation hook unit tests
//
// The hook is transport + shape validation only: it invokes the bounded
// `explain_problem_case` orchestrator channel and validates the UNTRUSTED
// response (runId + explanation required; malformed → error).
//   1. valid response → parsed explanation (model defaulted when absent)
//   2. malformed response → mutation errors (never rendered)
//   3. invoke error → mutation errors
// =============================================================================

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const mockInvoke = vi.fn();
vi.mock("@/lib/supabase", () => ({
  supabase: {
    functions: {
      invoke: (...args: unknown[]) => mockInvoke(...args),
    },
  },
}));
vi.mock("@/ai/hooks/useAiIdentity", () => ({
  useAiIdentity: () => ({
    userId: "user-1",
    institutionId: "inst-1",
    role: "coordinator",
    ready: true,
  }),
}));

import { useProblemCaseExplanation } from "@/ai/hooks/useProblemCaseExplanation";

const wrapper =
  () =>
  ({ children }: { children: ReactNode }) => {
    const client = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    return (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
  };

describe("useProblemCaseExplanation (8.9)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("invokes the orchestrator with identifiers only and parses the response", async () => {
    mockInvoke.mockResolvedValue({
      data: {
        runId: "run-1",
        explanation: "Course average is 46.8%.",
        model: "deepseek-chat",
        evidencePacket: { course_id: "c1" },
      },
      error: null,
    });
    const { result } = renderHook(() => useProblemCaseExplanation(), {
      wrapper: wrapper(),
    });
    result.current.mutate({ courseId: "c1", cloId: "clo-1" });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockInvoke).toHaveBeenCalledWith("agent-orchestrator", {
      body: { action: "explain_problem_case", courseId: "c1", cloId: "clo-1" },
    });
    expect(result.current.data?.explanation).toBe("Course average is 46.8%.");
    expect(result.current.data?.model).toBe("deepseek-chat");
  });

  it("errors on a malformed response (guards are fail-closed)", async () => {
    mockInvoke.mockResolvedValue({ data: { explanation: 42 }, error: null });
    const { result } = renderHook(() => useProblemCaseExplanation(), {
      wrapper: wrapper(),
    });
    result.current.mutate({ courseId: "c1", cloId: "clo-1" });
    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  it("errors when the orchestrator rejects the request", async () => {
    mockInvoke.mockResolvedValue({
      data: null,
      error: { message: "function not found" },
    });
    const { result } = renderHook(() => useProblemCaseExplanation(), {
      wrapper: wrapper(),
    });
    result.current.mutate({ courseId: "c1", cloId: "clo-1" });
    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
