import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
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
import { useChildAttendance } from "@/hooks/useAttendance";

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
              <Select
                value={effectiveChildId}
                onValueChange={setSelectedChildId}
              >
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
                      <Badge
                        variant="outline"
                        className="text-[10px] font-bold mb-1"
                      >
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
                    {course.total_sessions}{" "}
                    {t("parent.attendance.sessions", "sessions tracked")}
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
