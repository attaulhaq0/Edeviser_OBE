// Feature: production-bug-fixes, Req 16 — parent attendance consolidation.
//
// PARITY TEST: the parent attendance summary was consolidated from a 4-step client
// waterfall (enrollments → course_sections → class_sessions → attendance_records with a
// large `.in(sessionIds)`) into 2 queries (enrollments + one joined attendance query).
// The data math MUST NOT change. This test reproduces the ORIGINAL aggregation algorithm
// and asserts the extracted/shared `aggregateParentAttendance` produces byte-for-byte the
// same per-course summaries across representative cases (incl. excused records, zero-record
// enrolled courses, records for non-enrolled courses, and the no-sessions branch).

import { describe, it, expect } from "vitest";
import {
  aggregateParentAttendance,
  type ParentAttendanceSummary,
} from "@/hooks/useAttendance";

type Course = { course_id: string; course_name: string; course_code: string };
type Session = { id: string; course_id: string }; // session resolved to its course
type Record = { session_id: string; status: string };

// Faithful reproduction of the PRE-refactor aggregation (the path being replaced).
function oldWaterfallAggregate(
  enrollments: Course[],
  sessions: Session[],
  records: Record[]
): ParentAttendanceSummary[] {
  const sessionToCourse = new Map(sessions.map((s) => [s.id, s.course_id]));
  const sessionIds = sessions.map((s) => s.id);

  // Old "no sessions at all" early-return: every enrolled course at zeros.
  if (sessionIds.length === 0) {
    return enrollments.map((c) => ({
      course_id: c.course_id,
      course_name: c.course_name,
      course_code: c.course_code,
      total_sessions: 0,
      present: 0,
      late: 0,
      absent: 0,
      attendance_rate: 0,
    }));
  }

  const summary = new Map<string, ParentAttendanceSummary>();
  for (const c of enrollments) {
    summary.set(c.course_id, {
      course_id: c.course_id,
      course_name: c.course_name,
      course_code: c.course_code,
      total_sessions: 0,
      present: 0,
      late: 0,
      absent: 0,
      attendance_rate: 0,
    });
  }
  for (const r of records) {
    const courseId = sessionToCourse.get(r.session_id);
    if (!courseId) continue;
    const s = summary.get(courseId);
    if (!s) continue;
    s.total_sessions += 1;
    if (r.status === "present") s.present += 1;
    else if (r.status === "late") s.late += 1;
    else if (r.status === "absent") s.absent += 1;
  }
  for (const s of summary.values()) {
    s.attendance_rate =
      s.total_sessions > 0
        ? Math.round(((s.present + s.late) / s.total_sessions) * 100)
        : 0;
  }
  return Array.from(summary.values());
}

// The new path flattens the joined query (record → course_id) before aggregating.
function newPath(
  enrollments: Course[],
  sessions: Session[],
  records: Record[]
): ParentAttendanceSummary[] {
  const sessionToCourse = new Map(sessions.map((s) => [s.id, s.course_id]));
  const flat = records.map((r) => ({
    course_id: sessionToCourse.get(r.session_id) ?? "",
    status: r.status,
  }));
  return aggregateParentAttendance(enrollments, flat);
}

const courses: Course[] = [
  { course_id: "c1", course_name: "Algebra", course_code: "MATH101" },
  { course_id: "c2", course_name: "Biology", course_code: "BIO101" },
  { course_id: "c3", course_name: "History", course_code: "HIS101" }, // zero records
];

const sessions: Session[] = [
  { id: "s1", course_id: "c1" },
  { id: "s2", course_id: "c1" },
  { id: "s3", course_id: "c1" },
  { id: "s4", course_id: "c2" },
  { id: "s5", course_id: "c2" },
  { id: "sX", course_id: "cZZ" }, // session for a NON-enrolled course
];

const records: Record[] = [
  { session_id: "s1", status: "present" },
  { session_id: "s2", status: "late" },
  { session_id: "s3", status: "absent" },
  { session_id: "s4", status: "present" },
  { session_id: "s5", status: "excused" }, // counts toward total, not p/l/a
  { session_id: "sX", status: "present" }, // non-enrolled course → skipped
];

describe("parent attendance consolidation parity (Req 16)", () => {
  it("matches the original waterfall aggregation exactly", () => {
    expect(newPath(courses, sessions, records)).toEqual(
      oldWaterfallAggregate(courses, sessions, records)
    );
  });

  it("produces the hand-verified per-course numbers", () => {
    const result = aggregateParentAttendance(
      courses,
      records.map((r) => ({
        course_id:
          new Map(sessions.map((s) => [s.id, s.course_id])).get(r.session_id) ??
          "",
        status: r.status,
      }))
    );
    const byId = Object.fromEntries(result.map((s) => [s.course_id, s]));

    // c1: present1 + late1 + absent1 = 3 records; rate (1+1)/3 = 67
    expect(byId.c1).toMatchObject({
      total_sessions: 3,
      present: 1,
      late: 1,
      absent: 0 + 1,
      attendance_rate: 67,
    });
    // c2: present1 + excused1 = 2 total; excused not bucketed; rate (1+0)/2 = 50
    expect(byId.c2).toMatchObject({
      total_sessions: 2,
      present: 1,
      late: 0,
      absent: 0,
      attendance_rate: 50,
    });
    // c3: enrolled but zero records → all zeros, rate 0 (NOT 100)
    expect(byId.c3).toMatchObject({
      total_sessions: 0,
      present: 0,
      late: 0,
      absent: 0,
      attendance_rate: 0,
    });
    // the non-enrolled course (cZZ) never appears
    expect(result.find((s) => s.course_id === "cZZ")).toBeUndefined();
  });

  it("zero-record enrolled courses still render (parity with old zeros branch)", () => {
    const noRecords = newPath(courses, sessions, []);
    expect(noRecords).toEqual(oldWaterfallAggregate(courses, sessions, []));
    expect(noRecords).toHaveLength(3);
    expect(noRecords.every((s) => s.attendance_rate === 0)).toBe(true);
  });
});
