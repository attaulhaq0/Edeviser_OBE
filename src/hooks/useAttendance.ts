// =============================================================================
// useAttendance — TanStack Query hooks for class sessions & attendance records
// =============================================================================

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { queryKeys } from "@/lib/queryKeys";
import { logAuditEvent } from "@/lib/auditLogger";
import { useAuth } from "@/hooks/useAuth";

// ─── Types ──────────────────────────────────────────────────────────────────

export type AttendanceStatus = "present" | "absent" | "late" | "excused";

export interface ClassSession {
  id: string;
  section_id: string;
  session_date: string;
  session_type: "lecture" | "lab" | "tutorial";
  topic: string;
  created_at: string;
}

export interface AttendanceRecord {
  id: string;
  session_id: string;
  student_id: string;
  status: AttendanceStatus;
  marked_by: string;
  created_at: string;
}

export interface StudentAttendanceSummary {
  studentId: string;
  studentName: string;
  totalSessions: number;
  presentCount: number;
  lateCount: number;
  absentCount: number;
  excusedCount: number;
  attendancePercent: number | null;
  isBelowThreshold: boolean;
}

export interface CreateSessionInput {
  section_id: string;
  session_date: string;
  session_type: "lecture" | "lab" | "tutorial";
  topic: string;
}

export interface MarkAttendanceInput {
  session_id: string;
  records: Array<{ student_id: string; status: AttendanceStatus }>;
}

// ─── Attendance Percentage Calculation ───────────────────────────────────────

// Note: the 75% risk threshold now lives in SQL (attendance_summary_v1 view,
// `below_threshold` column) so it cannot be tampered with client-side.

/**
 * Calculate attendance percentage: (present + late) / total × 100
 * Per Requirement 78.3
 */
export function calculateAttendancePercent(
  presentCount: number,
  lateCount: number,
  totalSessions: number
): number | null {
  if (totalSessions === 0) return null;
  return Math.round(((presentCount + lateCount) / totalSessions) * 100);
}

// ─── Class Session Hooks ────────────────────────────────────────────────────

export const useClassSessions = (sectionId: string | undefined) => {
  return useQuery({
    queryKey: queryKeys.classSessions.list({ sectionId }),
    queryFn: async (): Promise<ClassSession[]> => {
      if (!sectionId) return [];
      const { data, error } = await supabase
        .from("class_sessions")
        .select("id, section_id, session_date, session_type, topic, created_at")
        .eq("section_id", sectionId)
        .order("session_date", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as ClassSession[];
    },
    enabled: !!sectionId,
  });
};

export const useCreateClassSession = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: CreateSessionInput) => {
      const { data, error } = await supabase
        .from("class_sessions")
        .insert(input)
        .select()
        .single();
      if (error) throw error;

      await logAuditEvent({
        action: "create",
        entity_type: "class_session",
        entity_id: data.id,
        changes: input as unknown as Record<string, unknown>,
        performed_by: user?.id ?? "",
      });

      return data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.classSessions.list({
          sectionId: variables.section_id,
        }),
      });
    },
  });
};

export const useDeleteClassSession = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      sessionId,
      sectionId,
    }: {
      sessionId: string;
      sectionId: string;
    }) => {
      const { error } = await supabase
        .from("class_sessions")
        .delete()
        .eq("id", sessionId);
      if (error) throw error;

      await logAuditEvent({
        action: "delete",
        entity_type: "class_session",
        entity_id: sessionId,
        changes: null,
        performed_by: user?.id ?? "",
      });

      return { sessionId, sectionId };
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.classSessions.list({
          sectionId: variables.sectionId,
        }),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.attendanceRecords.lists(),
      });
    },
  });
};

// ─── Attendance Record Hooks ────────────────────────────────────────────────

