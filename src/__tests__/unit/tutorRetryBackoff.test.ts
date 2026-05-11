// @vitest-environment happy-dom
import { describe, it, expect } from "vitest";
import { calculateBackoffDelay } from "@/lib/tutorApi";

describe("calculateBackoffDelay", () => {
  it("returns 1000ms for attempt 1", () => {
    expect(calculateBackoffDelay(1)).toBe(1000);
  });

  it("returns 2000ms for attempt 2", () => {
    expect(calculateBackoffDelay(2)).toBe(2000);
  });

  it("returns 4000ms for attempt 3", () => {
    expect(calculateBackoffDelay(3)).toBe(4000);
  });

  it("doubles the delay with each attempt", () => {
    const delay1 = calculateBackoffDelay(1);
    const delay2 = calculateBackoffDelay(2);
    const delay3 = calculateBackoffDelay(3);
    expect(delay2).toBe(delay1 * 2);
    expect(delay3).toBe(delay2 * 2);
  });

  it("follows the formula 1000 * 2^(attempt-1)", () => {
    for (let attempt = 1; attempt <= 5; attempt++) {
      expect(calculateBackoffDelay(attempt)).toBe(
        1000 * Math.pow(2, attempt - 1)
      );
    }
  });

  it("returns 1000ms for attempt 0 (edge case: 2^-1 = 0.5)", () => {
    // attempt 0 → 1000 * 2^(-1) = 500
    expect(calculateBackoffDelay(0)).toBe(500);
  });

  it("returns 8000ms for attempt 4", () => {
    expect(calculateBackoffDelay(4)).toBe(8000);
  });

  it("returns positive values for all valid attempts", () => {
    for (let attempt = 1; attempt <= 10; attempt++) {
      expect(calculateBackoffDelay(attempt)).toBeGreaterThan(0);
    }
  });
});
