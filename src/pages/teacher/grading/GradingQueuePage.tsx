import { parseAsString, useQueryState } from 'nuqs';
import { DataTable } from '@/components/shared/DataTable';
import { useSubmissions } from '@/hooks/useSubmissions';
import { useCourses } from '@/hooks/useCourses';
import { useAssignments } from '@/hooks/useAssignments';
import { gradingQueueColumns } from './gradingQueueColumns';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const GradingQueuePage = () => {
  const [courseId, setCourseId] = useQueryState('course', parseAsString.withDefault(''));
  const [assignmentId, setAssignmentId] = useQueryState('assignment', parseAsString.withDefault(''));

  const { data: courses } = useCourses();
  const { data: assignments } = useAssignments(courseId || undefined);
  const { data: submissions, isLoading } = useSubmissions({
    courseId: courseId || undefined,
    assignmentId: assignmentId || undefined,
  });

  const handleCourseChange = (value: string) => {
    setCourseId(value === 'all' ? '' : value);
    setAssignmentId('');
  };

  const handleAssignmentChange = (value: string) => {
    setAssignmentId(value === 'all' ? '' : value);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <h1 className="text-2xl font-bold tracking-tight">Grading Queue</h1>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <Select value={courseId || 'all'} onValueChange={handleCourseChange}>
          <SelectTrigger className="w-[220px] bg-white">
            <SelectValue placeholder="All Courses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Courses</SelectItem>
            {courses?.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.code} — {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={assignmentId || 'all'}
          onValueChange={handleAssignmentChange}
          disabled={!courseId}
        >
          <SelectTrigger className="w-[220px] bg-white">
            <SelectValue placeholder="All Assignments" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Assignments</SelectItem>
            {assignments?.map((a) => (
              <SelectItem key={a.id} value={a.id}>
                {a.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Data Table */}
      <DataTable
        columns={gradingQueueColumns}
        data={submissions ?? []}
        isLoading={isLoading}
      />
    </div>
  );
};

export default GradingQueuePage;
