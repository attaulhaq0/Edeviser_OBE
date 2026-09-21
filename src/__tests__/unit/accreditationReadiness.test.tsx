// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import {
  accreditationReadinessSchema,
  calculatePackCompletion,
} from "@/lib/accreditationReadiness";
import { useCoordinatorAccreditationReadiness } from "@/hooks/useCoordinatorAccreditation";
const rpc = vi.hoisted(() => vi.fn());
vi.mock("@/lib/supabase", () => ({ supabase: { rpc } }));

// Self-contained synthetic response using the declared RPC keys and states.
// Course coverage and pack completion intentionally have different denominators.
// This is not an executed actor RPC snapshot or a dependency on private audit data.
const response = {
  readinessPercent: 100,
  documented: 4,
  partial: 0,
  blocked: 0,
  notStarted: 0,
  courses: [],
  pack: [
    { key: "cloMapping", state: "done" },
    { key: "samples", state: "done" },
    { key: "analysis", state: "done" },
    { key: "cqi", state: "prog" },
  ],
};
const wrapper = () => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
};
beforeEach(() => rpc.mockReset());

describe("declared evidence checklist completion", () => {
  it("keeps 100% course coverage separate from 3/4 completed pack items", () => {
    const data = accreditationReadinessSchema.parse(response);
    expect(calculatePackCompletion(data.pack)).toEqual({
      total: 4,
      complete: 3,
      inProgress: 1,
      outstanding: 0,
      percent: 75,
    });
    expect(data.readinessPercent).toBe(100);
  });
  it("does not assign credit to in-progress or pending items", () => {
    expect(
      calculatePackCompletion([
        { key: "cqi", state: "prog" },
        { key: "analysis", state: "pending" },
      ])
    ).toEqual({
      total: 2,
      complete: 0,
      inProgress: 1,
      outstanding: 1,
      percent: 0,
    });
  });
  it("only returns 100 when every declared item is complete", () => {
    expect(
      calculatePackCompletion([
        { key: "a", state: "done" },
        { key: "b", state: "done" },
      ])?.percent
    ).toBe(100);
    const many = Array.from({ length: 201 }, (_, i) => ({
      key: String(i),
      state: i === 200 ? ("prog" as const) : ("done" as const),
    }));
    expect(calculatePackCompletion(many)?.percent).toBe(99);
  });
  it("does not invent a denominator or complete state for missing/invalid data", () => {
    expect(calculatePackCompletion([])).toBeNull();
    expect(
      accreditationReadinessSchema.safeParse({ ...response, pack: undefined })
        .success
    ).toBe(false);
    expect(
      accreditationReadinessSchema.safeParse({
        ...response,
        pack: [{ key: "cqi", state: "unknown" }],
      }).success
    ).toBe(false);
    expect(
      accreditationReadinessSchema.safeParse({
        ...response,
        pack: [response.pack[0], response.pack[0]],
      }).success
    ).toBe(false);
  });
});
describe("readiness query contract", () => {
  it("returns the validated producer response without changing course metrics", async () => {
    rpc.mockResolvedValue({ data: response, error: null });
    const { result } = renderHook(
      () => useCoordinatorAccreditationReadiness("inst"),
      { wrapper: wrapper() }
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.documented).toBe(4);
    expect(result.current.data?.pack[3]?.state).toBe("prog");
  });
  it.each([
    { data: null, error: { message: "permission denied" } },
    {
      data: { ...response, pack: [{ key: "cqi", state: "invalid" }] },
      error: null,
    },
  ])(
    "propagates read/contract failure rather than returning an empty success",
    async (resultValue) => {
      rpc.mockResolvedValue(resultValue);
      const { result } = renderHook(
        () => useCoordinatorAccreditationReadiness("inst"),
        { wrapper: wrapper() }
      );
      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(result.current.data).toBeUndefined();
    }
  );
  it("keeps null result unknown and disables queries without institution scope", async () => {
    const disabled = renderHook(() => useCoordinatorAccreditationReadiness(), {
      wrapper: wrapper(),
    });
    expect(disabled.result.current.fetchStatus).toBe("idle");
    expect(rpc).not.toHaveBeenCalled();
    rpc.mockResolvedValue({ data: null, error: null });
    const enabled = renderHook(
      () => useCoordinatorAccreditationReadiness("inst"),
      { wrapper: wrapper() }
    );
    await waitFor(() => expect(enabled.result.current.isSuccess).toBe(true));
    expect(enabled.result.current.data).toBeNull();
  });
});
