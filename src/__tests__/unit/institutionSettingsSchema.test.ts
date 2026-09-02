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
  // Complete partition of 0–100 (QA FAIL-03 guard): every percentage maps to
  // exactly one band, so the baseline fixture must cover the whole range.
  const validSettings = {
    attainment_thresholds: { excellent: 85, satisfactory: 70, developing: 50 },
    success_threshold: 70,
    accreditation_body: "HEC" as const,
    grade_scales: [
      { letter: "A", min_percent: 85, max_percent: 100, gpa_points: 4.0 },
      { letter: "B", min_percent: 70, max_percent: 84, gpa_points: 3.0 },
      { letter: "F", min_percent: 0, max_percent: 69, gpa_points: 0.0 },
    ],
    streak_sabbatical_enabled: false,
  };

  it("accepts valid institution settings", () => {
    const result = institutionSettingsSchema.safeParse(validSettings);
    expect(result.success).toBe(true);
  });

  // ── QA SET-03 (FAIL-02): overlapping bands must be rejected ──
  it("rejects overlapping grade bands (B max raised into A's range)", () => {
    const result = institutionSettingsSchema.safeParse({
      ...validSettings,
      grade_scales: [
        { letter: "A", min_percent: 85, max_percent: 100, gpa_points: 4.0 },
        { letter: "B", min_percent: 70, max_percent: 90, gpa_points: 3.0 },
        { letter: "F", min_percent: 0, max_percent: 69, gpa_points: 0.0 },
      ],
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.issues.some((issue) => /overlap/i.test(issue.message))
      ).toBe(true);
    }
  });

  // ── QA SET-04 (FAIL-03): gapped bands must be rejected ──
  it("rejects gapped grade bands (B min raised past F's max)", () => {
    const result = institutionSettingsSchema.safeParse({
      ...validSettings,
      grade_scales: [
        { letter: "A", min_percent: 85, max_percent: 100, gpa_points: 4.0 },
        { letter: "B", min_percent: 71, max_percent: 84, gpa_points: 3.0 },
        { letter: "F", min_percent: 0, max_percent: 69, gpa_points: 0.0 },
      ],
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.issues.some((issue) => /gap/i.test(issue.message))
      ).toBe(true);
    }
  });

  it("rejects scales that do not reach 100%", () => {
    const result = institutionSettingsSchema.safeParse({
      ...validSettings,
      grade_scales: [
        { letter: "A", min_percent: 85, max_percent: 95, gpa_points: 4.0 },
        { letter: "B", min_percent: 70, max_percent: 84, gpa_points: 3.0 },
        { letter: "F", min_percent: 0, max_percent: 69, gpa_points: 0.0 },
      ],
    });
    expect(result.success).toBe(false);
  });

  it("rejects scales that do not start at 0%", () => {
    const result = institutionSettingsSchema.safeParse({
      ...validSettings,
      grade_scales: [
        { letter: "A", min_percent: 85, max_percent: 100, gpa_points: 4.0 },
        { letter: "B", min_percent: 70, max_percent: 84, gpa_points: 3.0 },
        { letter: "F", min_percent: 5, max_percent: 69, gpa_points: 0.0 },
      ],
    });
    expect(result.success).toBe(false);
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
