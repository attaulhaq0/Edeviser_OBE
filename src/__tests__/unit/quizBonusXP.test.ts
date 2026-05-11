import { describe, it, expect } from "vitest";
import { computeBonusXP } from "@/lib/questionAnalytics";

describe("computeBonusXP — mixed difficulty edge cases", () => {
  it("returns 0 for an empty array", () => {
    expect(computeBonusXP([])).toBe(0);
  });

  it("returns 0 when all questions are easy (difficulty 1.0–3.9)", () => {
    const questions = [
      { difficulty_rating: 1.0 },
      { difficulty_rating: 2.5 },
      { difficulty_rating: 3.0 },
      { difficulty_rating: 3.9 },
    ];
    expect(computeBonusXP(questions)).toBe(0);
  });

  it("returns 20 XP for 2 hard and 3 easy questions", () => {
    const questions = [
      { difficulty_rating: 4.0 },
      { difficulty_rating: 4.5 },
      { difficulty_rating: 1.0 },
      { difficulty_rating: 2.0 },
      { difficulty_rating: 3.5 },
    ];
    expect(computeBonusXP(questions)).toBe(20);
  });

  it("returns 30 XP for 3 hard and 7 easy questions", () => {
    const questions = [
      { difficulty_rating: 4.0 },
      { difficulty_rating: 4.2 },
      { difficulty_rating: 5.0 },
      { difficulty_rating: 1.0 },
      { difficulty_rating: 1.5 },
      { difficulty_rating: 2.0 },
      { difficulty_rating: 2.5 },
      { difficulty_rating: 3.0 },
      { difficulty_rating: 3.5 },
      { difficulty_rating: 3.9 },
    ];
    expect(computeBonusXP(questions)).toBe(30);
  });

  it("returns 50 XP for exactly 5 hard questions (max)", () => {
    const questions = Array.from({ length: 5 }, () => ({
      difficulty_rating: 4.0,
    }));
    expect(computeBonusXP(questions)).toBe(50);
  });

  it("returns 50 XP (capped) for 8 hard questions", () => {
    const questions = Array.from({ length: 8 }, () => ({
      difficulty_rating: 4.5,
    }));
    expect(computeBonusXP(questions)).toBe(50);
  });

  it("caps at 50 when all questions are exactly 4.0", () => {
    const questions = Array.from({ length: 7 }, () => ({
      difficulty_rating: 4.0,
    }));
    // 7 * 10 = 70, capped at 50
    expect(computeBonusXP(questions)).toBe(50);
  });

  it("returns 30 XP for various difficulties: 1.0, 2.5, 3.9, 4.0, 4.5, 5.0", () => {
    const questions = [
      { difficulty_rating: 1.0 },
      { difficulty_rating: 2.5 },
      { difficulty_rating: 3.9 },
      { difficulty_rating: 4.0 },
      { difficulty_rating: 4.5 },
      { difficulty_rating: 5.0 },
    ];
    // 3 hard (4.0, 4.5, 5.0) → 30 XP
    expect(computeBonusXP(questions)).toBe(30);
  });

  it("returns 10 XP for a single question at exactly 4.0", () => {
    expect(computeBonusXP([{ difficulty_rating: 4.0 }])).toBe(10);
  });

  it("returns 0 XP for a single question at 3.99", () => {
    expect(computeBonusXP([{ difficulty_rating: 3.99 }])).toBe(0);
  });
});
