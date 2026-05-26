import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays, Check, X, Clock } from "lucide-react";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Shimmer from "@/components/shared/Shimmer";
import { NoLinkedStudents } from "@/components/shared/EmptyState";
import { useAuth } from "@/hooks/useAuth";
import { useLinkedChildren } from "@/hooks/useParentDashboard";
import { supabase } from "@/lib/supabase";
import { queryKeys } from "@/lib/queryKeys";

interface AttendanceSummary {
  course_id: string;
  course_name: string;
  course_code: string;
  total_sessions: number;
  present: number;
  late: number;
  absent: number;
  attendance_rate: number;
}

const useChildAttendance = (studentId: string | undefined) => {
  return useQuery({
    queryKey: queryKeys.attendanceRecords.list({
      studentId,
      view: "parent-summary",
    }),
    queryFn: async (): Promise<AttendanceSummary[]> => {
      if (!studentId) return [];

      // Get enrolled courses
      const { data: enrollments } = await supabase
        .from("student_courses")
        .select(`course_id, courses!inner(id, name, code)`)
        .eq("student_id", studentId)
        .eq("status", "active");

      if (!enrollments || enrollments.length === 0) return [];

      const courseIds = enrollments.map((e) => e.course_id);

      // Get all class sessions through course_sections that belong to enrolled courses
      const { data: sections } = await supabase
        .from("course_sections")
        .select("id, course_id")
        .in("course_id", courseIds);

      const sectionIds = (sections ?? []).map((s) => s.id);
      const sectionToCourse = new Map(
        (sections ?? []).map((s) => [s.id, s.course_id])
      );

      const { data: sessions } =
        sectionIds.length > 0
          ? await supabase
              .from("class_sessions")
              .select("id, section_id")
              .in("section_id", sectionIds)
          : { data: [] as Array<{ id: string; section_id: string }> };

      const sessionIds = (sessions ?? []).map((s) => s.id);
      // Map session → course (via section)
      const sessionToCourse = new Map<string, string>();
      for (const sess of sessions ?? []) {
        const courseId = sectionToCourse.get(sess.section_id);
        if (courseId) sessionToCourse.set(sess.id, courseId);
      }

      if (sessionIds.length === 0) {
        return enrollments.map((e) => {
          const c = e.courses as unknown as {
            id: string;
            name: string;
            code: string;
          };
          return {
            course_id: c.id,
            course_name: c.name,
            course_code: c.code,
            total_sessions: 0,
            present: 0,
            late: 0,
            absent: 0,
            attendance_rate: 0,
          };
        });
      }

      // Get attendance records for this student across all sessions
      const { data: records } = await supabase
        .from("attendance_records")
        .select("session_id, status")
        .eq("student_id", studentId)
        .in("session_id", sessionIds);

      // Aggregate per course
      const summary = new Map<string, AttendanceSummary>();
      for (const e of enrollments) {
        const c = e.courses as unknown as {
          id: string;
          name: string;
          code: string;
        };
        summary.set(c.id, {
          course_id: c.id,
          course_name: c.name,
          course_code: c.code,
          total_sessions: 0,
          present: 0,
          late: 0,
          absent: 0,
          attendance_rate: 0,
        });
      }

      for (const r of records ?? []) {
        const courseId = sessionToCourse.get(r.session_id);
        if (!courseId) continue;
        const s = summary.get(courseId);
        if (!s) continue;
        s.total_sessions += 1;
        if (r.status === "present") s.present += 1;
        else if (r.status === "late") s.late += 1;
        else if (r.status === "absent") s.absent += 1;
      }

      // Calculate attendance rate
      for (const s of summary.values()) {
        s.attendance_rate =
          s.total_sessions > 0
            ? Math.round(((s.present + s.late) / s.total_sessions) * 100)
            : 0;
      }

      return Array.from(summary.values());
    },
    enabled: !!studentId,
    staleTime: 60_000,
  });
};

