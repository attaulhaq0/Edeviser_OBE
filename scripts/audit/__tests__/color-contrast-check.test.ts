// Unit tests for scripts/audit/color-contrast-check.ts (Task 15.3, Req 11.4).

import { describe, expect, it } from "vitest";

import { contrastRatio, scanColorContrast } from "../color-contrast-check.ts";

describe("contrastRatio", () => {
  it("#000000 on #ffffff is exactly 21:1", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 0);
  });

  it("#ffffff on #ffffff is 1:1", () => {
    expect(contrastRatio("#ffffff", "#ffffff")).toBeCloseTo(1, 6);
  });

  it("is symmetric (order of fg/bg does not matter)", () => {
    const a = contrastRatio("#ff0000", "#00ff00");
    const b = contrastRatio("#00ff00", "#ff0000");
    expect(a).toBeCloseTo(b, 6);
  });

  it("handles 3-digit hex shorthand", () => {
    expect(contrastRatio("#000", "#fff")).toBeCloseTo(21, 0);
  });
});

describe("scanColorContrast (Task 15.3, Req 11.4)", () => {
  it("audits the real BADGE_PAIRS and reports any failures as Major findings", () => {
    const findings = scanColorContrast();
    // Every finding is Major severity mapping to Req 11.4.
    for (const f of findings) {
      expect(f.severity).toBe("Major");
      expect(f.requirementId).toBe("11.4");
    }
  });

  it("returns empty when all pairs meet AA", () => {
    const findings = scanColorContrast([
      {
        label: "safe-white-on-black",
        background: "#000000",
        foreground: "#ffffff",
      },
    ]);
    expect(findings).toEqual([]);
  });

  it("flags a pair below AA", () => {
    const findings = scanColorContrast([
      { label: "too-low", background: "#ffffff", foreground: "#cccccc" },
    ]);
    expect(findings).toHaveLength(1);
    expect(findings[0]?.detail?.ratio).toBeLessThan(4.5);
  });

  it("uses 3:1 threshold for large text", () => {
    // #888 on #fff is ~3.5:1 — fails normal but passes large.
    const normalPair = [
      { label: "borderline", background: "#ffffff", foreground: "#888888" },
    ];
    const largePair = [
      {
        label: "borderline-large",
        background: "#ffffff",
        foreground: "#888888",
        isLargeText: true,
      },
    ];
    expect(scanColorContrast(normalPair)).toHaveLength(1);
    expect(scanColorContrast(largePair)).toHaveLength(0);
  });
});
