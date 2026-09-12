import { describe, it, expect } from "vitest";
import {
  institutionSettingsSchema,
  gradeScalesPartitionSchema,
} from "@/lib/schemas/institutionSettings";
import { DEFAULT_GRADE_SCALES, type GradeScale } from "@/types/app";
import { mapToLetterGrade, mapToGpaPoints } from "@/lib/letterGradeMapper";

describe("Grade scales per accreditation", () => {
  const ibMypScale: GradeScale[] = [
    { letter: "7", min_percent: 88, max_percent: 100, gpa_points: 4.0 },
    { letter: "6", min_percent: 75, max_percent: 88, gpa_points: 3.7 },
    { letter: "5", min_percent: 62, max_percent: 75, gpa_points: 3.0 },
    { letter: "4", min_percent: 50, max_percent: 62, gpa_points: 2.3 },
    { letter: "3", min_percent: 37, max_percent: 50, gpa_points: 1.7 },
    { letter: "2", min_percent: 25, max_percent: 37, gpa_points: 1.0 },
    { letter: "1", min_percent: 0, max_percent: 25, gpa_points: 0.0 },
  ];

  const igcseScale: GradeScale[] = [
    { letter: "9/A*", min_percent: 90, max_percent: 100, gpa_points: 4.0 },
    { letter: "8/A*", min_percent: 80, max_percent: 90, gpa_points: 4.0 },
    { letter: "7/A", min_percent: 70, max_percent: 80, gpa_points: 3.7 },
    { letter: "6/B", min_percent: 60, max_percent: 70, gpa_points: 3.3 },
    { letter: "5/C", min_percent: 50, max_percent: 60, gpa_points: 3.0 },
    { letter: "4/D", min_percent: 40, max_percent: 50, gpa_points: 2.3 },
    { letter: "3/E", min_percent: 30, max_percent: 40, gpa_points: 1.7 },
    { letter: "2/F", min_percent: 20, max_percent: 30, gpa_points: 1.0 },
    { letter: "1/G", min_percent: 0, max_percent: 20, gpa_points: 0.0 },
  ];

  it("IB MYP 1-7 is valid contiguous partition", () => {
    expect(gradeScalesPartitionSchema.safeParse(ibMypScale).success).toBe(true);
  });

  it("IGCSE A*-G is valid contiguous partition", () => {
    expect(gradeScalesPartitionSchema.safeParse(igcseScale).success).toBe(true);
  });

  it("Default A-F is valid contiguous partition", () => {
    expect(
      gradeScalesPartitionSchema.safeParse(DEFAULT_GRADE_SCALES).success
    ).toBe(true);
  });

  it("IB MYP letter mapping: 90->7, 80->6, 50->4", () => {
    expect(mapToLetterGrade(90, ibMypScale)).toBe("7");
    expect(mapToLetterGrade(80, ibMypScale)).toBe("6");
    expect(mapToLetterGrade(50, ibMypScale)).toBe("4");
  });

  it("IGCSE letter mapping: 95->9/A*, 65->6/B, 15->1/G", () => {
    expect(mapToLetterGrade(95, igcseScale)).toBe("9/A*");
    expect(mapToLetterGrade(65, igcseScale)).toBe("6/B");
    expect(mapToLetterGrade(15, igcseScale)).toBe("1/G");
  });

  it("all 3 scales cover full [0,100] domain", () => {
    for (const scales of [ibMypScale, igcseScale, DEFAULT_GRADE_SCALES]) {
      for (let p = 0; p <= 100; p++) {
        expect(mapToLetterGrade(p, scales)).toBeTruthy();
      }
    }
  });

  it("IB MYP GPA: 90->4.0, 15->0.0", () => {
    expect(mapToGpaPoints(90, ibMypScale)).toBe(4.0);
    expect(mapToGpaPoints(15, ibMypScale)).toBe(0.0);
  });
});

describe("Accreditation schema — all 10 bodies + multi-select", () => {
  const base = {
    attainment_thresholds: { excellent: 85, satisfactory: 70, developing: 50 },
    success_threshold: 70,
    accreditation_bodies: [] as string[],
    grade_scales: DEFAULT_GRADE_SCALES,
    streak_sabbatical_enabled: false,
  };

  const allBodies = [
    "ABET",
    "AACSB",
    "BSO",
    "CIS",
    "Generic",
    "HEC",
    "IB",
    "NCAAA",
    "QQA",
    "QNSA",
  ];

  for (const body of allBodies) {
    it(`accepts: ${body}`, () => {
      const r = institutionSettingsSchema.safeParse({
        ...base,
        accreditation_body: body,
      });
      expect(r.success).toBe(true);
    });
  }

  it("accepts free-text body per v8.1 migration", () => {
    expect(
      institutionSettingsSchema.safeParse({
        ...base,
        accreditation_body: "NEASC",
      }).success
    ).toBe(true);
  });

  it("accepts multi-accreditation: QNSA+BSO+IB", () => {
    const r = institutionSettingsSchema.safeParse({
      ...base,
      accreditation_body: "BSO",
      accreditation_bodies: ["QNSA", "BSO", "IB"],
    });
    expect(r.success).toBe(true);
  });

  it("rejects empty accreditation_body", () => {
    expect(
      institutionSettingsSchema.safeParse({ ...base, accreditation_body: "" })
        .success
    ).toBe(false);
  });
});

describe("Qatar K-12 market coverage", () => {
  const base = {
    attainment_thresholds: { excellent: 85, satisfactory: 70, developing: 50 },
    success_threshold: 70,
    accreditation_bodies: [] as string[],
    grade_scales: DEFAULT_GRADE_SCALES,
    streak_sabbatical_enabled: false,
  };

  it("K-12 bodies cover ~100% Qatar market: QNSA, IB, BSO, CIS", () => {
    for (const body of ["QNSA", "IB", "BSO", "CIS"]) {
      const r = institutionSettingsSchema.safeParse({
        ...base,
        accreditation_body: body,
      });
      expect(r.success).toBe(true);
    }
  });

  it("Higher-ed bodies also pass: ABET, AACSB, HEC, QQA, NCAAA", () => {
    for (const body of ["ABET", "AACSB", "HEC", "QQA", "NCAAA"]) {
      const r = institutionSettingsSchema.safeParse({
        ...base,
        accreditation_body: body,
      });
      expect(r.success).toBe(true);
    }
  });
});
