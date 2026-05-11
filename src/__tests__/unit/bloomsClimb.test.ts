import { describe, it, expect } from "vitest";
import {
  shouldAdvanceBloom,
  handleBloomRevert,
  highestBloomReached,
  computePracticeXP,
} from "@/lib/bloomsClimb";

describe("shouldAdvanceBloom", () => {
  it("returns currentLevel + 1 when 3 consecutive correct and level < 6", () => {
    expect(shouldAdvanceBloom(1, 3)).toBe(2);
    expect(shouldAdvanceBloom(3, 5)).toBe(4);
    expect(shouldAdvanceBloom(5, 3)).toBe(6);
  });

  it("returns currentLevel when consecutiveCorrect < 3", () => {
    expect(shouldAdvanceBloom(2, 0)).toBe(2);
    expect(shouldAdvanceBloom(4, 1)).toBe(4);
    expect(shouldAdvanceBloom(5, 2)).toBe(5);
  });

  it("caps at level 6 (Creating)", () => {
    expect(shouldAdvanceBloom(6, 3)).toBe(6);
    expect(shouldAdvanceBloom(6, 10)).toBe(6);
    expect(shouldAdvanceBloom(6, 0)).toBe(6);
  });
});

describe("handleBloomRevert", () => {
  it("reverts to previousLevel when incorrect and just advanced", () => {
    expect(handleBloomRevert(3, 2, false, true)).toBe(2);
    expect(handleBloomRevert(6, 5, false, true)).toBe(5);
    expect(handleBloomRevert(2, 1, false, true)).toBe(1);
  });

  it("returns currentLevel when correct and just advanced", () => {
    expect(handleBloomRevert(3, 2, true, true)).toBe(3);
  });

  it("returns currentLevel when incorrect but not just advanced", () => {
    expect(handleBloomRevert(3, 2, false, false)).toBe(3);
  });

  it("returns currentLevel when correct and not just advanced", () => {
    expect(handleBloomRevert(4, 3, true, false)).toBe(4);
  });
});

describe("highestBloomReached", () => {
  it("returns highest level with 2+ correct answers", () => {
    const attempts = [
      { bloomLevel: 1, correct: true },
      { bloomLevel: 1, correct: true },
      { bloomLevel: 2, correct: true },
      { bloomLevel: 2, correct: true },
      { bloomLevel: 3, correct: true },
      { bloomLevel: 3, correct: false },
    ];
    expect(highestBloomReached(attempts)).toBe(2);
  });

  it("returns 0 when no level has 2+ correct answers", () => {
    const attempts = [
      { bloomLevel: 1, correct: true },
      { bloomLevel: 2, correct: true },
      { bloomLevel: 3, correct: false },
    ];
    expect(highestBloomReached(attempts)).toBe(0);
  });

  it("returns 0 for empty attempts", () => {
    expect(highestBloomReached([])).toBe(0);
  });

  it("handles all incorrect answers", () => {
    const attempts = [
      { bloomLevel: 1, correct: false },
      { bloomLevel: 1, correct: false },
    ];
    expect(highestBloomReached(attempts)).toBe(0);
  });

  it("returns level 6 when Creating has 2+ correct", () => {
    const attempts = [
      { bloomLevel: 6, correct: true },
      { bloomLevel: 6, correct: true },
    ];
    expect(highestBloomReached(attempts)).toBe(6);
  });

  it("picks the highest among multiple qualifying levels", () => {
    const attempts = [
      { bloomLevel: 1, correct: true },
      { bloomLevel: 1, correct: true },
      { bloomLevel: 4, correct: true },
      { bloomLevel: 4, correct: true },
      { bloomLevel: 2, correct: true },
      { bloomLevel: 2, correct: true },
    ];
    expect(highestBloomReached(attempts)).toBe(4);
  });
});

describe("computePracticeXP", () => {
  it("always returns exactly 10", () => {
    expect(computePracticeXP()).toBe(10);
  });
});
