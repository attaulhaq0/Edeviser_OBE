import { describe, it, expect } from "vitest";
import {
  calculatePercentileBand,
  formatPercentileBand,
} from "@/lib/percentileBand";

describe("calculatePercentileBand", () => {
  it("returns exact rank for top 10 students", () => {
    const result = calculatePercentileBand(1, 100);
    expect(result).toEqual({ type: "exact", rank: 1 });
  });

  it("returns exact rank for rank 10", () => {
    const result = calculatePercentileBand(10, 100);
    expect(result).toEqual({ type: "exact", rank: 10 });
  });

  it("returns Top 10% band for rank 11 out of 200", () => {
    // 11/200 = 5.5% → Top 10%
    const result = calculatePercentileBand(11, 200);
    expect(result).toEqual({ type: "band", band: "Top 10%" });
  });

  it("returns Top 25% band for rank 20 out of 100", () => {
    // 20/100 = 20% → Top 25%
    const result = calculatePercentileBand(20, 100);
    expect(result).toEqual({ type: "band", band: "Top 25%" });
  });

  it("returns Top 50% band for rank 40 out of 100", () => {
    // 40/100 = 40% → Top 50%
    const result = calculatePercentileBand(40, 100);
    expect(result).toEqual({ type: "band", band: "Top 50%" });
  });

  it("returns Bottom 50% band for rank 60 out of 100", () => {
    // 60/100 = 60% → Bottom 50%
    const result = calculatePercentileBand(60, 100);
    expect(result).toEqual({ type: "band", band: "Bottom 50%" });
  });

  it("handles edge case: totalStudents = 0", () => {
    const result = calculatePercentileBand(1, 0);
    expect(result).toEqual({ type: "exact", rank: 1 });
  });

  it("handles edge case: rank = 0", () => {
    const result = calculatePercentileBand(0, 100);
    expect(result).toEqual({ type: "exact", rank: 1 });
  });

  it("returns exact rank for top 10 even with small total", () => {
    const result = calculatePercentileBand(5, 8);
    expect(result).toEqual({ type: "exact", rank: 5 });
  });

  it("returns Top 10% at boundary (exactly 10%)", () => {
    // 11/110 = 10% → Top 10%
    const result = calculatePercentileBand(11, 110);
    expect(result).toEqual({ type: "band", band: "Top 10%" });
  });

  it("returns Top 25% at boundary (exactly 25%)", () => {
    // 25/100 = 25% → Top 25%
    const result = calculatePercentileBand(25, 100);
    expect(result).toEqual({ type: "band", band: "Top 25%" });
  });
});

describe("formatPercentileBand", () => {
  it("formats exact rank", () => {
    expect(formatPercentileBand({ type: "exact", rank: 3 })).toBe("#3");
  });

  it("formats band label", () => {
    expect(formatPercentileBand({ type: "band", band: "Top 25%" })).toBe(
      "Top 25%"
    );
  });
});
