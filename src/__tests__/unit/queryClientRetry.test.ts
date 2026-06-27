// =============================================================================
// queryClient retry policy — unit tests
//
// Guards the request-fan-out reduction: deterministic client errors (4xx, except
// 408) must NOT be retried, because a retry just reproduces the same failure and
// multiplies network requests (this is what amplified a single broken
// tutor-analytics 404 into ~8 calls in the captured HAR). Network/5xx/unknown
// errors stay retryable (up to 3×); 429 is never retried (rate-limit respected).
// =============================================================================

import { describe, it, expect } from "vitest";
import { getErrorStatus, shouldRetryQuery } from "@/lib/queryClient";

describe("getErrorStatus", () => {
  it("reads a top-level numeric status", () => {
    expect(getErrorStatus({ status: 404 })).toBe(404);
  });

  it("reads status from an edge-function error's context (FunctionsHttpError)", () => {
    expect(getErrorStatus({ context: { status: 403 } })).toBe(403);
  });

  it("returns undefined for PostgREST-style errors (code, no http status)", () => {
    expect(
      getErrorStatus({ code: "42501", message: "RLS", details: null })
    ).toBeUndefined();
  });

  it("returns undefined for non-object / nullish errors", () => {
    expect(getErrorStatus(null)).toBeUndefined();
    expect(getErrorStatus("boom")).toBeUndefined();
    expect(getErrorStatus(new Error("x"))).toBeUndefined();
  });
});

describe("shouldRetryQuery", () => {
  it("does NOT retry deterministic 4xx client errors", () => {
    for (const status of [400, 401, 403, 404, 409, 422]) {
      expect(shouldRetryQuery(0, { status })).toBe(false);
    }
  });

  it("does NOT retry 4xx surfaced via edge-function context", () => {
    expect(shouldRetryQuery(0, { context: { status: 404 } })).toBe(false);
  });

  it("does NOT retry 429 (rate limit respected)", () => {
    expect(shouldRetryQuery(0, { status: 429 })).toBe(false);
  });

  it("DOES retry 408 Request Timeout (transient) up to 3×", () => {
    expect(shouldRetryQuery(0, { status: 408 })).toBe(true);
    expect(shouldRetryQuery(2, { status: 408 })).toBe(true);
    expect(shouldRetryQuery(3, { status: 408 })).toBe(false);
  });

  it("DOES retry 5xx server errors up to 3×", () => {
    expect(shouldRetryQuery(0, { status: 500 })).toBe(true);
    expect(shouldRetryQuery(2, { status: 503 })).toBe(true);
    expect(shouldRetryQuery(3, { status: 500 })).toBe(false);
  });

  it("DOES retry unknown/network/PostgREST errors (no status) up to 3×", () => {
    expect(shouldRetryQuery(0, new Error("network"))).toBe(true);
    expect(shouldRetryQuery(0, { code: "42P01" })).toBe(true);
    expect(shouldRetryQuery(2, { code: "42P01" })).toBe(true);
    expect(shouldRetryQuery(3, { code: "42P01" })).toBe(false);
  });
});
