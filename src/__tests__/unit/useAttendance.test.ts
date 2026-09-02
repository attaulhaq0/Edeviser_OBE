import { describe, it, expect } from "vitest";
import {
  calculateAttendancePercent,
  mapAttendanceSummaryRows,
} from "@/hooks/useAttendance";

describe("calculateAttendancePercent", () => {
  it("returns null when no sessions exist", () => {
    expect(calculateAttendancePercent(0, 0, 0)).toBeNull();
  });

  it("counts present + late as attended", () => {
    // 5 present + 2 late out of 10 sessions = 70%
    expect(calculateAttendancePercent(5, 2, 10)).toBe(70);
  });

  it("returns 100% when all present", () => {
    expect(calculateAttendancePercent(10, 0, 10)).toBe(100);
  });

  it("returns 0% when all absent", () => {
    expect(calculateAttendancePercent(0, 0, 5)).toBe(0);
  });

  it("rounds to nearest integer", () => {
    // 1 present + 0 late out of 3 sessions = 33.33... → 33
    expect(calculateAttendancePercent(1, 0, 3)).toBe(33);
  });

  it("handles late-only attendance", () => {
    // 0 present + 3 late out of 4 sessions = 75%
    expect(calculateAttendancePercent(0, 3, 4)).toBe(75);
  });
});

describe("mapAttendanceSummaryRows (E2.E server-side summary)", () => {
  const baseRow = {
    student_id: "s1",
    student_name: "Noor",
    total_sessions: 10,
    present_count: 6,
    late_count: 2,
    absent_count: 2,
    excused_count: 0,
    attendance_pct: 80,
    below_threshold: false,
  };

  it("maps view rows to the camelCase summary shape", () => {
    const [summary] = mapAttendanceSummaryRows([baseRow]);
    expect(summary).toEqual({
      studentId: "s1",
      studentName: "Noor",
      totalSessions: 10,
      presentCount: 6,
      lateCount: 2,
      absentCount: 2,
      excusedCount: 0,
      attendancePercent: 80,
      isBelowThreshold: false,
    });
  });

  it("preserves null attendance_pct as null (section with no sessions)", () => {
    const [summary] = mapAttendanceSummaryRows([
      { ...baseRow, attendance_pct: null },
    ]);
    expect(summary?.attendancePercent).toBeNull();
  });

  it("carries the server-computed below_threshold flag verbatim", () => {
    const [summary] = mapAttendanceSummaryRows([
      { ...baseRow, below_threshold: true },
    ]);
    expect(summary?.isBelowThreshold).toBe(true);
  });

  it("returns an empty array for an empty result set", () => {
    expect(mapAttendanceSummaryRows([])).toEqual([]);
  });
});
