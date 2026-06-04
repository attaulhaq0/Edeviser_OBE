// Feature: qa-partner-review-remediation, Property 5 (announcement fan-out)
// **Validates: Requirements 15.1, 15.2, 15.5**
//
// Property 5 (design.md): *For any* course roster (including rosters where the
// author is also enrolled, with duplicates, or empty), the set of announcement
// notification recipients SHALL equal the set of distinct actively-enrolled
// students minus the author, and SHALL never include the author.
//
// This test runs against an EXTRACTED PURE MODEL of the fan-out recipient
// computation — NOT a mocked Supabase client. The fan-out logic lives in the
// `fan_out_announcement_notifications` SECURITY DEFINER RPC
// (supabase/migrations/20260603225113_create_fan_out_announcement_notifications.sql):
//
//   INSERT INTO public.notifications (user_id, ...)
//   SELECT sc.student_id, 'announcement', ...
//   FROM public.student_courses sc
//   WHERE sc.course_id = v_course
//     AND sc.student_id <> v_author      -- excludes the author
//     AND sc.status = 'active';          -- only active enrollments
//
// Because Postgres INSERT...SELECT emits one row per matching enrollment row,
// duplicate active enrollments would each produce a notification at the DB
// level; the meaningful contract (Req 15.5) is the *recipient set*: the set of
// distinct user_ids that receive a notification. The model below computes that
// recipient set and is checked against an INDEPENDENT oracle so neither a
// missing recipient (an active student not notified) nor a forbidden recipient
// (the author, or an inactive student) can slip through.

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";

// ── Domain model (mirrors the columns the RPC inspects) ──────────────────────

interface Enrollment {
  student_id: string;
  /** mirrors `sc.status = 'active'` — true iff the enrollment is active. */
  active: boolean;
}

// ── System Under Test: pure model of the RPC's recipient computation ─────────
// Recipients = distinct student_ids of active enrollments, excluding the author.

const fanOutRecipients = (
  enrollments: readonly Enrollment[],
  authorId: string
): Set<string> => {
  const recipients = new Set<string>();
  for (const e of enrollments) {
    if (e.active && e.student_id !== authorId) {
      recipients.add(e.student_id);
    }
  }
  return recipients;
};

// ── Independent oracle (distinct construction from the SUT) ──────────────────
// Build the set of active student ids first, then remove the author. This uses
// a different code path (filter → map → Set → delete) than the SUT's single
// guarded loop, so the two agreeing is meaningful evidence of correctness.

const oracleRecipients = (
  enrollments: readonly Enrollment[],
  authorId: string
): Set<string> => {
  const activeStudentIds = enrollments
    .filter((e) => e.active)
    .map((e) => e.student_id);
  const set = new Set<string>(activeStudentIds);
  set.delete(authorId);
  return set;
};

// ── Smart generators ─────────────────────────────────────────────────────────
// Draw student_ids and author_id from a small shared pool so the author
// FREQUENTLY appears in the roster (exercising the must-exclude-author case).
// `active` is biased to a true/false mix so inactive enrollments occur often.
// maxLength includes 0 so the empty roster (recipients = empty set) is covered.

const ID_POOL = ["u1", "u2", "u3", "u4", "u5"] as const;

const arbEnrollment: fc.Arbitrary<Enrollment> = fc.record({
  student_id: fc.constantFrom(...ID_POOL),
  active: fc.boolean(),
});

const arbScenario = fc.record({
  // Allow duplicates (default array behavior) and the empty roster (minLength 0).
  enrollments: fc.array(arbEnrollment, { minLength: 0, maxLength: 12 }),
  authorId: fc.constantFrom(...ID_POOL),
});

const sortedArray = (s: Set<string>): string[] => [...s].sort();

describe("Property 5 — announcement fan-out recipients (extracted pure model)", () => {
  it("recipients equal the active-students-minus-author oracle set exactly (Req 15.1, 15.5)", () => {
    fc.assert(
      fc.property(arbScenario, ({ enrollments, authorId }) => {
        const recipients = fanOutRecipients(enrollments, authorId);
        const oracle = oracleRecipients(enrollments, authorId);
        // (a) Exact set equality against the independent oracle.
        expect(sortedArray(recipients)).toEqual(sortedArray(oracle));
      }),
      { numRuns: 300 }
    );
  });

  it("recipients never include the author (Req 15.2)", () => {
    fc.assert(
      fc.property(arbScenario, ({ enrollments, authorId }) => {
        const recipients = fanOutRecipients(enrollments, authorId);
        // (b) The author is never a recipient, even when enrolled (incl. active).
        expect(recipients.has(authorId)).toBe(false);
      }),
      { numRuns: 300 }
    );
  });

  it("recipients are distinct — duplicate active enrollments dedupe to one (Req 15.5)", () => {
    fc.assert(
      fc.property(arbScenario, ({ enrollments, authorId }) => {
        const recipients = fanOutRecipients(enrollments, authorId);
        // (c) A Set has no duplicates by construction; assert the recipient
        // count never exceeds the number of distinct non-author active ids.
        const distinctActiveNonAuthor = new Set(
          enrollments
            .filter((e) => e.active && e.student_id !== authorId)
            .map((e) => e.student_id)
        );
        expect(recipients.size).toBe(distinctActiveNonAuthor.size);
      }),
      { numRuns: 200 }
    );
  });

  it("inactive students are absent from recipients (Req 15.5)", () => {
    fc.assert(
      fc.property(arbScenario, ({ enrollments, authorId }) => {
        const recipients = fanOutRecipients(enrollments, authorId);
        // (d) Any student id that is ONLY ever enrolled inactively must not be a
        // recipient. (An id that is also active elsewhere may legitimately be in.)
        const everActive = new Set(
          enrollments.filter((e) => e.active).map((e) => e.student_id)
        );
        for (const e of enrollments) {
          if (!e.active && !everActive.has(e.student_id)) {
            expect(recipients.has(e.student_id)).toBe(false);
          }
        }
      }),
      { numRuns: 200 }
    );
  });

  it("the empty roster yields an empty recipient set (Req 15.5)", () => {
    expect(fanOutRecipients([], "u1").size).toBe(0);
  });

  it("an author enrolled actively is still excluded (Req 15.2)", () => {
    fc.assert(
      fc.property(fc.constantFrom(...ID_POOL), (authorId) => {
        const recipients = fanOutRecipients(
          [{ student_id: authorId, active: true }],
          authorId
        );
        expect(recipients.size).toBe(0);
      }),
      { numRuns: 100 }
    );
  });
});
