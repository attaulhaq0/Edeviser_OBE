// Unit test: challengeTypes — all 5 types including cooperative, Blooms_Climb goal fixed at 6
import { describe, it, expect } from "vitest";
import {
  getChallengeTypeKeys,
  getChallengeType,
  hasFixedGoal,
  validateGoalTarget,
} from "@/lib/challengeTypes";

describe("challengeTypes", () => {
  const EXPECTED_TYPES = [
    "academic",
    "habit",
    "xp_race",
    "blooms_climb",
    "cooperative",
  ] as const;

  it("defines all 5 challenge types", () => {
    const keys = getChallengeTypeKeys();
    expect(keys.length).toBe(5);
    for (const type of EXPECTED_TYPES) {
      expect(keys).toContain(type);
    }
  });

  it("each type has required fields", () => {
    for (const key of EXPECTED_TYPES) {
      const config = getChallengeType(key);
      expect(config.key).toBe(key);
      expect(config.label).toBeTruthy();
      expect(config.description).toBeTruthy();
      expect(config.goalDescription).toBeTruthy();
      expect(config.goalUnit).toBeTruthy();
      expect(config.validationRules.minGoal).toBeGreaterThan(0);
      expect(config.validationRules.maxGoal).toBeGreaterThanOrEqual(
        config.validationRules.minGoal
      );
    }
  });

  it("blooms_climb has fixed goal of 6", () => {
    const bloomsClimb = getChallengeType("blooms_climb");
    expect(bloomsClimb.fixedGoal).toBe(6);
    expect(bloomsClimb.validationRules.minGoal).toBe(6);
    expect(bloomsClimb.validationRules.maxGoal).toBe(6);
    expect(hasFixedGoal("blooms_climb")).toBe(true);
  });

  it("cooperative type is defined", () => {
    const cooperative = getChallengeType("cooperative");
    expect(cooperative.key).toBe("cooperative");
    expect(cooperative.label).toBe("Cooperative");
    expect(hasFixedGoal("cooperative")).toBe(false);
  });

  it("non-fixed-goal types accept variable goals", () => {
    for (const key of [
      "academic",
      "habit",
      "xp_race",
      "cooperative",
    ] as const) {
      expect(hasFixedGoal(key)).toBe(false);
    }
  });

  it("validateGoalTarget enforces blooms_climb fixed goal", () => {
    expect(validateGoalTarget("blooms_climb", 6)).toBe(true);
    expect(validateGoalTarget("blooms_climb", 5)).toBe(false);
    expect(validateGoalTarget("blooms_climb", 7)).toBe(false);
  });

  it("validateGoalTarget enforces min/max for variable types", () => {
    expect(validateGoalTarget("academic", 1)).toBe(true);
    expect(validateGoalTarget("academic", 100)).toBe(true);
    expect(validateGoalTarget("academic", 0)).toBe(false);
    expect(validateGoalTarget("academic", 101)).toBe(false);
  });
});
