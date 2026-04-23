// =============================================================================
// AttendanceReport — Per-student attendance percentage per course
// Requirements: 78.3, 78.4
// =============================================================================

import { useMemo } from 'react';
import { parseAsString, useQueryState } from 'nuqs';
import { AlertTriangle, BarChart3, CheckCircle2 } from 'lucide-react';

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import Shimmer from '@/components/shared/Shimmer';

import { useAuth } from '@/hooks/useAuth';
import { useCourses } from '@/hooks/useCourses';
import { useCourseSections } from '@/hooks/useCourseSections';
import { useAttendanceSummary } from '@/hooks/useAttendance';

const AttendanceReport = () => {
  const { user } = useAuth();
  const teacherId = user?.id ?? '';

  const [courseId, setCourseId] = useQueryState('course', parseAsString.withDefault(''));
  const [sectionId, setSectionId] = useQueryState('section', parseAsString.withDefault(''));

  const { data: coursesResult, isLoading: coursesLoading } = useCourses();
  const teacherCourses = useMemo(
    () => (coursesResult?.data ?? []).filter((c) => c.teacher_id === teacherId),
    [coursesResult, teacherId],
  );
  const { data: sections } = useCourseSections(courseId || undefined);
  const { data: summary, isLoading: summaryLoading } = useAttendanceSummary(
    courseId || undefined,
    sectionId || undefined,
  );

  const belowThreshold = useMemo(
    () => (summary ?? []).filter((s) => s.isBelowThreshold),
    [summary],
  );

  const avgAttendance = useMemo(() => {
    if (!summary || summary.length === 0) return 0;
    return Math.round(summary.reduce((s, r) => s + r.attendancePercent, 0) / summary.length);
  }, [summary]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Attendance Report</h1>

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-4">
        <div className="w-64">
          <span className="text-xs font-medium text-gray-500 mb-1 block">Course</span>
          {coursesLoading ? (
            <Shimmer className="h-10 rounded-lg" />
          ) : (
            <Select value={courseId} onValueChange={(v) => { setCourseId(v); setSectionId(''); }}>
              <SelectTrigger aria-label="Select course"><SelectValue placeholder="Select course" /></SelectTrigger>
              <SelectContent>
                {teacherCourses.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
        {courseId && (
          <div className="w-48">
            <span className="text-xs font-medium text-gray-500 mb-1 block">Section</span>
            <Select value={sectionId} onValueChange={setSectionId}>
              <SelectTrigger aria-label="Select section"><SelectValue placeholder="Select section" /></SelectTrigger>
              <SelectContent>
                {(sections ?? []).map((s) => (
                  <SelectItem key={s.id} value={s.id}>Section {s.section_code}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {sectionId && (
        <>
          {/* KPI Row */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <Card className="bg-white border-0 shadow-md rounded-xl p-4">
              <p className="text-[10px] font-black tracking-widest uppercase text-gray-500">Avg Attendance</p>
              <p className="text-2xl font-black mt-1">{avgAttendance}%</p>
            </Card>
            <Card className="bg-white border-0 shadow-md rounded-xl p-4">
              <p className="text-[10px] font-black tracking-widest uppercase text-gray-500">Total Students</p>
              <p className="text-2xl font-black mt-1">{summary?.length ?? 0}</p>
            </Card>
            <Card className="bg-white border-0 shadow-md rounded-xl p-4">
              <div className="flex items-center gap-1">
                <AlertTriangle className="h-3 w-3 text-red-500" />
                <p className="text-[10px] font-black tracking-widest uppercase text-red-600">Below 75%</p>
              </div>
              <p className="text-2xl font-black mt-1 text-red-600">{belowThreshold.length}</p>
            </Card>
          </div>

          {/* Flagged Students */}
          {belowThreshold.length > 0 && (
            <Card className="bg-red-50 border border-red-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <span className="text-sm font-bold text-red-700">Students Below 75% Threshold</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {belowThreshold.map((s) => (
                  <Badge key={s.studentId} variant="destructive" className="text-xs">
                    {s.studentName} — {s.attendancePercent}%
                  </Badge>
                ))}
              </div>
            </Card>
          )}

          {/* Full Report Table */}
          <Card className="bg-white border-0 shadow-md rounded-xl overflow-hidden">
            <div
              className="px-6 py-4 flex items-center gap-2"
              style={{ background: 'linear-gradient(93.65deg, #14B8A6 5.37%, #0382BD 78.89%)' }}
            >
              <BarChart3 className="h-5 w-5 text-white" />
              <h2 className="text-lg font-bold tracking-tight text-white">Student Attendance</h2>
            </div>
            <div className="p-4">
              {summaryLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Shimmer key={i} className="h-10 rounded-lg" />
                  ))}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead className="text-center">Present</TableHead>
                      <TableHead className="text-center">Late</TableHead>
                      <TableHead className="text-center">Absent</TableHead>
                      <TableHead className="text-center">Excused</TableHead>
                      <TableHead className="text-center">Attendance %</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(summary ?? []).map((s) => (
                      <TableRow key={s.studentId}>
                        <TableCell className="font-medium">{s.studentName}</TableCell>
                        <TableCell className="text-center text-green-600">{s.presentCount}</TableCell>
                        <TableCell className="text-center text-yellow-600">{s.lateCount}</TableCell>
                        <TableCell className="text-center text-red-600">{s.absentCount}</TableCell>
                        <TableCell className="text-center text-blue-600">{s.excusedCount}</TableCell>
                        <TableCell className="text-center font-bold">{s.attendancePercent}%</TableCell>
                        <TableCell className="text-center">
                          {s.isBelowThreshold ? (
                            <Badge variant="destructive" className="text-xs">
                              <AlertTriangle className="h-3 w-3 me-1" /> At Risk
                            </Badge>
                          ) : (
                            <Badge className="text-xs bg-green-50 text-green-700 border-green-200">
                              <CheckCircle2 className="h-3 w-3 me-1" /> Good
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </Card>
        </>
      )}
    </div>
  );
};

export default AttendanceReport;
