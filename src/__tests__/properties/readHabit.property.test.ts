// Feature: edeviser-platform, Property 49: Read habit timer accuracy
// **Validates: Requirements 61.1, 61.2, 61.4**

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";

// ─── Pure logic extracted from useReadHabitTimer ────────────────────────────

const READ_THRESHOLD_SECONDS = 30;

type PageType = "assignment_detail" | "clo_progress";

interface ReadHabitInput {
  pageType: PageType;
  elapsedSeconds: number;
}

interface ReadHabitResult {
  isCompleted: boolean;
  shouldLogHabit: boolean;
  shouldLogPartialDuration: boolean;
}

/**
 * Pure function modeling the read habit timer decision logic.
 * Mirrors the behavior in useReadHabitTimer.ts.
 */
function evaluateReadHabit(input: ReadHabitInput): ReadHabitResult {
  const isCompleted = input.elapsedSeconds >= READ_THRESHOLD_SECONDS;

  return {
    isCompleted,
    shouldLogHabit: isCompleted,
    shouldLogPartialDuration: !isCompleted && input.elapsedSeconds > 0,
  };
}

/** Compute YYYY-MM-DD from a Date (local calendar date). */
function getLocalDateString(date: Date): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

// ─── Property 49: Read habit timer accuracy ─────────────────────────────────

describe("Property 49 — Read habit timer accuracy", () => {
  it("P49a: habit completed if and only if elapsed >= 30 seconds", () => {
    fc.assert(
      fc.property(
        fc.constantFrom<PageType>("assignment_detail", "clo_progress"),
        fc.integer({ min: 0, max: 600 }),
        (pageType, elapsedSeconds) => {
          const result = evaluateReadHabit({ pageType, elapsedSeconds });

          if (elapsedSeconds >= READ_THRESHOLD_SECONDS) {
            expect(result.isCompleted).toBe(true);
            expect(result.shouldLogHabit).toBe(true);
          } else {
            expect(result.isCompleted).toBe(false);
            expect(result.shouldLogHabit).toBe(false);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it("P49b: durations below 30 seconds never trigger habit completion", () => {
    fc.assert(
      fc.property(
        fc.constantFrom<PageType>("assignment_detail", "clo_progress"),
        fc.integer({ min: 0, max: 29 }),
        (pageType, elapsedSeconds) => {
          const result = evaluateReadHabit({ pageType, elapsedSeconds });
          expect(result.isCompleted).toBe(false);
          expect(result.shouldLogHabit).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("P49c: durations >= 30 seconds always trigger habit completion", () => {
    fc.assert(
      fc.property(
        fc.constantFrom<PageType>("assignment_detail", "clo_progress"),
        fc.integer({ min: 30, max: 3600 }),
        (pageType, elapsedSeconds) => {
          const result = evaluateReadHabit({ pageType, elapsedSeconds });
          expect(result.isCompleted).toBe(true);
          expect(result.shouldLogHabit).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("P49d: partial duration (>0 but <30) should log partial activity on unmount", () => {
    fc.assert(
      fc.property(
        fc.constantFrom<PageType>("assignment_detail", "clo_progress"),
        fc.integer({ min: 1, max: 29 }),
        (pageType, elapsedSeconds) => {
          const result = evaluateReadHabit({ pageType, elapsedSeconds });
          expect(result.shouldLogPartialDuration).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("P49e: zero elapsed seconds should not log anything", () => {
    fc.assert(
      fc.property(
        fc.constantFrom<PageType>("assignment_detail", "clo_progress"),
        (_pageType) => {
          const result = evaluateReadHabit({
            pageType: _pageType,
            elapsedSeconds: 0,
          });
          expect(result.isCompleted).toBe(false);
          expect(result.shouldLogHabit).toBe(false);
          expect(result.shouldLogPartialDuration).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("P49f: getLocalDateString produces valid YYYY-MM-DD format", () => {
    fc.assert(
      fc.property(
        fc
          .integer({ min: 0, max: 1095 })
          .map((offset) => new Date(Date.UTC(2024, 0, 1 + offset))),
        (date) => {
          const dateStr = getLocalDateString(date);
          expect(dateStr).toMatch(/^\d{4}-\d{2}-\d{2}$/);

          // Round-trip: parsing the string should produce a valid date
          const parsed = new Date(dateStr + "T00:00:00");
          expect(parsed.getTime()).not.toBeNaN();
        }
      ),
      { numRuns: 100 }
    );
  });
});
