// =============================================================================
// gradeScale property tests â€” E1.11 letter-scale totality + FAIL-02/03 partition
//
// Feature: platform-hardening-and-integration, E1.11 (+ QA FAIL-02/03)
// Property 1: letter mapping is TOTAL â€” every percentage in [0, 100] maps to
//             one of the scale's letters, on valid (touching) scales AND on
//             legacy gapped scales (nearest-lower-band fallback, E1.11).
// Property 2: percents in a known gap of a gapped scale map to the nearest
//             LOWER band (84.0â€“85.0 gap â†’ "B"), never the failing grade.
// Property 3: the partition validator accepts touching band pairs and rejects
//             every strict gap and every strict overlap.
// =============================================================================

import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { mapToLetterGrade, mapToGpaPoints } from "@/lib/letterGradeMapper";
import { gradeScalesPartitionSchema } from "@/lib/schemas/institutionSettings";
import { DEFAULT_GRADE_SCALES, type GradeScale } from "@/types/app";

// The exact scale found in the live institution_settings rows at E1.11 audit
// time â€” integer-adjacent bands with real gaps at every boundary.
const LEGACY_GAPPED: GradeScale[] = [
  { letter: "A", min_percent: 85, max_percent: 100, gpa_points: 4.0 },
  { letter: "B", min_percent: 70, max_percent: 84, gpa_points: 3.0 },
  { letter: "C", min_percent: 55, max_percent: 69, gpa_points: 2.0 },
  { letter: "D", min_percent: 50, max_percent: 54, gpa_points: 1.0 },
  { letter: "F", min_percent: 0, max_percent: 49, gpa_points: 0.0 },
];

const band = (
  letter: string,
  min: number,
  max: number,
  gpa: number
): GradeScale => ({
  letter,
  min_percent: min,
  max_percent: max,
  gpa_points: gpa,
});

describe("gradeScale property tests (E1.11 + FAIL-02/03)", () => {
  it("Property 1: mapping is total over [0, 100] on valid and legacy scales", () => {
    const defaultLetters = new Set(DEFAULT_GRADE_SCALES.map((s) => s.letter));
    const legacyLetters = new Set(LEGACY_GAPPED.map((s) => s.letter));
    fc.assert(
      fc.property(
        fc.float({ min: 0, max: 100, noNaN: true }),
        (percent: number) => {
          expect(defaultLetters.has(mapToLetterGrade(percent))).toBe(true);
          expect(
            legacyLetters.has(mapToLetterGrade(percent, LEGACY_GAPPED))
          ).toBe(true);
        }
      ),
      { numRuns: 200 }
    );
  });

  it("Property 2: percents inside the 84â€“85 gap map to the nearest LOWER band (B), never F", () => {
    fc.assert(
      fc.property(
        fc.float({
          min: Math.fround(84.001),
          max: Math.fround(84.999),
          noNaN: true,
        }),
        (percent: number) => {
          expect(mapToLetterGrade(percent, LEGACY_GAPPED)).toBe("B");
          expect(mapToGpaPoints(percent, LEGACY_GAPPED)).toBe(3.0);
        }
      ),
      { numRuns: 200 }
    );
  });

  it("Property 3a: touching two-band partitions are accepted; strict gaps rejected", () => {
    fc.assert(
      fc.property(
        fc.float({
          min: Math.fround(0.001),
          max: Math.fround(99.999),
          noNaN: true,
        }),
        fc.float({
          min: Math.fround(0.001),
          max: Math.fround(5),
          noNaN: true,
        }),
        (split: number, gap: number) => {
          const touching = [band("F", 0, split, 0), band("A", split, 100, 4)];
          const gapped = [
            band("F", 0, split, 0),
            band("A", split + gap, 100, 4),
          ];
          expect(gradeScalesPartitionSchema.safeParse(touching).success).toBe(
            true
          );
          expect(gradeScalesPartitionSchema.safeParse(gapped).success).toBe(
            false
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  it("Property 3b: strict overlaps are rejected", () => {
    fc.assert(
      fc.property(
        fc.float({
          min: Math.fround(0.001),
          max: Math.fround(99.999),
          noNaN: true,
        }),
        fc.float({
          min: Math.fround(0.001),
          max: Math.fround(5),
          noNaN: true,
        }),
        (split: number, overlap: number) => {
          const overlapping = [
            band("F", 0, split, 0),
            band("A", Math.max(0, split - overlap), 100, 4),
          ];
          expect(
            gradeScalesPartitionSchema.safeParse(overlapping).success
          ).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });
});