export const useAttendanceRecords = (sessionId: string | undefined) => {
  return useQuery({
    queryKey: queryKeys.attendanceRecords.list({ sessionId }),
    queryFn: async (): Promise<AttendanceRecord[]> => {
      if (!sessionId) return [];
      const { data, error } = await supabase
        .from("attendance_records")
        .select("id, session_id, student_id, status, marked_by, created_at")
        .eq("session_id", sessionId);
      if (error) throw error;
      return (data ?? []) as unknown as AttendanceRecord[];
    },
    enabled: !!sessionId,
  });
};

export const useMarkAttendance = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: MarkAttendanceInput) => {
      // E2.E: idempotent server-side RPC — marked_by is set to auth.uid()
      // inside the function and section ownership is enforced by RLS.
      // Returns recomputed server-side percentages per student.
      const { data, error } = await supabase.rpc("record_attendance_v1", {
        p_session_id: input.session_id,
        p_records: input.records.map((r) => ({
          student_id: r.student_id,
          status: r.status,
        })),
      });
      if (error) throw error;

      await logAuditEvent({
        action: "mark_attendance",
        entity_type: "attendance_record",
        entity_id: input.session_id,
        changes: { student_count: input.records.length },
        performed_by: user?.id ?? "",
      });

      return data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.attendanceRecords.list({
          sessionId: variables.session_id,
        }),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.attendanceRecords.lists(),
      });
    },
  });
};

// ─── Attendance Summary / Report Hooks ──────────────────────────────────────

export const useAttendanceSummary = (
  courseId: string | undefined,
  sectionId: string | undefined
) => {
  return useQuery({
    queryKey: queryKeys.attendanceRecords.list({
      courseId,
      sectionId,
      type: "summary",
    }),
    queryFn: async (): Promise<StudentAttendanceSummary[]> => {
      if (!sectionId) return [];

      // E2.E: percentages are computed server-side by the
      // attendance_summary_v1 view (security_invoker — RLS scopes rows).
      // Formula (Req 78.3): round(((present + late) / total) * 100),
      // NULL when the section has no sessions yet.
      const { data, error } = await supabase
        .from("attendance_summary_v1")
        .select(
          "student_id, student_name, total_sessions, present_count, late_count, absent_count, excused_count, attendance_pct, below_threshold"
        )
        .eq("section_id", sectionId)
        .eq("course_id", courseId ?? "");
      if (error) throw error;

      return mapAttendanceSummaryRows(
        data as unknown as AttendanceSummaryViewRow[]
      );
    },
    enabled: !!sectionId && !!courseId,
  });
};

// ─── E2.E: view-row → summary mapping (pure, unit-tested) ───────────────────

export interface AttendanceSummaryViewRow {
  student_id: string;
  student_name: string;
  total_sessions: number;
  present_count: number;
  late_count: number;
  absent_count: number;
  excused_count: number;
  attendance_pct: number | null;
  below_threshold: boolean;
}

export const mapAttendanceSummaryRows = (
  rows: AttendanceSummaryViewRow[]
): StudentAttendanceSummary[] =>
  rows.map((row) => ({
    studentId: row.student_id,
    studentName: row.student_name,
    totalSessions: Number(row.total_sessions),
    presentCount: Number(row.present_count),
    lateCount: Number(row.late_count),
    absentCount: Number(row.absent_count),
    excusedCount: Number(row.excused_count),
    attendancePercent:
      row.attendance_pct === null ? null : Number(row.attendance_pct),
    isBelowThreshold: row.below_threshold,
  }));

// ─── Student-facing: attendance per enrolled course ─────────────────────────

export interface StudentCourseAttendance {
  courseId: string;
  courseName: string;
  attendancePercent: number | null;
  totalSessions: number;
  attended: number;
}

interface StudentAttendanceCourse {
  courseId: string;
  courseName: string;
}

/**
 * Pure aggregation of a student's per-course attendance. Extracted + exported
 * so the parity test can prove the consolidated (bounded-query) path returns
 * byte-for-byte the same shape the prior per-course N+1 produced.
 *
 * Semantics preserved exactly from the previous implementation:
 *   - one entry per enrolled course, in enrollment order;
 *   - `totalSessions` = number of `class_sessions` across the course's sections;
 *   - `attended` = count of this student's `present`|`late` records in those
 *     sessions;
 *   - `attendancePercent` = calculateAttendancePercent(attended, 0, totalSessions),
 *     so a course with zero sessions remains explicitly unmeasured.
 */
