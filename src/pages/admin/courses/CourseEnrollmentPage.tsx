import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowLeft, Loader2, UserPlus } from 'lucide-react';
import { createEnrollmentColumns } from './enrollmentColumns';
import { DataTable } from '@/components/shared/DataTable';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { useCourse } from '@/hooks/useCourses';
import {
  useEnrollments,
  useEnrollStudent,
  useUnenrollStudent,
  type EnrollmentWithProfile,
} from '@/hooks/useEnrollments';
import { useUsers } from '@/hooks/useUsers';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const CourseEnrollmentPage = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();

  const [enrollDialogOpen, setEnrollDialogOpen] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [unenrollTarget, setUnenrollTarget] = useState<EnrollmentWithProfile | null>(null);

  const { data: course, isLoading: courseLoading } = useCourse(courseId);
  const { data: enrollments = [], isLoading: enrollmentsLoading } = useEnrollments(courseId);
  const { data: students = [] } = useUsers({ role: 'student' });
  const enrollMutation = useEnrollStudent();
  const unenrollMutation = useUnenrollStudent();

  // Filter out students already enrolled (active or completed) from the enroll dialog
  const availableStudents = useMemo(() => {
    const enrolledIds = new Set(
      enrollments
        .filter((e) => e.status !== 'dropped')
        .map((e) => e.student_id),
    );
    return students.filter((s) => s.is_active && !enrolledIds.has(s.id));
  }, [students, enrollments]);

  const columns = createEnrollmentColumns((enrollment) =>
    setUnenrollTarget(enrollment),
  );

  const handleEnroll = () => {
    if (!selectedStudentId || !courseId) return;
    enrollMutation.mutate(
      { student_id: selectedStudentId, course_id: courseId },
      {
        onSuccess: () => {
          toast.success('Student enrolled successfully');
          setEnrollDialogOpen(false);
          setSelectedStudentId('');
        },
        onError: (err) => toast.error(err.message),
      },
    );
  };

  const handleUnenroll = () => {
    if (!unenrollTarget) return;
    unenrollMutation.mutate(unenrollTarget.id, {
      onSuccess: () => {
        toast.success(
          `${unenrollTarget.profiles?.full_name ?? 'Student'} has been unenrolled`,
        );
        setUnenrollTarget(null);
      },
      onError: (err) => toast.error(err.message),
    });
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/admin/courses')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold tracking-tight">
            Course Enrollment
          </h1>
        </div>
        <Button
          className="bg-gradient-to-r from-teal-500 to-blue-600 active:scale-95 text-white"
          onClick={() => setEnrollDialogOpen(true)}
        >
          <UserPlus className="h-4 w-4" /> Enroll Student
        </Button>
      </div>

      {/* Course Info Card */}
      {courseLoading ? (
        <Card className="bg-white border-0 shadow-md rounded-xl p-4">
          <div className="flex items-center gap-2 text-gray-400">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading course info…
          </div>
        </Card>
      ) : course ? (
        <Card className="bg-white border-0 shadow-md rounded-xl p-4">
          <p className="text-lg font-bold tracking-tight">{course.name}</p>
          <p className="text-sm text-gray-500">Code: {course.code}</p>
        </Card>
      ) : null}

      {/* Enrolled Students Table */}
      <DataTable
        columns={columns}
        data={enrollments}
        isLoading={enrollmentsLoading}
      />

      {/* Enroll Student Dialog */}
      <Dialog open={enrollDialogOpen} onOpenChange={setEnrollDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enroll Student</DialogTitle>
            <DialogDescription>
              Select a student to enroll in{' '}
              <span className="font-medium">{course?.name ?? 'this course'}</span>.
            </DialogDescription>
          </DialogHeader>

          <Select value={selectedStudentId} onValueChange={setSelectedStudentId}>
            <SelectTrigger className="w-full bg-white">
              <SelectValue placeholder="Select a student…" />
            </SelectTrigger>
            <SelectContent>
              {availableStudents.length === 0 ? (
                <div className="px-3 py-2 text-sm text-gray-500">
                  No students available
                </div>
              ) : (
                availableStudents.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.full_name} ({s.email})
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setEnrollDialogOpen(false);
                setSelectedStudentId('');
              }}
              disabled={enrollMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleEnroll}
              disabled={!selectedStudentId || enrollMutation.isPending}
              className="bg-gradient-to-r from-teal-500 to-blue-600 active:scale-95 text-white"
            >
              {enrollMutation.isPending && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              Enroll
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Unenroll Confirmation Dialog */}
      <ConfirmDialog
        open={!!unenrollTarget}
        onOpenChange={() => setUnenrollTarget(null)}
        title="Unenroll Student"
        description={`Are you sure you want to unenroll "${unenrollTarget?.profiles?.full_name ?? 'this student'}" from the course? Their status will be set to dropped.`}
        variant="destructive"
        confirmLabel="Unenroll"
        isPending={unenrollMutation.isPending}
        onConfirm={handleUnenroll}
      />
    </div>
  );
};

export default CourseEnrollmentPage;
