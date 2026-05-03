// Feature: ai-tutor-rag, Property 38: Autonomy level resolution precedence
// Feature: ai-tutor-rag, Property 39: Student autonomy override respects teacher ceiling
// Feature: ai-tutor-rag, Property 40: Student L3 override is capped by teacher ceiling
// Feature: ai-tutor-rag, Property 41: Default is L2 when no config exists
// Feature: ai-tutor-rag, Property 42: Resolved autonomy is always a valid AutonomyLevel
// **Validates: Requirements 21.2, 21.3, 21.4, 22.3, 23.3**

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import {
  resolveAutonomyLevel,
  type AutonomyLevel,
  type ResolveAutonomyInput,
} from "@/lib/tutorAutonomy";

// ─── Arbitraries ────────────────────────────────────────────────────────────

const autonomyLevelArb = fc.constantFrom<AutonomyLevel>("L1", "L2", "L3");
const nullableAutonomyArb = fc.option(autonomyLevelArb, { nil: null });
const studentOverrideArb = fc.option(
  fc.constantFrom<"L1" | "L3">("L1", "L3"),
  { nil: null },
);

const resolveInputArb: fc.Arbitrary<ResolveAutonomyInput> = fc.record({
  assignmentAutonomy: nullableAutonomyArb,
  cloAutonomy: nullableAutonomyArb,
  studentOverride: studentOverrideArb,
});

const VALID_LEVELS: readonly AutonomyLevel[] = ["L1", "L2", "L3"] as const;

// ─── P38: Assignment autonomy takes precedence over CLO autonomy ────────────

describe("Property 38 — Assignment autonomy takes precedence over CLO autonomy", () => {
  it("P38: when assignment autonomy is set, it is used as the base level", () => {
    fc.assert(
      fc.property(
        autonomyLevelArb,
        nullableAutonomyArb,
        (assignmentLevel, cloLevel) => {
          const result = resolveAutonomyLevel({
            assignmentAutonomy: assignmentLevel,
            cloAutonomy: cloLevel,
            studentOverride: null,
          });
          expect(result).toBe(assignmentLevel);
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ─── P39: Student L1 override always applies regardless of base level ───────

describe("Property 39 — Student L1 override always applies", () => {
  it("P39: student override L1 always results in L1 regardless of teacher config", () => {
    fc.assert(
      fc.property(
        nullableAutonomyArb,
        nullableAutonomyArb,
        (assignmentLevel, cloLevel) => {
          const result = resolveAutonomyLevel({
            assignmentAutonomy: assignmentLevel,
            cloAutonomy: cloLevel,
            studentOverride: "L1",
          });
          expect(result).toBe("L1");
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ─── P40: Student L3 override is capped by teacher ceiling ──────────────────

describe("Property 40 — Student L3 override is capped by teacher ceiling", () => {
  it("P40: student L3 override cannot exceed the base (teacher) level", () => {
    fc.assert(
      fc.property(
        nullableAutonomyArb,
        nullableAutonomyArb,
        (assignmentLevel, cloLevel) => {
          const result = resolveAutonomyLevel({
            assignmentAutonomy: assignmentLevel,
            cloAutonomy: cloLevel,
            studentOverride: "L3",
          });

          const baseLevel = assignmentLevel ?? cloLevel ?? "L2";
          const baseLevelIndex = VALID_LEVELS.indexOf(baseLevel);
          const resultIndex = VALID_LEVELS.indexOf(result);

          // Result must not exceed the teacher ceiling (base level)
          expect(resultIndex).toBeLessThanOrEqual(baseLevelIndex);
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ─── P41: Default is L2 when no config exists ───────────────────────────────

describe("Property 41 — Default is L2 when no config exists", () => {
  it("P41: when neither assignment nor CLO autonomy is set and no student override, result is L2", () => {
    const result = resolveAutonomyLevel({
      assignmentAutonomy: null,
      cloAutonomy: null,
      studentOverride: null,
    });
    expect(result).toBe("L2");
  });
});

// ─── P42: Resolved autonomy is always a valid AutonomyLevel ─────────────────

describe("Property 42 — Resolved autonomy is always a valid AutonomyLevel", () => {
  it("P42: for any combination of inputs, the result is always L1, L2, or L3", () => {
    fc.assert(
      fc.property(resolveInputArb, (input) => {
        const result = resolveAutonomyLevel(input);
        expect(VALID_LEVELS).toContain(result);
      }),
      { numRuns: 100 },
    );
  });
});
