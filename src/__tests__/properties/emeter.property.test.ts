// Feature: prototype-frontend-rebuild (P0.4 L2 patterns) — EMeter semantic meter.
// Reproduces prototype/shared.css `.emeter`; see src/design-system/PARITY.md §A.4.
import { describe, it, expect } from "vitest";
import fc from "fast-check";
import {
  clampPercent,
  emeterFillBackground,
  EMETER_FILL,
} from "@/design-system/patterns/EMeter";

describe("EMeter logic — clampPercent (property)", () => {
  // Property: the rendered fill width can never leave the [0,100] domain for
  // ANY numeric input (guards against NaN / negative / overflow widths).
  it("always yields a value within [0,100]", () => {
    fc.assert(
      fc.property(fc.double(), (n) => {
        const r = clampPercent(n);
        return r >= 0 && r <= 100;
      }),
      { numRuns: 200 }
    );
  });

  // Property: identity on the valid domain (no distortion of real values).
  it("is identity on [0,100]", () => {
    fc.assert(
      fc.property(fc.double({ min: 0, max: 100, noNaN: true }), (n) =>
        Object.is(clampPercent(n), n)
      ),
      { numRuns: 200 }
    );
  });

  it("collapses non-finite → 0, negatives → 0, overflow → 100", () => {
    expect(clampPercent(NaN)).toBe(0);
    expect(clampPercent(Infinity)).toBe(0);
    expect(clampPercent(-Infinity)).toBe(0);
    fc.assert(
      fc.property(
        fc.double({ min: -1e6, max: -1e-6, noNaN: true }),
        (n) => clampPercent(n) === 0
      ),
      { numRuns: 100 }
    );
    fc.assert(
      fc.property(
        fc.double({ min: 100.0001, max: 1e6, noNaN: true }),
        (n) => clampPercent(n) === 100
      ),
      { numRuns: 100 }
    );
  });
});

describe("EMeter logic — emeterFillBackground (fill parity with prototype)", () => {
  it("default fill: brand gradient (student) / flat slate (pro)", () => {
    expect(emeterFillBackground(undefined, false)).toBe(
      "var(--brand-gradient)"
    );
    expect(emeterFillBackground(undefined, true)).toBe("#334155");
  });

  it("student semantic variants match prototype hex exactly", () => {
    expect(emeterFillBackground("strong")).toBe("#16a34a");
    expect(emeterFillBackground("good")).toBe("#0d9488");
    expect(emeterFillBackground("attention")).toBe("#f59e0b");
    expect(emeterFillBackground("critical")).toBe("#ef4444");
  });

  it("pro semantic variants match prototype hex exactly", () => {
    expect(emeterFillBackground("strong", true)).toBe("#15803d");
    expect(emeterFillBackground("good", true)).toBe("#0f766e");
    expect(emeterFillBackground("attention", true)).toBe("#b45309");
    expect(emeterFillBackground("critical", true)).toBe("#b91c1c");
  });

  it("exposes both palettes", () => {
    expect(Object.keys(EMETER_FILL)).toEqual(["default", "pro"]);
  });
});