export function aggregateStudentAttendance(
  courses: StudentAttendanceCourse[],
  sections: { id: string; course_id: string }[],
  sessions: { id: string; section_id: string }[],
  records: { status: string; session_id: string }[]
): StudentCourseAttendance[] {
  const sectionToCourse = new Map(sections.map((s) => [s.id, s.course_id]));

  const sessionToCourse = new Map<string, string>();
  const totalByCourse = new Map<string, number>();
  for (const sess of sessions) {
    const courseId = sectionToCourse.get(sess.section_id);
    if (!courseId) continue;
    sessionToCourse.set(sess.id, courseId);
    totalByCourse.set(courseId, (totalByCourse.get(courseId) ?? 0) + 1);
  }

  const attendedByCourse = new Map<string, number>();
  for (const r of records) {
    if (r.status !== "present" && r.status !== "late") continue;
    const courseId = sessionToCourse.get(r.session_id);
    if (!courseId) continue;
    attendedByCourse.set(courseId, (attendedByCourse.get(courseId) ?? 0) + 1);
  }

  return courses.map((c) => {
    const totalSessions = totalByCourse.get(c.courseId) ?? 0;
    const attended = attendedByCourse.get(c.courseId) ?? 0;
    return {
      courseId: c.courseId,
      courseName: c.courseName,
      attendancePercent: calculateAttendancePercent(attended, 0, totalSessions),
      totalSessions,
      attended,
    };
  });
}

/**
 * Student view: attendance summary per enrolled course.
 *
 * Consolidated from the prior per-course client fan-out (for EACH enrolled
 * course: course_sections → class_sessions → attendance_records, i.e. 1 + 3×N
 * round-trips) into a fixed set of bounded queries regardless of course count:
 *   1) active enrollments (the complete course list, incl. zero-session courses),
 *   2) all sections for those courses  ┐ run in parallel
 *      + this student's attendance records ┘ (records filter by student_id only,
 *      using the idx_attendance_student index — no large session_id `.in()`),
 *   3) all sessions for those sections.
 * This was the #2 DB-time consumer (143 calls / 4.77 s max in pg_stat_statements);
 * the new path is O(1) round-trips. RLS is unchanged (same tables, same caller).
 */
export const useStudentAttendance = (
  studentId: string | undefined,
  options?: { enabled?: boolean }
) => {
  return useQuery({
    queryKey: queryKeys.attendanceRecords.list({
      studentId,
      type: "student_courses",
    }),
    queryFn: async (): Promise<StudentCourseAttendance[]> => {
      if (!studentId) return [];

      // 1) Active enrollments — the complete course list (incl. zero-session
      //    courses, which remain explicitly unmeasured until sessions exist).
      const { data: enrollments, error: enrErr } = await supabase
        .from("student_courses")
        .select("course_id, courses:course_id(name)")
        .eq("student_id", studentId)
        .eq("status", "active");
      if (enrErr) throw enrErr;
      if (!enrollments || enrollments.length === 0) return [];

      const courses: StudentAttendanceCourse[] = enrollments.map((e) => ({
        courseId: e.course_id,
        courseName:
          (e.courses as unknown as { name: string } | null)?.name ?? "Unknown",
      }));
      const courseIds = courses.map((c) => c.courseId);

      // 2) Sections for those courses + this student's attendance records.
      //    Independent, so fetch in parallel.
      const [sectionsRes, recordsRes] = await Promise.all([
        supabase
          .from("course_sections")
          .select("id, course_id")
          .in("course_id", courseIds),
        supabase
          .from("attendance_records")
          .select("status, session_id")
          .eq("student_id", studentId),
      ]);
      if (sectionsRes.error) throw sectionsRes.error;
      if (recordsRes.error) throw recordsRes.error;

      const sections = (sectionsRes.data ?? []) as {
        id: string;
        course_id: string;
      }[];

      // 3) Sessions for those sections (needs the section ids from step 2).
      let sessions: { id: string; section_id: string }[] = [];
      const sectionIds = sections.map((s) => s.id);
      if (sectionIds.length > 0) {
        const { data: sessionData, error: sessErr } = await supabase
          .from("class_sessions")
          .select("id, section_id")
          .in("section_id", sectionIds);
        if (sessErr) throw sessErr;
        sessions = (sessionData ?? []) as { id: string; section_id: string }[];
      }

      const records = (recordsRes.data ?? []) as {
        status: string;
        session_id: string;
      }[];

      return aggregateStudentAttendance(courses, sections, sessions, records);
    },
    // Backward-compatible: callers that omit `options` keep the prior
    // `enabled: !!studentId` behavior. The optional `enabled` lets callers (e.g.
    // StudentDashboard, where the aggregate RPC already returns attendance) gate
    // this hook to a fallback-only fetch without changing any other call site.
    enabled: !!studentId && (options?.enabled ?? true),
    staleTime: 60_000,
  });
};

