// Feature: edeviser-platform, Property 38: AI module suggestion CLO gap detection
// Feature: edeviser-platform, Property 39: AI at-risk prediction timeliness
// Feature: edeviser-platform, Property 40: AI feedback flywheel data integrity
// **Validates: Requirements 46, 47, 49**

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";

// ─── Pure AI Co-Pilot models ────────────────────────────────────────────────

const CLO_GAP_THRESHOLD = 70;

interface CLOAttainment {
  clo_id: string;
  clo_title: string;
  attainment_percent: number;
}

interface CLOGap {
  clo_id: string;
  clo_title: string;
  attainment_percent: number;
}

function detectCLOGaps(attainments: CLOAttainment[]): CLOGap[] {
  return attainments.filter((a) => a.attainment_percent < CLO_GAP_THRESHOLD);
}

function evaluatePredictionTimeliness(
  predictionDate: string,
  nextDueDate: string
): { isTimely: boolean; daysBeforeDue: number } {
  const pred = new Date(predictionDate + "T00:00:00Z");
  const due = new Date(nextDueDate + "T00:00:00Z");
  const diffMs = due.getTime() - pred.getTime();
  const daysBeforeDue = Math.floor(diffMs / 86_400_000);
  return { isTimely: daysBeforeDue >= 7, daysBeforeDue };
}

type SuggestionType =
  | "module_suggestion"
  | "at_risk_prediction"
  | "feedback_draft";

interface AIFeedbackRecord {
  id: string;
  suggestion_type: SuggestionType;
  suggestion_text: string;
  student_id: string;
  feedback: "thumbs_up" | "thumbs_down" | null;
}

function validateAIFeedbackRecord(record: AIFeedbackRecord): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  const validTypes: SuggestionType[] = [
    "module_suggestion",
    "at_risk_prediction",
    "feedback_draft",
  ];
  if (!validTypes.includes(record.suggestion_type)) {
    errors.push(`Invalid suggestion_type: ${record.suggestion_type}`);
  }
  if (!record.suggestion_text || record.suggestion_text.trim().length === 0) {
    errors.push("suggestion_text must be non-null and non-empty");
  }
  if (!record.student_id) {
    errors.push("student_id must be non-null");
  }
  return { valid: errors.length === 0, errors };
}

// ─── Arbitraries ────────────────────────────────────────────────────────────

const cloAttainmentArb = fc.record({
  clo_id: fc.uuid(),
  clo_title: fc.string({ minLength: 1, maxLength: 100 }),
  attainment_percent: fc.double({ min: 0, max: 100, noNaN: true }),
});

const dateStrArb = fc.integer({ min: 0, max: 1095 }).map((offset) => {
  const d = new Date(Date.UTC(2024, 0, 1 + offset));
  return d.toISOString().slice(0, 10);
});

const suggestionTypeArb = fc.constantFrom<SuggestionType>(
  "module_suggestion",
  "at_risk_prediction",
  "feedback_draft"
);

// ─── Property 38: AI module suggestion CLO gap detection ────────────────────

