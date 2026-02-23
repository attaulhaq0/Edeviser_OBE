import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { parseAsString, useQueryState } from 'nuqs';
import { createColumns } from './columns';
import { DataTable } from '@/components/shared/DataTable';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { useAssignments, useDeleteAssignment } from '@/hooks/useAssignments';
import type { AssignmentWithRelations } from '@/hooks/useAssignments';
import { useCourses } from '@/hooks/useCourses';
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

const AssignmentListPage = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useQueryState('q', parseAsString.withDefault(''));
  const [courseFilter, setCourseFilter] = useQueryState(
    'course',
    parseAsString.withDefault(''),
  );
  const [assignmentToDelete, setAssignmentToDelete] =
    useState<AssignmentWithRelations | null>(null);

  const { data: courses, isLoading: coursesLoading } = useCourses();
  const { data: assignments, isLoading } = useAssignments(
    courseFilter || undefined,
  );
  const deleteMutation = useDeleteAssignment();

  const filteredAssignments = (assignments ?? []).filter((a) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      a.title.toLowerCase().includes(q) ||
      (a.description?.toLowerCase().includes(q) ?? false)
    );
  });

  const columns = createColumns(
    (id) => navigate(`/teacher/assignments/${id}/edit`),
    (assignment) => setAssignmentToDelete(assignment),
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Assignments</h1>
        <Button
          className="bg-gradient-to-r from-teal-500 to-blue-600 active:scale-95 text-white"
          onClick={() => navigate('/teacher/assignments/new')}
        >
          <Plus className="h-4 w-4" /> Add Assignment
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search assignments..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select
          value={courseFilter}
          onValueChange={(val) => setCourseFilter(val === 'all' ? '' : val)}
          disabled={coursesLoading}
        >
          <SelectTrigger className="w-[260px] bg-white">
            <SelectValue placeholder="Filter by course" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Courses</SelectItem>
            {(courses ?? []).map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.code} — {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Data Table */}
      <DataTable
        columns={columns}
        data={filteredAssignments}
        isLoading={isLoading}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={!!assignmentToDelete}
        onOpenChange={() => setAssignmentToDelete(null)}
        title="Delete Assignment"
        description={`Are you sure you want to delete "${assignmentToDelete?.title}"? This action cannot be undone.`}
        variant="destructive"
        confirmLabel="Delete"
        isPending={deleteMutation.isPending}
        onConfirm={() => {
          if (!assignmentToDelete) return;
          deleteMutation.mutate(assignmentToDelete.id, {
            onSuccess: () => {
              toast.success(`"${assignmentToDelete.title}" has been deleted`);
              setAssignmentToDelete(null);
            },
            onError: (err) => {
              toast.error(err.message);
              setAssignmentToDelete(null);
            },
          });
        }}
      />
    </div>
  );
};

export default AssignmentListPage;
