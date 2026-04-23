// =============================================================================
// AttendanceMarker — Teacher page for creating sessions & marking attendance
// Requirements: 78.1, 78.2
// =============================================================================

import { useState, useMemo, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { parseAsString, useQueryState } from 'nuqs';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { Plus, CalendarCheck, Loader2, Users } from 'lucide-react';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from '@/components/ui/form';

import AttendanceGrid from '@/components/shared/AttendanceGrid';
import type { StudentAttendance, AttendanceStatus } from '@/components/shared/AttendanceGrid';
import Shimmer from '@/components/shared/Shimmer';

import { useAuth } from '@/hooks/useAuth';
import { useCourses } from '@/hooks/useCourses';
import { useCourseSections } from '@/hooks/useCourseSections';
import {
  useClassSessions,
  useCreateClassSession,
  useAttendanceRecords,
  useMarkAttendance,
} from '@/hooks/useAttendance';
import { createSessionSchema, type CreateSessionFormData } from '@/lib/schemas/attendance';
import { supabase } from '@/lib/supabase';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';

// ─── Enrolled students for a course ─────────────────────────────────────────

const useEnrolledStudents = (courseId: string | undefined) => {
  return useQuery({
    queryKey: queryKeys.enrollments.list({ courseId, scope: 'attendance' }),
    queryFn: async () => {
      if (!courseId) return [];
      const { data, error } = await supabase
        .from('student_courses')
        .select('student_id, profiles:student_id(full_name)')
        .eq('course_id', courseId)
        .eq('status', 'active');
      if (error) throw error;
      return (data ?? []).map((e) => ({
        studentId: e.student_id as string,
        studentName:
          (e.profiles as unknown as { full_name: string } | null)?.full_name ?? 'Unknown',
      }));
    },
    enabled: !!courseId,
  });
};

// ─── Component ──────────────────────────────────────────────────────────────

const AttendanceMarker = () => {
  const { user } = useAuth();
  const teacherId = user?.id ?? '';

  // URL-persisted filters
  const [courseId, setCourseId] = useQueryState('course', parseAsString.withDefault(''));
  const [sectionId, setSectionId] = useQueryState('section', parseAsString.withDefault(''));
  const [selectedSessionId, setSelectedSessionId] = useState<string>('');

  // Data hooks
  const { data: coursesResult, isLoading: coursesLoading } = useCourses();
  const teacherCourses = useMemo(
    () => (coursesResult?.data ?? []).filter((c) => c.teacher_id === teacherId),
    [coursesResult, teacherId],
  );
  const { data: sections } = useCourseSections(courseId || undefined);
  const { data: sessions, isLoading: sessionsLoading } = useClassSessions(sectionId || undefined);
  const { data: existingRecords } = useAttendanceRecords(selectedSessionId || undefined);
  const { data: enrolledStudents } = useEnrolledStudents(courseId || undefined);

  // Mutations
  const createSession = useCreateClassSession();
  const markAttendance = useMarkAttendance();

  // Session creation form
  const form = useForm<CreateSessionFormData>({
    resolver: zodResolver(createSessionSchema),
    defaultValues: {
      section_id: sectionId || '',
      session_date: new Date().toISOString().slice(0, 10),
      session_type: 'lecture',
      topic: '',
    },
  });

  // Local attendance overrides (user edits on top of server data)
  const [localOverrides, setLocalOverrides] = useState<Record<string, AttendanceStatus>>({});
  const [overrideSessionId, setOverrideSessionId] = useState<string>('');

  // Build grid data: merge server records with local overrides
  const gridStudents: StudentAttendance[] = useMemo(() => {
    if (!enrolledStudents) return [];

    // Build base map from existing records
    const baseMap: Record<string, AttendanceStatus> = {};
    if (existingRecords && selectedSessionId) {
      for (const r of existingRecords) {
        baseMap[r.student_id] = r.status;
      }
    }

    // Apply local overrides only if they belong to the current session
    const overrides = overrideSessionId === selectedSessionId ? localOverrides : {};

    return enrolledStudents.map((s) => ({
      studentId: s.studentId,
      studentName: s.studentName,
      status: overrides[s.studentId] ?? baseMap[s.studentId] ?? 'present',
    }));
  }, [enrolledStudents, existingRecords, selectedSessionId, localOverrides, overrideSessionId]);

  // When a session is selected, clear local overrides
  const handleSessionSelect = useCallback(
    (sessionId: string) => {
      setSelectedSessionId(sessionId);
      setLocalOverrides({});
      setOverrideSessionId(sessionId);
    },
    [],
  );

  const handleStatusChange = (studentId: string, status: AttendanceStatus) => {
    setLocalOverrides((prev) => ({ ...prev, [studentId]: status }));
    setOverrideSessionId(selectedSessionId);
  };

  const handleCreateSession = (data: CreateSessionFormData) => {
    createSession.mutate(
      { ...data, section_id: sectionId || data.section_id },
      {
        onSuccess: (session) => {
          toast.success('Class session created');
          form.reset();
          setSelectedSessionId(session.id);
        },
        onError: (err) => toast.error(err.message),
      },
    );
  };

  const handleSaveAttendance = () => {
    if (!selectedSessionId || !gridStudents.length) return;
    const records = gridStudents.map((s) => ({
      student_id: s.studentId,
      status: s.status,
    }));
    markAttendance.mutate(
      { session_id: selectedSessionId, records },
      {
        onSuccess: () => {
          toast.success('Attendance saved');
          setLocalOverrides({});
        },
        onError: (err) => toast.error(err.message),
      },
    );
  };

  const handleBulkMark = (status: AttendanceStatus) => {
    if (!enrolledStudents) return;
    const map: Record<string, AttendanceStatus> = {};
    for (const s of enrolledStudents) {
      map[s.studentId] = status;
    }
    setLocalOverrides(map);
    setOverrideSessionId(selectedSessionId);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Attendance Marker</h1>
      </div>

      {/* Course & Section Selectors */}
      <div className="flex flex-wrap items-end gap-4">
        <div className="w-64">
          <span className="text-xs font-medium text-gray-500 mb-1 block">Course</span>
          {coursesLoading ? (
            <Shimmer className="h-10 rounded-lg" />
          ) : (
            <Select value={courseId} onValueChange={(v) => { setCourseId(v); setSectionId(''); setSelectedSessionId(''); }}>
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
            <Select value={sectionId} onValueChange={(v) => { setSectionId(v); setSelectedSessionId(''); }}>
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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Create Session + Session List */}
          <div className="space-y-4">
            {/* Create Session Form */}
            <Card className="bg-white border-0 shadow-md rounded-xl overflow-hidden">
              <div
                className="px-6 py-4 flex items-center gap-2"
                style={{ background: 'linear-gradient(93.65deg, #14B8A6 5.37%, #0382BD 78.89%)' }}
              >
                <Plus className="h-5 w-5 text-white" />
                <h2 className="text-lg font-bold tracking-tight text-white">New Session</h2>
              </div>
              <div className="p-6">
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(handleCreateSession)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="session_date"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Date</FormLabel>
                          <FormControl><Input type="date" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="session_type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Type</FormLabel>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                            <SelectContent>
                              <SelectItem value="lecture">Lecture</SelectItem>
                              <SelectItem value="lab">Lab</SelectItem>
                              <SelectItem value="tutorial">Tutorial</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="topic"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Topic</FormLabel>
                          <FormControl><Input placeholder="Session topic" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button
                      type="submit"
                      disabled={createSession.isPending}
                      className="w-full bg-gradient-to-r from-teal-500 to-blue-600 active:scale-95"
                    >
                      {createSession.isPending && <Loader2 className="h-4 w-4 animate-spin me-1" />}
                      Create Session
                    </Button>
                  </form>
                </Form>
              </div>
            </Card>

            {/* Session List */}
            <Card className="bg-white border-0 shadow-md rounded-xl overflow-hidden">
              <div
                className="px-6 py-4 flex items-center gap-2"
                style={{ background: 'linear-gradient(93.65deg, #14B8A6 5.37%, #0382BD 78.89%)' }}
              >
                <CalendarCheck className="h-5 w-5 text-white" />
                <h2 className="text-lg font-bold tracking-tight text-white">Sessions</h2>
              </div>
              <div className="p-4 max-h-96 overflow-y-auto">
                {sessionsLoading ? (
                  <div className="space-y-2">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <Shimmer key={i} className="h-12 rounded-lg" />
                    ))}
                  </div>
                ) : (sessions ?? []).length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">No sessions yet</p>
                ) : (
                  <div className="space-y-1">
                    {(sessions ?? []).map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => handleSessionSelect(s.id)}
                        className={`w-full text-start px-3 py-2 rounded-lg text-sm transition-colors ${
                          selectedSessionId === s.id
                            ? 'bg-blue-50 text-blue-700 font-semibold'
                            : 'hover:bg-slate-50 text-gray-700'
                        }`}
                      >
                        <span className="font-medium">{format(new Date(s.session_date), 'MMM d, yyyy')}</span>
                        <span className="text-xs text-gray-500 ms-2 capitalize">{s.session_type}</span>
                        <p className="text-xs text-gray-400 truncate">{s.topic}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </Card>
          </div>

          {/* Right: Attendance Grid */}
          <div className="lg:col-span-2">
            {selectedSessionId ? (
              <Card className="bg-white border-0 shadow-md rounded-xl overflow-hidden">
                <div
                  className="px-6 py-4 flex items-center justify-between"
                  style={{ background: 'linear-gradient(93.65deg, #14B8A6 5.37%, #0382BD 78.89%)' }}
                >
                  <div className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-white" />
                    <h2 className="text-lg font-bold tracking-tight text-white">Mark Attendance</h2>
                  </div>
                  <span className="text-xs text-white/70">{gridStudents.length} students</span>
                </div>
                <div className="p-6 space-y-4">
                  {/* Bulk actions */}
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => handleBulkMark('present')} className="text-xs text-green-700 border-green-300">
                      All Present
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleBulkMark('absent')} className="text-xs text-red-700 border-red-300">
                      All Absent
                    </Button>
                  </div>

                  {/* Grid */}
                  <AttendanceGrid
                    students={gridStudents}
                    onStatusChange={handleStatusChange}
                  />

                  {/* Save */}
                  <Button
                    onClick={handleSaveAttendance}
                    disabled={markAttendance.isPending || gridStudents.length === 0}
                    className="w-full bg-gradient-to-r from-teal-500 to-blue-600 active:scale-95"
                  >
                    {markAttendance.isPending && <Loader2 className="h-4 w-4 animate-spin me-1" />}
                    Save Attendance
                  </Button>
                </div>
              </Card>
            ) : (
              <Card className="bg-white border-0 shadow-md rounded-xl p-12 flex flex-col items-center justify-center text-center">
                <CalendarCheck className="h-12 w-12 text-gray-300 mb-3" />
                <p className="text-sm text-gray-500">Select or create a session to mark attendance</p>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AttendanceMarker;
