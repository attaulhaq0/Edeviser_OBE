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
  attendancePercent: number;
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

const ATTENDANCE_THRESHOLD = 75;

/**
 * Calculate attendance percentage: (present + late) / total × 100
 * Per Requirement 78.3
 */
export function calculateAttendancePercent(
  presentCount: number,
  lateCount: number,
  totalSessions: number
): number {
  if (totalSessions === 0) return 100;
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
      const rows = input.records.map((r) => ({
        session_id: input.session_id,
        student_id: r.student_id,
        status: r.status,
        marked_by: user?.id ?? "",
      }));

      const { data, error } = await supabase
        .from("attendance_records")
        .upsert(rows, { onConflict: "session_id,student_id" })
        .select();
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

      // 1. Get all sessions for this section
      const { data: sessions, error: sessErr } = await supabase
        .from("class_sessions")
        .select("id")
        .eq("section_id", sectionId);
      if (sessErr) throw sessErr;
      if (!sessions || sessions.length === 0) return [];

      const sessionIds = sessions.map((s) => s.id);
      const totalSessions = sessionIds.length;

      // 2. Get all attendance records for these sessions
      const { data: records, error: recErr } = await supabase
        .from("attendance_records")
        .select("student_id, status")
        .in("session_id", sessionIds);
      if (recErr) throw recErr;

      // 3. Get enrolled students for this section/course
      const { data: enrollments, error: enrErr } = await supabase
        .from("student_courses")
        .select("student_id, profiles:student_id(full_name)")
        .eq("course_id", courseId ?? "")
        .eq("status", "active");
      if (enrErr) throw enrErr;

      // 4. Aggregate per student
      const studentMap = new Map<
        string,
        {
          name: string;
          present: number;
          late: number;
          absent: number;
          excused: number;
        }
      >();

      for (const enrollment of enrollments ?? []) {
        const name =
          (enrollment.profiles as unknown as { full_name: string } | null)
            ?.full_name ?? "Unknown";
        studentMap.set(enrollment.student_id, {
          name,
          present: 0,
          late: 0,
          absent: 0,
          excused: 0,
        });
      }

      for (const record of records ?? []) {
        const entry = studentMap.get(record.student_id);
        if (!entry) continue;
        if (record.status === "present") entry.present++;
        else if (record.status === "late") entry.late++;
        else if (record.status === "absent") entry.absent++;
        else if (record.status === "excused") entry.excused++;
      }

      return Array.from(studentMap.entries()).map(([studentId, counts]) => {
        const percent = calculateAttendancePercent(
          counts.present,
          counts.late,
          totalSessions
        );
        return {
          studentId,
          studentName: counts.name,
          totalSessions,
          presentCount: counts.present,
          lateCount: counts.late,
          absentCount: counts.absent,
          excusedCount: counts.excused,
          attendancePercent: percent,
          isBelowThreshold: percent < ATTENDANCE_THRESHOLD,
        };
      });
    },
    enabled: !!sectionId && !!courseId,
  });
};

// ─── Student-facing: attendance per enrolled course ─────────────────────────

export interface StudentCourseAttendance {
  courseId: string;
  courseName: string;
  attendancePercent: number;
  totalSessions: number;
  attended: number;
}

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

      // Get enrolled courses
      const { data: enrollments, error: enrErr } = await supabase
        .from("student_courses")
        .select("course_id, courses:course_id(name)")
        .eq("student_id", studentId)
        .eq("status", "active");
      if (enrErr) throw enrErr;
      if (!enrollments || enrollments.length === 0) return [];

      const results: StudentCourseAttendance[] = await Promise.all(
        enrollments.map(async (enrollment) => {
          const courseName =
            (enrollment.courses as unknown as { name: string } | null)?.name ??
            "Unknown";

          // Get sections for this course
          const { data: sections, error: secErr } = await supabase
            .from("course_sections")
            .select("id")
            .eq("course_id", enrollment.course_id);
          if (secErr) throw secErr;

          const sectionIds = (sections ?? []).map((s) => s.id);
          if (sectionIds.length === 0) {
            return {
              courseId: enrollment.course_id,
              courseName,
              attendancePercent: 100,
              totalSessions: 0,
              attended: 0,
            };
          }

          // Get all sessions for these sections
          const { data: sessions, error: sessErr } = await supabase
            .from("class_sessions")
            .select("id")
            .in("section_id", sectionIds);
          if (sessErr) throw sessErr;

          const sessionIds = (sessions ?? []).map((s) => s.id);
          const totalSessions = sessionIds.length;

          if (totalSessions === 0) {
            return {
              courseId: enrollment.course_id,
              courseName,
              attendancePercent: 100,
              totalSessions: 0,
              attended: 0,
            };
          }

          // Get this student's attendance records
          const { data: records, error: recErr } = await supabase
            .from("attendance_records")
            .select("status")
            .eq("student_id", studentId)
            .in("session_id", sessionIds);
          if (recErr) throw recErr;

          const presentOrLate = (records ?? []).filter(
            (r) => r.status === "present" || r.status === "late"
          ).length;

          return {
            courseId: enrollment.course_id,
            courseName,
            attendancePercent: calculateAttendancePercent(
              presentOrLate,
              0,
              totalSessions
            ),
            totalSessions,
            attended: presentOrLate,
          };
        })
      );

      return results;
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
