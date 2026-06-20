// =============================================================================
// Feature: dashboard-and-ux-performance — Phase 6 Fix B / Phase 7 Task 23.
// Parity + correctness test for `aggregateStudentAttendance`, the pure function
// that backs the consolidated `useStudentAttendance` (which replaced a per-course
// 1 + 3×N query fan-out with a fixed set of bounded queries).
//
// These assertions lock in the EXACT semantics of the prior per-course
// implementation so the consolidation cannot silently change a student's numbers.
// =============================================================================
import { describe, it, expect } from "vitest";
import { aggregateStudentAttendance } from "@/hooks/useAttendance";

describe("aggregateStudentAttendance", () => {
  const courses = [
    { courseId: "c1", courseName: "Calculus" },
    { courseId: "c2", courseName: "Physics" },
    { courseId: "c3", courseName: "History" }, // zero-session course
  ];

  // c1: sections s1a, s1b ; c2: section s2a ; c3: no sections
  const sections = [
    { id: "s1a", course_id: "c1" },
    { id: "s1b", course_id: "c1" },
    { id: "s2a", course_id: "c2" },
  ];

  // c1 has 3 sessions (2 in s1a, 1 in s1b); c2 has 2 sessions; c3 has none
  const sessions = [
    { id: "ses1", section_id: "s1a" },
    { id: "ses2", section_id: "s1a" },
    { id: "ses3", section_id: "s1b" },
    { id: "ses4", section_id: "s2a" },
    { id: "ses5", section_id: "s2a" },
  ];

  it("returns one entry per enrolled course, in enrollment order", () => {
    const result = aggregateStudentAttendance(courses, sections, sessions, []);
    expect(result.map((r) => r.courseId)).toEqual(["c1", "c2", "c3"]);
    expect(result.map((r) => r.courseName)).toEqual([
      "Calculus",
      "Physics",
      "History",
    ]);
  });

  it("counts totalSessions across all of a course's sections", () => {
    const result = aggregateStudentAttendance(courses, sections, sessions, []);
    expect(result.find((r) => r.courseId === "c1")?.totalSessions).toBe(3);
    expect(result.find((r) => r.courseId === "c2")?.totalSessions).toBe(2);
  });

  it("counts present and late (but not absent/excused) as attended", () => {
    const records = [
      { status: "present", session_id: "ses1" },
      { status: "late", session_id: "ses2" },
      { status: "absent", session_id: "ses3" },
      { status: "present", session_id: "ses4" },
      { status: "excused", session_id: "ses5" },
    ];
    const result = aggregateStudentAttendance(
      courses,
      sections,
      sessions,
      records
    );
    // c1: present(ses1) + late(ses2) = 2 of 3 → round(2/3*100) = 67
    const c1 = result.find((r) => r.courseId === "c1")!;
    expect(c1.attended).toBe(2);
    expect(c1.attendancePercent).toBe(67);
    // c2: present(ses4) only = 1 of 2 → 50
    const c2 = result.find((r) => r.courseId === "c2")!;
    expect(c2.attended).toBe(1);
    expect(c2.attendancePercent).toBe(50);
  });

  it("renders a zero-session course at 100% / 0 (matches the prior early-return)", () => {
    const result = aggregateStudentAttendance(courses, sections, sessions, []);
    const c3 = result.find((r) => r.courseId === "c3")!;
    expect(c3.totalSessions).toBe(0);
    expect(c3.attended).toBe(0);
    expect(c3.attendancePercent).toBe(100);
  });

  it("ignores attendance records for sessions outside the enrolled courses", () => {
    const records = [
      { status: "present", session_id: "ses1" }, // belongs to c1 → counted
      { status: "present", session_id: "unknown-session" }, // not enrolled → ignored
    ];
    const result = aggregateStudentAttendance(
      courses,
      sections,
      sessions,
      records
    );
    expect(result.find((r) => r.courseId === "c1")?.attended).toBe(1);
    // total attended across all courses must equal only the in-scope record
    expect(result.reduce((sum, r) => sum + r.attended, 0)).toBe(1);
  });

  it("returns an empty array when there are no enrolled courses", () => {
    expect(aggregateStudentAttendance([], sections, sessions, [])).toEqual([]);
  });
});
