import { describe, it, expect } from "vitest";
import { wellnessXpAmountSchema } from "@/lib/schemas/wellnessXpAmount";

describe("wellnessXpAmountSchema", () => {
  it("accepts 0 (disables XP)", () => {
    expect(wellnessXpAmountSchema.safeParse(0).success).toBe(true);
  });

  it("accepts the default value of 5", () => {
    expect(wellnessXpAmountSchema.safeParse(5).success).toBe(true);
  });

  it("accepts the maximum value of 25", () => {
    expect(wellnessXpAmountSchema.safeParse(25).success).toBe(true);
  });

  it("accepts all integers in the valid range 0–25", () => {
    for (let i = 0; i <= 25; i++) {
      const result = wellnessXpAmountSchema.safeParse(i);
      expect(result.success).toBe(true);
    }
  });

  it("rejects negative values", () => {
    expect(wellnessXpAmountSchema.safeParse(-1).success).toBe(false);
    expect(wellnessXpAmountSchema.safeParse(-10).success).toBe(false);
  });

  it("rejects values above 25", () => {
    expect(wellnessXpAmountSchema.safeParse(26).success).toBe(false);
    expect(wellnessXpAmountSchema.safeParse(100).success).toBe(false);
  });

  it("rejects non-integer numbers", () => {
    expect(wellnessXpAmountSchema.safeParse(5.5).success).toBe(false);
    expect(wellnessXpAmountSchema.safeParse(0.1).success).toBe(false);
  });

  it("rejects non-number types", () => {
    expect(wellnessXpAmountSchema.safeParse("5").success).toBe(false);
    expect(wellnessXpAmountSchema.safeParse(null).success).toBe(false);
    expect(wellnessXpAmountSchema.safeParse(undefined).success).toBe(false);
  });
});
