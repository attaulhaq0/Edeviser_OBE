import { describe, it, expect } from "vitest";
import { improvementBonusSchema } from "@/lib/schemas/improvementBonus";

describe("Improvement Bonus Schema", () => {
  it("validates a correct improvement bonus payload", () => {
    const result = improvementBonusSchema.safeParse({
      clo_id: "550e8400-e29b-41d4-a716-446655440000",
      previous_percent: 45,
      current_percent: 72,
      bonus_xp: 50,
    });
    expect(result.success).toBe(true);
  });

  it("rejects non-UUID clo_id", () => {
    const result = improvementBonusSchema.safeParse({
      clo_id: "not-a-uuid",
      previous_percent: 45,
      current_percent: 72,
      bonus_xp: 50,
    });
    expect(result.success).toBe(false);
  });

  it("rejects previous_percent below 0", () => {
    const result = improvementBonusSchema.safeParse({
      clo_id: "550e8400-e29b-41d4-a716-446655440000",
      previous_percent: -5,
      current_percent: 72,
      bonus_xp: 50,
    });
    expect(result.success).toBe(false);
  });

  it("rejects current_percent above 100", () => {
    const result = improvementBonusSchema.safeParse({
      clo_id: "550e8400-e29b-41d4-a716-446655440000",
      previous_percent: 45,
      current_percent: 105,
      bonus_xp: 50,
    });
    expect(result.success).toBe(false);
  });

  it("rejects non-positive bonus_xp", () => {
    const result = improvementBonusSchema.safeParse({
      clo_id: "550e8400-e29b-41d4-a716-446655440000",
      previous_percent: 45,
      current_percent: 72,
      bonus_xp: 0,
    });
    expect(result.success).toBe(false);
  });

  it("rejects non-integer bonus_xp", () => {
    const result = improvementBonusSchema.safeParse({
      clo_id: "550e8400-e29b-41d4-a716-446655440000",
      previous_percent: 45,
      current_percent: 72,
      bonus_xp: 50.5,
    });
    expect(result.success).toBe(false);
  });

  it("accepts boundary values (0 and 100 for percents)", () => {
    const result = improvementBonusSchema.safeParse({
      clo_id: "550e8400-e29b-41d4-a716-446655440000",
      previous_percent: 0,
      current_percent: 100,
      bonus_xp: 50,
    });
    expect(result.success).toBe(true);
  });
});