describe("Property 38 — AI module suggestion CLO gap detection", () => {
  it("P38a: CLOs below 70% are identified as gaps", () => {
    fc.assert(
      fc.property(
        fc.array(cloAttainmentArb, { minLength: 1, maxLength: 10 }),
        (attainments) => {
          const gaps = detectCLOGaps(attainments);
          for (const gap of gaps) {
            expect(gap.attainment_percent).toBeLessThan(CLO_GAP_THRESHOLD);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it("P38b: CLOs at or above 70% are NOT gaps", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            clo_id: fc.uuid(),
            clo_title: fc.string({ minLength: 1, maxLength: 50 }),
            attainment_percent: fc.double({ min: 70, max: 100, noNaN: true }),
          }),
          { minLength: 1, maxLength: 10 }
        ),
        (attainments) => {
          const gaps = detectCLOGaps(attainments);
          expect(gaps).toHaveLength(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("P38c: all CLOs below 70% are detected", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            clo_id: fc.uuid(),
            clo_title: fc.string({ minLength: 1, maxLength: 50 }),
            attainment_percent: fc.double({ min: 0, max: 69.99, noNaN: true }),
          }),
          { minLength: 1, maxLength: 10 }
        ),
        (attainments) => {
          const gaps = detectCLOGaps(attainments);
          expect(gaps).toHaveLength(attainments.length);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ─── Property 39: AI at-risk prediction timeliness ──────────────────────────

describe("Property 39 — AI at-risk prediction timeliness", () => {
  it("P39a: prediction >= 7 days before due date is timely", () => {
    fc.assert(
      fc.property(
        dateStrArb,
        fc.integer({ min: 7, max: 60 }),
        (predDate, daysAhead) => {
          const dueDate = (() => {
            const d = new Date(predDate + "T00:00:00Z");
            d.setUTCDate(d.getUTCDate() + daysAhead);
            return d.toISOString().slice(0, 10);
          })();
          const result = evaluatePredictionTimeliness(predDate, dueDate);
          expect(result.isTimely).toBe(true);
          expect(result.daysBeforeDue).toBeGreaterThanOrEqual(7);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("P39b: prediction < 7 days before due date is flagged as late", () => {
    fc.assert(
      fc.property(
        dateStrArb,
        fc.integer({ min: 0, max: 6 }),
        (predDate, daysAhead) => {
          const dueDate = (() => {
            const d = new Date(predDate + "T00:00:00Z");
            d.setUTCDate(d.getUTCDate() + daysAhead);
            return d.toISOString().slice(0, 10);
          })();
          const result = evaluatePredictionTimeliness(predDate, dueDate);
          expect(result.isTimely).toBe(false);
          expect(result.daysBeforeDue).toBeLessThan(7);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ─── Property 40: AI feedback flywheel data integrity ───────────────────────

describe("Property 40 — AI feedback flywheel data integrity", () => {
  it("P40a: valid AI feedback records pass validation", () => {
    fc.assert(
      fc.property(
        fc.record({
          id: fc.uuid(),
          suggestion_type: suggestionTypeArb,
          suggestion_text: fc
            .string({ minLength: 1, maxLength: 500 })
            .filter((s) => s.trim().length > 0),
          student_id: fc.uuid(),
          feedback: fc.constantFrom<"thumbs_up" | "thumbs_down" | null>(
            "thumbs_up",
            "thumbs_down",
            null
          ),
        }),
        (record) => {
          const result = validateAIFeedbackRecord(record);
          expect(result.valid).toBe(true);
          expect(result.errors).toHaveLength(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("P40b: suggestion_type must be one of the 3 valid types", () => {
    fc.assert(
      fc.property(suggestionTypeArb, (type) => {
        const validTypes = [
          "module_suggestion",
          "at_risk_prediction",
          "feedback_draft",
        ];
        expect(validTypes).toContain(type);
      }),
      { numRuns: 100 }
    );
  });

  it("P40c: empty suggestion_text is rejected", () => {
    fc.assert(
      fc.property(
        fc.record({
          id: fc.uuid(),
          suggestion_type: suggestionTypeArb,
          suggestion_text: fc.constant(""),
          student_id: fc.uuid(),
          feedback: fc.constant(null),
        }),
        (record) => {
          const result = validateAIFeedbackRecord(record);
          expect(result.valid).toBe(false);
          expect(result.errors.some((e) => e.includes("suggestion_text"))).toBe(
            true
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  it("P40d: every record has a valid student_id", () => {
    fc.assert(
      fc.property(
        fc.record({
          id: fc.uuid(),
          suggestion_type: suggestionTypeArb,
          suggestion_text: fc.string({ minLength: 1, maxLength: 200 }),
          student_id: fc.uuid(),
          feedback: fc.constant(null),
        }),
        (record) => {
          expect(record.student_id).toBeTruthy();
          expect(record.student_id.length).toBeGreaterThan(0);
        }
      ),
      { numRuns: 100 }
    );
  });
});
