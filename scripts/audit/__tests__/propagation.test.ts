// Unit tests for tests/e2e/_helpers/propagation.ts (Task 4.11).
//
// Covers the uniform polling contract: returns truthy values, preserves
// the last thrown error, times out cleanly, never exceeds the budget.

import { describe, it, expect } from "vitest";

import {
  pollUntil,
  PollTimeoutError,
} from "../../../tests/e2e/_helpers/propagation.ts";

describe("pollUntil (Task 4.11)", () => {
  it("resolves immediately when the predicate returns truthy on the first call", async () => {
    const result = await pollUntil(() => "ok", {
      intervalMs: 50,
      timeoutMs: 1000,
    });
    expect(result).toBe("ok");
  });

  it("resolves once the predicate flips to truthy", async () => {
    let attempts = 0;
    const result = await pollUntil(
      () => {
        attempts += 1;
        return attempts >= 3 ? "ready" : false;
      },
      { intervalMs: 10, timeoutMs: 1000 }
    );
    expect(result).toBe("ready");
    expect(attempts).toBeGreaterThanOrEqual(3);
  });

  it("throws PollTimeoutError when the predicate never becomes truthy", async () => {
    await expect(
      pollUntil(() => false, {
        intervalMs: 10,
        timeoutMs: 50,
        label: "test-bound",
      })
    ).rejects.toBeInstanceOf(PollTimeoutError);
  });

  it("carries the last thrown error onto the timeout", async () => {
    try {
      await pollUntil(
        () => {
          throw new Error("kaboom");
        },
        { intervalMs: 10, timeoutMs: 50, label: "fails" }
      );
      throw new Error("should have thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(PollTimeoutError);
      const typed = error as PollTimeoutError;
      expect(typed.elapsedMs).toBeGreaterThanOrEqual(50);
      expect((typed.lastError as Error).message).toBe("kaboom");
    }
  });

  it("clamps the final wait so the total never materially exceeds timeoutMs", async () => {
    const started = Date.now();
    try {
      await pollUntil(() => false, { intervalMs: 40, timeoutMs: 60 });
    } catch {
      /* expected */
    }
    const elapsed = Date.now() - started;
    // The final sleep is clamped to `remaining`, so total should land
    // within ~1 interval of the budget.
    expect(elapsed).toBeLessThan(200);
  });
});