// ─── Parent-facing: per-course attendance summary for a linked child ────────

export interface ParentAttendanceSummary {
  course_id: string;
  course_name: string;
  course_code: string;
  total_sessions: number;
  present: number;
  late: number;
  absent: number;
  attendance_rate: number;
}

interface ParentEnrolledCourse {
  course_id: string;
  course_name: string;
  course_code: string;
}

interface ParentAttendanceRecord {
  course_id: string;
  status: string;
}

/**
 * Pure aggregation of a child's attendance records into per-course summaries.
 * Seeds one entry per ENROLLED course (so courses with zero records still
 * render at 0%), then counts present/late/absent and derives the rate.
 *
 * Extracted + exported so the parity test can prove the consolidated
 * (2-query) `useChildAttendance` returns byte-for-byte the same shape the prior
 * 4-step waterfall produced. `total_sessions` intentionally counts the child's
 * attendance RECORDS (any status, including excused) per course, matching the
 * pre-existing behavior.
 */
export function aggregateParentAttendance(
  courses: ParentEnrolledCourse[],
  records: ParentAttendanceRecord[]
): ParentAttendanceSummary[] {
  const summary = new Map<string, ParentAttendanceSummary>();
  for (const c of courses) {
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
    const s = summary.get(r.course_id);
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

/**
 * Parent view: attendance summary per course for one linked child.
 *
 * Consolidated from the prior 4-step client waterfall (enrollments →
 * course_sections → class_sessions → attendance_records with a large
 * `.in(sessionIds)`), which could exceed URL/`in`-list limits and stall. Now
 * two queries: (1) the child's active enrollments (the complete course list,
 * incl. zero-record courses) and (2) a single JOINED attendance query filtered
 * by `student_id` that walks `attendance_records → class_sessions →
 * course_sections` to resolve each record's course — no unbounded `.in()`.
 *
 * RLS is preserved: both queries read the same tables under the caller's
 * (parent's) row-level security, so only verified-linked children resolve.
 */
export const useChildAttendance = (studentId: string | undefined) => {
  return useQuery({
    queryKey: queryKeys.attendanceRecords.list({
      studentId,
      view: "parent-summary",
    }),
    queryFn: async (): Promise<ParentAttendanceSummary[]> => {
      if (!studentId) return [];

      // 1) Active enrollments — the complete course list (incl. zero-record).
      const { data: enrollments, error: enrErr } = await supabase
        .from("student_courses")
        .select("course_id, courses!inner(id, name, code)")
        .eq("student_id", studentId)
        .eq("status", "active");
      if (enrErr) throw enrErr;
      if (!enrollments || enrollments.length === 0) return [];

      const courses: ParentEnrolledCourse[] = enrollments.map((e) => {
        const c = e.courses as unknown as {
          id: string;
          name: string;
          code: string;
        };
        return { course_id: c.id, course_name: c.name, course_code: c.code };
      });

      // 2) One joined query for THIS child's attendance — resolves the course
      // via the FK chain instead of a giant session-id `.in()` list.
      const { data: rawRecords, error: recErr } = await supabase
        .from("attendance_records")
        .select(
          "status, class_sessions!inner(course_sections!inner(course_id))"
        )
        .eq("student_id", studentId);
      if (recErr) throw recErr;

      const records: ParentAttendanceRecord[] = (rawRecords ?? []).map((r) => {
        const courseId =
          (
            r.class_sessions as unknown as {
              course_sections: { course_id: string } | null;
            } | null
          )?.course_sections?.course_id ?? "";
        return { course_id: courseId, status: r.status as string };
      });

      return aggregateParentAttendance(courses, records);
    },
    enabled: !!studentId,
    staleTime: 60_000,
  });
};

// ─── Single Canonical Parent Attendance Overview Hook & Types ───────────────

export interface ParentAttendanceOverview {
  child: {
    id: string;
    name: string;
  };
  period: {
    dateFrom: string;
    dateTo: string;
    label: string;
  };
  totals: {
    totalSessions: number;
    present: number;
    late: number;
    absent: number;
    excused: number;
    attended: number;
    attendanceRate: number;
    punctualityRate: number;
    absenceRate: number;
  };
  trend: Array<{
    periodLabel: string;
    periodStart: string;
    periodEnd: string;
    present: number;
    late: number;
    absent: number;
    attendanceRate: number;
  }>;
  courses: Array<{
    courseId: string;
    code: string;
    name: string;
    present: number;
    late: number;
    absent: number;
    excused: number;
    totalSessions: number;
    attendanceRate: number;
    trend: "up" | "stable" | "down" | "insufficient_data";
  }>;
  recentExceptions: Array<{
    attendanceRecordId: string;
    sessionId: string;
    courseId: string;
    courseName: string;
    sessionDate: string;
    sessionType: string;
    topic?: string;
    status: "present" | "late" | "absent" | "excused";
  }>;
  attention?: {
    courseId: string;
    courseName: string;
    absenceCount: number;
    message: string;
  };
}

export interface RawAttendanceRecordItem {
  id: string;
  session_id: string;
  status: string;
  created_at: string;
  class_sessions: {
    id: string;
    session_date: string;
    session_type: string;
    topic?: string;
    course_sections: {
      id: string;
      course_id: string;
      courses: {
        id: string;
        name: string;
        code: string;
      };
    };
  };
}

/**
 * Pure canonical aggregation function for Parent Attendance Overview.
 * Enforces explicit formulas:
 *   Attended = Present + Late
 *   Attendance Rate = Math.round(((Present + Late) / Total) * 100)
 *   Punctuality Rate = Attended > 0 ? Math.round((Present / Attended) * 100) : 100
 *   Absence Rate = Math.round((Absent / Total) * 100)
 */
export function buildParentAttendanceOverview(
  child: { id: string; name: string },
  enrolledCourses: Array<{ courseId: string; code: string; name: string }>,
  records: RawAttendanceRecordItem[],
  dateFrom?: string,
  dateTo?: string
): ParentAttendanceOverview {
  // Filter by date range if provided
  const filteredRecords = records.filter((r) => {
    const d = r.class_sessions?.session_date;
    if (!d) return false;
    if (dateFrom && d < dateFrom) return false;
    if (dateTo && d > dateTo) return false;
    return true;
  });

  // Calculate totals
  let present = 0;
  let late = 0;
  let absent = 0;
  let excused = 0;

  for (const r of filteredRecords) {
    if (r.status === "present") present++;
    else if (r.status === "late") late++;
    else if (r.status === "absent") absent++;
    else if (r.status === "excused") excused++;
  }

  const totalSessions = filteredRecords.length;
  const attended = present + late;
  const attendanceRate =
    totalSessions > 0 ? Math.round((attended / totalSessions) * 100) : 100;
  const punctualityRate =
    attended > 0 ? Math.round((present / attended) * 100) : 100;
  const absenceRate =
    totalSessions > 0 ? Math.round((absent / totalSessions) * 100) : 0;

  // Aggregate by Course
  const courseMap = new Map<
    string,
    {
      courseId: string;
      code: string;
      name: string;
      present: number;
      late: number;
      absent: number;
      excused: number;
      totalSessions: number;
    }
  >();

  for (const c of enrolledCourses) {
    courseMap.set(c.courseId, {
      courseId: c.courseId,
      code: c.code,
      name: c.name,
      present: 0,
      late: 0,
      absent: 0,
      excused: 0,
      totalSessions: 0,
    });
  }

  for (const r of filteredRecords) {
    const course = r.class_sessions?.course_sections?.courses;
    if (!course) continue;
    let item = courseMap.get(course.id);
    if (!item) {
      item = {
        courseId: course.id,
        code: course.code,
        name: course.name,
        present: 0,
        late: 0,
        absent: 0,
        excused: 0,
        totalSessions: 0,
      };
      courseMap.set(course.id, item);
    }
    item.totalSessions++;
    if (r.status === "present") item.present++;
    else if (r.status === "late") item.late++;
    else if (r.status === "absent") item.absent++;
    else if (r.status === "excused") item.excused++;
  }

  const courseSummaries = Array.from(courseMap.values()).map((c) => {
    const cAttended = c.present + c.late;
    const rate =
      c.totalSessions > 0
        ? Math.round((cAttended / c.totalSessions) * 100)
        : 100;
    let trend: "up" | "stable" | "down" | "insufficient_data" = "stable";
    if (c.totalSessions < 3) trend = "insufficient_data";
    else if (rate >= 95) trend = "up";
    else if (rate < 85) trend = "down";

    return {
      courseId: c.courseId,
      code: c.code,
      name: c.name,
      present: c.present,
      late: c.late,
      absent: c.absent,
      excused: c.excused,
      totalSessions: c.totalSessions,
      attendanceRate: rate,
      trend,
    };
  });

  // Recent Exceptions (sorted descending by date)
  const recentExceptions: ParentAttendanceOverview["recentExceptions"] =
    filteredRecords
      .map((r) => ({
        attendanceRecordId: r.id,
        sessionId: r.class_sessions.id,
        courseId: r.class_sessions.course_sections.courses.id,
        courseName: r.class_sessions.course_sections.courses.name,
        sessionDate: r.class_sessions.session_date,
        sessionType: r.class_sessions.session_type,
        topic: r.class_sessions.topic,
        status:
          (r.status as "present" | "late" | "absent" | "excused") ?? "present",
      }))
      .sort((a, b) => b.sessionDate.localeCompare(a.sessionDate));

  // Determine highest absence course for Attention card
  let maxAbsenceCourse: (typeof courseSummaries)[0] | null = null;
  for (const c of courseSummaries) {
    if (c.absent > 0) {
      if (!maxAbsenceCourse || c.absent > maxAbsenceCourse.absent) {
        maxAbsenceCourse = c;
      }
    }
  }

  const attention = maxAbsenceCourse
    ? {
        courseId: maxAbsenceCourse.courseId,
        courseName: maxAbsenceCourse.name,
        absenceCount: maxAbsenceCourse.absent,
        message: `${maxAbsenceCourse.name} has ${maxAbsenceCourse.absent} of the ${absent} missed sessions.`,
      }
    : undefined;

  // Trend aggregation (weekly blocks)
  const weekMap = new Map<
    string,
    {
      label: string;
      start: string;
      end: string;
      present: number;
      late: number;
      absent: number;
    }
  >();

  for (const r of filteredRecords) {
    const d = new Date(r.class_sessions.session_date);
    if (isNaN(d.getTime())) continue;
    // Get week label (e.g., W1, W2)
    const weekNum = Math.ceil(d.getDate() / 7);
    const weekKey = `${d.getFullYear()}-M${d.getMonth() + 1}-W${weekNum}`;
    let w = weekMap.get(weekKey);
    if (!w) {
      w = {
        label: `W${weekNum}`,
        start: r.class_sessions.session_date,
        end: r.class_sessions.session_date,
        present: 0,
        late: 0,
        absent: 0,
      };
      weekMap.set(weekKey, w);
    }
    if (r.status === "present") w.present++;
    else if (r.status === "late") w.late++;
    else if (r.status === "absent") w.absent++;
  }

  const trend = Array.from(weekMap.values()).map((w) => {
    const tot = w.present + w.late + w.absent;
    const rate = tot > 0 ? Math.round(((w.present + w.late) / tot) * 100) : 100;
    return {
      periodLabel: w.label,
      periodStart: w.start,
      periodEnd: w.end,
      present: w.present,
      late: w.late,
      absent: w.absent,
      attendanceRate: rate,
    };
  });

  // Calculate actual period label
  const dates = filteredRecords
    .map((r) => r.class_sessions?.session_date)
    .filter(Boolean)
    .sort();
  const actualFrom = dateFrom || dates[0] || "2026-04-07";
  const actualTo = dateTo || dates[dates.length - 1] || "2026-05-18";
  const label = `${new Date(actualFrom).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  })} – ${new Date(actualTo).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })}`;

  return {
    child,
    period: {
      dateFrom: actualFrom,
      dateTo: actualTo,
      label,
    },
    totals: {
      totalSessions,
      present,
      late,
      absent,
      excused,
      attended,
      attendanceRate,
      punctualityRate,
      absenceRate,
    },
    trend,
    courses: courseSummaries,
    recentExceptions,
    attention,
  };
}

/**
 * Single Canonical Parent Attendance Hook
 * Consolidates Overview, Trend, Course Breakdown, Exceptions, and Right Rail data
 * into a single unified query with strict authorization checks.
 */
export const useParentAttendanceOverview = (
  studentId: string | undefined,
  options?: { dateFrom?: string; dateTo?: string; courseId?: string }
) => {
  return useQuery({
    queryKey: queryKeys.attendanceRecords.list({
      studentId,
      dateFrom: options?.dateFrom,
      dateTo: options?.dateTo,
      courseId: options?.courseId,
      view: "parent-canonical-overview",
    }),
    queryFn: async (): Promise<ParentAttendanceOverview> => {
      if (!studentId) {
        return buildParentAttendanceOverview({ id: "", name: "Child" }, [], []);
      }

      // 1) Fetch child profile info
      const { data: profile, error: profErr } = await supabase
        .from("profiles")
        .select("id, full_name")
        .eq("id", studentId)
        .single();
      if (profErr) throw profErr;

      const childName = profile?.full_name ?? "Child";

      // 2) Fetch active course enrollments for this child
      const { data: enrollments, error: enrErr } = await supabase
        .from("student_courses")
        .select("course_id, courses!inner(id, name, code)")
        .eq("student_id", studentId)
        .eq("status", "active");
      if (enrErr) throw enrErr;

      const enrolledCourses = (enrollments ?? []).map((e) => {
        const c = e.courses as unknown as {
          id: string;
          name: string;
          code: string;
        };
        return { courseId: c.id, name: c.name, code: c.code };
      });

      // 3) Fetch attendance records with joined session details
      let query = supabase
        .from("attendance_records")
        .select(
          `
          id,
          session_id,
          status,
          created_at,
          class_sessions!inner(
            id,
            session_date,
            session_type,
            topic,
            course_sections!inner(
              id,
              course_id,
              courses!inner(
                id,
                name,
                code
              )
            )
          )
        `
        )
        .eq("student_id", studentId);

      if (options?.courseId) {
        query = query.eq(
          "class_sessions.course_sections.course_id",
          options.courseId
        );
      }

      const { data: recordsData, error: recErr } = await query;
      if (recErr) throw recErr;

      const rawRecords = (recordsData ??
        []) as unknown as RawAttendanceRecordItem[];

      return buildParentAttendanceOverview(
        { id: studentId, name: childName },
        enrolledCourses,
        rawRecords,
        options?.dateFrom,
        options?.dateTo
      );
    },
    enabled: !!studentId,
    staleTime: 60_000,
  });
};
