// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import {
  useCompetencyItems,
  useCompetencyOutcomeMappings,
} from "@/hooks/useCompetencyFrameworks";

const mock = vi.hoisted(() => ({
  from: vi.fn(),
  select: vi.fn(),
  eq: vi.fn(),
  order: vi.fn(),
  response: {
    data: [] as unknown[],
    error: null as null | { message: string },
  },
}));
vi.mock("@/lib/supabase", () => ({ supabase: { from: mock.from } }));

// Self-contained synthetic row with the declared database projection shape.
// No external audit capture or live fixture is required to execute this test.
export const numberRow = {
  id: "number",
  framework_id: "cambridge",
  parent_id: null,
  level: 0,
  name: "Number",
  sort_order: 1,
  description: "Synthetic description for the number topic.",
};
const wrapper = () => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
};
beforeEach(() => {
  vi.clearAllMocks();
  mock.response = { data: [numberRow], error: null };
  const query = {
    select: mock.select,
    eq: mock.eq,
    order: mock.order,
    then: (resolve: (value: typeof mock.response) => unknown) =>
      Promise.resolve(mock.response).then(resolve),
  };
  mock.from.mockReturnValue(query);
  mock.select.mockReturnValue(query);
  mock.eq.mockReturnValue(query);
  mock.order.mockReturnValue(query);
});

describe("competency read contracts", () => {
  it("queries real fields and maps name/description without a fabricated code or string level", async () => {
    const { result } = renderHook(() => useCompetencyItems("cambridge"), {
      wrapper: wrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mock.select).toHaveBeenCalledWith(
      "id, framework_id, parent_id, level, name, description, sort_order"
    );
    expect(mock.eq).toHaveBeenCalledWith("framework_id", "cambridge");
    expect(result.current.data?.[0]).toMatchObject({
      title: "Number",
      level: 0,
      description: numberRow.description,
    });
    expect(result.current.data?.[0]).not.toHaveProperty("code");
  });
  it("keeps a successful empty response distinct from a read error", async () => {
    mock.response = { data: [], error: null };
    const empty = renderHook(() => useCompetencyItems("empty"), {
      wrapper: wrapper(),
    });
    await waitFor(() => expect(empty.result.current.isSuccess).toBe(true));
    expect(empty.result.current.data).toEqual([]);
    mock.response = { data: [], error: { message: "permission denied" } };
    const failed = renderHook(() => useCompetencyItems("denied"), {
      wrapper: wrapper(),
    });
    await waitFor(() => expect(failed.result.current.isError).toBe(true));
    expect(failed.result.current.data).toBeUndefined();
  });
  it("propagates the mapping item lookup error, rather than claiming no mappings", async () => {
    mock.response = { data: [], error: { message: "permission denied" } };
    const { result } = renderHook(
      () => useCompetencyOutcomeMappings("denied"),
      { wrapper: wrapper() }
    );
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(mock.from).not.toHaveBeenCalledWith("competency_outcome_mappings");
  });
  it("does not query until a framework is selected", () => {
    renderHook(() => useCompetencyItems(), { wrapper: wrapper() });
    expect(mock.from).not.toHaveBeenCalled();
  });
});
