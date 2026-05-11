import { describe, it, expect } from "vitest";
import { emailPreferencesSchema } from "@/lib/schemas/emailPrefs";

describe("emailPreferencesSchema", () => {
  it("accepts all-true preferences", () => {
    const result = emailPreferencesSchema.safeParse({
      streak_risk: true,
      weekly_summary: true,
      new_assignment: true,
      grade_released: true,
    });
    expect(result.success).toBe(true);
  });

  it("accepts all-false preferences (full opt-out)", () => {
    const result = emailPreferencesSchema.safeParse({
      streak_risk: false,
      weekly_summary: false,
      new_assignment: false,
      grade_released: false,
    });
    expect(result.success).toBe(true);
  });

  it("applies default values for missing fields (true for most, false for notification_digest)", () => {
    const result = emailPreferencesSchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.streak_risk).toBe(true);
      expect(result.data.weekly_summary).toBe(true);
      expect(result.data.new_assignment).toBe(true);
      expect(result.data.grade_released).toBe(true);
      expect(result.data.notification_digest).toBe(false);
    }
  });

  it("rejects non-boolean values", () => {
    const result = emailPreferencesSchema.safeParse({
      streak_risk: "yes",
      weekly_summary: 1,
      new_assignment: null,
      grade_released: undefined,
    });
    // streak_risk and weekly_summary should fail, grade_released defaults
    expect(result.success).toBe(false);
  });

  it("accepts mixed true/false preferences", () => {
    const result = emailPreferencesSchema.safeParse({
      streak_risk: false,
      weekly_summary: true,
      new_assignment: false,
      grade_released: true,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.streak_risk).toBe(false);
      expect(result.data.weekly_summary).toBe(true);
      expect(result.data.new_assignment).toBe(false);
      expect(result.data.grade_released).toBe(true);
    }
  });
});
