import { type ColumnDef } from '@tanstack/react-table';
import { format } from 'date-fns';
import { ArrowUpDown, ClipboardCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import type { SubmissionWithRelations } from '@/hooks/useSubmissions';

export const gradingQueueColumns: ColumnDef<SubmissionWithRelations>[] = [
  {
    id: 'student_name',
    header: ({ column }) => (
      <Button
        variant="ghost"
        size="sm"
        className="-ml-3"
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
      >
        Student
        <ArrowUpDown className="h-4 w-4" />
      </Button>
    ),
    accessorFn: (row) => row.profiles?.full_name ?? 'Unknown',
    cell: ({ row }) => (
      <span className="font-medium">
        {row.original.profiles?.full_name ?? 'Unknown'}
      </span>
    ),
  },
  {
    id: 'assignment_title',
    header: ({ column }) => (
      <Button
        variant="ghost"
        size="sm"
        className="-ml-3"
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
      >
        Assignment
        <ArrowUpDown className="h-4 w-4" />
      </Button>
    ),
    accessorFn: (row) => row.assignments?.title ?? 'Unknown',
    cell: ({ row }) => (
      <span className="text-sm">{row.original.assignments?.title ?? 'Unknown'}</span>
    ),
  },
  {
    accessorKey: 'created_at',
    header: ({ column }) => (
      <Button
        variant="ghost"
        size="sm"
        className="-ml-3"
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
      >
        Submitted At
        <ArrowUpDown className="h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => (
      <span className="text-sm">
        {format(new Date(row.getValue('created_at') as string), 'MMM d, yyyy h:mm a')}
      </span>
    ),
  },
  {
    accessorKey: 'is_late',
    header: 'Timing',
    cell: ({ row }) => {
      const isLate = row.getValue('is_late') as boolean;
      return isLate ? (
        <Badge className="bg-red-100 text-red-700 border-red-200" variant="outline">
          Late
        </Badge>
      ) : (
        <Badge className="bg-green-100 text-green-700 border-green-200" variant="outline">
          On Time
        </Badge>
      );
    },
  },
  {
    id: 'status',
    header: 'Status',
    cell: ({ row }) => {
      const isGraded = !!row.original.grades;
      return isGraded ? (
        <Badge className="bg-green-100 text-green-700 border-green-200" variant="outline">
          Graded
        </Badge>
      ) : (
        <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200" variant="outline">
          Pending
        </Badge>
      );
    },
  },
  {
    id: 'actions',
    header: '',
    cell: ({ row }) => (
      <Button
        asChild
        size="sm"
        className="bg-gradient-to-r from-teal-500 to-blue-600 active:scale-95"
      >
        <Link to={`/teacher/grading/${row.original.id}`}>
          <ClipboardCheck className="h-4 w-4" />
          Grade
        </Link>
      </Button>
    ),
  },
];
