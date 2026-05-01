// =============================================================================
// Property Tests — Review Schedule (P23, P24, P25)
// Feature: weekly-planner-today-view, Properties 23, 24, 25
// =============================================================================

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { generateReviewDates, isReviewCycleComplete } from "@/lib/plannerUtils";

describe("Property 23: Review date generation", () => {
  it("always generates exactly 3 review dates at intervals 1, 3, 7", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 2020, max: 2030 }),
        fc.integer({ min: 1, max: 12 }),
        fc.integer({ min: 1, max: 28 }),
        (year, month, day) => {
          const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(
            day
          ).padStart(2, "0")}`;
          const reviews = generateReviewDates(dateStr);

          expect(reviews).toHaveLength(3);
          expect(reviews.map((r) => r.intervalDays)).toEqual([1, 3, 7]);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("review dates are strictly increasing", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 2020, max: 2030 }),
        fc.integer({ min: 1, max: 12 }),
        fc.integer({ min: 1, max: 28 }),
        (year, month, day) => {
          const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(
            day
          ).padStart(2, "0")}`;
          const reviews = generateReviewDates(dateStr);

          for (let i = 1; i < reviews.length; i++) {
            expect(new Date(reviews[i]!.reviewDate).getTime()).toBeGreaterThan(
              new Date(reviews[i - 1]!.reviewDate).getTime()
            );
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it("all review dates are after the source date", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 2020, max: 2030 }),
        fc.integer({ min: 1, max: 12 }),
        fc.integer({ min: 1, max: 28 }),
        (year, month, day) => {
          const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(
            day
          ).padStart(2, "0")}`;
          const sourceDate = new Date(dateStr);
          const reviews = generateReviewDates(dateStr);

          for (const review of reviews) {
            expect(new Date(review.reviewDate).getTime()).toBeGreaterThan(
              sourceDate.getTime()
            );
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe("Property 24: Review deduplication", () => {
  it("generating reviews for the same date produces identical results", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 2020, max: 2030 }),
        fc.integer({ min: 1, max: 12 }),
        fc.integer({ min: 1, max: 28 }),
        (year, month, day) => {
          const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(
            day
          ).padStart(2, "0")}`;
          const first = generateReviewDates(dateStr);
          const second = generateReviewDates(dateStr);

          expect(first).toEqual(second);
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe("Property 25: Review cycle completion", () => {
  it("cycle is complete when all 3 intervals are completed", () => {
    fc.assert(
      fc.property(
        fc.shuffledSubarray(
          [
            { intervalDays: 1, status: "completed" },
            { intervalDays: 3, status: "completed" },
            { intervalDays: 7, status: "completed" },
          ],
          { minLength: 3, maxLength: 3 }
        ),
        (reviews) => {
          expect(isReviewCycleComplete(reviews)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("cycle is NOT complete when any interval is pending", () => {
    const statuses = ["pending", "skipped"] as const;

    fc.assert(
      fc.property(
        fc.constantFrom(1, 3, 7),
        fc.constantFrom(...statuses),
        (incompleteInterval, incompleteStatus) => {
          const reviews = [1, 3, 7].map((interval) => ({
            intervalDays: interval,
            status:
              interval === incompleteInterval ? incompleteStatus : "completed",
          }));
          expect(isReviewCycleComplete(reviews)).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("empty reviews array returns false", () => {
    expect(isReviewCycleComplete([])).toBe(false);
  });
});
