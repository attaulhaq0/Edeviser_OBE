// Feature: qa-partner-review-remediation, Property 1 (nudge authorization)
// **Validates: Requirements 1.4, 1.8**
//
// Property 1 (design.md): *For any* set of courses, enrollments, and any
// (teacher, student) pair, a nudge SHALL result in a notification for that
// student IF AND ONLY IF the teacher teaches the student in an active course;
// when the teaching relationship is absent, no notification row SHALL be created.
//
// This test runs against an EXTRACTED PURE MODEL of the teaches-predicate — NOT a
// mocked Supabase client. No pure helper exists in `src/lib/` (searched
// `src/lib/db/` and `src/lib/`), so the model is defined here and mirrors the
// `send_teacher_nudge` SECURITY DEFINER RPC
// (supabase/migrations/20260603200428_create_send_teacher_nudge.sql):
//
//   IF EXISTS (
//     SELECT 1 FROM public.courses c
//     JOIN public.student_courses sc ON sc.course_id = c.id
//     WHERE c.teacher_id = v_teacher
//       AND sc.student_id = p_student_id
//       AND c.is_active = true
//   ) THEN INSERT INTO notifications (user_id = p_student_id, ...)
//   ELSE RAISE EXCEPTION (no row created).
//
// The model below is the System Under Test; the IFF is checked against an
// INDEPENDENT brute-force oracle so neither false positives nor false negatives
// (a missing notification when authorized, or a created notification when not)
// can slip through.

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";

// ── Domain model (mirrors the columns the RPC inspects) ──────────────────────

interface Course {
  id: string;
  teacher_id: string;
  is_active: boolean;
}

interface Enrollment {
  student_id: string;
  course_id: string;
}

interface Roster {
  courses: readonly Course[];
  enrollments: readonly Enrollment[];
}

/** The notification row the RPC would insert (mirrors its INSERT column list). */
interface NotificationRow {
  user_id: string;
  type: string;
  title: string;
  body: string;
  is_read: boolean;
}

// ── System Under Test: pure model of the RPC's teaches-predicate ─────────────
// Set-based implementation: a (teacher, student) pair is authorized iff there is
// a course taught by `teacher`, active, that `student` is enrolled in. This joins
// courses.teacher_id with student_courses (the enrollment table) on course id.

const teacherTeachesStudent = (
  teacherId: string,
  studentId: string,
  roster: Roster
): boolean => {
  // Active course ids taught by this teacher.
  const activeTaughtCourseIds = new Set<string>();
  for (const c of roster.courses) {
    if (c.teacher_id === teacherId && c.is_active) {
      activeTaughtCourseIds.add(c.id);
    }
  }
  if (activeTaughtCourseIds.size === 0) return false;

  // The student must be enrolled in at least one of those active courses.
  for (const e of roster.enrollments) {
    if (e.student_id === studentId && activeTaughtCourseIds.has(e.course_id)) {
      return true;
    }
  }
  return false;
};

/**
 * Pure model of `send_teacher_nudge`: returns the notification rows that would
 * exist after the call. Authorized → exactly one row for the student; otherwise
 * the RPC raises and no row is created → empty array.
 */
const sendTeacherNudgeModel = (
  teacherId: string,
  studentId: string,
  message: string,
  roster: Roster
): NotificationRow[] => {
  if (!teacherTeachesStudent(teacherId, studentId, roster)) {
    return []; // RAISE EXCEPTION '42501' — no notification row created.
  }
  return [
    {
      user_id: studentId,
      type: "nudge",
      title: "Your teacher sent you a nudge",
      body: message,
      is_read: false,
    },
  ];
};

// ── Independent oracle (brute-force existence check, distinct from the SUT) ───

const oracleTeaches = (
  teacherId: string,
  studentId: string,
  roster: Roster
): boolean => {
  for (const c of roster.courses) {
    if (c.teacher_id !== teacherId || !c.is_active) continue;
    for (const e of roster.enrollments) {
      if (e.course_id === c.id && e.student_id === studentId) {
        return true;
      }
    }
  }
  return false;
};

