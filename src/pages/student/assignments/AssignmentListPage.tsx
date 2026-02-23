import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { parseAsString, useQueryState } from 'nuqs';
import { useStudentAssignments } from '@/hooks/useSubmissions';
import type { StudentAssignment } from '@/hooks/useSubmissions';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import Shimmer from '@/components/shared/Shimmer';
import { ClipboardList, Search, Calendar } from 'lucide-react';
import { format, isPast, addHours } from 'date-fns';

// ─── Status helpers ─────────────────────────────────────────────────────────

type AssignmentStatus = 'submitted' | 'pending' | 'late' | 'overdue';

const getAssignmentStatus = (assignment: StudentAssignment): AssignmentStatus => {
  if (assignment.submissions && assignment.submissions.length > 0) {
    const first = assignment.submissions[0]!;
    return first.is_late ? 'late' : 'submitted';
  }
  const dueDate = new Date(assignment.due_date);
  const lateDeadline = addHours(dueDate, assignment.late_window_hours);
  if (isPast(lateDeadline)) return 'overdue';
  if (isPast(dueDate)) return 'late';
  return 'pending';
};

const statusConfig: Record<AssignmentStatus, { label: string; className: string }> = {
  submitted: { label: 'Submitted', className: 'bg-green-100 text-green-700 border-green-200' },
  pending: { label: 'Pending', className: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  late: { label: 'Late', className: 'bg-orange-100 text-orange-700 border-orange-200' },
  overdue: { label: 'Overdue', className: 'bg-red-100 text-red-700 border-red-200' },
};

// ─── AssignmentListPage ─────────────────────────────────────────────────────

const AssignmentListPage = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useQueryState('q', parseAsString.withDefault(''));
  const [courseFilter, setCourseFilter] = useState<string>('all');
  const { data: assignments, isLoading } = useStudentAssignments(
    courseFilter !== 'all' ? courseFilter : undefined,
  );

  // Derive unique courses from assignments for the filter dropdown
  const courseOptions = (() => {
    if (!assignments) return [];
    const seen = new Map<string, boolean>();
    return assignments.reduce<Array<{ id: string; label: string }>>((acc, a) => {
      if (!seen.has(a.course_id)) {
        seen.set(a.course_id, true);
        acc.push({ id: a.course_id, label: a.course_id });
      }
      return acc;
    }, []);
  })();

  // Filter by search term
  const filtered = (assignments ?? []).filter((a) =>
    a.title.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Assignments</h1>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search assignments..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        {courseOptions.length > 1 && (
          <Select value={courseFilter} onValueChange={setCourseFilter}>
            <SelectTrigger className="w-48 bg-white">
              <SelectValue placeholder="All Courses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Courses</SelectItem>
              {courseOptions.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Assignment List */}
      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Shimmer key={i} className="h-20 rounded-xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="bg-white border-0 shadow-md rounded-xl">
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="p-3 rounded-full bg-blue-50 mb-3">
              <ClipboardList className="h-8 w-8 text-blue-500" />
            </div>
            <p className="text-sm text-gray-500">No assignments found.</p>
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((assignment) => {
            const status = getAssignmentStatus(assignment);
            const config = statusConfig[status];
            return (
              <Card
                key={assignment.id}
                className="bg-white border-0 shadow-md rounded-xl p-4 cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => navigate(`/student/assignments/${assignment.id}`)}
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold truncate">{assignment.title}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="flex items-center gap-1 text-xs text-gray-500">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(assignment.due_date), 'MMM d, yyyy h:mm a')}
                      </span>
                      <span className="text-xs text-gray-400">
                        {assignment.total_marks} marks
                      </span>
                    </div>
                  </div>
                  <Badge variant="outline" className={config.className}>
                    {config.label}
                  </Badge>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AssignmentListPage;