const ParentAttendancePage = () => {
  const { t } = useTranslation("common");
  const { user } = useAuth();
  const { data: children, isLoading: childrenLoading } = useLinkedChildren(
    user?.id
  );
  const [selectedChildId, setSelectedChildId] = useState<string>("");

  const effectiveChildId = useMemo(() => {
    if (selectedChildId) return selectedChildId;
    return children && children.length > 0 ? children[0]?.student_id ?? "" : "";
  }, [selectedChildId, children]);

  const { data: attendance, isLoading: attendanceLoading } = useChildAttendance(
    effectiveChildId || undefined
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          {t("parent.attendance.title", "Attendance")}
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          {t(
            "parent.attendance.subtitle",
            "Class attendance summary by course."
          )}
        </p>
      </div>

      {childrenLoading ? (
        <Shimmer className="h-64 rounded-xl" />
      ) : !children || children.length === 0 ? (
        <NoLinkedStudents />
      ) : (
        <>
          {children.length > 1 ? (
            <div className="max-w-xs">
              <Select value={effectiveChildId} onValueChange={setSelectedChildId}>
                <SelectTrigger>
                  <SelectValue
                    placeholder={t(
                      "parent.attendance.selectChild",
                      "Select a child"
                    )}
                  />
                </SelectTrigger>
                <SelectContent>
                  {children.map((c) => (
                    <SelectItem key={c.student_id} value={c.student_id}>
                      {c.student_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}

          {attendanceLoading ? (
            <Shimmer className="h-64 rounded-xl" />
          ) : !attendance || attendance.length === 0 ? (
            <Card className="bg-white border-0 shadow-md rounded-xl p-8 text-center">
              <CalendarDays className="h-8 w-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-500">
                {t(
                  "parent.attendance.noData",
                  "No attendance data available yet."
                )}
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {attendance.map((course) => (
                <Card
                  key={course.course_id}
                  className="bg-white border-0 shadow-md rounded-xl p-5"
                >
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div>
                      <Badge variant="outline" className="text-[10px] font-bold mb-1">
                        {course.course_code}
                      </Badge>
                      <h2 className="text-base font-semibold tracking-tight text-gray-900 dark:text-foreground">
                        {course.course_name}
                      </h2>
                    </div>
                    <div className="text-end">
                      <p className="text-2xl font-black text-gray-900 dark:text-foreground">
                        {course.attendance_rate}%
                      </p>
                      <p className="text-[10px] font-bold tracking-wider uppercase text-gray-500">
                        {t("parent.attendance.rate", "Rate")}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-3 border-t border-gray-100">
                    <div className="text-center">
                      <Check className="h-4 w-4 text-green-500 mx-auto mb-1" />
                      <p className="text-[10px] font-bold tracking-wider uppercase text-gray-500">
                        {t("parent.attendance.present", "Present")}
                      </p>
                      <p className="text-sm font-bold text-gray-900 dark:text-foreground">
                        {course.present}
                      </p>
                    </div>
                    <div className="text-center">
                      <Clock className="h-4 w-4 text-yellow-500 mx-auto mb-1" />
                      <p className="text-[10px] font-bold tracking-wider uppercase text-gray-500">
                        {t("parent.attendance.late", "Late")}
                      </p>
                      <p className="text-sm font-bold text-gray-900 dark:text-foreground">
                        {course.late}
                      </p>
                    </div>
                    <div className="text-center">
                      <X className="h-4 w-4 text-red-500 mx-auto mb-1" />
                      <p className="text-[10px] font-bold tracking-wider uppercase text-gray-500">
                        {t("parent.attendance.absent", "Absent")}
                      </p>
                      <p className="text-sm font-bold text-gray-900 dark:text-foreground">
                        {course.absent}
                      </p>
                    </div>
                  </div>

                  <p className="text-xs text-gray-500 mt-3 text-center">
                    {course.total_sessions} {t("parent.attendance.sessions", "sessions tracked")}
                  </p>
                </Card>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ParentAttendancePage;