// ── Smart generators ─────────────────────────────────────────────────────────
// Constrain ids to small shared pools so the same teacher/student/course recur
// across courses, enrollments, and the chosen pair — this guarantees BOTH
// authorized and unauthorized cases occur frequently (rather than the trivial
// "no overlap → always unauthorized" space).

const TEACHER_IDS = ["t1", "t2", "t3"] as const;
const STUDENT_IDS = ["s1", "s2", "s3", "s4"] as const;
const COURSE_IDS = ["c1", "c2", "c3"] as const;

const arbCourse: fc.Arbitrary<Course> = fc.record({
  id: fc.constantFrom(...COURSE_IDS),
  teacher_id: fc.constantFrom(...TEACHER_IDS),
  is_active: fc.boolean(),
});

const arbEnrollment: fc.Arbitrary<Enrollment> = fc.record({
  student_id: fc.constantFrom(...STUDENT_IDS),
  course_id: fc.constantFrom(...COURSE_IDS),
});

const arbRoster: fc.Arbitrary<Roster> = fc.record({
  courses: fc.array(arbCourse, { maxLength: 6 }),
  enrollments: fc.array(arbEnrollment, { maxLength: 8 }),
});

const arbScenario = fc.record({
  roster: arbRoster,
  teacherId: fc.constantFrom(...TEACHER_IDS),
  studentId: fc.constantFrom(...STUDENT_IDS),
  message: fc.string(),
});

describe("Property 1 — nudge authorization (extracted pure teaches-predicate model)", () => {
  it("creates a notification IFF the teacher teaches the student in an active course", () => {
    fc.assert(
      fc.property(arbScenario, ({ roster, teacherId, studentId, message }) => {
        const authorized = oracleTeaches(teacherId, studentId, roster);
        const rows = sendTeacherNudgeModel(
          teacherId,
          studentId,
          message,
          roster
        );

        if (authorized) {
          // Exactly one notification, addressed to the student (Req 1.3).
          expect(rows).toHaveLength(1);
          const [row] = rows;
          expect(row).toBeDefined();
          expect(row?.user_id).toBe(studentId);
          expect(row?.body).toBe(message);
        } else {
          // No teaching relationship → no notification row (Req 1.4, 1.8).
          expect(rows).toHaveLength(0);
        }
      }),
      { numRuns: 300 }
    );
  });

  it("never creates a notification when the teaching relationship is absent (Req 1.8)", () => {
    fc.assert(
      fc.property(arbScenario, ({ roster, teacherId, studentId, message }) => {
        fc.pre(!oracleTeaches(teacherId, studentId, roster));
        expect(
          sendTeacherNudgeModel(teacherId, studentId, message, roster)
        ).toHaveLength(0);
      }),
      { numRuns: 200 }
    );
  });

  it("an inactive course never authorizes a nudge, even with a matching enrollment", () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...TEACHER_IDS),
        fc.constantFrom(...STUDENT_IDS),
        fc.constantFrom(...COURSE_IDS),
        fc.string(),
        (teacherId, studentId, courseId, message) => {
          // A course the teacher owns AND the student is enrolled in, but it is
          // INACTIVE → predicate must be false and no row created (mirrors the
          // `c.is_active = true` clause in the RPC).
          const roster: Roster = {
            courses: [
              { id: courseId, teacher_id: teacherId, is_active: false },
            ],
            enrollments: [{ student_id: studentId, course_id: courseId }],
          };
          expect(teacherTeachesStudent(teacherId, studentId, roster)).toBe(
            false
          );
          expect(
            sendTeacherNudgeModel(teacherId, studentId, message, roster)
          ).toHaveLength(0);
        }
      ),
      { numRuns: 100 }
    );
  });
});
