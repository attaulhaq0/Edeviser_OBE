import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { parseAsString, useQueryState } from 'nuqs';
import { toast } from 'sonner';
import { createColumns } from './columns';
import { DataTable } from '@/components/shared/DataTable';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { useCourses, useSoftDeleteCourse } from '@/hooks/useCourses';
import { usePrograms } from '@/hooks/usePrograms';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Search } from 'lucide-react';
import type { Course } from '@/types/app';

const CourseListPage = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useQueryState('q', parseAsString.withDefault(''));
  const [programFilter, setProgramFilter] = useQueryState(
    'program',
    parseAsString.withDefault(''),
  );
  const [courseToDeactivate, setCourseToDeactivate] = useState<Course | null>(null);

  const { data, isLoading } = useCourses({
    search: search || undefined,
    programId: programFilter || undefined,
  });

  const { data: programs = [] } = usePrograms();
  const softDeleteMutation = useSoftDeleteCourse();

  const columns = createColumns(
    (course) => navigate(`/admin/courses/${course.id}/edit`),
    (course) => setCourseToDeactivate(course),
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Courses</h1>
        <Button
          className="bg-gradient-to-r from-teal-500 to-blue-600 active:scale-95 text-white"
          onClick={() => navigate('/admin/courses/new')}
        >
          <Plus className="h-4 w-4" /> Add Course
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search by name or code..."
            value={search}
            onChange={(e) => setSearch(e.target.value || null)}
            className="pl-9"
          />
        </div>
        <Select
          value={programFilter || '__all__'}
          onValueChange={(value) =>
            setProgramFilter(value === '__all__' ? null : value)
          }
        >
          <SelectTrigger className="w-[220px] bg-white">
            <SelectValue placeholder="All Programs" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All Programs</SelectItem>
            {programs.map((program) => (
              <SelectItem key={program.id} value={program.id}>
                {program.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Data Table */}
      <DataTable columns={columns} data={data ?? []} isLoading={isLoading} />

      {/* Deactivate Confirmation Dialog */}
      <ConfirmDialog
        open={!!courseToDeactivate}
        onOpenChange={() => setCourseToDeactivate(null)}
        title="Deactivate Course"
        description={`Are you sure you want to deactivate "${courseToDeactivate?.name}"? Students will no longer be able to submit assignments for this course.`}
        variant="destructive"
        confirmLabel="Deactivate"
        isPending={softDeleteMutation.isPending}
        onConfirm={() => {
          if (!courseToDeactivate) return;
          softDeleteMutation.mutate(courseToDeactivate.id, {
            onSuccess: () => {
              toast.success(`${courseToDeactivate.name} has been deactivated`);
              setCourseToDeactivate(null);
            },
            onError: (err) => {
              toast.error(err.message);
            },
          });
        }}
      />
    </div>
  );
};

export default CourseListPage;
