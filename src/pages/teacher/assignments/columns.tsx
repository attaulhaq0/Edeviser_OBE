import { type ColumnDef } from '@tanstack/react-table';
import { format } from 'date-fns';
import { isPast, differenceInHours } from 'date-fns';
import { ArrowUpDown, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { AssignmentWithRelations } from '@/hooks/useAssignments';

const getStatusBadge = (dueDate: string) => {
  const due = new Date(dueDate);
  const now = new Date();

  if (isPast(due)) {
    return (
      <Badge className="bg-red-100 text-red-700 border-red-200" variant="outline">
        Past Due
      </Badge>
    );
  }

  if (differenceInHours(due, now) <= 48) {
    return (
      <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200" variant="outline">
        Due Soon
      </Badge>
    );
  }

  return (
    <Badge className="bg-green-100 text-green-700 border-green-200" variant="outline">
      Open
    </Badge>
  );
};

export const createColumns = (
  onEdit: (id: string) => void,
  onDelete: (assignment: AssignmentWithRelations) => void,
): ColumnDef<AssignmentWithRelations>[] => [
  {
    accessorKey: 'title',
    header: ({ column }) => (
      <Button
        variant="ghost"
        size="sm"
        className="-ml-3"
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
      >
        Title
        <ArrowUpDown className="h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => (
      <span className="font-medium">{row.getValue('title')}</span>
    ),
  },
  {
    accessorKey: 'course_id',
    header: 'Course',
    cell: ({ row }) => (
      <span className="text-gray-500 text-sm font-mono truncate max-w-[120px] inline-block">
        {(row.getValue('course_id') as string).slice(0, 8)}…
      </span>
    ),
  },
  {
    accessorKey: 'due_date',
    header: ({ column }) => (
      <Button
        variant="ghost"
        size="sm"
        className="-ml-3"
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
      >
        Due Date
        <ArrowUpDown className="h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => {
      const dueDate = row.getValue('due_date') as string;
      return (
        <span className="text-sm">
          {format(new Date(dueDate), 'MMM d, yyyy')}
        </span>
      );
    },
  },
  {
    accessorKey: 'total_marks',
    header: 'Total Marks',
    cell: ({ row }) => (
      <span className="text-sm">{row.getValue('total_marks')}</span>
    ),
  },
  {
    id: 'rubric',
    header: 'Rubric',
    cell: ({ row }) => (
      <span className="text-sm text-gray-600">
        {row.original.rubrics?.title ?? '—'}
      </span>
    ),
  },
  {
    id: 'clos',
    header: 'CLOs',
    cell: ({ row }) => {
      const count = row.original.clo_weights?.length ?? 0;
      return (
        <Badge className="bg-blue-100 text-blue-700 border-blue-200" variant="outline">
          {count} CLO{count !== 1 ? 's' : ''}
        </Badge>
      );
    },
  },
  {
    id: 'status',
    header: 'Status',
    cell: ({ row }) => getStatusBadge(row.original.due_date),
  },
  {
    id: 'actions',
    header: '',
    cell: ({ row }) => (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-xs">
            <MoreHorizontal className="h-4 w-4" />
            <span className="sr-only">Open menu</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => onEdit(row.original.id)}>
            <Pencil className="h-4 w-4" />
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem
            variant="destructive"
            onClick={() => onDelete(row.original)}
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    ),
  },
];
