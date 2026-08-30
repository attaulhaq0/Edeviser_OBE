// Unit tests for the deterministic learning-state sweep (Task 8.2 families:
// learning-state-update-jobs + student-risk-jobs). Contract under test:
// canonical table/RPC usage, institution scoping, bounded batching,
// fail-closed candidate errors, and per-student failure isolation.

import { describe, expect, it } from "vitest";
import {
  DEFAULT_SWEEP_BATCH,
  MAX_SWEEP_BATCH,
  refreshStaleLearningStates,
  type LearningStateSweepClient,
} from "../../../supabase/functions/_shared/ai/learning-state-sweep";

interface RecordedCall {
  method: string;
  args: unknown[];
}

function createMockClient(options: {
  candidates?: Array<{ student_id: string }>;
  candidatesError?: { message: string } | null;
  refreshErrors?: (string | null)[];
}): { client: LearningStateSweepClient; calls: RecordedCall[] } {
  const calls: RecordedCall[] = [];
  const makeQuery = () => {
    const query = {
      eq: (...args: unknown[]) => {
        calls.push({ method: "eq", args });
        return query;
      },
      lte: (...args: unknown[]) => {
        calls.push({ method: "lte", args });
        return query;
      },
      order: (...args: unknown[]) => {
        calls.push({ method: "order", args });
        return query;
      },
      limit: (count: number) => {
        calls.push({ method: "limit", args: [count] });
        return Promise.resolve({
          data: options.candidatesError ? null : options.candidates ?? [],
          error: options.candidatesError ?? null,
        });
      },
    };
    return query;
  };
  const client: LearningStateSweepClient = {
    from: (table: string) => {
      calls.push({ method: "from", args: [table] });
      return {
        select: (columns: string) => {
          calls.push({ method: "select", args: [columns] });
          return makeQuery();
        },
      };
    },
    rpc: (fn: string, args: Record<string, unknown>) => {
      calls.push({ method: "rpc", args: [fn, args] });
      const index = calls.filter((call) => call.method === "rpc").length - 1;
      const message = options.refreshErrors?.[index] ?? null;
      return Promise.resolve({
        error: message ? { message } : null,
      });
    },
  };
  return { client, calls };
}

describe("refreshStaleLearningStates (Task 8.2 sweep)", () => {
  it("refreshes every stale candidate through the canonical SECURITY DEFINER RPC", async () => {
    const { client, calls } = createMockClient({
      candidates: [{ student_id: "s-1" }, { student_id: "s-2" }],
    });
    const result = await refreshStaleLearningStates(client, undefined);
    expect(result).toEqual({ ok: true, refreshed: 2, failed: 0 });
    expect(calls[0]).toEqual({
      method: "from",
      args: ["student_learning_states"],
    });
    expect(calls[1]).toEqual({ method: "select", args: ["student_id"] });
    const lte = calls.find((call) => call.method === "lte");
    expect(lte?.args[0]).toBe("fresh_until");
    const order = calls.find((call) => call.method === "order");
    expect(order?.args).toEqual(["calculated_at", { ascending: true }]);
    const rpcs = calls.filter((call) => call.method === "rpc");
    expect(rpcs).toHaveLength(2);
    const [firstRpc, secondRpc] = rpcs;
    expect(firstRpc?.args[0]).toBe("refresh_student_learning_state_v1");
    expect(firstRpc?.args[1]).toEqual({ p_student_id: "s-1" });
    expect(secondRpc?.args[1]).toEqual({ p_student_id: "s-2" });
  });

  it("scopes candidates to the institution when one is provided", async () => {
    const { client, calls } = createMockClient({
      candidates: [{ student_id: "s-1" }],
    });
    await refreshStaleLearningStates(client, "inst-1");
    const [institutionEq] = calls.filter((call) => call.method === "eq");
    expect(institutionEq?.args).toEqual(["institution_id", "inst-1"]);
  });

  it("does not scope when no institution is provided", async () => {
    const { client, calls } = createMockClient({ candidates: [] });
    await refreshStaleLearningStates(client, undefined);
    expect(calls.filter((call) => call.method === "eq")).toHaveLength(0);
  });

  it("fails closed on a candidate-list error: no RPC calls, no throw", async () => {
    const { client, calls } = createMockClient({
      candidatesError: { message: "db unavailable" },
    });
    const result = await refreshStaleLearningStates(client, undefined);
    expect(result).toEqual({ ok: false, refreshed: 0, failed: 0 });
    expect(calls.filter((call) => call.method === "rpc")).toHaveLength(0);
  });

  it("isolates per-student refresh failures and keeps counting", async () => {
    const { client } = createMockClient({
      candidates: [{ student_id: "bad" }, { student_id: "good" }],
      refreshErrors: ["boom", null],
    });
    const result = await refreshStaleLearningStates(client, undefined);
    expect(result).toEqual({ ok: true, refreshed: 1, failed: 1 });
  });

  it("bounds the batch: oversized clamps to MAX, invalid falls back to default", async () => {
    const oversized = createMockClient({ candidates: [] });
    await refreshStaleLearningStates(oversized.client, undefined, 999);
    expect(
      oversized.calls.find((call) => call.method === "limit")?.args
    ).toEqual([MAX_SWEEP_BATCH]);

    const invalid = createMockClient({ candidates: [] });
    await refreshStaleLearningStates(invalid.client, undefined, 0);
    expect(invalid.calls.find((call) => call.method === "limit")?.args).toEqual(
      [DEFAULT_SWEEP_BATCH]
    );

    const fallback = createMockClient({ candidates: [] });
    await refreshStaleLearningStates(fallback.client, undefined);
    expect(
      fallback.calls.find((call) => call.method === "limit")?.args
    ).toEqual([DEFAULT_SWEEP_BATCH]);
  });
});
