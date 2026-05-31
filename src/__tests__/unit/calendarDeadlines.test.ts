// =============================================================================
// Unit + property tests — calendarDeadlines (Task 23.3)
// Requirements: 21.1, 21.2, 21.4
// =============================================================================

import { describe, it, expect } from "vitest";
import fc from "fast-check";
import {
  normalizeDeadlineDay,
  normalizeDeadlineTitle,
  deadlineIdentityKey,
  dedupeCalendarEvents,
  type DeduplicableDeadline,
} from "@/lib/calendarDeadlines";

// ─── normalizeDeadlineDay ────────────────────────────────────────────────────

describe("normalizeDeadlineDay", () => {
  it("returns the date portion of an ISO date-time", () => {
    expect(normalizeDeadlineDay("2025-06-18T14:30:00Z")).toBe("2025-06-18");
  });

  it("returns a bare date unchanged", () => {
    expect(normalizeDeadlineDay("2025-06-18")).toBe("2025-06-18");
  });

  it("trims surrounding whitespace", () => {
    expect(normalizeDeadlineDay("  2025-06-18T09:00  ")).toBe("2025-06-18");
  });

  it("collapses null/undefined/empty to an empty string", () => {
    expect(normalizeDeadlineDay(null)).toBe("");
    expect(normalizeDeadlineDay(undefined)).toBe("");
    expect(normalizeDeadlineDay("")).toBe("");
    expect(normalizeDeadlineDay("   ")).toBe("");
  });
});

// ─── normalizeDeadlineTitle ──────────────────────────────────────────────────

describe("normalizeDeadlineTitle", () => {
  it("lower-cases and collapses internal whitespace", () => {
    expect(normalizeDeadlineTitle("Essay  1")).toBe("essay 1");
    expect(normalizeDeadlineTitle("  FINAL Exam ")).toBe("final exam");
  });

  it("collapses null/undefined to an empty string", () => {
    expect(normalizeDeadlineTitle(null)).toBe("");
    expect(normalizeDeadlineTitle(undefined)).toBe("");
  });
});

// ─── deadlineIdentityKey ─────────────────────────────────────────────────────

describe("deadlineIdentityKey", () => {
  it("treats same day + course + title as equal regardless of time-of-day", () => {
    const a: DeduplicableDeadline = {
      id: "1",
      title: "Essay 1",
      date: "2025-06-18T23:59:00Z",
      course_id: "c1",
    };
    const b: DeduplicableDeadline = {
      id: "2",
      title: "essay  1",
      date: "2025-06-18T08:00:00Z",
      course_id: "c1",
    };
    expect(deadlineIdentityKey(a)).toBe(deadlineIdentityKey(b));
  });

  it("distinguishes deadlines in different courses", () => {
    const a: DeduplicableDeadline = {
      id: "1",
      title: "Quiz",
      date: "2025-06-18",
      course_id: "c1",
    };
    const b: DeduplicableDeadline = {
      id: "2",
      title: "Quiz",
      date: "2025-06-18",
      course_id: "c2",
    };
    expect(deadlineIdentityKey(a)).not.toBe(deadlineIdentityKey(b));
  });

  it("distinguishes deadlines on different days", () => {
    const a: DeduplicableDeadline = {
      id: "1",
      title: "Quiz",
      date: "2025-06-18",
    };
    const b: DeduplicableDeadline = {
      id: "2",
      title: "Quiz",
      date: "2025-06-19",
    };
    expect(deadlineIdentityKey(a)).not.toBe(deadlineIdentityKey(b));
  });

  it("falls back to the source id when there is no day or title", () => {
    const a: DeduplicableDeadline = { id: "abc", title: "", date: "" };
    expect(deadlineIdentityKey(a)).toBe("id:abc");
  });
});

// ─── dedupeCalendarEvents ────────────────────────────────────────────────────

describe("dedupeCalendarEvents", () => {
  it("removes a deadline that appears from two sources (R21.4)", () => {
    const events: DeduplicableDeadline[] = [
      {
        id: "assignment-1",
        title: "Project",
        date: "2025-06-18T17:00:00Z",
        course_id: "c1",
      },
      {
        id: "quiz-9",
        title: "Project",
        date: "2025-06-18T09:00:00Z",
        course_id: "c1",
      },
    ];
    const result = dedupeCalendarEvents(events);
    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe("assignment-1"); // first-occurrence wins
  });

  it("keeps genuinely distinct deadlines", () => {
    const events: DeduplicableDeadline[] = [
      { id: "1", title: "A", date: "2025-06-18", course_id: "c1" },
      { id: "2", title: "B", date: "2025-06-18", course_id: "c1" },
      { id: "3", title: "A", date: "2025-06-19", course_id: "c1" },
    ];
    expect(dedupeCalendarEvents(events)).toHaveLength(3);
  });

  it("preserves input order", () => {
    const events: DeduplicableDeadline[] = [
      { id: "3", title: "C", date: "2025-06-20" },
      { id: "1", title: "A", date: "2025-06-18" },
      { id: "2", title: "B", date: "2025-06-19" },
    ];
    expect(dedupeCalendarEvents(events).map((e) => e.id)).toEqual([
      "3",
      "1",
      "2",
    ]);
  });

  it("returns an empty array for empty input", () => {
    expect(dedupeCalendarEvents([])).toEqual([]);
  });

  // ─── Property: dedup is a subset, has unique keys, and is idempotent ───────
  const arbDeadline = fc.record({
    id: fc.string({ minLength: 1, maxLength: 6 }),
    title: fc.option(fc.string({ maxLength: 8 }), { nil: undefined }),
    date: fc.option(
      fc.constantFrom("2025-06-18", "2025-06-19", "2025-06-18T10:00:00Z", ""),
      { nil: undefined }
    ),
    course_id: fc.option(fc.constantFrom("c1", "c2"), { nil: undefined }),
  });

  it("produces a subset with unique identity keys (property)", () => {
    fc.assert(
      fc.property(fc.array(arbDeadline, { maxLength: 30 }), (events) => {
        const result = dedupeCalendarEvents(events);
        // subset: every result element is from the input
        expect(result.every((r) => events.includes(r))).toBe(true);
        // result length never exceeds input
        expect(result.length).toBeLessThanOrEqual(events.length);
        // all identity keys are unique
        const keys = result.map(deadlineIdentityKey);
        expect(new Set(keys).size).toBe(keys.length);
      }),
      { numRuns: 200 }
    );
  });

  it("is idempotent (property)", () => {
    fc.assert(
      fc.property(fc.array(arbDeadline, { maxLength: 30 }), (events) => {
        const once = dedupeCalendarEvents(events);
        const twice = dedupeCalendarEvents(once);
        expect(twice).toEqual(once);
      }),
      { numRuns: 200 }
    );
  });
});
