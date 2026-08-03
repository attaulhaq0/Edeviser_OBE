import { describe, it, expect } from "vitest";
import {
  buildParentAttendanceOverview,
  type RawAttendanceRecordItem,
} from "@/hooks/useAttendance";

describe("buildParentAttendanceOverview — Canonical Formula & Calculation Verification", () => {
  it("correctly calculates attendance metrics for the Section 13 primary fixture (115 Present, 1 Late, 4 Absent -> 97%)", () => {
    const child = { id: "student-1", name: "Aarav" };
    const courses = [
      { courseId: "math-6", code: "MATH6", name: "Mathematics 6" },
      { courseId: "eng-7", code: "ENG7", name: "English 7" },
      { courseId: "soc-7", code: "SOC7", name: "Social Studies 7" },
      { courseId: "sci-8", code: "SCI8", name: "Science 8" },
    ];

    const records: RawAttendanceRecordItem[] = [];

    // Math 6: 26 present, 1 late, 3 absent (30 total)
    for (let i = 0; i < 26; i++) {
      records.push({
        id: `m-p-${i}`,
        session_id: `m-sess-${i}`,
        status: "present",
        created_at: "2026-04-10T08:00:00Z",
        class_sessions: {
          id: `m-sess-${i}`,
          session_date: "2026-04-10",
          session_type: "lecture",
          course_sections: {
            id: "sec-m",
            course_id: "math-6",
            courses: { id: "math-6", code: "MATH6", name: "Mathematics 6" },
          },
        },
      });
    }
    records.push({
      id: "m-l-1",
      session_id: "m-sess-late",
      status: "late",
      created_at: "2026-04-11T08:00:00Z",
      class_sessions: {
        id: "m-sess-late",
        session_date: "2026-04-11",
        session_type: "lecture",
        course_sections: {
          id: "sec-m",
          course_id: "math-6",
          courses: { id: "math-6", code: "MATH6", name: "Mathematics 6" },
        },
      },
    });
    for (let i = 0; i < 3; i++) {
      records.push({
        id: `m-a-${i}`,
        session_id: `m-sess-abs-${i}`,
        status: "absent",
        created_at: "2026-04-12T08:00:00Z",
        class_sessions: {
          id: `m-sess-abs-${i}`,
          session_date: "2026-04-12",
          session_type: "lecture",
          course_sections: {
            id: "sec-m",
            course_id: "math-6",
            courses: { id: "math-6", code: "MATH6", name: "Mathematics 6" },
          },
        },
      });
    }

    // English 7: 30 present (30 total)
    for (let i = 0; i < 30; i++) {
      records.push({
        id: `e-p-${i}`,
        session_id: `e-sess-${i}`,
        status: "present",
        created_at: "2026-04-15T08:00:00Z",
        class_sessions: {
          id: `e-sess-${i}`,
          session_date: "2026-04-15",
          session_type: "lecture",
          course_sections: {
            id: "sec-e",
            course_id: "eng-7",
            courses: { id: "eng-7", code: "ENG7", name: "English 7" },
          },
        },
      });
    }

    // Social Studies 7: 30 present (30 total)
    for (let i = 0; i < 30; i++) {
      records.push({
        id: `soc-p-${i}`,
        session_id: `soc-sess-${i}`,
        status: "present",
        created_at: "2026-04-18T08:00:00Z",
        class_sessions: {
          id: `soc-sess-${i}`,
          session_date: "2026-04-18",
          session_type: "lecture",
          course_sections: {
            id: "sec-soc",
            course_id: "soc-7",
            courses: { id: "soc-7", code: "SOC7", name: "Social Studies 7" },
          },
        },
      });
    }

    // Science 8: 29 present, 1 absent (30 total)
    for (let i = 0; i < 29; i++) {
      records.push({
        id: `sci-p-${i}`,
        session_id: `sci-sess-${i}`,
        status: "present",
        created_at: "2026-04-20T08:00:00Z",
        class_sessions: {
          id: `sci-sess-${i}`,
          session_date: "2026-04-20",
          session_type: "lab",
          course_sections: {
            id: "sec-sci",
            course_id: "sci-8",
            courses: { id: "sci-8", code: "SCI8", name: "Science 8" },
          },
        },
      });
    }
    records.push({
      id: "sci-a-1",
      session_id: "sci-sess-abs-1",
      status: "absent",
      created_at: "2026-04-21T08:00:00Z",
      class_sessions: {
        id: "sci-sess-abs-1",
        session_date: "2026-04-21",
        session_type: "lab",
        course_sections: {
          id: "sec-sci",
          course_id: "sci-8",
          courses: { id: "sci-8", code: "SCI8", name: "Science 8" },
        },
      },
    });

    const overview = buildParentAttendanceOverview(child, courses, records);

    // Verify overall totals
    expect(overview.totals.totalSessions).toBe(120);
    expect(overview.totals.present).toBe(115);
    expect(overview.totals.late).toBe(1);
    expect(overview.totals.absent).toBe(4);
    expect(overview.totals.attended).toBe(116);

    // Formula: (115 + 1) / 120 * 100 = 96.666... -> 97%
    expect(overview.totals.attendanceRate).toBe(97);

    // Mathematics course-level metrics
    const math = overview.courses.find((c) => c.courseId === "math-6");
    expect(math).toBeDefined();
    expect(math?.totalSessions).toBe(30);
    expect(math?.present).toBe(26);
    expect(math?.late).toBe(1);
    expect(math?.absent).toBe(3);
    // Formula: (26 + 1) / 30 * 100 = 90%
    expect(math?.attendanceRate).toBe(90);

    // Verify Attention card targets Mathematics 6 (3 of 4 missed sessions)
    expect(overview.attention).toBeDefined();
    expect(overview.attention?.courseId).toBe("math-6");
    expect(overview.attention?.absenceCount).toBe(3);
  });

  it("handles zero total sessions gracefully without NaN errors", () => {
    const child = { id: "student-empty", name: "EmptyChild" };
    const overview = buildParentAttendanceOverview(child, [], []);

    expect(overview.totals.totalSessions).toBe(0);
    expect(overview.totals.attendanceRate).toBe(100);
    expect(overview.totals.punctualityRate).toBe(100);
    expect(overview.totals.absenceRate).toBe(0);
    expect(overview.attention).toBeUndefined();
  });
});
