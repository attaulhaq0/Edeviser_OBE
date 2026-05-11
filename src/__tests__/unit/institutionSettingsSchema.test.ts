import { describe, it, expect } from "vitest";
import {
  institutionSettingsSchema,
  gradeScaleSchema,
} from "@/lib/schemas/institutionSettings";

describe("gradeScaleSchema", () => {
  it("accepts a valid grade scale entry", () => {
    const result = gradeScaleSchema.safeParse({
      letter: "A",
      min_percent: 85,
      max_percent: 100,
      gpa_points: 4.0,
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty letter", () => {
    const result = gradeScaleSchema.safeParse({
      letter: "",
      min_percent: 85,
      max_percent: 100,
      gpa_points: 4.0,
    });
    expect(result.success).toBe(false);
  });

  it("rejects gpa_points above 4", () => {
    const result = gradeScaleSchema.safeParse({
      letter: "A+",
      min_percent: 90,
      max_percent: 100,
      gpa_points: 4.5,
    });
    expect(result.success).toBe(false);
  });

  it("rejects negative percentages", () => {
    const result = gradeScaleSchema.safeParse({
      letter: "F",
      min_percent: -1,
      max_percent: 49,
      gpa_points: 0,
    });
    expect(result.success).toBe(false);
  });
});

describe("institutionSettingsSchema", () => {
  const validSettings = {
    attainment_thresholds: { excellent: 85, satisfactory: 70, developing: 50 },
    success_threshold: 70,
    accreditation_body: "HEC" as const,
    grade_scales: [
      { letter: "A", min_percent: 85, max_percent: 100, gpa_points: 4.0 },
      { letter: "B", min_percent: 70, max_percent: 84, gpa_points: 3.0 },
    ],
    streak_sabbatical_enabled: false,
  };

  it("accepts valid institution settings", () => {
    const result = institutionSettingsSchema.safeParse(validSettings);
    expect(result.success).toBe(true);
  });

  it("accepts all valid accreditation bodies", () => {
    const bodies = ["HEC", "QQA", "ABET", "NCAAA", "AACSB", "Generic"] as const;
    for (const body of bodies) {
      const result = institutionSettingsSchema.safeParse({
        ...validSettings,
        accreditation_body: body,
      });
      expect(result.success).toBe(true);
    }
  });

  it("rejects invalid accreditation body", () => {
    const result = institutionSettingsSchema.safeParse({
      ...validSettings,
      accreditation_body: "INVALID",
    });
    expect(result.success).toBe(false);
  });

  it("rejects thresholds above 100", () => {
    const result = institutionSettingsSchema.safeParse({
      ...validSettings,
      attainment_thresholds: {
        excellent: 101,
        satisfactory: 70,
        developing: 50,
      },
    });
    expect(result.success).toBe(false);
  });

  it("rejects negative thresholds", () => {
    const result = institutionSettingsSchema.safeParse({
      ...validSettings,
      attainment_thresholds: {
        excellent: 85,
        satisfactory: -1,
        developing: 50,
      },
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty grade_scales array", () => {
    const result = institutionSettingsSchema.safeParse({
      ...validSettings,
      grade_scales: [],
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing required fields", () => {
    const result = institutionSettingsSchema.safeParse({
      attainment_thresholds: {
        excellent: 85,
        satisfactory: 70,
        developing: 50,
      },
    });
    expect(result.success).toBe(false);
  });
});
