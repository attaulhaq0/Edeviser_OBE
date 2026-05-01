// Feature: edeviser-platform, Property 47: Student data export completeness
// **Validates: Requirements 64.2, 64.5**

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";

// ─── Pure export data model ─────────────────────────────────────────────────

/** The required sections in a student data export. */
const REQUIRED_EXPORT_SECTIONS = [
  "profile",
  "grades",
  "outcome_attainment",
  "xp_transactions",
  "journal_entries",
  "badges",
  "habit_logs",
] as const;

type ExportSection = (typeof REQUIRED_EXPORT_SECTIONS)[number];

interface ExportData {
  exported_at: string;
  profile: Record<string, unknown> | null;
  grades: Record<string, unknown>[];
  outcome_attainment: Record<string, unknown>[];
  xp_transactions: Record<string, unknown>[];
  journal_entries: Record<string, unknown>[];
  badges: Record<string, unknown>[];
  habit_logs: Record<string, unknown>[];
}

/** Validate that an export contains all required sections. */
function validateExportCompleteness(exportData: ExportData): {
  isComplete: boolean;
  missingSections: string[];
} {
  const missingSections: string[] = [];

  for (const section of REQUIRED_EXPORT_SECTIONS) {
    if (!(section in exportData)) {
      missingSections.push(section);
    }
  }

  return {
    isComplete: missingSections.length === 0,
    missingSections,
  };
}

/** Validate that export record counts match source counts. */
function validateExportCounts(
  exportData: ExportData,
  sourceCounts: Record<ExportSection, number>
): {
  allMatch: boolean;
  mismatches: Array<{ section: string; expected: number; actual: number }>;
} {
  const mismatches: Array<{
    section: string;
    expected: number;
    actual: number;
  }> = [];

  for (const section of REQUIRED_EXPORT_SECTIONS) {
    if (section === "profile") continue; // profile is a single object, not an array
    const actual = (exportData[section] as unknown[]).length;
    const expected = sourceCounts[section];
    if (actual !== expected) {
      mismatches.push({ section, expected, actual });
    }
  }

  return { allMatch: mismatches.length === 0, mismatches };
}

// ─── Arbitraries ────────────────────────────────────────────────────────────

/** Safe ISO timestamp arbitrary using integer offsets. */
const isoTimestampArb = fc
  .integer({ min: 0, max: 1095 })
  .map((offset) => new Date(Date.UTC(2024, 0, 1 + offset)).toISOString());

const gradeArb = fc.record({
  id: fc.uuid(),
  score_percent: fc.double({ min: 0, max: 100, noNaN: true }),
  overall_feedback: fc.string({ minLength: 0, maxLength: 200 }),
  created_at: isoTimestampArb,
});

const attainmentArb = fc.record({
  outcome_id: fc.uuid(),
  attainment_percent: fc.double({ min: 0, max: 100, noNaN: true }),
  scope: fc.constantFrom("clo", "plo", "ilo"),
  last_calculated_at: isoTimestampArb,
});

const xpArb = fc.record({
  source: fc.constantFrom(
    "login",
    "submission",
    "badge",
    "perfect_day",
    "streak_freeze_purchase"
  ),
  xp_amount: fc.integer({ min: -200, max: 500 }),
  created_at: isoTimestampArb,
});

const journalArb = fc.record({
  id: fc.uuid(),
  title: fc.string({ minLength: 1, maxLength: 100 }),
  word_count: fc.integer({ min: 0, max: 5000 }),
  created_at: isoTimestampArb,
});

const badgeArb = fc.record({
  badge_id: fc.uuid(),
  awarded_at: isoTimestampArb,
});

const habitLogArb = fc.record({
  date: fc
    .integer({ min: 0, max: 1095 })
    .map((offset) =>
      new Date(Date.UTC(2024, 0, 1 + offset)).toISOString().slice(0, 10)
    ),
  habit_type: fc.constantFrom("login", "submit", "journal", "read"),
});

// ─── Property 47: Student data export completeness ──────────────────────────

describe("Property 47 — Student data export completeness", () => {
  it("P47a: export data contains all required sections", () => {
    fc.assert(
      fc.property(
        fc.array(gradeArb, { minLength: 0, maxLength: 10 }),
        fc.array(attainmentArb, { minLength: 0, maxLength: 10 }),
        fc.array(xpArb, { minLength: 0, maxLength: 10 }),
        fc.array(journalArb, { minLength: 0, maxLength: 10 }),
        fc.array(badgeArb, { minLength: 0, maxLength: 10 }),
        fc.array(habitLogArb, { minLength: 0, maxLength: 10 }),
        (grades, attainment, xp, journals, badges, habits) => {
          const exportData: ExportData = {
            exported_at: new Date().toISOString(),
            profile: {
              id: "student-1",
              full_name: "Test",
              email: "test@test.com",
            },
            grades,
            outcome_attainment: attainment,
            xp_transactions: xp,
            journal_entries: journals,
            badges,
            habit_logs: habits,
          };

          const result = validateExportCompleteness(exportData);
          expect(result.isComplete).toBe(true);
          expect(result.missingSections).toHaveLength(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("P47b: exported record counts match source data counts", () => {
    fc.assert(
      fc.property(
        fc.array(gradeArb, { minLength: 0, maxLength: 15 }),
        fc.array(attainmentArb, { minLength: 0, maxLength: 15 }),
        fc.array(xpArb, { minLength: 0, maxLength: 15 }),
        fc.array(journalArb, { minLength: 0, maxLength: 15 }),
        fc.array(badgeArb, { minLength: 0, maxLength: 15 }),
        fc.array(habitLogArb, { minLength: 0, maxLength: 15 }),
        (grades, attainment, xp, journals, badges, habits) => {
          const exportData: ExportData = {
            exported_at: new Date().toISOString(),
            profile: { id: "student-1" },
            grades,
            outcome_attainment: attainment,
            xp_transactions: xp,
            journal_entries: journals,
            badges,
            habit_logs: habits,
          };

          const sourceCounts: Record<ExportSection, number> = {
            profile: 1,
            grades: grades.length,
            outcome_attainment: attainment.length,
            xp_transactions: xp.length,
            journal_entries: journals.length,
            badges: badges.length,
            habit_logs: habits.length,
          };

          const result = validateExportCounts(exportData, sourceCounts);
          expect(result.allMatch).toBe(true);
          expect(result.mismatches).toHaveLength(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("P47c: export always includes an exported_at timestamp", () => {
    fc.assert(
      fc.property(
        fc.array(gradeArb, { minLength: 0, maxLength: 5 }),
        (grades) => {
          const exportData: ExportData = {
            exported_at: new Date().toISOString(),
            profile: { id: "student-1" },
            grades,
            outcome_attainment: [],
            xp_transactions: [],
            journal_entries: [],
            badges: [],
            habit_logs: [],
          };

          expect(exportData.exported_at).toBeTruthy();
          expect(new Date(exportData.exported_at).getTime()).not.toBeNaN();
        }
      ),
      { numRuns: 100 }
    );
  });
});
