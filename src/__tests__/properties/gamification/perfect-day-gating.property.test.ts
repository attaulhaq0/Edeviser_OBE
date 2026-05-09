// Feature: pre-deployment-e2e-audit, Property 12: Perfect Day gating
// **Validates: Requirements 8.6**
//
// isPerfectDay returns true if and only if all four daily habits (Login,
// Submit, Journal, Read) completed. We validate the boolean contract with
// fast-check, including the "all but one" false cases that exercise the
// gate's AND semantics.

import { describe, it, expect } from "vitest";
import fc from "fast-check";

import { isPerfectDay } from "@/lib/perfectDayCheck";
import { arbitraryDailyHabits } from "../_generators/habits";

describe("Property 12 — Perfect Day gating", () => {
  it("returns true iff all four habits are true", () => {
    fc.assert(
      fc.property(arbitraryDailyHabits(), (habits) => {
        const expected =
          habits.login && habits.submit && habits.journal && habits.read;
        expect(isPerfectDay(habits)).toBe(expected);
      }),
      { numRuns: 200 }
    );
  });

  it("any single missing habit produces false", () => {
    const keys = ["login", "submit", "journal", "read"] as const;
    for (const missing of keys) {
      const habits = { login: true, submit: true, journal: true, read: true };
      (habits as Record<string, boolean>)[missing] = false;
      expect(isPerfectDay(habits)).toBe(false);
    }
  });

  it("all four complete always yields true", () => {
    expect(
      isPerfectDay({ login: true, submit: true, journal: true, read: true })
    ).toBe(true);
  });
});
