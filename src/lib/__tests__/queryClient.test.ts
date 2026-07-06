import { describe, it, expect } from "vitest";
import {
  computeRetryDelay,
  RETRY_MAX_DELAY_MS,
  shouldRetryQuery,
} from "@/lib/queryClient";

describe("computeRetryDelay (equal-jitter backoff)", () => {
  it("stays within [base/2, base] for each attempt", () => {
    // random=0 -> lower bound (base/2); random=1 -> upper bound (base)
    expect(computeRetryDelay(0, () => 0)).toBe(500);
    expect(computeRetryDelay(0, () => 1)).toBe(1000);

    expect(computeRetryDelay(1, () => 0)).toBe(1000);
    expect(computeRetryDelay(1, () => 1)).toBe(2000);

    expect(computeRetryDelay(2, () => 0)).toBe(2000);
    expect(computeRetryDelay(2, () => 1)).toBe(4000);
  });

  it("caps the base at RETRY_MAX_DELAY_MS", () => {
    // 2**20 * 1000 is huge; base is capped, so the ceiling is the cap.
    expect(computeRetryDelay(20, () => 1)).toBe(RETRY_MAX_DELAY_MS);
    expect(computeRetryDelay(20, () => 0)).toBe(RETRY_MAX_DELAY_MS / 2);
  });

  it("produces different delays for different random draws (de-synchronizes retries)", () => {
    const a = computeRetryDelay(2, () => 0.1);
    const b = computeRetryDelay(2, () => 0.9);
    expect(a).not.toBe(b);
  });
});

describe("shouldRetryQuery", () => {
  it("never retries 429 (rate limit)", () => {
    expect(shouldRetryQuery(0, { status: 429 })).toBe(false);
  });

  it("never retries deterministic 4xx (except 408)", () => {
    expect(shouldRetryQuery(0, { status: 404 })).toBe(false);
    expect(shouldRetryQuery(0, { status: 403 })).toBe(false);
    expect(shouldRetryQuery(0, { status: 422 })).toBe(false);
  });

  it("retries transient failures up to 3 times", () => {
    expect(shouldRetryQuery(0, { status: 500 })).toBe(true);
    expect(shouldRetryQuery(0, { status: 408 })).toBe(true); // Request Timeout
    expect(shouldRetryQuery(2, {})).toBe(true); // unknown/PostgREST error, no status
    expect(shouldRetryQuery(3, { status: 500 })).toBe(false); // cap reached
  });
});
