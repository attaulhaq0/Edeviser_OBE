import { describe, it, expect } from "vitest";
import {
  classifyAttainment,
  getAttainmentColor,
  getAttainmentTextClass,
  getAttainmentBadgeStyle,
} from "@/lib/attainmentClassifier";
import type { AttainmentThresholdsConfig } from "@/types/app";

describe("classifyAttainment", () => {
  it("classifies >= 85 as Excellent with default thresholds", () => {
    expect(classifyAttainment(85)).toBe("Excellent");
    expect(classifyAttainment(100)).toBe("Excellent");
    expect(classifyAttainment(90)).toBe("Excellent");
  });

  it("classifies 70-84 as Satisfactory with default thresholds", () => {
    expect(classifyAttainment(70)).toBe("Satisfactory");
    expect(classifyAttainment(84)).toBe("Satisfactory");
    expect(classifyAttainment(75)).toBe("Satisfactory");
  });

  it("classifies 50-69 as Developing with default thresholds", () => {
    expect(classifyAttainment(50)).toBe("Developing");
    expect(classifyAttainment(69)).toBe("Developing");
    expect(classifyAttainment(60)).toBe("Developing");
  });

  it("classifies < 50 as Not_Yet with default thresholds", () => {
    expect(classifyAttainment(49)).toBe("Not_Yet");
    expect(classifyAttainment(0)).toBe("Not_Yet");
    expect(classifyAttainment(25)).toBe("Not_Yet");
  });

  it("uses custom thresholds when provided", () => {
    const custom: AttainmentThresholdsConfig = {
      excellent: 90,
      satisfactory: 75,
      developing: 60,
    };
    expect(classifyAttainment(90, custom)).toBe("Excellent");
    expect(classifyAttainment(89, custom)).toBe("Satisfactory");
    expect(classifyAttainment(75, custom)).toBe("Satisfactory");
    expect(classifyAttainment(74, custom)).toBe("Developing");
    expect(classifyAttainment(60, custom)).toBe("Developing");
    expect(classifyAttainment(59, custom)).toBe("Not_Yet");
  });

  it("handles boundary values correctly", () => {
    const custom: AttainmentThresholdsConfig = {
      excellent: 80,
      satisfactory: 60,
      developing: 40,
    };
    expect(classifyAttainment(80, custom)).toBe("Excellent");
    expect(classifyAttainment(79, custom)).toBe("Satisfactory");
    expect(classifyAttainment(60, custom)).toBe("Satisfactory");
    expect(classifyAttainment(59, custom)).toBe("Developing");
    expect(classifyAttainment(40, custom)).toBe("Developing");
    expect(classifyAttainment(39, custom)).toBe("Not_Yet");
  });
});

describe("getAttainmentColor", () => {
  it("returns gray for negative values", () => {
    expect(getAttainmentColor(-1)).toBe("#e5e7eb");
  });

  it("returns green for excellent", () => {
    expect(getAttainmentColor(85)).toBe("#22c55e");
  });

  it("returns blue for satisfactory", () => {
    expect(getAttainmentColor(70)).toBe("#3b82f6");
  });

  it("returns yellow for developing", () => {
    expect(getAttainmentColor(50)).toBe("#eab308");
  });

  it("returns red for not yet", () => {
    expect(getAttainmentColor(30)).toBe("#ef4444");
  });
});

describe("getAttainmentTextClass", () => {
  it("returns correct text classes for each level", () => {
    expect(getAttainmentTextClass(90)).toBe("text-green-800");
    expect(getAttainmentTextClass(75)).toBe("text-blue-700");
    expect(getAttainmentTextClass(55)).toBe("text-yellow-800");
    expect(getAttainmentTextClass(30)).toBe("text-red-700");
  });
});

describe("getAttainmentBadgeStyle", () => {
  it("returns correct badge styles for each level", () => {
    expect(getAttainmentBadgeStyle(90)).toContain("bg-green-50");
    expect(getAttainmentBadgeStyle(75)).toContain("bg-blue-50");
    expect(getAttainmentBadgeStyle(55)).toContain("bg-yellow-50");
    expect(getAttainmentBadgeStyle(30)).toContain("bg-red-50");
  });

  it("uses custom thresholds", () => {
    const custom: AttainmentThresholdsConfig = {
      excellent: 95,
      satisfactory: 80,
      developing: 60,
    };
    expect(getAttainmentBadgeStyle(90, custom)).toContain("bg-blue-50");
    expect(getAttainmentBadgeStyle(95, custom)).toContain("bg-green-50");
  });
});
